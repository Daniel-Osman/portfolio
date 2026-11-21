/**
 * One session for voice and text: the socket opens first and audio follows without gating it, so
 * a blocked speaker never costs the greeting or a typed turn. The microphone becomes a toggle on
 * the same connection. Typed turns ride `text.message` there, so muting gives back the
 * microphone, never the conversation. Everything the panel needs is a small state object pushed
 * through `onChange`; transcript lines go out through `onLine`; every ending arrives through
 * `onEnded` with a reason.
 *
 * The wire shapes live in `voice-protocol.ts`; the speaker and microphone in `voice-audio.ts`.
 */

import { createVoiceAudio, VOICE_SEND_HIGH_WATER_BYTES } from "./voice-audio.ts";
import {
    GREETING_INSTRUCTION,
    VOICE_SESSION_CAP_MS,
    createStreamingResampler,
    decodePcm16,
    pcm16Base64,
    phaseForVoiceState,
    voiceEventId,
    voiceHello,
    voiceProtocols,
    voiceSocketUrl,
    voiceTextMessage,
    type VoicePhase,
} from "./voice-protocol.ts";

export type VoiceStatus = "idle" | "active" | "ended";

export type VoiceState = {
    status: VoiceStatus;
    phase: VoicePhase;
    micOn: boolean;
    soundOn: boolean;
    /** Milliseconds left in the mirrored cap; `null` until the gateway's voice front end is ready. */
    remainingMs: number | null;
    /** One line about a non-fatal problem, such as playback that never opened. */
    notice: string | null;
};

/**
 * One `transcript.*` event exactly as the gateway sent it. The shape mirrors `applyVoiceLine`'s
 * parameter in `voice-protocol.ts`; keep the two in step until that module exports one type.
 */
export type VoiceTranscriptEvent = {
    type?: string;
    role?: string;
    content?: unknown;
    turnId?: unknown;
    replace?: boolean;
    [key: string]: unknown;
};

export type VoiceEndReason = "user" | "cap" | "closed" | "error";

export type VoiceSession = {
    readonly state: VoiceState;
    /** Creates or resumes the AudioContext. Call it in the panel's click, before `start()`. */
    openOutput(): Promise<void>;
    start(): Promise<void>;
    stop(reason?: VoiceEndReason): void;
    /** Turning the microphone on asks for it inside this call, so it must run in a click. */
    setMic(on: boolean): Promise<void>;
    setSound(on: boolean): void;
    /** Sends one text turn on the open session; ignored until `voice.ready`. */
    sendText(text: string): void;
};

type Options = {
    /** The gateway origin, e.g. `https://voice.danielosman.com`. No path. */
    origin: string;
    token: string;
    onChange(state: VoiceState): void;
    onEnded(reason: VoiceEndReason, message: string): void;
    /** Every `transcript.*` event, unchanged. The panel owns the reducer. */
    onLine(event: VoiceTranscriptEvent): void;
};

const END_MESSAGES: Record<VoiceEndReason, string> = {
    user: "the session ended.",
    cap: "the session ended; a voice session runs for five minutes.",
    closed: "the session ended.",
    error: "the voice session could not continue.",
};

/** A failed output is a line, never an ending: text and the transcript still work. */
const AUDIO_NOTICE = "playback is unavailable; the transcript and typed replies still work.";

/** Permission can be granted and the audio graph still fail; that is not a live microphone. */
const MIC_NOTICE = "the microphone could not start; you can still type.";

/** A refused unmute is the push-to-talk answer; playback follows the microphone down. */
const MIC_REFUSED = "the microphone did not open; you can still type.";

/** The browser's own refusals; anything else is a setup failure after permission was granted. */
const MIC_REFUSALS = new Set(["NotAllowedError", "SecurityError", "NotFoundError"]);

function isMicRefusal(error: unknown): boolean {
    return error instanceof Error && MIC_REFUSALS.has(error.name);
}

/** Close codes the gateway uses for a connection that must not be retried. */
const CLOSE_MESSAGES: Record<number, string> = {
    4001: "the session ended; another window took the connection.",
    4002: "the voice session is already open in another window.",
    4003: "this invite link is no longer valid.",
};

export function createVoiceSession({
    origin,
    token,
    onChange,
    onEnded,
    onLine,
}: Options): VoiceSession {
    const audio = createVoiceAudio();
    const resampler = createStreamingResampler();
    const sessionId = voiceEventId("session");
    const instanceId = voiceEventId("instance");

    let socket: WebSocket | null = null;
    let timer: number | null = null;
    let started = false;
    let stopped = false;
    let handshakeReady = false;
    let voiceReady = false;
    let greeted = false;
    let micOn = false;
    let micStarting = false;
    /** Bumped by every microphone change, so a start that awaited past it does nothing. */
    let micEpoch = 0;
    let inputRate = 16_000;
    let endsAt: number | null = null;
    let state: VoiceState = {
        status: "idle",
        phase: "connecting",
        micOn: false,
        soundOn: true,
        remainingMs: null,
        notice: null,
    };

    const publish = (patch: Partial<VoiceState>) => {
        state = { ...state, ...patch };
        onChange(state);
    };

    const send = (event: object): boolean => {
        if (!socket || socket.readyState !== WebSocket.OPEN) return false;
        try {
            socket.send(JSON.stringify({ event_id: voiceEventId("client"), ...event }));
            return true;
        } catch {
            return false;
        }
    };

    /** A typed turn is only valid on an open socket whose voice front end is ready. */
    const submitText = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed || stopped) return;
        if (!voiceReady || !socket || socket.readyState !== WebSocket.OPEN) return;
        send(voiceTextMessage(trimmed, voiceEventId("text")));
    };

    /** The agent speaks first; whichever handshake arrives second sends the one greeting. */
    const maybeGreet = () => {
        if (greeted || !handshakeReady || !voiceReady) return;
        greeted = true;
        submitText(GREETING_INSTRUCTION);
    };

    const onSamples = (samples: Float32Array) => {
        if (!micOn || stopped || !handshakeReady) return;
        const pcm = resampler.process(samples, audio.sampleRate, inputRate);
        if (!pcm.length) return;
        // Live audio: drop a chunk while the socket is congested instead of queuing it.
        if (socket && socket.bufferedAmount > VOICE_SEND_HIGH_WATER_BYTES) return;
        send({ type: "input_audio_buffer.append", audio: pcm16Base64(pcm) });
    };

    /** Every ending — user, cap, close, error — runs exactly this teardown once. */
    function finish(reason: VoiceEndReason, message: string) {
        if (stopped) return;
        stopped = true;
        if (timer !== null) window.clearInterval(timer);
        timer = null;
        handshakeReady = false;
        voiceReady = false;
        greeted = false;
        micEpoch += 1;
        micStarting = false;

        // Release input before the socket goes: the gateway keeps the lease until told. A socket
        // still CONNECTING is aborted here too, so an Escape during `connecting` leaves no orphan
        // connection whose late `onopen` could send anything.
        if (socket) {
            if (socket.readyState === WebSocket.OPEN && micOn) send({ type: "mute" });
            audio.stopMicrophone();
            audio.stopPlayback();
            try {
                socket.close(1000, "session ended");
            } catch {
                // Already closing.
            }
        }
        socket = null;
        audio.close();
        publish({ status: "ended", micOn: false, soundOn: false });
        onEnded(reason, message);
    }

    function stop(reason: VoiceEndReason = "user") {
        finish(reason, END_MESSAGES[reason]);
    }

    const tick = () => {
        if (endsAt === null || stopped) return;
        const remainingMs = Math.max(0, endsAt - Date.now());
        publish({ remainingMs });
        if (remainingMs === 0) stop("cap");
    };

    const handleMessage = (raw: unknown) => {
        if (stopped) return;
        let event: { type?: unknown; [key: string]: unknown };
        try {
            event = JSON.parse(String(raw)) as { type?: unknown; [key: string]: unknown };
        } catch {
            return;
        }
        if (!event || typeof event.type !== "string") return;
        const type = event.type;

        // Every transcript line goes to the panel as it arrived; the reducer lives there.
        if (type.startsWith("transcript.")) onLine(event as VoiceTranscriptEvent);

        switch (type) {
            case "session.ready":
                handshakeReady = true;
                // The gateway ignores audio until the client claims input. A microphone turned
                // on during `connecting` is claimed now, not lost.
                if (micOn) send({ type: "unmute" });
                publish({ phase: "listening" });
                maybeGreet();
                break;
            case "session.ping":
                if (typeof event.event_id === "string") {
                    send({ type: "session.pong", request_event_id: event.event_id });
                }
                break;
            case "voice.ready": {
                const rate = Number(event.inputSampleRate);
                if (Number.isFinite(rate) && rate > 0) inputRate = rate;
                resampler.reset();
                voiceReady = true;
                if (endsAt === null) {
                    endsAt = Date.now() + VOICE_SESSION_CAP_MS;
                    timer = window.setInterval(tick, 1000);
                    publish({ remainingMs: VOICE_SESSION_CAP_MS });
                }
                maybeGreet();
                break;
            }
            case "voice.state": {
                const phase = phaseForVoiceState(event.state);
                if (phase) publish({ phase });
                break;
            }
            case "turn.started":
                publish({ phase: "thinking" });
                break;
            case "response.started":
                publish({ phase: "speaking" });
                break;
            case "audio.delta": {
                const data = typeof event.audio === "string" ? event.audio : "";
                const rate = Number(event.sampleRate);
                if (data)
                    audio.play(
                        decodePcm16(data),
                        Number.isFinite(rate) && rate > 0 ? rate : 24_000
                    );
                publish({ phase: "speaking" });
                break;
            }
            case "audio.done":
                if (state.phase === "speaking") publish({ phase: "listening" });
                break;
            case "playback.clear":
                audio.stopPlayback();
                break;
            case "voice.deactivated":
                stop("closed");
                break;
            case "error": {
                const message =
                    typeof event.message === "string" && event.message.trim()
                        ? event.message
                        : "the voice agent reported an error.";
                finish("error", message);
                break;
            }
            default:
                break;
        }
    };

    return {
        get state() {
            return state;
        },

        async openOutput() {
            if (stopped) return;
            await audio.openOutput();
        },

        async start() {
            if (started || stopped) return;
            started = true;
            publish({
                status: "active",
                phase: "connecting",
                micOn: false,
                soundOn: true,
                remainingMs: null,
            });

            const url = voiceSocketUrl(origin, sessionId);
            if (!url) {
                finish("error", "the voice gateway address is not configured.");
                return;
            }

            let connection: WebSocket;
            try {
                connection = new WebSocket(url, voiceProtocols(token));
            } catch {
                finish("error", "the voice session could not open.");
                return;
            }
            socket = connection;
            connection.onopen = () => {
                // A stop that beat the upgrade already closed this socket; hello is not sent.
                if (stopped) return;
                send(voiceHello(instanceId));
            };
            connection.onmessage = (message: MessageEvent) => handleMessage(message.data);
            connection.onclose = (event: CloseEvent) => {
                if (stopped) return;
                // 4001 replaced, 4002 occupied, 4003 revoked: the session is over for good. This
                // client never reconnects at all, so every close ends it.
                const message = CLOSE_MESSAGES[event.code] ?? END_MESSAGES.closed;
                if (event.code === 4001 || event.code === 4002 || event.code === 4003) {
                    finish("closed", message);
                    return;
                }
                finish("closed", END_MESSAGES.closed);
            };
            connection.onerror = () => {
                // A failed upgrade is followed by `close`, which ends the session.
            };

            // The socket is the conversation; audio is only its voice. A blocked, slow or refused
            // output must never delay hello, the greeting, the transcript or a typed turn. The
            // catch records one line and keeps the session up.
            void audio.openOutput().catch(() => {
                if (stopped) return;
                audio.setOutputEnabled(false);
                publish({ soundOn: false, notice: AUDIO_NOTICE });
            });
        },

        stop,

        async setMic(on) {
            if (stopped) return;
            if (on === micOn && !micStarting) return;
            if (on && micStarting) return;
            micEpoch += 1;
            const epoch = micEpoch;

            if (!on) {
                micStarting = false;
                micOn = false;
                publish({ micOn: false });
                if (handshakeReady) send({ type: "mute" });
                audio.stopMicrophone();
                resampler.reset();
                return;
            }

            micStarting = true;
            try {
                // The click is the gesture, so the permission prompt opens inside this call.
                await audio.startMicrophone(onSamples);
            } catch (error) {
                // A superseded attempt owns nothing: an earlier prompt that ends after a mute or
                // a newer unmute must not report, warn, or claim the current microphone.
                if (epoch !== micEpoch || stopped) return;
                micOn = false;
                if (isMicRefusal(error)) {
                    // The unmute asked for voice and got none: playback goes down with the
                    // microphone in this same press, and the panel reads one line.
                    audio.setOutputEnabled(false);
                    publish({ micOn: false, soundOn: false, notice: MIC_REFUSED });
                    return;
                }
                // Permission was granted and the graph failed: that is news, but playback stays
                // exactly as the visitor left it.
                publish({ micOn: false, notice: MIC_NOTICE });
                return;
            } finally {
                if (epoch === micEpoch) micStarting = false;
            }
            if (epoch !== micEpoch || stopped) return;
            micOn = true;
            publish({
                micOn: true,
                notice:
                    state.notice === MIC_NOTICE || state.notice === MIC_REFUSED
                        ? null
                        : state.notice,
            });
            if (handshakeReady) send({ type: "unmute" });
        },

        setSound(on) {
            if (stopped) return;
            audio.setOutputEnabled(on);
            publish({ soundOn: on });
        },

        sendText: submitText,
    };
}

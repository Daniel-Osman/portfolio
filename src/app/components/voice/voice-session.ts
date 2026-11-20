/**
 * One voice session: microphone first, then the gateway socket, then a teardown that gives the
 * microphone back. Everything the panel needs is a small state object pushed through
 * `onChange`; everything that ends the session arrives through `onEnded` with a reason.
 *
 * The wire shapes live in `voice-protocol.ts`; the speaker and microphone in `voice-audio.ts`.
 */

import { createVoiceAudio, VOICE_SEND_HIGH_WATER_BYTES } from "./voice-audio";
import {
    VOICE_SESSION_CAP_MS,
    createStreamingResampler,
    decodePcm16,
    pcm16Base64,
    phaseForVoiceState,
    voiceEventId,
    voiceHello,
    voiceProtocols,
    voiceSocketUrl,
    type VoicePhase,
} from "./voice-protocol";

export type VoiceStatus = "idle" | "active" | "ended";

export type VoiceState = {
    status: VoiceStatus;
    phase: VoicePhase;
    muted: boolean;
    /** Milliseconds left in the mirrored cap; `null` until the gateway's voice front end is ready. */
    remainingMs: number | null;
};

export type VoiceEndReason = "user" | "cap" | "closed" | "error";

export type VoiceSession = {
    readonly state: VoiceState;
    start(): Promise<void>;
    stop(reason?: VoiceEndReason): void;
    setMuted(muted: boolean): void;
};

type Options = {
    /** The gateway origin, e.g. `https://voice.danielosman.com`. No path. */
    origin: string;
    token: string;
    onChange(state: VoiceState): void;
    onEnded(reason: VoiceEndReason, message: string): void;
};

const END_MESSAGES: Record<VoiceEndReason, string> = {
    user: "the session ended.",
    cap: "the session ended; a voice session runs for five minutes.",
    closed: "the session ended.",
    error: "the voice session could not continue.",
};

/** Close codes the gateway uses for a connection that must not be retried. */
const CLOSE_MESSAGES: Record<number, string> = {
    4001: "the session ended; another window took the connection.",
    4002: "the voice session is already open in another window.",
    4003: "this invite link is no longer valid.",
};

function microphoneMessage(error: unknown): string {
    const name =
        error && typeof error === "object" && "name" in error
            ? String((error as { name?: unknown }).name)
            : "";
    switch (name) {
        case "NotAllowedError":
        case "SecurityError":
            return "the microphone is blocked; allow it for this site and try again.";
        case "NotFoundError":
            return "no microphone was found.";
        case "NotReadableError":
            return "the microphone is busy in another app.";
        case "NotSupportedError":
            return "this browser cannot capture audio.";
        default:
            return "the microphone could not start.";
    }
}

export function createVoiceSession({ origin, token, onChange, onEnded }: Options): VoiceSession {
    const audio = createVoiceAudio();
    const resampler = createStreamingResampler();
    const sessionId = voiceEventId("session");
    const instanceId = voiceEventId("instance");

    let socket: WebSocket | null = null;
    let timer: number | null = null;
    let started = false;
    let stopped = false;
    let ready = false;
    let muted = false;
    let inputRate = 16_000;
    let endsAt: number | null = null;
    let state: VoiceState = {
        status: "idle",
        phase: "connecting",
        muted: false,
        remainingMs: null,
    };

    const publish = (patch: Partial<VoiceState>) => {
        state = { ...state, ...patch };
        onChange(state);
    };

    const send = (event: Record<string, unknown>): boolean => {
        if (!socket || socket.readyState !== WebSocket.OPEN) return false;
        try {
            socket.send(JSON.stringify({ event_id: voiceEventId("client"), ...event }));
            return true;
        } catch {
            return false;
        }
    };

    /** Every ending — user, cap, close, error — runs exactly this teardown once. */
    function finish(reason: VoiceEndReason, message: string) {
        if (stopped) return;
        stopped = true;
        if (timer !== null) window.clearInterval(timer);
        timer = null;
        ready = false;

        if (socket?.readyState === WebSocket.OPEN) {
            // Release input before the socket goes: the gateway keeps the lease until told.
            send({ type: "mute" });
            try {
                socket.close(1000, "session ended");
            } catch {
                // Already closing.
            }
        }
        socket = null;
        audio.close();
        publish({ status: "ended", muted: false });
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

        switch (event.type) {
            case "session.ready":
                ready = true;
                // The gateway ignores audio until the client claims input. A mute pressed while
                // the handshake was in flight is claimed now, not lost.
                send({ type: muted ? "mute" : "unmute" });
                publish({ phase: "listening" });
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
                if (endsAt === null) {
                    endsAt = Date.now() + VOICE_SESSION_CAP_MS;
                    timer = window.setInterval(tick, 1000);
                    publish({ remainingMs: VOICE_SESSION_CAP_MS });
                }
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

        async start() {
            if (started || stopped) return;
            started = true;
            publish({ status: "active", phase: "connecting", muted: false, remainingMs: null });

            try {
                await audio.startMicrophone((samples) => {
                    if (muted || stopped || !ready) return;
                    const pcm = resampler.process(samples, audio.sampleRate, inputRate);
                    if (!pcm.length) return;
                    // Live audio: drop a chunk while the socket is congested instead of queuing it.
                    if (socket && socket.bufferedAmount > VOICE_SEND_HIGH_WATER_BYTES) return;
                    send({ type: "input_audio_buffer.append", audio: pcm16Base64(pcm) });
                });
            } catch (error) {
                finish("error", microphoneMessage(error));
                return;
            }

            // Closed while the permission prompt was open.
            if (stopped) {
                audio.close();
                return;
            }

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
        },

        stop,

        setMuted(next: boolean) {
            if (stopped) return;
            muted = next;
            // Before the handshake lands this only records the intent: a mute during
            // `connecting` must not be forgotten.
            if (ready) send({ type: next ? "mute" : "unmute" });
            publish({ muted: next });
        },
    };
}

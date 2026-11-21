/**
 * The voice gateway's wire contract, with no socket and no DOM in sight.
 *
 * Everything here is pure so `npm test` can hold the handshake, the audio encoding and the
 * caption mapping still without a browser. `voice-session.ts` owns the socket, `voice-audio.ts`
 * owns the speaker and the microphone. The reference client lives in
 * `shipwright/incubator/qwen-audio-agent`; the shapes come from
 * `shared/protocol/gateway-client-protocol.mjs` and `docs/gateway-protocol.md` there.
 */

/** The only subprotocol the server selects. The bearer rides second and is never echoed. */
export const VOICE_WS_PROTOCOL = "qwaudio.gcp.v6";

export const VOICE_PROTOCOL_VERSION = "7.0.0";

/**
 * How long a session may run. The server enforces its own cap (`VOICE_SESSION_MAX_MINUTES`,
 * live value 5); this constant only mirrors it so the panel can count down. The server stays
 * authoritative: it may end a session sooner and this value never extends one.
 */
export const VOICE_SESSION_CAP_MS = 5 * 60 * 1000;

/** The gateway's own token rule; anything outside it is refused before a socket is opened. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,256}$/;

const BEARER_PREFIX = "qwaudio.bearer.";

/** The four states the panel names; `idle` folds into `listening`. */
export type VoicePhase = "connecting" | "listening" | "thinking" | "speaking";

export function isVoiceToken(value: unknown): value is string {
    return typeof value === "string" && TOKEN_PATTERN.test(value);
}

/**
 * Read the invite token from `#voice=<token>`. The fragment never reaches a server log, which is
 * the whole reason the token travels there.
 */
export function tokenFromFragment(fragment: string): string | null {
    const source = String(fragment);
    // Only a fragment is accepted: a token in a query string would already be in the logs.
    if (!source.startsWith("#")) return null;
    const params = new URLSearchParams(source.slice(1));
    const value = (params.get("voice") ?? "").trim();
    return isVoiceToken(value) ? value : null;
}

/** The same fragment with `voice` removed, so the address bar keeps nothing about the invite. */
export function fragmentWithoutVoice(fragment: string): string {
    const source = String(fragment);
    if (!source.startsWith("#")) return source;
    const params = new URLSearchParams(source.slice(1));
    if (!params.has("voice")) return source;
    params.delete("voice");
    const rest = params.toString();
    return rest ? `#${rest}` : "";
}

/** `https://host` → `wss://host/api/realtime?sessionId=…`, the endpoint the gateway serves. */
export function voiceSocketUrl(origin: string, sessionId: string): string | null {
    try {
        const url = new URL(origin);
        if (url.protocol !== "https:" && url.protocol !== "http:") return null;
        const protocol = url.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${url.host}/api/realtime?sessionId=${encodeURIComponent(sessionId)}`;
    } catch {
        return null;
    }
}

/**
 * Browsers cannot set `Authorization` on an upgrade, so the token is a secondary subprotocol.
 * The server selects only `qwaudio.gcp.v6`, so the credential never comes back to JavaScript.
 */
export function voiceProtocols(token: string): string[] {
    if (!isVoiceToken(token)) throw new TypeError("invalid voice invite token");
    return [VOICE_WS_PROTOCOL, `${BEARER_PREFIX}${token}`];
}

export type VoiceHello = {
    type: "session.hello";
    event_id: string;
    protocol: { min: string; max: string };
    client: { type: string; instance_id: string; label: string };
    capabilities: string[];
    connection: {
        voice_enabled: boolean;
        input_enabled: boolean;
        output_enabled: boolean;
        text_only: boolean;
    };
};

export function voiceHello(instanceId: string): VoiceHello {
    return {
        type: "session.hello",
        event_id: voiceEventId("client"),
        protocol: { min: VOICE_PROTOCOL_VERSION, max: VOICE_PROTOCOL_VERSION },
        client: { type: "web", instance_id: instanceId, label: "portfolio" },
        // `input.audio` is the one audio input this client owns; `input.text` says typed turns
        // ride the same session. `session.heartbeat` keeps the lease alive through quiet
        // stretches by answering the gateway's ping.
        capabilities: ["input.audio", "input.text", "session.heartbeat"],
        connection: {
            voice_enabled: true,
            input_enabled: true,
            output_enabled: true,
            text_only: false,
        },
    };
}

/** Every outgoing event needs a stable id; replay and correlation key off it. */
export function voiceEventId(origin = "client"): string {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return `evt_${origin}_${uuid.replaceAll("-", "")}`;
    return `evt_${origin}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * `voice.state` is the gateway's own vocabulary: `idle | listening | processing | speaking`.
 * The panel speaks four words, so `processing` becomes `thinking` and `idle` is a quiet moment
 * between turns. Anything else leaves the caption where it was.
 */
export function phaseForVoiceState(state: unknown): VoicePhase | null {
    switch (state) {
        case "idle":
        case "listening":
            return "listening";
        case "processing":
            return "thinking";
        case "speaking":
            return "speaking";
        default:
            return null;
    }
}

/** `299000` → `4:59`; never negative, never a long form. */
export function formatRemaining(ms: number): string {
    const total = Math.max(0, Math.ceil(Number(ms) / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Little-endian PCM16 base64, the one audio shape GCP 7.0 carries. */
export function pcm16Base64(samples: Float32Array): string {
    const bytes = new Uint8Array(samples.length * 2);
    const view = new DataView(bytes.buffer);
    for (let index = 0; index < samples.length; index += 1) {
        const clamped = Math.max(-1, Math.min(1, samples[index]));
        view.setInt16(index * 2, clamped * 0x7fff, true);
    }
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    return btoa(binary);
}

export function decodePcm16(base64: string): Float32Array {
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const view = new DataView(bytes.buffer);
    const output = new Float32Array(Math.floor(bytes.length / 2));
    for (let index = 0; index < output.length; index += 1) {
        output[index] = view.getInt16(index * 2, true) / 0x8000;
    }
    return output;
}

/**
 * The greeting the panel submits once, as a `text.message`, so the agent speaks first. The
 * gateway has no greeting event, so a text turn is the only door. The visitor never sees this
 * line: `applyVoiceLine` drops the user final that carries it verbatim.
 */
export const GREETING_INSTRUCTION =
    "Greet the visitor in one short spoken sentence, then say you can answer questions about Daniel's work.";

/**
 * A text turn. `RealtimeInputRuntime.submit` reads `event.text` and the turn joins the same
 * session context as the microphone, so the reply is spoken and transcribed like any other.
 * `text.message` reaches that method with no capability check (gateway
 * `realtime-session-runtime.mjs`, checked 2026-11-21); `input.text` in the handshake advertises
 * the turn rather than unlocking it.
 */
export function voiceTextMessage(text: string, eventId: string): object {
    return { type: "text.message", event_id: eventId, text };
}

/** One line of the conversation surface. `id` is the gateway's `turnId`, and nothing else. */
export type VoiceLine = {
    id: string;
    role: "user" | "assistant";
    text: string;
};

/** Only the tail is kept; a long session still scrolls, it just cannot grow without bound. */
const VOICE_LINE_CAP = 200;

function capped(lines: VoiceLine[]): VoiceLine[] {
    return lines.length > VOICE_LINE_CAP ? lines.slice(lines.length - VOICE_LINE_CAP) : lines;
}

/**
 * Fold one gateway transcript event into the panel's lines. Pure and presentation-only: it
 * never merges, reorders or invents lines across turns, and returns the same array reference
 * whenever the event changes nothing, so a reducer can bail out of a re-render.
 *
 * `turnId` plus role is the key. The gateway stamps the assistant's events with the same
 * `turnId` as the user turn they answer, so a bare `turnId` would let the reply overwrite the
 * visitor's own line; both roles keep their own line inside the turn, in arrival order.
 */
export function applyVoiceLine(
    lines: VoiceLine[],
    event: {
        type?: string;
        role?: string;
        content?: unknown;
        turnId?: unknown;
        replace?: boolean;
    }
): VoiceLine[] {
    const { type } = event;
    if (
        type !== "transcript.delta" &&
        type !== "transcript.final" &&
        type !== "transcript.discard"
    ) {
        return lines;
    }

    const turnId = event.turnId;
    if (typeof turnId !== "string" || !turnId) return lines;

    // A role is never guessed: only these two words are in the contract.
    const role = event.role;
    if (role !== "user" && role !== "assistant") return lines;

    const key = `${turnId}:${role}`;
    const index = lines.findIndex((line) => line.id === key);

    if (type === "transcript.discard") {
        if (index === -1) return lines;
        return [...lines.slice(0, index), ...lines.slice(index + 1)];
    }

    const { content } = event;
    if (typeof content !== "string" || !content) return lines;

    // The instruction that makes the agent speak first is not something the visitor said.
    if (type === "transcript.final" && role === "user" && content === GREETING_INSTRUCTION) {
        if (index === -1) return lines;
        return [...lines.slice(0, index), ...lines.slice(index + 1)];
    }

    if (type === "transcript.final") {
        if (index === -1) return capped([...lines, { id: key, role, text: content }]);
        const current = lines[index];
        if (current.text === content && current.role === role) return lines;
        const next = lines.slice();
        next[index] = { id: key, role, text: content };
        return next;
    }

    // A delta grows the turn's line: replace in place when the gateway re-sends the partial,
    // append when it sends only the new words. The line keeps the role it was created with.
    if (index === -1) return capped([...lines, { id: key, role, text: content }]);
    const current = lines[index];
    const text = event.replace === true ? content : current.text + content;
    if (text === current.text) return lines;
    const next = lines.slice();
    next[index] = { id: key, role: current.role, text };
    return next;
}

export type StreamingResampler = {
    process(input: Float32Array, from: number, to: number): Float32Array;
    flush(): Float32Array;
    reset(): void;
};

/**
 * Linear resampling that keeps its interpolation phase between chunks. Microphone frames arrive
 * at the context rate (often 48 kHz) and the gateway wants 16 kHz; a per-chunk resample would
 * click at every boundary. Ported from the gateway's own `createStreamingResampler`.
 */
export function createStreamingResampler(): StreamingResampler {
    let ratio = 0;
    let pending = new Float32Array(0);
    let position = 0;

    const reset = () => {
        ratio = 0;
        pending = new Float32Array(0);
        position = 0;
    };

    return {
        process(input, from, to) {
            if (!input.length) return new Float32Array(0);
            if (!(from > 0) || !(to > 0)) throw new RangeError("sample rates must be positive");

            const next = from / to;
            if (next !== ratio) {
                reset();
                ratio = next;
            }
            if (ratio === 1) {
                pending = new Float32Array(0);
                position = 0;
                return input;
            }

            const merged = new Float32Array(pending.length + input.length);
            merged.set(pending);
            merged.set(input, pending.length);
            pending = merged;

            const output: number[] = [];
            while (position + 1 < pending.length) {
                const before = Math.floor(position);
                const fraction = position - before;
                output.push(pending[before] * (1 - fraction) + pending[before + 1] * fraction);
                position += ratio;
            }

            const consumed = Math.floor(position);
            if (consumed > 0) {
                pending = pending.slice(consumed);
                position -= consumed;
            }
            return Float32Array.from(output);
        },
        flush() {
            if (!ratio) return new Float32Array(0);
            const tail =
                position < pending.length
                    ? Float32Array.of(pending[Math.floor(position)])
                    : new Float32Array(0);
            reset();
            return tail;
        },
        reset,
    };
}

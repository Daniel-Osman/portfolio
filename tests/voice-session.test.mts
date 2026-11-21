/**
 * The session's lifecycle, without a browser: a fake socket and a fake AudioContext stand in for
 * the real ones. The cases are the ones that cannot be watched by hand — a stop during
 * `connecting`, an output that never opens, and a delta that arrives after playback failed.
 */

import assert from "node:assert/strict";
import test from "node:test";

import { createVoiceSession, type VoiceState } from "../src/app/components/voice/voice-session.ts";
import { VOICE_OUTPUT_TIMEOUT_MS } from "../src/app/components/voice/voice-audio.ts";
import { GREETING_INSTRUCTION } from "../src/app/components/voice/voice-protocol.ts";

const TOKEN = "aB3_x-9zLmQ7pR2sT5vW8yK1nH4jG6dF";
const ORIGIN = "https://voice.example";

type SentEvent = Record<string, unknown>;

class FakeSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;

    readyState = FakeSocket.CONNECTING;
    readonly sent: SentEvent[] = [];
    closed = false;
    readonly url: string;
    readonly protocols: string[];
    onopen: (() => void) | null = null;
    onmessage: ((message: { data: string }) => void) | null = null;
    onclose: ((event: { code: number }) => void) | null = null;
    onerror: (() => void) | null = null;

    constructor(url: string, protocols: string[]) {
        this.url = url;
        this.protocols = protocols;
    }

    /** The upgrade landed. Called by hand so a test can order it after a stop. */
    accept() {
        this.readyState = FakeSocket.OPEN;
        this.onopen?.();
    }

    send(raw: string) {
        this.sent.push(JSON.parse(String(raw)) as SentEvent);
    }

    receive(event: SentEvent) {
        this.onmessage?.({ data: JSON.stringify(event) });
    }

    close() {
        this.closed = true;
        this.readyState = FakeSocket.CLOSED;
        this.onclose?.({ code: 1000 });
    }
}

type AudioMode = "pending" | "reject" | "throw" | "graph" | "deferred";

type DeferredCall = {
    resolve: () => void;
    reject: (error: unknown) => void;
};

/** Installs the fake globals the session reaches for and returns what the test needs to look at. */
function install(mode: AudioMode) {
    const sockets: FakeSocket[] = [];
    const resumeCalls = { count: 0 };
    const tracks = { stopped: 0 };
    const media = { calls: [] as DeferredCall[], streams: 0 };

    class Socket extends FakeSocket {
        constructor(url: string, protocols: string[]) {
            super(url, protocols);
            sockets.push(this);
        }
    }

    class FakeAudioContext {
        state = mode === "graph" || mode === "deferred" ? "running" : "suspended";
        destination = {};
        audioWorklet = { addModule: () => Promise.resolve() };

        resume() {
            resumeCalls.count += 1;
            if (mode === "reject") return Promise.reject(new Error("blocked by policy"));
            if (mode === "graph" || mode === "deferred") return Promise.resolve();
            return new Promise<void>(() => {});
        }

        createMediaStreamSource() {
            if (mode === "graph") throw new Error("the audio graph refused the stream");
            return { connect: () => {}, disconnect: () => {} };
        }

        close() {
            return Promise.resolve();
        }
    }

    class ThrowingAudioContext extends FakeAudioContext {
        constructor() {
            super();
            throw new Error("audio is unavailable");
        }
    }

    class FakeWorkletNode {
        port = { onmessage: null as ((event: MessageEvent) => void) | null, close: () => {} };
        connect() {}
        disconnect() {}
    }

    Object.defineProperty(globalThis, "WebSocket", {
        value: Socket,
        configurable: true,
        writable: true,
    });
    Object.defineProperty(globalThis, "AudioContext", {
        value: mode === "throw" ? ThrowingAudioContext : FakeAudioContext,
        configurable: true,
        writable: true,
    });
    if (mode === "graph" || mode === "deferred") {
        const getUserMedia = () => {
            if (mode === "graph") {
                return Promise.resolve({
                    getTracks: () => [
                        {
                            stop: () => {
                                tracks.stopped += 1;
                            },
                        },
                    ],
                });
            }
            return new Promise((resolve, reject) => {
                media.calls.push({
                    resolve: () => {
                        media.streams += 1;
                        resolve({
                            getTracks: () => [
                                {
                                    stop: () => {
                                        tracks.stopped += 1;
                                    },
                                },
                            ],
                        });
                    },
                    reject,
                });
            });
        };
        Object.defineProperty(globalThis, "navigator", {
            value: { mediaDevices: { getUserMedia } },
            configurable: true,
            writable: true,
        });
    }
    if (mode === "deferred") {
        Object.defineProperty(globalThis, "AudioWorkletNode", {
            value: FakeWorkletNode,
            configurable: true,
            writable: true,
        });
    }
    // `voice.ready` starts the cap timer through `window`; Node has no window.
    if (!("window" in globalThis)) {
        Object.defineProperty(globalThis, "window", {
            value: { setInterval, clearInterval },
            configurable: true,
            writable: true,
        });
    }

    return { sockets, resumeCalls, tracks, media };
}

function openSession() {
    const states: VoiceState[] = [];
    const endings: { reason: string; message: string }[] = [];
    const session = createVoiceSession({
        origin: ORIGIN,
        token: TOKEN,
        onChange(state) {
            states.push(state);
        },
        onEnded(reason, message) {
            endings.push({ reason, message });
        },
        onLine() {},
    });
    return { session, states, endings };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test("stopping while the socket still connects closes it and never sends hello", async () => {
    const { sockets } = install("pending");
    const { session, endings } = openSession();

    await session.start();
    assert.equal(sockets.length, 1);
    const socket = sockets[0];

    session.stop("user");
    assert.equal(socket.closed, true);

    // The upgrade lands after the stop: the guard keeps hello off the wire.
    socket.accept();
    assert.deepEqual(socket.sent, []);
    assert.deepEqual(
        endings.map((ending) => ending.reason),
        ["user"]
    );
});

test("a blocked output never delays hello, the greeting or a typed turn", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const { sockets } = install("pending");
    const { session } = openSession();

    await session.start();
    assert.equal(sockets.length, 1);
    const socket = sockets[0];

    socket.accept();
    assert.equal(socket.sent[0]?.type, "session.hello");

    socket.receive({ type: "session.ready", event_id: "s1" });
    socket.receive({ type: "voice.ready", event_id: "v1", inputSampleRate: 16000 });

    const greeting = socket.sent.filter((event) => event.type === "text.message");
    assert.equal(greeting.length, 1);
    assert.equal(greeting[0]?.text, GREETING_INSTRUCTION);

    session.sendText("what does daniel build?");
    const typed = socket.sent.at(-1);
    assert.equal(typed?.type, "text.message");
    assert.equal(typed?.text, "what does daniel build?");
    assert.equal(sockets.length, 1);

    session.stop("user");
});

test("an output that never opens records one line after the bound", async (t) => {
    t.mock.timers.enable({ apis: ["setTimeout"] });
    const { sockets } = install("pending");
    const { session } = openSession();

    await session.start();
    t.mock.timers.tick(VOICE_OUTPUT_TIMEOUT_MS);
    await flush();

    assert.equal(session.state.status, "active");
    assert.equal(session.state.soundOn, false);
    assert.match(session.state.notice ?? "", /playback is unavailable/);

    const socket = sockets[0];
    socket.accept();
    socket.receive({ type: "session.ready", event_id: "s1" });
    socket.receive({ type: "voice.ready", event_id: "v1", inputSampleRate: 16000 });
    session.sendText("still here?");
    assert.equal(socket.sent.at(-1)?.text, "still here?");

    session.stop("user");
});

test("a refused output is a line, not an ending, and a late delta never retries resume", async () => {
    const { sockets, resumeCalls } = install("reject");
    const { session } = openSession();

    await session.start();
    await flush();

    assert.equal(session.state.status, "active");
    assert.equal(session.state.soundOn, false);
    assert.match(session.state.notice ?? "", /playback is unavailable/);
    assert.equal(resumeCalls.count, 1);

    const socket = sockets[0];
    socket.accept();
    socket.receive({ type: "voice.ready", event_id: "v1", inputSampleRate: 16000 });
    socket.receive({ type: "audio.delta", event_id: "a1", audio: "AAAA", sampleRate: 24000 });
    assert.equal(resumeCalls.count, 1);

    session.sendText("text still works");
    assert.equal(socket.sent.at(-1)?.text, "text still works");

    session.stop("user");
});

test("an output that cannot even be created leaves the socket and typing alive", async () => {
    const { sockets } = install("throw");
    const { session } = openSession();

    await session.start();
    await flush();

    assert.equal(session.state.status, "active");
    assert.equal(
        session.state.notice,
        "playback is unavailable; the transcript and typed replies still work."
    );

    const socket = sockets[0];
    socket.accept();
    assert.equal(socket.sent[0]?.type, "session.hello");

    session.stop("user");
});

test("a graph failure after permission stops the tracks and reports the mic off", async () => {
    const { sockets, tracks } = install("graph");
    const { session } = openSession();

    await session.start();
    const socket = sockets[0];
    socket.accept();
    socket.receive({ type: "session.ready", event_id: "s1" });
    socket.receive({ type: "voice.ready", event_id: "v1", inputSampleRate: 16000 });

    await session.setMic(true);

    assert.equal(tracks.stopped, 1);
    assert.equal(session.state.micOn, false);
    assert.equal(session.state.notice, "the microphone could not start; you can still type.");
    assert.equal(session.state.status, "active");
    assert.equal(socket.readyState, FakeSocket.OPEN);
    assert.equal(socket.closed, false);

    session.stop("user");
});

test("a superseded mic attempt cannot overwrite the current one", async () => {
    const { sockets, media, tracks } = install("deferred");
    const { session } = openSession();

    await session.start();
    const socket = sockets[0];
    socket.accept();
    socket.receive({ type: "session.ready", event_id: "s1" });
    socket.receive({ type: "voice.ready", event_id: "v1", inputSampleRate: 16000 });

    // Attempt A asks for the microphone and stays pending at the permission prompt.
    const attemptA = session.setMic(true);
    await flush();
    assert.equal(media.calls.length, 1);

    // Mute, then a second unmute: attempt B becomes the current one and its stream is live.
    await session.setMic(false);
    const attemptB = session.setMic(true);
    await flush();
    assert.equal(media.calls.length, 2);
    media.calls[1].resolve();
    await attemptB;
    assert.equal(session.state.micOn, true);
    assert.equal(media.streams, 1);
    assert.equal(socket.sent.filter((event) => event.type === "mute").length, 1);

    // A finally refuses. It is no longer current, so it changes nothing and stops no track.
    media.calls[0].reject(Object.assign(new Error("denied"), { name: "NotAllowedError" }));
    await attemptA;

    assert.equal(session.state.micOn, true);
    assert.equal(session.state.notice, null);
    assert.equal(tracks.stopped, 0);
    assert.equal(socket.sent.filter((event) => event.type === "mute").length, 1);
    assert.equal(socket.sent.filter((event) => event.type === "unmute").length, 1);

    session.stop("user");
});

test("a late refusal from an older attempt cannot deny the newer one", async () => {
    const { sockets, media, tracks } = install("deferred");
    const { session } = openSession();

    await session.start();
    const socket = sockets[0];
    socket.accept();
    socket.receive({ type: "session.ready", event_id: "s1" });
    socket.receive({ type: "voice.ready", event_id: "v1", inputSampleRate: 16000 });

    // A and B both wait at the permission prompt; A was left behind by the mute.
    const attemptA = session.setMic(true);
    await flush();
    assert.equal(media.calls.length, 1);
    await session.setMic(false);
    const attemptB = session.setMic(true);
    await flush();
    assert.equal(media.calls.length, 2);

    // The older attempt is refused first: it owns nothing and says nothing.
    media.calls[0].reject(Object.assign(new Error("denied"), { name: "NotAllowedError" }));
    await attemptA;
    assert.equal(session.state.micOn, false);
    assert.equal(session.state.soundOn, true);
    assert.equal(session.state.notice, null);

    // The current attempt then succeeds: one unmute, its track open, the earlier line absent.
    media.calls[1].resolve();
    await attemptB;
    assert.equal(session.state.micOn, true);
    assert.equal(session.state.soundOn, true);
    assert.equal(session.state.notice, null);
    assert.equal(media.streams, 1);
    assert.equal(tracks.stopped, 0);
    assert.equal(socket.sent.filter((event) => event.type === "unmute").length, 1);

    session.stop("user");
});

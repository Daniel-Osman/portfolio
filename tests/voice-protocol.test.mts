import assert from "node:assert/strict";
import test from "node:test";

import {
    GREETING_INSTRUCTION,
    VOICE_PROTOCOL_VERSION,
    VOICE_WS_PROTOCOL,
    applyVoiceLine,
    createStreamingResampler,
    decodePcm16,
    formatRemaining,
    fragmentWithoutVoice,
    isVoiceToken,
    pcm16Base64,
    phaseForVoiceState,
    tokenFromFragment,
    voiceEventId,
    voiceHello,
    voiceProtocols,
    voiceSocketUrl,
    voiceTextMessage,
} from "../src/app/components/voice/voice-protocol.ts";
import type { VoiceLine } from "../src/app/components/voice/voice-protocol.ts";

const TOKEN = "aB3_x-9zLmQ7pR2sT5vW8yK1nH4jG6dF";

test("a voice token is 24 to 256 URL-safe characters", () => {
    assert.equal(isVoiceToken(TOKEN), true);
    assert.equal(isVoiceToken("a".repeat(24)), true);
    assert.equal(isVoiceToken("a".repeat(256)), true);
    assert.equal(isVoiceToken("a".repeat(23)), false);
    assert.equal(isVoiceToken("a".repeat(257)), false);
    assert.equal(isVoiceToken(`${TOKEN} `), false);
    assert.equal(isVoiceToken(`${TOKEN}!`), false);
    assert.equal(isVoiceToken(`qwaudio.bearer.${TOKEN}`), false);
    assert.equal(isVoiceToken(undefined), false);
});

test("the invite token is read from the fragment alone", () => {
    assert.equal(tokenFromFragment(`#voice=${TOKEN}`), TOKEN);
    assert.equal(tokenFromFragment(`#voice=${TOKEN}&tab=1`), TOKEN);
    assert.equal(tokenFromFragment("#voice=too-short"), null);
    assert.equal(tokenFromFragment("#voice="), null);
    assert.equal(tokenFromFragment("#contact"), null);
    assert.equal(tokenFromFragment(""), null);
    assert.equal(tokenFromFragment(`?voice=${TOKEN}`), null);
});

test("stripping the token leaves any other fragment untouched", () => {
    assert.equal(fragmentWithoutVoice(`#voice=${TOKEN}`), "");
    assert.equal(fragmentWithoutVoice(`#voice=${TOKEN}&x=1`), "#x=1");
    assert.equal(fragmentWithoutVoice("#contact"), "#contact");
    assert.equal(fragmentWithoutVoice(""), "");
});

test("the socket address is the gateway origin plus the realtime path", () => {
    assert.equal(
        voiceSocketUrl("https://voice.danielosman.com", "session_1"),
        "wss://voice.danielosman.com/api/realtime?sessionId=session_1"
    );
    assert.equal(
        voiceSocketUrl("http://127.0.0.1:3101", "session_1"),
        "ws://127.0.0.1:3101/api/realtime?sessionId=session_1"
    );
    assert.equal(
        voiceSocketUrl("https://voice.danielosman.com/some/path", "a b"),
        "wss://voice.danielosman.com/api/realtime?sessionId=a%20b"
    );
    assert.equal(voiceSocketUrl("not a url", "session_1"), null);
    assert.equal(voiceSocketUrl("ftp://voice.danielosman.com", "session_1"), null);
});

test("the token rides in a secondary subprotocol and nothing else", () => {
    assert.deepEqual(voiceProtocols(TOKEN), [VOICE_WS_PROTOCOL, `qwaudio.bearer.${TOKEN}`]);
    assert.throws(() => voiceProtocols("short"), TypeError);
});

test("the handshake advertises audio input, text input and a heartbeat", () => {
    const hello = voiceHello("instance_1");
    assert.equal(hello.type, "session.hello");
    assert.match(hello.event_id, /^evt_client_/);
    assert.deepEqual(hello.protocol, {
        min: VOICE_PROTOCOL_VERSION,
        max: VOICE_PROTOCOL_VERSION,
    });
    assert.deepEqual(hello.client, {
        type: "web",
        instance_id: "instance_1",
        label: "portfolio",
    });
    assert.deepEqual(hello.capabilities, ["input.audio", "input.text", "session.heartbeat"]);
    assert.deepEqual(hello.connection, {
        voice_enabled: true,
        input_enabled: true,
        output_enabled: true,
        text_only: false,
    });
});

test("event ids are unique and prefixed by origin", () => {
    const first = voiceEventId("session");
    const second = voiceEventId("session");
    assert.match(first, /^evt_session_/);
    assert.notEqual(first, second);
});

test("the gateway's four voice states fold into the panel's three", () => {
    assert.equal(phaseForVoiceState("idle"), "listening");
    assert.equal(phaseForVoiceState("listening"), "listening");
    assert.equal(phaseForVoiceState("processing"), "thinking");
    assert.equal(phaseForVoiceState("speaking"), "speaking");
    assert.equal(phaseForVoiceState("connected"), null);
    assert.equal(phaseForVoiceState(undefined), null);
});

test("remaining time reads as minutes and seconds and never goes negative", () => {
    assert.equal(formatRemaining(299_000), "4:59");
    assert.equal(formatRemaining(300_000), "5:00");
    assert.equal(formatRemaining(65_000), "1:05");
    assert.equal(formatRemaining(999), "0:01");
    assert.equal(formatRemaining(0), "0:00");
    assert.equal(formatRemaining(-500), "0:00");
});

test("PCM16 survives the round trip and clips past full scale", () => {
    const samples = Float32Array.from([0, 0.5, -0.5, 0.999, -0.999, 1, -1, 2, -2]);
    const decoded = decodePcm16(pcm16Base64(samples));
    assert.equal(decoded.length, samples.length);
    for (let index = 0; index < samples.length; index += 1) {
        assert.ok(
            Math.abs(decoded[index] - Math.max(-1, Math.min(1, samples[index]))) <= 1 / 16_000,
            `sample ${index} drifted: ${decoded[index]}`
        );
    }
});

test("the resampler converts 48 kHz to 16 kHz and keeps its phase across chunks", () => {
    const ramp = Float32Array.from({ length: 4800 }, (_, index) => index / 4800);

    const oneShot = createStreamingResampler();
    const whole = oneShot.process(ramp, 48_000, 16_000);
    const wholeTail = oneShot.flush();
    assert.ok(Math.abs(whole.length + wholeTail.length - 1600) <= 1, `got ${whole.length}`);

    const chunked = createStreamingResampler();
    const first = chunked.process(ramp.subarray(0, 2400), 48_000, 16_000);
    const second = chunked.process(ramp.subarray(2400), 48_000, 16_000);
    const tail = chunked.flush();
    assert.ok(Math.abs(first.length + second.length + tail.length - 1600) <= 1);

    const joined = Float32Array.from([...first, ...second, ...tail]);
    assert.ok(joined[0] < joined[joined.length - 1], "the ramp must keep rising");
    assert.ok(joined.length > 0 && joined[joined.length - 1] < 1);
});

test("matching rates pass through untouched, and a reset forgets the stream", () => {
    const resampler = createStreamingResampler();
    const input = Float32Array.from([0.5, 0.25, 0.75]);
    assert.deepEqual(Array.from(resampler.process(input, 16_000, 16_000)), [0.5, 0.25, 0.75]);
    assert.equal(resampler.flush().length, 0);
    assert.throws(() => resampler.process(input, 0, 16_000), RangeError);
});

const GREETING_FINAL = {
    type: "transcript.final",
    role: "user",
    content: GREETING_INSTRUCTION,
    turnId: "voice-1-1",
};

test("the greeting instruction never shows as a user line", () => {
    const empty: VoiceLine[] = [];
    assert.equal(applyVoiceLine(empty, GREETING_FINAL), empty);

    const partial: VoiceLine[] = [{ id: "voice-1-1:user", role: "user", text: "Greet the vis" }];
    assert.deepEqual(applyVoiceLine(partial, GREETING_FINAL), []);

    // The drop is exact and user-only: any other text, or any other role, is a real line.
    assert.equal(
        applyVoiceLine([], { ...GREETING_FINAL, content: `${GREETING_INSTRUCTION} ` }).length,
        1
    );
    assert.equal(applyVoiceLine([], { ...GREETING_FINAL, role: "assistant" }).length, 1);
});

test("a replace delta rewrites the turn's line where it sits", () => {
    const first = applyVoiceLine([], {
        type: "transcript.delta",
        role: "user",
        turnId: "t1",
        content: "hel",
        replace: true,
    });
    assert.deepEqual(first, [{ id: "t1:user", role: "user", text: "hel" }]);

    const second = applyVoiceLine(first, {
        type: "transcript.delta",
        role: "user",
        turnId: "t1",
        content: "hello there",
        replace: true,
    });
    assert.equal(second.length, 1);
    assert.equal(second[0].text, "hello there");

    // Same words again: nothing changed, so the same array comes back.
    assert.equal(
        applyVoiceLine(second, {
            type: "transcript.delta",
            role: "user",
            turnId: "t1",
            content: "hello there",
            replace: true,
        }),
        second
    );
});

test("a delta without replace grows the one line for that turn", () => {
    let lines = applyVoiceLine([], {
        type: "transcript.delta",
        role: "user",
        turnId: "t1",
        content: "hello ",
    });
    lines = applyVoiceLine(lines, {
        type: "transcript.delta",
        role: "user",
        turnId: "t1",
        content: "there",
    });
    assert.equal(lines.length, 1);
    assert.equal(lines[0].text, "hello there");
});

test("assistant deltas append and separate turns stay apart", () => {
    let lines = applyVoiceLine([], {
        type: "transcript.delta",
        role: "assistant",
        turnId: "t2",
        content: "hel",
    });
    lines = applyVoiceLine(lines, {
        type: "transcript.delta",
        role: "assistant",
        turnId: "t2",
        content: "lo",
    });
    assert.deepEqual(lines, [{ id: "t2:assistant", role: "assistant", text: "hello" }]);

    const next = applyVoiceLine(lines, {
        type: "transcript.delta",
        role: "user",
        turnId: "t3",
        content: "and another turn",
    });
    assert.equal(next.length, 2);
    assert.deepEqual(
        next.map((line) => line.id),
        ["t2:assistant", "t3:user"]
    );
    assert.equal(lines.length, 1);
});

test("one turn holds both roles, and neither final overwrites the other", () => {
    let lines = applyVoiceLine([], {
        type: "transcript.final",
        role: "user",
        turnId: "t4",
        content: "how do i reach you?",
    });
    lines = applyVoiceLine(lines, {
        type: "transcript.final",
        role: "assistant",
        turnId: "t4",
        content: "the contact form",
    });
    assert.deepEqual(lines, [
        { id: "t4:user", role: "user", text: "how do i reach you?" },
        { id: "t4:assistant", role: "assistant", text: "the contact form" },
    ]);

    // Each final revisits only its own line.
    const userAgain = applyVoiceLine(lines, {
        type: "transcript.final",
        role: "user",
        turnId: "t4",
        content: "how do i reach you, please?",
    });
    assert.equal(userAgain.length, 2);
    assert.equal(userAgain[0].text, "how do i reach you, please?");
    assert.equal(userAgain[1].text, "the contact form");
});

test("a replace delta refreshes the user line while an assistant delta appends to its own", () => {
    let lines = applyVoiceLine([], {
        type: "transcript.delta",
        role: "user",
        turnId: "t5",
        content: "how do i",
        replace: true,
    });
    lines = applyVoiceLine(lines, {
        type: "transcript.delta",
        role: "assistant",
        turnId: "t5",
        content: "the contact form",
    });
    lines = applyVoiceLine(lines, {
        type: "transcript.delta",
        role: "user",
        turnId: "t5",
        content: "how do i reach you?",
        replace: true,
    });
    lines = applyVoiceLine(lines, {
        type: "transcript.delta",
        role: "assistant",
        turnId: "t5",
        content: ", or the mailto link",
    });
    assert.deepEqual(lines, [
        { id: "t5:user", role: "user", text: "how do i reach you?" },
        { id: "t5:assistant", role: "assistant", text: "the contact form, or the mailto link" },
    ]);
});

test("a final sets the turn's line, creates it when absent, and removes it when empty", () => {
    const partial: VoiceLine[] = [{ id: "t1:user", role: "user", text: "how do i" }];
    assert.deepEqual(
        applyVoiceLine(partial, {
            type: "transcript.final",
            role: "user",
            turnId: "t1",
            content: "how do i reach you?",
        }),
        [{ id: "t1:user", role: "user", text: "how do i reach you?" }]
    );

    assert.deepEqual(
        applyVoiceLine([], {
            type: "transcript.final",
            role: "assistant",
            turnId: "t9",
            content: "the contact form",
        }),
        [{ id: "t9:assistant", role: "assistant", text: "the contact form" }]
    );

    assert.equal(
        applyVoiceLine(partial, {
            type: "transcript.final",
            role: "user",
            turnId: "t1",
            content: "how do i",
        }),
        partial
    );
});

test("discard removes that turn's line and leaves its neighbours", () => {
    const lines: VoiceLine[] = [
        { id: "t1:user", role: "user", text: "one" },
        { id: "t2:user", role: "user", text: "two" },
        { id: "t3:assistant", role: "assistant", text: "three" },
    ];
    assert.deepEqual(
        applyVoiceLine(lines, { type: "transcript.discard", role: "user", turnId: "t2" }),
        [
            { id: "t1:user", role: "user", text: "one" },
            { id: "t3:assistant", role: "assistant", text: "three" },
        ]
    );
    assert.equal(
        applyVoiceLine(lines, { type: "transcript.discard", role: "user", turnId: "nope" }),
        lines
    );
});

test("an event that changes nothing returns the array itself", () => {
    const lines: VoiceLine[] = [
        { id: "t1:user", role: "user", text: "one" },
        { id: "t2:assistant", role: "assistant", text: "two" },
    ];
    const noops = [
        { type: "transcript.nope", role: "user", content: "x", turnId: "t3" },
        { type: "transcript.delta", role: "user", content: "x" },
        { type: "transcript.delta", role: "user", content: "x", turnId: "" },
        { type: "transcript.delta", role: "user", content: "x", turnId: 42 },
        { type: "transcript.delta", role: undefined, content: "x", turnId: "t3" },
        { type: "transcript.delta", role: "system", content: "x", turnId: "t3" },
        { type: "transcript.final", content: "x", turnId: "t3" },
        { type: "transcript.delta", role: "assistant", content: "", turnId: "t3" },
        { type: "transcript.final", role: "assistant", content: undefined, turnId: "t3" },
    ];
    for (const event of noops) {
        assert.equal(applyVoiceLine(lines, event), lines, JSON.stringify(event));
    }
});

test("only the last 200 lines survive", () => {
    let lines: VoiceLine[] = [];
    for (let index = 0; index < 205; index += 1) {
        lines = applyVoiceLine(lines, {
            type: "transcript.final",
            role: "user",
            turnId: `t${index}`,
            content: `line ${index}`,
        });
    }
    assert.equal(lines.length, 200);
    assert.equal(lines[0].id, "t5:user");
    assert.equal(lines[199].id, "t204:user");
});

test("a returned array never mutates the one passed in", () => {
    const input: VoiceLine[] = [{ id: "t1:user", role: "user", text: "one" }];
    const snapshot = structuredClone(input);
    const next = applyVoiceLine(input, {
        type: "transcript.delta",
        role: "user",
        turnId: "t1",
        content: "!",
    });
    assert.notEqual(next, input);
    assert.equal(next[0].text, "one!");
    assert.deepEqual(input, snapshot);
});

test("the greeting turn is one text message and says what it is", () => {
    assert.deepEqual(voiceTextMessage("hello", "evt_1"), {
        type: "text.message",
        event_id: "evt_1",
        text: "hello",
    });
    assert.equal(
        GREETING_INSTRUCTION,
        "Greet the visitor in one short spoken sentence, then say you can answer questions about Daniel's work."
    );
});

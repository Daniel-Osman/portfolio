import assert from "node:assert/strict";
import test from "node:test";

import {
    VOICE_PROTOCOL_VERSION,
    VOICE_WS_PROTOCOL,
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
} from "../src/app/components/voice/voice-protocol.ts";

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

test("the handshake asks for audio input and a heartbeat, and nothing more", () => {
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
    assert.deepEqual(hello.capabilities, ["input.audio", "session.heartbeat"]);
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

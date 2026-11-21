/**
 * The browser half of the voice client: one AudioContext for output and input, the microphone
 * through an AudioWorklet, and returned PCM scheduled on a timeline. The output opens once and
 * lives as long as the session; the microphone is a toggle that can stop while playback plays
 * on. No protocol knowledge beyond a Float32Array; `voice-session.ts` does the wiring.
 */

/** Served from `public/` so it stays a same-origin script the worklet can load directly. */
const MIC_WORKLET_URL = "/voice/mic-worklet.js";
const WORKLET_NAME = "portfolio-microphone";

/** Enough headroom for a burst of deltas to land before the first buffer is due. */
const PLAYBACK_LEAD_SECONDS = 0.1;

/** Live audio is dropped rather than queued: a late chunk is worse than a missing one. */
export const VOICE_SEND_HIGH_WATER_BYTES = 64 * 1024;

/**
 * A suspended context that never resumes must not stall the session or leave the panel silent
 * about it. The bound is generous for a real device and short enough to say something useful.
 */
export const VOICE_OUTPUT_TIMEOUT_MS = 3000;

type Samples = (samples: Float32Array) => void;

/** Rejects if `promise` does not settle in time; the losing timer is always cleared. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("audio output did not start")), ms);
        // A pending timer must not keep a Node test runner alive; browsers return a number.
        const unref = (timer as unknown as { unref?: () => void }).unref;
        if (typeof unref === "function") unref.call(timer);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error: unknown) => {
                clearTimeout(timer);
                reject(error);
            }
        );
    });
}

export type VoiceAudio = {
    /** The capture rate; the resampler converts from here to what the gateway asked for. */
    readonly sampleRate: number;
    /** Creates or resumes the one AudioContext. Call it in the click that starts a session.
     *  Rejects when it does not reach `running` within `VOICE_OUTPUT_TIMEOUT_MS`. */
    openOutput(): Promise<void>;
    /** Captures until `stopMicrophone`; the context must already be open. */
    startMicrophone(onSamples: Samples): Promise<void>;
    /** Gives back the microphone only: the context and any scheduled playback stay alive. */
    stopMicrophone(): void;
    /** Echoed audio as a switch; `play` drops deltas while it is off. */
    setOutputEnabled(on: boolean): void;
    play(samples: Float32Array, sampleRate: number): void;
    stopPlayback(): void;
    close(): void;
};

export function createVoiceAudio(): VoiceAudio {
    let context: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let node: AudioWorkletNode | null = null;
    let workletLoaded = false;
    let outputEnabled = true;
    /** True only once the context is running, so a delta before that is dropped, not queued. */
    let ready = false;
    /** Bumped by every stop: a start that awaited past the bump releases its own stream. */
    let micEpoch = 0;
    let cursor = 0;
    let playing: AudioBufferSourceNode[] = [];

    const stopPlayback = () => {
        for (const item of playing) {
            try {
                item.stop();
            } catch {
                // Already ended or never started.
            }
        }
        playing = [];
        cursor = 0;
    };

    const stopMicrophone = () => {
        // Cancels a start still waiting on the permission prompt.
        micEpoch += 1;
        if (node) {
            node.port.onmessage = null;
            node.port.close();
            node.disconnect();
            node = null;
        }
        source?.disconnect();
        source = null;
        stream?.getTracks().forEach((track) => track.stop());
        stream = null;
    };

    return {
        get sampleRate() {
            return context?.sampleRate ?? 48_000;
        },

        async openOutput() {
            const ctx = context ?? new AudioContext();
            context = ctx;
            if (ctx.state === "suspended") {
                await withTimeout(ctx.resume(), VOICE_OUTPUT_TIMEOUT_MS);
            }
            ready = true;
        },

        async startMicrophone(onSamples) {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw Object.assign(new Error("this browser cannot capture audio"), {
                    name: "NotSupportedError",
                });
            }

            const ctx = context;
            // The session opens the output first; a missing context is a wiring bug.
            if (!ctx) throw new Error("audio output is not open");
            if (stream) return;

            const epoch = ++micEpoch;
            if (ctx.state === "suspended") await ctx.resume();
            if (epoch !== micEpoch) return;

            // The module registers once per context, so a mute cycle does not fetch it again.
            if (!workletLoaded) {
                await ctx.audioWorklet.addModule(MIC_WORKLET_URL);
                workletLoaded = true;
            }
            if (epoch !== micEpoch) return;

            const media = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            // Stopped while the prompt was open: release the stream instead of wiring it.
            if (epoch !== micEpoch) {
                media.getTracks().forEach((track) => track.stop());
                return;
            }
            stream = media;

            // Permission can be granted and the graph still refuse to build. That is not a
            // microphone the session can claim, so the stream goes and the error goes up.
            try {
                source = ctx.createMediaStreamSource(media);
                node = new AudioWorkletNode(ctx, WORKLET_NAME, {
                    numberOfInputs: 1,
                    numberOfOutputs: 1,
                    outputChannelCount: [1],
                });
                node.port.onmessage = (event: MessageEvent) => {
                    const data = event.data as { type?: string; samples?: ArrayBuffer } | null;
                    if (data?.type !== "samples" || !data.samples) return;
                    onSamples(new Float32Array(data.samples));
                };

                source.connect(node);
                // Pulled through the graph, and silenced by the processor itself.
                node.connect(ctx.destination);
            } catch (error) {
                stopMicrophone();
                throw error;
            }
        },

        stopMicrophone,

        setOutputEnabled(on) {
            if (outputEnabled === on) return;
            outputEnabled = on;
            // Off only silences the future: this also clears anything already scheduled.
            if (!on) stopPlayback();
        },

        play(samples, sampleRate) {
            // Before the output is ready, a delta is dropped; nothing retries `resume()` here.
            if (!outputEnabled || !ready) return;
            const ctx = context;
            if (!ctx || !samples.length) return;

            try {
                const buffer = ctx.createBuffer(1, samples.length, sampleRate);
                buffer.getChannelData(0).set(samples);
                const item = ctx.createBufferSource();
                item.buffer = buffer;
                item.connect(ctx.destination);
                const start = Math.max(ctx.currentTime + PLAYBACK_LEAD_SECONDS, cursor);
                cursor = start + buffer.duration;
                item.onended = () => {
                    playing = playing.filter((entry) => entry !== item);
                };
                playing.push(item);
                item.start(start);
            } catch {
                // A refused buffer must not end the session; the next delta is scheduled anew.
            }
        },

        stopPlayback,

        close() {
            // Bumping the epoch here also releases a stream whose prompt is still open.
            stopMicrophone();
            stopPlayback();
            ready = false;
            const ctx = context;
            context = null;
            workletLoaded = false;
            outputEnabled = true;
            void ctx?.close().catch(() => {});
        },
    };
}

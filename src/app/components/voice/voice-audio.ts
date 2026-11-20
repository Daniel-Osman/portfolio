/**
 * The browser half of the voice client: one AudioContext, the microphone through an
 * AudioWorklet, and returned PCM scheduled on a timeline. No protocol knowledge beyond a
 * Float32Array; `voice-session.ts` does the wiring.
 */

/** Served from `public/` so it stays a same-origin script the worklet can load directly. */
const MIC_WORKLET_URL = "/voice/mic-worklet.js";
const WORKLET_NAME = "portfolio-microphone";

/** Enough headroom for a burst of deltas to land before the first buffer is due. */
const PLAYBACK_LEAD_SECONDS = 0.1;

/** Live audio is dropped rather than queued: a late chunk is worse than a missing one. */
export const VOICE_SEND_HIGH_WATER_BYTES = 64 * 1024;

type Samples = (samples: Float32Array) => void;

export type VoiceAudio = {
    /** The capture rate; the resampler converts from here to what the gateway asked for. */
    readonly sampleRate: number;
    startMicrophone(onSamples: Samples): Promise<void>;
    play(samples: Float32Array, sampleRate: number): void;
    stopPlayback(): void;
    close(): void;
};

export function createVoiceAudio(): VoiceAudio {
    let context: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let node: AudioWorkletNode | null = null;
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

    return {
        get sampleRate() {
            return context?.sampleRate ?? 48_000;
        },

        async startMicrophone(onSamples) {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw Object.assign(new Error("this browser cannot capture audio"), {
                    name: "NotSupportedError",
                });
            }

            const ctx = context ?? new AudioContext();
            context = ctx;
            if (ctx.state === "suspended") await ctx.resume();

            await ctx.audioWorklet.addModule(MIC_WORKLET_URL);
            const media = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            stream = media;

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
        },

        play(samples, sampleRate) {
            const ctx = context;
            if (!ctx || !samples.length) return;
            if (ctx.state === "suspended") void ctx.resume();

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
            stopPlayback();
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
            const ctx = context;
            context = null;
            void ctx?.close().catch(() => {});
        },
    };
}

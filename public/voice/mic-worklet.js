// Served from `public/voice/` and loaded by `audioWorklet.addModule()`; it must stay a plain
// same-origin script with no imports and no build step. It hands raw Float32 frames to the main
// thread and writes silence to its output, so the microphone is never routed to the speakers.

class PortfolioMicrophoneProcessor extends AudioWorkletProcessor {
    process(inputs, outputs) {
        const input = inputs[0]?.[0];
        if (input?.length) {
            const samples = new Float32Array(input);
            this.port.postMessage({ type: "samples", samples: samples.buffer }, [samples.buffer]);
        }

        for (const channel of outputs[0] || []) channel.fill(0);
        return true;
    }
}

registerProcessor("portfolio-microphone", PortfolioMicrophoneProcessor);

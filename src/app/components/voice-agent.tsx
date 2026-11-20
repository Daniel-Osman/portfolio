"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The gateway's address is build-time: Next inlines every `NEXT_PUBLIC_*` reference, so the
 * server render and the client bundle agree without a second copy of the value.
 *
 * Production has no `NEXT_PUBLIC_VOICE_GATEWAY_URL` yet, so this component renders nothing
 * at all there: no label, no button, no empty shell. Add the var in Vercel when the agent has
 * a host, and the entry appears on the next build.
 */
const CONFIGURED = process.env.NEXT_PUBLIC_VOICE_GATEWAY_URL;

const LOAD_TIMEOUT_MS = 12_000;

/** The value only counts when it parses as an http(s) URL; anything else renders nothing. */
function gatewayUrl(): string | null {
    if (!CONFIGURED) return null;
    try {
        const url = new URL(CONFIGURED);
        return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
    } catch {
        return null;
    }
}

const SECONDARY =
    "focus-ring cursor-pointer font-mono text-[12px] lowercase underline decoration-foreground/30 underline-offset-4 hover:decoration-current";

type Phase = "idle" | "starting" | "ready" | "failed";

export default function VoiceAgent() {
    const url = gatewayUrl();
    const [phase, setPhase] = useState<Phase>("idle");
    const [attempt, setAttempt] = useState(0);
    const timer = useRef<number | null>(null);
    const probe = useRef<AbortController | null>(null);

    const clearTimer = useCallback(() => {
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }
    }, []);

    useEffect(
        () => () => {
            clearTimer();
            probe.current?.abort();
        },
        [clearTimer]
    );

    if (!url) return null;

    const start = () => {
        clearTimer();
        probe.current?.abort();
        setAttempt((count) => count + 1);
        setPhase("starting");

        // Measured: Chrome fires `load` on the frame even when the port is dead, because it
        // paints its own error page there. The frame cannot report the difference, and its
        // document is cross-origin so it cannot be read either. A no-cors probe can: it
        // rejects only when the gateway does not answer at all. The timer is the backstop
        // for a connection that hangs instead of refusing.
        const controller = new AbortController();
        probe.current = controller;
        fetch(url, { mode: "no-cors", cache: "no-store", signal: controller.signal }).catch(() => {
            if (controller.signal.aborted) return;
            clearTimer();
            setPhase("failed");
        });

        timer.current = window.setTimeout(() => {
            timer.current = null;
            setPhase((current) => (current === "starting" ? "failed" : current));
        }, LOAD_TIMEOUT_MS);
    };

    // Unmounting the frame is what ends the websocket and releases the microphone stream.
    const stop = () => {
        clearTimer();
        probe.current?.abort();
        setPhase("idle");
    };

    const loaded = () => {
        clearTimer();
        setPhase("ready");
    };

    return (
        <section aria-labelledby="voice-label" className="mt-16 border-t border-foreground/15 pt-8">
            <p id="voice-label" className="font-mono text-[12px] text-muted lowercase">
                voice
            </p>
            <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.7] [text-wrap:pretty] text-muted">
                Ask by voice instead. The agent answers out loud. It runs on my own machine and may
                be offline.
            </p>

            {phase === "idle" ? (
                <div className="mt-6">
                    <button
                        type="button"
                        onClick={start}
                        className="focus-ring min-w-[9rem] cursor-pointer rounded-full bg-foreground px-5 py-2.5 font-sans text-[15px] text-background"
                    >
                        start voice
                    </button>
                </div>
            ) : (
                <div className="mt-6">
                    <p
                        role="status"
                        aria-live="polite"
                        className="mb-2 font-mono text-[11px] text-muted"
                    >
                        {phase === "starting" ? "starting…" : ""}
                        {phase === "failed" ? "the agent is not reachable." : ""}
                    </p>

                    {phase === "failed" ? (
                        <div className="border border-foreground/15 p-6">
                            <p className="max-w-[46ch] text-[16px] leading-[1.7] [text-wrap:pretty]">
                                The agent is not reachable. It runs on my own machine, so it may be
                                offline right now.
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                                <button type="button" onClick={start} className={SECONDARY}>
                                    try again
                                </button>
                                <a
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="ink-link font-mono text-[12px] lowercase"
                                >
                                    open in a new tab
                                </a>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="w-full border border-foreground/15">
                                {/* No rounding, no shadow: the panel sits in the page, not over it. */}
                                <iframe
                                    key={attempt}
                                    src={url}
                                    title="Voice agent"
                                    allow="microphone; camera; autoplay"
                                    referrerPolicy="no-referrer"
                                    onLoad={loaded}
                                    className="block h-[560px] w-full lg:h-[min(78vh,720px)]"
                                />
                            </div>
                            <p className="mt-3 max-w-[52ch] font-mono text-[11px] leading-relaxed text-muted">
                                Press the agent&rsquo;s own Enable microphone button inside the
                                panel, then allow the browser prompt.
                            </p>
                        </>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ink-link font-mono text-[12px] lowercase"
                        >
                            open in a new tab
                        </a>
                        {phase === "failed" ? null : (
                            <button type="button" onClick={stop} className={SECONDARY}>
                                stop
                            </button>
                        )}
                    </div>
                    <p className="mt-3 max-w-[52ch] font-mono text-[11px] leading-relaxed text-muted">
                        Some browsers refuse the microphone inside a frame, and a phone leaves the
                        panel narrow, so the link above opens the agent on its own.
                    </p>
                </div>
            )}
        </section>
    );
}

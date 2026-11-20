"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { formatRemaining, isVoiceToken, type VoicePhase } from "./voice/voice-protocol";
import { createVoiceSession, type VoiceSession, type VoiceState } from "./voice/voice-session";

const TITLE_ID = "assistant-voice-title";
const RING = "focus-ring focus-ring-square";

const SMALL_CONTROL = `${RING} h-9 w-full cursor-pointer border border-foreground/15 bg-transparent px-2 font-mono text-[12px] lowercase text-foreground disabled:cursor-default disabled:text-foreground/40 [@media(min-width:640px)]:w-auto`;

const MIC_BUTTON = `${RING} h-12 min-w-[9rem] cursor-pointer border border-foreground/25 bg-transparent px-4 font-mono text-[13px] lowercase text-foreground`;

const PHASE_LABEL: Record<VoicePhase, string> = {
    connecting: "connecting",
    listening: "listening",
    thinking: "thinking",
    speaking: "speaking",
};

type Props = {
    /** The gateway origin from `NEXT_PUBLIC_AGENT_URL`, with no path. */
    origin: string;
    /** The invite token, held in memory by the widget and never written anywhere. */
    token: string | null;
    onToken: (token: string) => void;
    onClose: () => void;
};

export default function VoicePanel({ origin, token, onToken, onClose }: Props) {
    const [voice, setVoice] = useState<VoiceState | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [code, setCode] = useState("");
    const [codeProblem, setCodeProblem] = useState<string | null>(null);

    const overlay = useRef<HTMLDivElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);
    const session = useRef<VoiceSession | null>(null);
    /** Set just before closing, so the focus guard lets the return to the launcher through. */
    const closing = useRef(false);
    /** False once unmounted: the session's callbacks must not set state after that. */
    const alive = useRef(true);
    /** Exactly the nodes this overlay made inert, so closing clears those and nothing else. */
    const inerted = useRef<HTMLElement[]>([]);

    const close = useCallback(() => {
        closing.current = true;
        session.current?.stop("user");
        session.current = null;
        onClose();
    }, [onClose]);

    const begin = useCallback(
        (value: string | null) => {
            if (!value) return;
            if (!isVoiceToken(value)) {
                setCodeProblem("that code is not valid.");
                return;
            }
            setCodeProblem(null);
            setMessage(null);
            session.current?.stop("user");

            const next = createVoiceSession({
                origin,
                token: value,
                onChange: (state) => {
                    if (alive.current) setVoice(state);
                },
                onEnded: (reason, text) => {
                    // Closing the overlay is not a session ending worth reporting.
                    if (alive.current && reason !== "user") setMessage(text);
                },
            });
            session.current = next;
            void next.start();
        },
        [origin]
    );

    useEffect(() => {
        alive.current = true;
        return () => {
            alive.current = false;
            session.current?.stop("user");
            session.current = null;
        };
    }, []);

    // The overlay declares itself modal, so it holds the keyboard: focus lands on `close`, Tab
    // wraps inside it, and any focus landing outside is put back. The listener sits on
    // `document` because Chrome parks focus on `document.body` when a tab chain ends, and a
    // listener on the node would never see the next Tab.
    useEffect(() => {
        const node = overlay.current;
        if (!node) return;

        closing.current = false;
        closeButton.current?.focus();

        const selector = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';
        const focusables = () =>
            Array.from(node.querySelectorAll<HTMLElement>(selector)).filter(
                (element) => element.getClientRects().length > 0
            );

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                close();
                return;
            }
            if (event.key !== "Tab") return;

            const items = focusables();
            if (items.length === 0) {
                event.preventDefault();
                return;
            }

            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;
            const inside = active instanceof HTMLElement && node.contains(active);

            if (event.shiftKey) {
                if (!inside || active === first) {
                    event.preventDefault();
                    last.focus();
                }
                return;
            }
            if (!inside || active === last) {
                event.preventDefault();
                first.focus();
            }
        };

        const onFocusIn = (event: FocusEvent) => {
            if (closing.current) return;
            const target = event.target;
            if (target instanceof Node && node.contains(target)) return;
            closeButton.current?.focus();
        };

        document.addEventListener("keydown", onKeyDown);
        document.addEventListener("focusin", onFocusIn);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.removeEventListener("focusin", onFocusIn);
        };
    }, [close]);

    // Everything behind the modal is out of the tab order and off the pointer while it is open.
    // Only the nodes marked here are cleared again; somebody else's `inert` is left alone.
    useEffect(() => {
        const node = overlay.current;
        if (!node) return;

        let keep: HTMLElement | null = node;
        while (keep && keep.parentElement !== document.body) keep = keep.parentElement;
        if (!keep) return;

        for (const child of Array.from(document.body.children)) {
            if (!(child instanceof HTMLElement) || child === keep) continue;
            if (child.inert) continue;
            child.inert = true;
            inerted.current.push(child);
        }

        return () => {
            for (const element of inerted.current) element.inert = false;
            inerted.current = [];
        };
    }, []);

    const active = voice?.status === "active";
    const ended = voice?.status === "ended";
    const phase = voice?.phase ?? "connecting";
    const remaining = voice?.remainingMs ?? null;

    const microphoneLabel = !active
        ? ended
            ? "start again"
            : "start"
        : voice?.muted
          ? "resume"
          : "mute";

    const caption = !voice
        ? "not started"
        : active
          ? `${PHASE_LABEL[phase]}${voice.muted ? " · muted" : ""}`
          : "session ended";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 [@media(max-width:640px)]:p-0">
            <div
                ref={overlay}
                role="dialog"
                aria-modal="true"
                aria-labelledby={TITLE_ID}
                className="flex h-full max-h-[720px] w-full max-w-[640px] flex-col border border-foreground/15 bg-background [@media(max-width:640px)]:max-h-none [@media(max-width:640px)]:max-w-none [@media(max-width:640px)]:border-0"
            >
                <div className="flex h-10 shrink-0 items-center justify-between border-b border-foreground/15 px-3">
                    <p id={TITLE_ID} className="font-mono text-[11px] text-muted lowercase">
                        voice
                    </p>
                    <button
                        ref={closeButton}
                        type="button"
                        onClick={close}
                        className={`${RING} cursor-pointer font-mono text-[11px] lowercase`}
                    >
                        close
                    </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 py-8">
                    {!token ? (
                        <div className="flex w-full max-w-[320px] flex-col gap-3">
                            <p className="text-[14px] leading-[1.6] [text-wrap:pretty]">
                                voice needs an invite link.
                            </p>
                            <form
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    const value = code.trim();
                                    if (!isVoiceToken(value)) {
                                        setCodeProblem("that code is not valid.");
                                        return;
                                    }
                                    setCode("");
                                    setCodeProblem(null);
                                    onToken(value);
                                    begin(value);
                                }}
                                className="flex flex-col gap-2 [@media(min-width:640px)]:flex-row [@media(min-width:640px)]:items-center"
                            >
                                <input
                                    value={code}
                                    onChange={(event) => setCode(event.target.value)}
                                    type="password"
                                    aria-label="Invite code"
                                    placeholder="paste invite code"
                                    autoComplete="off"
                                    spellCheck={false}
                                    className={`${RING} h-9 w-full min-w-0 border border-foreground/15 bg-transparent px-2 font-mono text-[12px] text-foreground placeholder:text-foreground/30 [@media(min-width:640px)]:w-auto [@media(min-width:640px)]:flex-1`}
                                />
                                <button
                                    type="submit"
                                    disabled={code.trim().length === 0}
                                    className={SMALL_CONTROL}
                                >
                                    start
                                </button>
                            </form>
                            {codeProblem ? (
                                <p
                                    role="status"
                                    aria-live="polite"
                                    className="text-[13px] leading-[1.6] [text-wrap:pretty]"
                                >
                                    {codeProblem}
                                </p>
                            ) : null}
                        </div>
                    ) : (
                        <div className="flex w-full max-w-[320px] flex-col items-center gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    if (!active) {
                                        begin(token);
                                        return;
                                    }
                                    session.current?.setMuted(!voice?.muted);
                                }}
                                aria-label={
                                    !active
                                        ? ended
                                            ? "Start a new voice session"
                                            : "Start the voice session"
                                        : voice?.muted
                                          ? "Unmute the microphone"
                                          : "Mute the microphone"
                                }
                                className={MIC_BUTTON}
                            >
                                {microphoneLabel}
                            </button>

                            <p className="text-center font-mono text-[11px] text-muted lowercase">
                                <span role="status" aria-live="polite">
                                    {caption}
                                </span>
                                {active && remaining !== null ? (
                                    <span aria-hidden="true">
                                        {" "}
                                        · {formatRemaining(remaining)} left
                                    </span>
                                ) : null}
                            </p>

                            {message ? (
                                <p
                                    role="status"
                                    aria-live="polite"
                                    className="text-center text-[13px] leading-[1.6] [text-wrap:pretty]"
                                >
                                    {message}
                                </p>
                            ) : null}
                        </div>
                    )}
                </div>

                <p className="shrink-0 border-t border-foreground/15 px-3 py-2 font-mono text-[11px] leading-[1.5] text-muted lowercase">
                    the microphone is open only while this panel is open.
                </p>
            </div>
        </div>
    );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
    applyVoiceLine,
    formatRemaining,
    isVoiceToken,
    type VoiceLine,
    type VoicePhase,
} from "./voice/voice-protocol";
import { createVoiceSession, type VoiceSession, type VoiceState } from "./voice/voice-session";

const TITLE_ID = "assistant-voice-title";
const RING = "focus-ring focus-ring-square";

const SMALL_CONTROL = `${RING} h-9 w-full cursor-pointer border border-foreground/15 bg-transparent px-2 font-mono text-[12px] lowercase text-foreground disabled:cursor-default disabled:text-foreground/40 [@media(min-width:640px)]:w-auto`;

const MUTE_BUTTON = `${RING} h-9 shrink-0 cursor-pointer border border-foreground/15 bg-transparent px-3 font-mono text-[12px] lowercase text-foreground disabled:cursor-default disabled:text-foreground/40`;

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
    const [lines, setLines] = useState<VoiceLine[]>([]);
    /** The ending's own line, set only when the session ends for a reason the visitor must read. */
    const [message, setMessage] = useState<string | null>(null);
    const [code, setCode] = useState("");
    const [codeProblem, setCodeProblem] = useState<string | null>(null);
    const [draft, setDraft] = useState("");

    const overlay = useRef<HTMLDivElement>(null);
    const closeButton = useRef<HTMLButtonElement>(null);
    const log = useRef<HTMLDivElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const session = useRef<VoiceSession | null>(null);
    /** The token whose session was started, so the mount effect runs once and not again. */
    const startedToken = useRef<string | null>(null);
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

    /**
     * Starts one session and keeps it: the socket first, then audio, and never the other way
     * round. The click that got here also opens the output, so a browser that wants a gesture
     * has one; a refusal or a blocked output is a line, not a lost conversation.
     */
    const begin = useCallback(
        (value: string | null) => {
            if (!value) return;
            if (!isVoiceToken(value)) {
                setCodeProblem("that code is not valid.");
                return;
            }

            session.current?.stop("user");
            session.current = null;
            startedToken.current = value;
            setVoice(null);
            setLines([]);
            setMessage(null);
            setCodeProblem(null);
            setDraft("");

            const next = createVoiceSession({
                origin,
                token: value,
                onChange: (state) => {
                    if (alive.current) setVoice(state);
                },
                onLine: (event) => {
                    // Every transcript event goes through the reducer; it decides what a line is.
                    if (alive.current) setLines((current) => applyVoiceLine(current, event));
                },
                onEnded: (reason, text) => {
                    // Closing the overlay is not a session ending worth reporting.
                    if (alive.current && reason !== "user") setMessage(text);
                },
            });
            session.current = next;

            // Socket first, always: `start` opens it in this click's task and only then asks
            // audio to open, so a blocked speaker cannot cost the greeting or a typed turn.
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

    // A token already in memory starts the session as soon as the overlay opens: the opening
    // click is the gesture. The cleanup covers a token change and Strict Mode's replay.
    useEffect(() => {
        if (!token || startedToken.current === token) return;
        const value = token;
        begin(value);
        return () => {
            if (startedToken.current !== value) return;
            startedToken.current = null;
            session.current?.stop("user");
            session.current = null;
        };
    }, [token, begin]);

    // The overlay declares itself modal, so it holds the keyboard: focus lands on `close`, Tab
    // wraps inside it, and any focus landing outside is put back. The listener sits on
    // `document` because Chrome parks focus on `document.body` when a tab chain ends, and a
    // listener on the node would never see the next Tab.
    useEffect(() => {
        const node = overlay.current;
        if (!node) return;

        closing.current = false;
        closeButton.current?.focus();

        // A disabled input is not a tab stop, so it must not be counted as one.
        const selector =
            'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';
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
            const activeElement = document.activeElement;
            const inside = activeElement instanceof HTMLElement && node.contains(activeElement);

            if (event.shiftKey) {
                if (!inside || activeElement === first) {
                    event.preventDefault();
                    last.focus();
                }
                return;
            }
            if (!inside || activeElement === last) {
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

    // Keep the newest line in view without moving the page behind the overlay.
    useEffect(() => {
        const node = log.current;
        if (node) node.scrollTop = node.scrollHeight;
    }, [lines]);

    const active = voice?.status === "active";
    const ended = voice?.status === "ended";
    const phase = voice?.phase ?? "connecting";
    const remaining = voice?.remainingMs ?? null;
    /** The gateway ignores a typed turn until its voice front end says it is ready. */
    const canType = active && remaining !== null;

    // `muted` wins: a session whose playback is gone is muted even before the microphone is
    // touched. Then a live microphone is `voice`; the rest is typing only.
    const mode = !active ? null : !voice?.soundOn ? "muted" : voice.micOn ? "voice" : "text only";

    const caption = !voice
        ? "not started"
        : active
          ? `${PHASE_LABEL[phase]}${mode ? ` · ${mode}` : ""}`
          : "session ended";

    const line = message ?? voice?.notice ?? null;

    const sendDraft = () => {
        const text = draft.trim();
        if (!text || !canType) return;
        session.current?.sendText(text);
        setDraft("");
        // The caret stays where the turn was typed.
        input.current?.focus();
    };

    /**
     * One control for the session's voice. The label follows playback, so the first press on a
     * live sound turns it off without asking the microphone for anything. `mute` drops sound and
     * mic together; `unmute` raises both, and a refused mic silences playback in that same press.
     */
    /**
     * One control for the session's voice, and it only states the intent. The session owns the
     * microphone attempt; its result arrives as published state, so this handler never reads a
     * promise and cannot mistake an old attempt for the current one. The label follows playback,
     * so the first press on a live sound turns it off without asking the microphone for anything.
     */
    const toggleMute = () => {
        const current = session.current;
        if (!current || current.state.status !== "active") return;

        if (current.state.soundOn) {
            current.setSound(false);
            void current.setMic(false);
            return;
        }

        current.setSound(true);
        void current.setMic(true);
    };

    const soundOn = voice?.soundOn ?? true;

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

                {!token ? (
                    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 py-8">
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
                    </div>
                ) : (
                    <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 py-4">
                        <div
                            ref={log}
                            role="log"
                            aria-live="polite"
                            className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto"
                        >
                            {lines.length === 0 && active ? (
                                <p className="font-mono text-[11px] leading-[1.6] text-muted lowercase">
                                    {remaining === null
                                        ? "connecting…"
                                        : "waiting for the greeting…"}
                                </p>
                            ) : null}

                            {lines.map((entry) => (
                                <div key={entry.id} className="flex flex-col gap-1">
                                    <p className="font-mono text-[10px] leading-none text-muted lowercase">
                                        {entry.role === "user" ? "you" : "assistant"}
                                    </p>
                                    <p className="text-[14px] leading-[1.6] [text-wrap:pretty] whitespace-pre-wrap">
                                        {entry.text}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-foreground/15 pt-3">
                            <p className="min-w-0 font-mono text-[11px] leading-[1.6] text-muted lowercase">
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
                            {!ended ? (
                                <button
                                    type="button"
                                    onClick={() => void toggleMute()}
                                    aria-label={
                                        soundOn
                                            ? "Mute the microphone and playback"
                                            : "Unmute the microphone and playback"
                                    }
                                    className={MUTE_BUTTON}
                                >
                                    {soundOn ? "mute" : "unmute"}
                                </button>
                            ) : null}
                        </div>

                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                sendDraft();
                            }}
                            className="flex shrink-0 flex-col gap-2 [@media(min-width:640px)]:flex-row [@media(min-width:640px)]:items-center"
                        >
                            <input
                                ref={input}
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                aria-label="Message"
                                placeholder={ended ? "session ended" : "type a message"}
                                autoComplete="off"
                                spellCheck={false}
                                disabled={!canType}
                                className={`${RING} h-9 w-full min-w-0 border border-foreground/15 bg-transparent px-2 font-mono text-[12px] text-foreground placeholder:text-foreground/30 disabled:cursor-default disabled:text-foreground/40 [@media(min-width:640px)]:w-auto [@media(min-width:640px)]:flex-1`}
                            />
                            <button
                                type="submit"
                                disabled={!canType || draft.trim().length === 0}
                                className={SMALL_CONTROL}
                            >
                                send
                            </button>
                        </form>

                        {line ? (
                            <p
                                role="status"
                                aria-live="polite"
                                className="shrink-0 text-[13px] leading-[1.6] [text-wrap:pretty]"
                            >
                                {line}
                            </p>
                        ) : null}
                    </div>
                )}

                <p className="shrink-0 border-t border-foreground/15 px-3 py-2 font-mono text-[11px] leading-[1.5] text-muted lowercase">
                    the microphone is open only while this panel is open.
                </p>
            </div>
        </div>
    );
}

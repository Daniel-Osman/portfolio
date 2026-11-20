"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import VoicePanel from "./voice-panel";
import { fragmentWithoutVoice, tokenFromFragment } from "./voice/voice-protocol";

/**
 * Both values are build-time: Next inlines every `NEXT_PUBLIC_*` reference into the client bundle,
 * so the server render and the browser agree without a second copy of either.
 *
 * Production carries neither variable, so every page renders nothing at all there today: no fixed
 * shell, not even an empty div. Add them in Vercel when the assistant has a host, and the widget
 * appears on the next build.
 */
const ENABLED = process.env.NEXT_PUBLIC_ASSISTANT === "1";
const CONFIGURED_AGENT = process.env.NEXT_PUBLIC_AGENT_URL;

/** The agent address only counts when it parses as an http(s) URL; anything else means no voice. */
function agentUrl(): string | null {
    if (!CONFIGURED_AGENT) return null;
    try {
        const url = new URL(CONFIGURED_AGENT);
        if (url.protocol !== "http:" && url.protocol !== "https:") return null;
        return url.toString().replace(/\/$/, "");
    } catch {
        return null;
    }
}

const PANEL_ID = "assistant-panel";
const REVEAL_MS = 10_000;
const WAKE_TIMEOUT_MS = 20_000;
const KEPT_TURNS = 12;
/** The route refuses anything past 32 KB; this leaves room and still carries a real conversation. */
const MAX_BODY_BYTES = 12_000;
/**
 * The route rejects a single message past 2000 characters. The composer clips a paste at the same
 * number, and a send that is already longer is refused here rather than by the route.
 */
const MAX_CONTENT = 2000;
const TOO_LONG = "that message is too long; keep it under 2000 characters.";
const REFUSED = "that message was refused; shorten it and try again.";

const SUGGESTIONS = [
    "what does daniel build?",
    "tell me about the projects",
    "how do i get in touch?",
];

const RING = "focus-ring focus-ring-square";

const SUGGESTION = `${RING} cursor-pointer border border-foreground/15 px-2 py-1.5 text-left font-mono text-[11px] lowercase text-foreground/80`;

const SMALL_CONTROL = `${RING} h-9 cursor-pointer border border-foreground/15 bg-transparent px-2 font-mono text-[12px] lowercase text-foreground disabled:cursor-default disabled:text-foreground/40`;

type Turn = { role: "user" | "assistant"; content: string };
type Problem = "unavailable" | "slow_down" | null;

function replyFrom(data: unknown): string | null {
    if (!data || typeof data !== "object") return null;
    const reply = (data as { reply?: unknown }).reply;
    return typeof reply === "string" && reply.trim().length > 0 ? reply : null;
}

/** The exact bytes the route counts: the same serialisation that goes on the wire, in UTF-8. */
function bodyBytes(messages: Turn[]): number {
    return new TextEncoder().encode(JSON.stringify({ messages })).byteLength;
}

/**
 * The last twelve turns, then the oldest of those dropped until the encoded body fits. A long
 * conversation would otherwise be refused as too large, and "try again" would send it again. The
 * newest visitor message always stays: it is the question, and `send` and `retry` have already
 * refused one above the per-message limit, so the newest turn never exceeds the route's rules.
 * Deterministic, so a retry of the same history trims to the same bytes.
 */
function trimForSend(history: Turn[]): Turn[] {
    const kept = history.slice(-KEPT_TURNS);
    while (kept.length > 1 && bodyBytes(kept) > MAX_BODY_BYTES) kept.shift();
    return kept;
}

/**
 * The invite token arrives in the fragment, which no server log ever sees. This read is pure and
 * side-effect free, so it is safe as a lazy state initializer: the token is kept in memory and the
 * address bar is left alone. The strip below needs to wait for the mount effect, because a write
 * made during render is overwritten once Next takes the page over. On the server there is no
 * fragment, so it returns null.
 */
function readInviteFragment(): string | null {
    if (typeof window === "undefined") return null;
    return tokenFromFragment(window.location.hash);
}

function Assistant() {
    const url = agentUrl();
    const pathname = usePathname();

    const [shown, setShown] = useState(false);
    const [open, setOpen] = useState(false);
    const [voice, setVoice] = useState(false);
    const [turns, setTurns] = useState<Turn[]>([]);
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState<Problem>(null);
    /** A refused draft: one line about the composer, never a `try again` for a turn not sent. */
    const [notice, setNotice] = useState<string | null>(null);
    /** The invite token, read once from the fragment and kept in memory only. */
    const [token, setToken] = useState<string | null>(readInviteFragment);

    const root = useRef<HTMLDivElement>(null);
    const launcher = useRef<HTMLButtonElement>(null);
    const talk = useRef<HTMLButtonElement>(null);
    const panelClose = useRef<HTMLButtonElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const list = useRef<HTMLDivElement>(null);
    const woke = useRef(false);
    const inFlight = useRef(false);
    const voiceOpen = useRef(false);
    /** Set by `closeVoice`, spent by the effect below once the overlay's commit has landed. */
    const restoreFocus = useRef(false);
    /** The path on first render: a route change is a difference from it, not the first value. */
    const firstPath = useRef(pathname);

    // Closing stands the guard down first: it would otherwise pull focus straight back into an
    // overlay that is already on its way out.
    const dismissVoice = useCallback(() => {
        setVoice(false);
    }, []);

    /**
     * A visitor who closed the overlay gets the keyboard back on `talk`, inside the panel that is
     * still open; the launcher is only the fallback for a panel that closed too. The move cannot
     * happen here: the panel carries `inert` while the overlay is open, and a focus call into an
     * inert subtree is refused. The ref is set first, so a synchronous flush still sees it, and
     * the effect below focuses once the commit has cleared `inert` and unmounted the overlay.
     */
    const closeVoice = useCallback(() => {
        restoreFocus.current = true;
        dismissVoice();
    }, [dismissVoice]);

    useEffect(() => {
        if (voice || !restoreFocus.current) return;
        restoreFocus.current = false;
        (talk.current ?? launcher.current)?.focus();
    }, [voice]);

    // Nothing for the first ten seconds: not a node, not a pixel of layout. Then it stays.
    useEffect(() => {
        const timer = window.setTimeout(() => setShown(true), REVEAL_MS);
        return () => window.clearTimeout(timer);
    }, []);

    // The token is read by the state initializer above, which is pure. The strip runs once here,
    // after hydration: Next rewrites the address bar as it takes the page over, so the same write
    // from render was overwritten and the invite stayed visible. Any other fragment is untouched.
    useEffect(() => {
        const fragment = window.location.hash;
        if (!tokenFromFragment(fragment)) return;
        const rest = fragmentWithoutVoice(fragment);
        window.history.replaceState(
            window.history.state,
            "",
            `${window.location.pathname}${window.location.search}${rest}`
        );
    }, []);

    // One request, once per page load. It only wakes a hosting provider's sleeping instance:
    // `no-cors` hides the answer and a failure is not news, so nothing reads it. No interval, no
    // retry, and the ref survives a development Strict Mode replay.
    useEffect(() => {
        if (!url || woke.current) return;
        woke.current = true;

        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), WAKE_TIMEOUT_MS);
        void fetch(`${url}/livez`, {
            mode: "no-cors",
            cache: "no-store",
            signal: controller.signal,
        })
            .catch(() => {})
            .finally(() => window.clearTimeout(timer));
    }, [url]);

    // Opening puts the keyboard in the panel, so Tab, Shift+Tab and Escape all work from there.
    useEffect(() => {
        if (!open) return;
        panelClose.current?.focus();
    }, [open]);

    // The voice overlay owns its own focus trap, inert flags and Escape: it is a modal in our own
    // page now, so nothing has to be reached through a cross-origin frame.

    // The overlay declares itself modal, so a text reply that lands while it is open must not pull
    // focus back into the chat behind it. A ref, so the fetch callback reads the current value.
    useEffect(() => {
        voiceOpen.current = voice;
    }, [voice]);

    useEffect(() => {
        // The voice overlay handles Escape itself, so this only ever closes the chat panel.
        if (!open || voice) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            setOpen(false);
            launcher.current?.focus();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [open, voice]);

    // A route change swaps the page under the widget, never the widget itself. Left alone, the
    // panel and the voice overlay stayed open across a Back press, and the inert flags kept the new
    // page unreachable - the modal outlived the page it was opened over. Closing both here stands
    // the guard down, unmounts the voice panel (ending its session) and lets its inert effect clear
    // its own nodes. Focus is deliberately not moved: the visitor pressed a link or a Back button,
    // so the destination decides where the keyboard goes. Returning it to the launcher would steal
    // focus from the new page while the widget itself was never touched. The first render is not a
    // change, so it closes nothing.
    useEffect(() => {
        if (pathname === firstPath.current) return;
        firstPath.current = pathname;
        dismissVoice();
        setOpen(false);
    }, [pathname, dismissVoice]);

    // Keep the newest turn in view without moving the page behind the panel.
    useEffect(() => {
        const node = list.current;
        if (node) node.scrollTop = node.scrollHeight;
    }, [turns, busy, problem]);

    const request = useCallback(async (history: Turn[]) => {
        inFlight.current = true;
        setBusy(true);
        setProblem(null);
        setNotice(null);
        try {
            const messages = trimForSend(history);
            const response = await fetch("/api/assistant", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ messages }),
            });
            const data: unknown = await response.json().catch(() => null);
            const reply = replyFrom(data);

            if (response.ok && reply) {
                // The composer clears only now, so a failed send never loses what was typed.
                setTurns([...history, { role: "assistant", content: reply }]);
                setDraft("");
                return;
            }
            if (response.status === 400) {
                // The route refused the body as a whole. Drop the newest visitor turn instead of
                // leaving it in history: `try again` would resend it, and every later send would
                // carry it. The composer still holds the text, and no retry is offered.
                setTurns((current) =>
                    current.length > 0 && current[current.length - 1].role === "user"
                        ? current.slice(0, -1)
                        : current
                );
                setNotice(REFUSED);
                return;
            }
            setProblem(response.status === 429 ? "slow_down" : "unavailable");
        } catch {
            setProblem("unavailable");
        } finally {
            inFlight.current = false;
            setBusy(false);
            if (!voiceOpen.current) input.current?.focus();
        }
    }, []);

    const send = useCallback(
        (raw: string) => {
            const content = raw.trim();
            if (!content || inFlight.current) return;
            // The field clips a paste at the limit, so this catches a programmatic draft: a turn the
            // route would refuse must never be appended, or it poisons every send after it.
            if (content.length > MAX_CONTENT) {
                setNotice(TOO_LONG);
                return;
            }
            setNotice(null);
            const history: Turn[] = [...turns, { role: "user", content }];
            setTurns(history);
            void request(history);
        },
        [turns, request]
    );

    const retry = useCallback(() => {
        if (inFlight.current) return;
        const last = turns[turns.length - 1];
        if (!last || last.role !== "user") return;
        // The same rules the request sends against, checked before the resend: a turn past either
        // limit is dropped with one line rather than posted a second time.
        if (last.content.length > MAX_CONTENT || bodyBytes(trimForSend(turns)) > MAX_BODY_BYTES) {
            setTurns((current) => current.slice(0, -1));
            setNotice(REFUSED);
            return;
        }
        void request(turns);
    }, [turns, request]);

    const closePanel = () => {
        setOpen(false);
        launcher.current?.focus();
    };

    if (!shown) return null;

    const lastIsQuestion = turns.length > 0 && turns[turns.length - 1].role === "user";

    return (
        <div ref={root} className="contents">
            <button
                ref={launcher}
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-label="Ask about Daniel's work"
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-controls={open ? PANEL_ID : undefined}
                className={`agent-enter ${RING} fixed right-6 bottom-6 z-40 flex h-9 cursor-pointer items-center border border-foreground/15 bg-background px-3 font-mono text-[12px] lowercase [@media(max-width:640px)]:right-4 [@media(max-width:640px)]:bottom-4`}
            >
                ask
            </button>

            {open ? (
                <div
                    id={PANEL_ID}
                    role="dialog"
                    aria-modal="false"
                    aria-labelledby={`${PANEL_ID}-title`}
                    inert={voice}
                    className="fixed right-6 bottom-[4.5rem] z-50 flex flex-col overflow-hidden border border-foreground/15 bg-background [@media(max-width:640px)]:right-4 [@media(max-width:640px)]:bottom-16"
                    style={{
                        width: "clamp(320px, calc(100vw - 2rem), 400px)",
                        height: "clamp(420px, 70vh, 560px)",
                        maxHeight: "calc(100dvh - 6rem)",
                    }}
                >
                    <div className="flex h-9 shrink-0 items-center justify-between border-b border-foreground/15 px-3">
                        <p
                            id={`${PANEL_ID}-title`}
                            className="font-mono text-[11px] text-muted lowercase"
                        >
                            assistant
                        </p>
                        <button
                            ref={panelClose}
                            type="button"
                            onClick={closePanel}
                            className={`${RING} cursor-pointer font-mono text-[11px] lowercase`}
                        >
                            close
                        </button>
                    </div>

                    <div
                        ref={list}
                        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3"
                    >
                        {turns.length === 0 && !busy && problem === null ? (
                            <div className="flex flex-col gap-2">
                                <p className="text-[14px] leading-[1.6] [text-wrap:pretty]">
                                    Ask about Daniel&apos;s work, the projects, or how to reach him.
                                </p>
                                <div className="mt-1 flex flex-col items-start gap-1.5">
                                    {SUGGESTIONS.map((suggestion) => (
                                        <button
                                            key={suggestion}
                                            type="button"
                                            onClick={() => {
                                                setDraft(suggestion);
                                                send(suggestion);
                                            }}
                                            className={SUGGESTION}
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : null}

                        {turns.map((turn, index) =>
                            turn.role === "user" ? (
                                <p
                                    key={index}
                                    className="max-w-[85%] self-end bg-foreground/[0.06] px-2 py-1.5 text-[14px] leading-[1.6] [text-wrap:pretty] whitespace-pre-wrap"
                                >
                                    {turn.content}
                                </p>
                            ) : (
                                <p
                                    key={index}
                                    className="max-w-[92%] self-start text-[14px] leading-[1.6] [text-wrap:pretty] whitespace-pre-wrap"
                                >
                                    {turn.content}
                                </p>
                            )
                        )}

                        {busy ? (
                            <p
                                role="status"
                                aria-live="polite"
                                className="self-start font-mono text-[11px] text-muted lowercase"
                            >
                                thinking…
                            </p>
                        ) : null}

                        {problem ? (
                            <div className="flex flex-col items-start gap-2">
                                <p className="text-[14px] leading-[1.6] [text-wrap:pretty]">
                                    {problem === "slow_down"
                                        ? "the assistant is busy right now, try again in a moment."
                                        : "the assistant is not available right now"}
                                </p>
                                {lastIsQuestion ? (
                                    <button
                                        type="button"
                                        onClick={retry}
                                        className={`${RING} cursor-pointer font-mono text-[11px] lowercase underline decoration-foreground/30 underline-offset-4 hover:decoration-current`}
                                    >
                                        try again
                                    </button>
                                ) : null}
                            </div>
                        ) : null}
                    </div>

                    <div className="shrink-0 border-t border-foreground/15">
                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                send(draft);
                            }}
                            className="flex items-center gap-2 p-2"
                        >
                            {url ? (
                                <button
                                    ref={talk}
                                    type="button"
                                    onClick={() => setVoice(true)}
                                    className={SMALL_CONTROL}
                                >
                                    talk
                                </button>
                            ) : null}
                            <input
                                ref={input}
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                aria-label="Message"
                                placeholder="ask about daniel's work"
                                autoComplete="off"
                                maxLength={MAX_CONTENT}
                                className={`${RING} h-9 min-w-0 flex-1 border border-foreground/15 bg-transparent px-2 font-mono text-[12px] text-foreground placeholder:text-foreground/30`}
                            />
                            <button
                                type="submit"
                                disabled={busy || draft.trim().length === 0}
                                className={SMALL_CONTROL}
                            >
                                send
                            </button>
                        </form>
                        {notice ? (
                            <p
                                role="status"
                                aria-live="polite"
                                className="px-2 pb-1 text-[13px] leading-[1.6] [text-wrap:pretty]"
                            >
                                {notice}
                            </p>
                        ) : null}
                        <p className="px-2 pb-2 font-mono text-[11px] leading-[1.5] text-muted lowercase">
                            messages are sent to a hosted model; please keep anything private out of
                            them.
                        </p>
                    </div>
                </div>
            ) : null}

            {voice && url ? (
                <VoicePanel origin={url} token={token} onToken={setToken} onClose={closeVoice} />
            ) : null}
        </div>
    );
}

export default function AgentWidget() {
    if (!ENABLED) return null;
    return <Assistant />;
}

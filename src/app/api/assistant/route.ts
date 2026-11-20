import { NextResponse } from "next/server";
import { SYSTEM_PROMPT } from "./facts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A conversation longer than this is not a conversation with a portfolio assistant. */
const MAX_MESSAGES = 20;
/** What actually reaches the model: the last twelve turns, oldest dropped first. */
const KEEP_MESSAGES = 12;
const MAX_CONTENT = 2000;
const MAX_REPLY = 1200;
/** Nothing legitimate here is this large: a conversation is a dozen short turns. */
const MAX_BODY = 32 * 1024;
/** A real body here arrives in one burst: a client still dribbling after this is not talking. */
const BODY_DEADLINE_MS = 10_000;

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_ADDRESS = 10;
const MAX_GLOBAL = 300;
/** A module map is small on purpose: a leak here would be a memory leak, not a quota. */
const MAX_TRACKED_ADDRESSES = 5000;

const TIMEOUT_MS = 20_000;
const DEFAULT_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "qwen/qwen3.8-27b";

type Turn = { role: "user" | "assistant"; content: string };

/**
 * Best effort only: a serverless instance keeps this in its own memory, so a cold start clears it
 * and two instances never share a bucket. It slows a script down; it does not stop one. The address
 * is the first `x-forwarded-for` hop, which the client supplies and can lie about - another reason
 * this is a speed bump and not a quota.
 */
const recentByAddress = new Map<string, number[]>();
const recentGlobal: number[] = [];

/** One line per failure, a status token only: never the key, the prompt or the visitor's text. */
function badRequest(): NextResponse {
    console.error("[assistant] bad_request");
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
}

/**
 * Off by config: answer as if this route were never deployed. Same shape as a missing page, so a
 * switched-off build spends nothing and reveals nothing about the assistant.
 */
function absent(): NextResponse {
    console.error("[assistant] not_found off");
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
}

/** A body past the cap is refused before it is parsed, and before the model hears a word. */
function tooLarge(): NextResponse {
    console.error("[assistant] too_large");
    return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
}

/** The client stopped sending before it finished: a status line, and the socket is released. */
function timedOut(): NextResponse {
    console.error("[assistant] timeout body");
    return NextResponse.json({ ok: false, error: "timeout" }, { status: 408 });
}

type Body = { ok: true; raw: string } | { ok: false; response: NextResponse };

/**
 * Read the body only as far as the cap, and only for ten seconds. `content-length` can be absent or
 * a lie, so the bytes that actually arrive are counted: the reader stops the moment the total passes
 * 32 KB, cancels the rest and answers 413 without joining or decoding a single chunk. A body under
 * the cap is decoded once, at the end, so a character split across chunks survives. A client that
 * sends a few bytes and then stalls would otherwise hold the request - and its address's admission -
 * open for as long as it likes, so the timer cancels the reader and answers 408.
 */
async function readBody(request: Request): Promise<Body> {
    const stream = request.body;
    if (!stream) return { ok: false, response: badRequest() };

    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    let expired = false;

    // `cancel` settles a pending `read`, so the wait ends with the timer rather than after it.
    const timer = setTimeout(() => {
        expired = true;
        void reader.cancel().catch(() => {});
    }, BODY_DEADLINE_MS);

    try {
        for (;;) {
            const { done, value } = await reader.read();
            // Checked before `done`: a cancelled reader resolves as done with nothing to keep.
            if (expired) return { ok: false, response: timedOut() };
            if (done) break;

            total += value.byteLength;
            if (total > MAX_BODY) {
                // Refuse the rest rather than hold it: nothing here is decoded or kept.
                void reader.cancel().catch(() => {});
                return { ok: false, response: tooLarge() };
            }
            chunks.push(value);
        }
    } catch {
        if (expired) return { ok: false, response: timedOut() };
        void reader.cancel().catch(() => {});
        return { ok: false, response: badRequest() };
    } finally {
        clearTimeout(timer);
    }

    // The loop counted the raw bytes, so no second check on the decoded string is needed.
    return { ok: true, raw: Buffer.concat(chunks).toString("utf8") };
}

/** One log line, a status token only: never the key, the prompt or the visitor's text. */
function unavailable(status: string): NextResponse {
    console.error(`[assistant] unavailable ${status}`);
    return NextResponse.json({ ok: false, error: "unavailable" }, { status: 503 });
}

/** Upstream is rate limiting, not broken: the same 429 the local speed bump returns. */
function busy(status: string): NextResponse {
    console.error(`[assistant] slow_down ${status}`);
    return NextResponse.json({ ok: false, error: "slow_down" }, { status: 429 });
}

/** The last valid entry, or null. Shape and length are checked before a role can be dropped. */
function readMessages(payload: unknown): Turn[] | null {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

    const raw = (payload as { messages?: unknown }).messages;
    if (!Array.isArray(raw) || raw.length < 1 || raw.length > MAX_MESSAGES) return null;

    const turns: Turn[] = [];
    for (const entry of raw) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;

        const { role, content } = entry as { role?: unknown; content?: unknown };
        if (typeof content !== "string" || content.length < 1 || content.length > MAX_CONTENT) {
            return null;
        }
        // An unknown role is not worth a rejection: drop the message, keep the conversation.
        if (role !== "user" && role !== "assistant") continue;

        turns.push({ role, content });
    }

    return turns.slice(-KEEP_MESSAGES);
}

/** The first hop only: every hop after it is appended by a proxy, so only the first is claimed. */
function addressOf(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    const first = forwarded?.split(",")[0]?.trim();
    return first || "unknown";
}

function liveStamps(stamps: number[], now: number): number[] {
    return stamps.filter((stamp) => now - stamp < WINDOW_MS);
}

/** One write to the map, whichever path made it, keeps the bound: a rejection stores too. */
function remember(address: string, stamps: number[]): void {
    recentByAddress.set(address, stamps);
    if (recentByAddress.size > MAX_TRACKED_ADDRESSES) {
        const oldest = recentByAddress.keys().next();
        if (!oldest.done) recentByAddress.delete(oldest.value);
    }
}

/** Check, then record. One admitted request counts once, whatever its history length. */
function admit(address: string, now: number): boolean {
    const mine = liveStamps(recentByAddress.get(address) ?? [], now);
    const all = liveStamps(recentGlobal, now);

    if (mine.length >= MAX_PER_ADDRESS || all.length >= MAX_GLOBAL) {
        remember(address, mine);
        recentGlobal.splice(0, recentGlobal.length, ...all);
        return false;
    }

    mine.push(now);
    all.push(now);
    remember(address, mine);
    recentGlobal.splice(0, recentGlobal.length, ...all);

    return true;
}

type Outcome = { ok: true; reply: string } | { ok: false; status: string };

function textOf(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") return null;
    const choices = (payload as { choices?: unknown }).choices;
    if (!Array.isArray(choices) || choices.length === 0) return null;

    const first = choices[0];
    if (!first || typeof first !== "object") return null;
    const message = (first as { message?: unknown }).message;
    if (!message || typeof message !== "object") return null;

    const content = (message as { content?: unknown }).content;
    return typeof content === "string" ? content : null;
}

/**
 * One OpenAI-compatible call. Every moving part is env-driven, so the provider can change without
 * touching this file. Measured on the default model: 420 ms, 63 tokens, a direct answer. So no
 * `reasoning_effort` is sent. That field belonged to the previous model, which spent its budget on
 * reasoning and could return empty content.
 */
/** One OpenAI-compatible call. The provider, the model and the key are all env-driven. */
async function complete(apiKey: string, messages: Turn[]): Promise<Outcome> {
    const base = (process.env.ASSISTANT_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
    const model = process.env.ASSISTANT_MODEL || DEFAULT_MODEL;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(`${base}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            cache: "no-store",
            signal: controller.signal,
            body: JSON.stringify({
                model,
                messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
                max_tokens: 400,
                temperature: 0.3,
            }),
        });

        if (!response.ok) return { ok: false, status: String(response.status) };

        let body: string;
        try {
            body = await response.text();
        } catch {
            // The abort fires inside `fetch` or mid-body. Either way the wait ran out: `timeout`.
            return { ok: false, status: controller.signal.aborted ? "timeout" : "empty" };
        }

        let payload: unknown;
        try {
            payload = JSON.parse(body);
        } catch {
            // A body that does not parse carries no usable content, so it reads as `empty`.
            return { ok: false, status: controller.signal.aborted ? "timeout" : "empty" };
        }

        const text = textOf(payload);
        if (text === null) return { ok: false, status: "empty" };

        const reply = text.trim().slice(0, MAX_REPLY).trim();
        return reply ? { ok: true, reply } : { ok: false, status: "empty" };
    } catch {
        return { ok: false, status: controller.signal.aborted ? "timeout" : "network" };
    } finally {
        clearTimeout(timer);
    }
}

export async function POST(request: Request): Promise<NextResponse> {
    // The server checks the same switch the widget reads. The client gate only stops the render, so
    // without this a keyed deploy still answers anyone who posts to the route by hand. One value
    // stops both, because Next inlines it into the client and leaves it in the server env.
    if (process.env.NEXT_PUBLIC_ASSISTANT !== "1") return absent();

    // A declared oversize body is refused before a byte of it is read.
    const declared = Number(request.headers.get("content-length") ?? "");
    if (Number.isFinite(declared) && declared > MAX_BODY) return tooLarge();

    // A keyless build is inert: one 503 and no spend, so it never eats an address's allowance.
    const apiKey = process.env.ASSISTANT_API_KEY;
    if (!apiKey) return unavailable("no_key");

    // Admitted before the body is read: a slow upload is charged against the limit, and a stalled
    // one cannot hold an unpaid free slot open while its address still looks unused.
    if (!admit(addressOf(request), Date.now())) {
        console.error("[assistant] slow_down local");
        return NextResponse.json({ ok: false, error: "slow_down" }, { status: 429 });
    }

    // A header can lie or be missing, so the stream itself is capped and given a deadline: past
    // 32 KB it is cancelled, and ten seconds of silence ends it.
    const body = await readBody(request);
    if (!body.ok) return body.response;
    const raw = body.raw;

    let payload: unknown;
    try {
        payload = JSON.parse(raw);
    } catch {
        return badRequest();
    }

    const messages = readMessages(payload);
    if (!messages || messages.length === 0) return badRequest();

    const outcome = await complete(apiKey, messages);
    if (!outcome.ok) {
        // An upstream rate limit is busy; a 5xx is an outage. Never label an outage as throttling.
        if (outcome.status === "429") return busy(outcome.status);
        return unavailable(outcome.status);
    }

    return NextResponse.json({ ok: true, reply: outcome.reply });
}

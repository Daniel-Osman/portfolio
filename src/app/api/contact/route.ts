import { NextResponse } from "next/server";
import {
    buildEmail,
    cleanContact,
    isPreferred,
    isTopic,
    LIMITS,
    validateContact,
    type ContactInput,
    type ContactMessage,
} from "@/lib/contact-rules";
import { sendWithResend } from "@/lib/contact-send";

export const runtime = "nodejs";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const MAX_TRACKED_IPS = 5000;

/**
 * Best effort only: a serverless instance keeps this map in its own memory, so a cold start
 * clears it and two instances never share a bucket. It slows a script, it does not stop one.
 */
const recentByIp = new Map<string, number[]>();

const FIELDS = ["name", "email", "phone", "topic", "preferred", "message"] as const;

type Body = { ok: true; data: Record<string, unknown> } | { ok: false };

async function readBody(request: Request): Promise<Body> {
    const type = request.headers.get("content-type") ?? "";
    try {
        if (type.includes("application/json")) {
            const parsed: unknown = await request.json();
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
                return { ok: false };
            return { ok: true, data: parsed as Record<string, unknown> };
        }
        if (type.includes("form")) {
            const form = await request.formData();
            const data: Record<string, unknown> = {};
            for (const key of new Set(form.keys())) data[key] = form.get(key);
            return { ok: true, data };
        }
    } catch {
        // A half-sent or malformed body is a client error, not a silent drop.
    }
    return { ok: false };
}

/** Only the platform's own header, then the hop it appended. The leftmost hop is client-supplied. */
function clientIp(request: Request): string {
    const real = request.headers.get("x-real-ip")?.trim();
    if (real) return real;
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
        const hops = forwarded
            .split(",")
            .map((hop) => hop.trim())
            .filter(Boolean);
        if (hops.length > 0) return hops[hops.length - 1];
    }
    return "unknown";
}

function isThrottled(ip: string, now: number): boolean {
    const stamps = (recentByIp.get(ip) ?? []).filter((stamp) => now - stamp < WINDOW_MS);
    if (stamps.length >= MAX_PER_WINDOW) {
        recentByIp.set(ip, stamps);
        return true;
    }
    stamps.push(now);
    recentByIp.set(ip, stamps);
    if (recentByIp.size > MAX_TRACKED_IPS) {
        const oldest = recentByIp.keys().next();
        if (!oldest.done) recentByIp.delete(oldest.value);
    }
    return false;
}

function readField(data: Record<string, unknown>, key: string): string | null {
    const value = data[key];
    if (value === undefined || value === null) return "";
    return typeof value === "string" ? value : null;
}

/** Milliseconds since the form mounted, as a whole non-negative number, or null if unusable. */
function readElapsed(value: unknown): number | null {
    if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
    if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
    return null;
}

/**
 * A drop is indistinguishable from success in status and body. It is not indistinguishable in
 * time: a real send waits for Resend. The short wait below only stops a drop from answering
 * instantly; a patient prober can still measure the difference.
 */
async function silentDrop(): Promise<NextResponse> {
    const wait = 250 + Math.floor(Math.random() * 350);
    await new Promise((resolve) => setTimeout(resolve, wait));
    return NextResponse.json({ ok: true });
}

export async function POST(request: Request): Promise<NextResponse> {
    const body = await readBody(request);
    if (!body.ok) {
        return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    const { data } = body;
    const honeypot = readField(data, "website");
    const elapsed = readElapsed(data.elapsedMs);
    const fields = FIELDS.map((key) => [key, readField(data, key)] as const);

    // A non-string field (array, object, file) is malformed, not empty.
    if (honeypot === null || fields.some(([, value]) => value === null)) {
        return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
    }

    // Bots first, and told nothing. Both branches look exactly like a success.
    if (honeypot.length > 0) return silentDrop();
    if (elapsed === null || elapsed < LIMITS.minFillMs) return silentDrop();

    if (isThrottled(clientIp(request), Date.now())) {
        return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    const input = cleanContact(Object.fromEntries(fields) as ContactInput);
    const errors = validateContact(input);
    if (Object.keys(errors).length > 0) {
        return NextResponse.json({ ok: false, errors }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.CONTACT_FROM;
    const to = process.env.CONTACT_TO;
    if (!apiKey || !from || !to) {
        return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
    }

    // validateContact guarantees both memberships; the casts only satisfy the type system.
    const message: ContactMessage = {
        ...input,
        topic: isTopic(input.topic) ? input.topic : "something else",
        preferred: isPreferred(input.preferred) ? input.preferred : "email",
    };

    const outcome = await sendWithResend(
        {
            from,
            to,
            replyTo: input.email,
            ...buildEmail(message),
        },
        apiKey
    );

    if (outcome === "sent") return NextResponse.json({ ok: true });
    if (outcome === "rejected") {
        return NextResponse.json({ ok: false, error: "send_failed" }, { status: 502 });
    }
    // Ambiguous by design: Resend did not answer, so the send is neither confirmed nor denied.
    return NextResponse.json({ ok: false, error: "send_unconfirmed" }, { status: 504 });
}

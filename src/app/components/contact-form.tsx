"use client";

import {
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
    type ReactNode,
} from "react";
import {
    cleanContact,
    EMPTY_CONTACT,
    LIMITS,
    PREFERRED,
    TOPICS,
    validateContact,
    type ContactErrors,
    type ContactField,
    type ContactInput,
} from "@/lib/contact-rules";

const CONTROL =
    "focus-ring w-full rounded-[2px] bg-transparent font-sans text-[16px] leading-[1.4] text-foreground placeholder:text-foreground/25";

const FIELD_ORDER: ContactField[] = ["name", "email", "phone", "topic", "preferred", "message"];

const FAILURE = {
    unavailable: "The message did not send. Your text is still here.",
    unconfirmed:
        "I could not confirm the send. Your text is still here. Check for a reply before sending again.",
    rate: "Too many messages just now. Try again in a few minutes.",
    unreadable: "Something in the form could not be read. Check the fields and try again.",
} as const;

type FailureKind = keyof typeof FAILURE;
type Status = "idle" | "sending" | "sent";

function Field({
    id,
    label,
    error,
    children,
}: {
    id: ContactField;
    label: string;
    error?: string;
    children: ReactNode;
}) {
    return (
        <div className="border-b border-foreground/15 py-4">
            <div className="grid gap-1.5 sm:grid-cols-[9rem_1fr] sm:gap-6">
                <label htmlFor={id} className="font-mono text-[12px] text-muted lowercase sm:pt-1">
                    {label}
                </label>
                <div>
                    {children}
                    <p
                        id={`${id}-error`}
                        className="min-h-[1.15rem] font-mono text-[11px] leading-[1.15rem] text-foreground/70"
                    >
                        {error ?? ""}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function ContactForm({ fallbackAddress }: { fallbackAddress: string | null }) {
    const [values, setValues] = useState<ContactInput>(EMPTY_CONTACT);
    const [honeypot, setHoneypot] = useState("");
    const [errors, setErrors] = useState<ContactErrors>({});
    const [failure, setFailure] = useState<FailureKind | null>(null);
    const [status, setStatus] = useState<Status>("idle");
    const [announcement, setAnnouncement] = useState("");

    const formRef = useRef<HTMLFormElement>(null);
    const busy = useRef(false);
    const startedAt = useRef<number | null>(null);

    // Reading the clock belongs in an effect, not in render.
    useEffect(() => {
        startedAt.current = Date.now();
    }, []);

    const elapsedMs = () =>
        startedAt.current === null ? LIMITS.minFillMs : Date.now() - startedAt.current;

    const update =
        (field: ContactField | "website") =>
        (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
            const { value } = event.target;
            if (field === "website") {
                setHoneypot(value);
                return;
            }
            setValues((current) => ({ ...current, [field]: value }));
        };

    const focusFirstError = (found: ContactErrors) => {
        const first = FIELD_ORDER.find((field) => found[field]);
        if (!first) return;
        const selector = first === "preferred" ? 'input[name="preferred"]' : `#${first}`;
        formRef.current?.querySelector<HTMLElement>(selector)?.focus();
    };

    const fail = (kind: FailureKind) => {
        const withAddress =
            fallbackAddress && kind !== "unreadable"
                ? ` Email ${fallbackAddress} and I will reply from there.`
                : "";
        setFailure(kind);
        setAnnouncement(`${FAILURE[kind]}${withAddress}`);
    };

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy.current || status === "sent") return;

        setFailure(null);
        const found = validateContact(cleanContact(values));
        setErrors(found);

        if (Object.keys(found).length > 0) {
            const count = Object.keys(found).length;
            setAnnouncement(
                count === 1 ? "One field needs attention." : `${count} fields need attention.`
            );
            focusFirstError(found);
            return;
        }

        busy.current = true;
        setStatus("sending");

        // A person never reaches the server before the gate closes; wait it out here.
        const measured = elapsedMs();
        if (measured < LIMITS.minFillMs) {
            await new Promise((resolve) => window.setTimeout(resolve, LIMITS.minFillMs - measured));
        }

        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 15_000);

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controller.signal,
                body: JSON.stringify({
                    ...cleanContact(values),
                    website: honeypot,
                    elapsedMs: elapsedMs(),
                }),
            });

            if (response.ok) {
                setStatus("sent");
                setAnnouncement("Thanks. I will get back to you within two business days.");
                return;
            }

            const payload: unknown = await response.json().catch(() => null);
            const record = (payload ?? {}) as { errors?: unknown; error?: unknown };

            if (response.status === 400) {
                const sent = record.errors;
                if (sent && typeof sent === "object") {
                    const next = sent as ContactErrors;
                    setErrors(next);
                    setAnnouncement("Check the highlighted fields.");
                    focusFirstError(next);
                } else {
                    fail("unreadable");
                }
                return;
            }

            if (response.status === 429) return fail("rate");
            if (response.status === 504) return fail("unconfirmed");
            return fail("unavailable");
        } catch {
            fail(controller.signal.aborted ? "unconfirmed" : "unavailable");
        } finally {
            window.clearTimeout(timer);
            busy.current = false;
            setStatus((current) => (current === "sent" ? current : "idle"));
        }
    }

    return (
        <div className="relative mt-12">
            <p role="status" aria-live="polite" className="sr-only">
                {announcement}
            </p>

            {status === "sent" ? (
                <div className="border-t border-foreground/15 pt-8">
                    <p className="text-[16px] leading-[1.7] [text-wrap:pretty]">
                        Thanks. I will get back to you within two business days.
                    </p>
                </div>
            ) : (
                <form ref={formRef} onSubmit={onSubmit} noValidate>
                    <div className="border-t border-foreground/15">
                        <Field id="name" label="name" error={errors.name}>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                value={values.name}
                                onChange={update("name")}
                                maxLength={LIMITS.name}
                                autoComplete="name"
                                placeholder="your name"
                                required
                                aria-invalid={Boolean(errors.name)}
                                aria-describedby={errors.name ? "name-error" : undefined}
                                className={CONTROL}
                            />
                        </Field>

                        <Field id="email" label="email" error={errors.email}>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={values.email}
                                onChange={update("email")}
                                maxLength={LIMITS.email}
                                autoComplete="email"
                                inputMode="email"
                                placeholder="you@example.com"
                                required
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={errors.email ? "email-error" : undefined}
                                className={CONTROL}
                            />
                        </Field>

                        <Field id="phone" label="phone (optional)" error={errors.phone}>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                value={values.phone}
                                onChange={update("phone")}
                                maxLength={LIMITS.phone}
                                autoComplete="tel"
                                inputMode="tel"
                                placeholder="optional"
                                aria-invalid={Boolean(errors.phone)}
                                aria-describedby={errors.phone ? "phone-error" : undefined}
                                className={CONTROL}
                            />
                        </Field>

                        <Field id="topic" label="topic" error={errors.topic}>
                            <div className="relative">
                                <select
                                    id="topic"
                                    name="topic"
                                    value={values.topic}
                                    onChange={update("topic")}
                                    required
                                    aria-invalid={Boolean(errors.topic)}
                                    aria-describedby={errors.topic ? "topic-error" : undefined}
                                    className={`${CONTROL} appearance-none bg-background pr-6 ${values.topic ? "" : "text-muted"}`}
                                >
                                    <option value="">choose one</option>
                                    {TOPICS.map((topic) => (
                                        <option key={topic} value={topic}>
                                            {topic}
                                        </option>
                                    ))}
                                </select>
                                <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute top-1/2 right-0 -translate-y-1/2 font-mono text-[11px] text-muted"
                                >
                                    ↓
                                </span>
                            </div>
                        </Field>

                        <fieldset
                            className="border-b border-foreground/15 py-4"
                            aria-describedby={errors.preferred ? "preferred-error" : undefined}
                        >
                            <legend className="sr-only">Preferred way to talk</legend>
                            <div className="grid gap-1.5 sm:grid-cols-[9rem_1fr] sm:gap-6">
                                <p
                                    aria-hidden="true"
                                    className="font-mono text-[12px] text-muted lowercase sm:pt-1"
                                >
                                    preferred
                                </p>
                                <div>
                                    <div className="flex flex-wrap gap-2">
                                        {PREFERRED.map((option) => (
                                            <label key={option} className="cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="preferred"
                                                    value={option}
                                                    checked={values.preferred === option}
                                                    onChange={update("preferred")}
                                                    required
                                                    className="peer sr-only"
                                                />
                                                <span className="inline-flex rounded-full border border-foreground/20 px-4 py-1.5 font-sans text-[14px] text-foreground/70 transition-colors peer-checked:border-transparent peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-foreground/45">
                                                    {option}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <p
                                        id="preferred-error"
                                        className="min-h-[1.15rem] font-mono text-[11px] leading-[1.15rem] text-foreground/70"
                                    >
                                        {errors.preferred ?? ""}
                                    </p>
                                </div>
                            </div>
                        </fieldset>

                        <Field id="message" label="message" error={errors.message}>
                            <textarea
                                id="message"
                                name="message"
                                value={values.message}
                                onChange={update("message")}
                                rows={6}
                                maxLength={LIMITS.messageMax}
                                placeholder="what you have in mind"
                                required
                                aria-invalid={Boolean(errors.message)}
                                aria-describedby={errors.message ? "message-error" : undefined}
                                className={`${CONTROL} resize-y`}
                            />
                        </Field>
                    </div>

                    {/* Off-screen, out of the tab order, unannounced. Only a bot fills this. */}
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden"
                    >
                        <label htmlFor="website">Website</label>
                        <input
                            id="website"
                            name="website"
                            type="text"
                            value={honeypot}
                            onChange={update("website")}
                            tabIndex={-1}
                            autoComplete="off"
                        />
                    </div>

                    <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                        <button
                            type="submit"
                            aria-busy={status === "sending"}
                            className="focus-ring min-w-[9rem] cursor-pointer rounded-full bg-foreground px-5 py-2.5 font-sans text-[15px] text-background"
                        >
                            {status === "sending" ? "sending…" : "send"}
                        </button>
                        <p className="font-mono text-[11px] text-muted">
                            your details are used only to reply
                        </p>
                    </div>

                    {failure ? (
                        <p className="mt-6 max-w-[46ch] font-mono text-[12px] leading-relaxed text-foreground/80">
                            {FAILURE[failure]}
                            {fallbackAddress && failure !== "unreadable" ? (
                                <>
                                    {" "}
                                    Email{" "}
                                    <a href={`mailto:${fallbackAddress}`} className="ink-link">
                                        {fallbackAddress}
                                    </a>{" "}
                                    and I will reply from there.
                                </>
                            ) : null}
                        </p>
                    ) : null}
                </form>
            )}
        </div>
    );
}

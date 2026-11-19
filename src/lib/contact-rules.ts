/**
 * One definition of the contact form: limits, rules and the email it produces.
 * Imported by the client form and by the API route, so both sides agree by construction.
 * Nothing here touches the network, `process.env` or the DOM.
 */

export const TOPICS = [
    "a new project",
    "working together",
    "a question",
    "something else",
] as const;
export const PREFERRED = ["a meeting", "WhatsApp", "email"] as const;

export type Topic = (typeof TOPICS)[number];
export type Preferred = (typeof PREFERRED)[number];

export const LIMITS = {
    name: 80,
    email: 254,
    phone: 32,
    messageMin: 10,
    messageMax: 2000,
    /** A person needs about this long to fill six fields; anything faster is a bot. */
    minFillMs: 2500,
} as const;

export type ContactInput = {
    name: string;
    email: string;
    phone: string;
    topic: string;
    preferred: string;
    message: string;
};

export type ContactField = keyof ContactInput;
export type ContactErrors = Partial<Record<ContactField, string>>;

export const EMPTY_CONTACT: ContactInput = {
    name: "",
    email: "",
    phone: "",
    topic: "",
    preferred: "",
    message: "",
};

const LOCAL_PART = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const DOMAIN_LABEL = /^[A-Za-z0-9-]+$/;
const TOP_LEVEL = /^[A-Za-z]{2,}$/;

/**
 * Structural check, no library: one `@`, a sane local part, dotted labels, letters in the TLD.
 * It cannot prove an address exists; only delivery can, which is why the form says so little.
 */
export function isEmail(value: string): boolean {
    if (value.length < 3 || value.length > LIMITS.email) return false;
    const parts = value.split("@");
    if (parts.length !== 2) return false;
    const [local, domain] = parts;
    if (local.length < 1 || local.length > 64) return false;
    if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return false;
    if (!LOCAL_PART.test(local)) return false;
    if (domain.length < 4 || domain.length > 253) return false;
    const labels = domain.split(".");
    if (labels.length < 2) return false;
    for (const label of labels) {
        if (label.length < 1 || label.length > 63) return false;
        if (!DOMAIN_LABEL.test(label)) return false;
        if (label.startsWith("-") || label.endsWith("-")) return false;
    }
    return TOP_LEVEL.test(labels[labels.length - 1]);
}

export function isTopic(value: string): value is Topic {
    return (TOPICS as readonly string[]).includes(value);
}

export function isPreferred(value: string): value is Preferred {
    return (PREFERRED as readonly string[]).includes(value);
}

/** Outer whitespace is not content. Every rule below judges the trimmed value. */
export function cleanContact(input: ContactInput): ContactInput {
    return {
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone.trim(),
        topic: input.topic.trim(),
        preferred: input.preferred.trim(),
        message: input.message.trim(),
    };
}

export function validateContact(input: ContactInput): ContactErrors {
    // Judge the value the route will send, not the one a browser happened to hand over.
    const value = cleanContact(input);
    const errors: ContactErrors = {};

    if (!value.name) errors.name = "add your name";
    else if (value.name.length > LIMITS.name) errors.name = `keep it under ${LIMITS.name}`;

    if (!value.email) errors.email = "add an email address";
    else if (!isEmail(value.email)) errors.email = "that address does not look complete";

    if (value.phone.length > LIMITS.phone) errors.phone = `keep it under ${LIMITS.phone}`;

    if (!value.topic) errors.topic = "choose a topic";
    else if (!isTopic(value.topic)) errors.topic = "choose one of the four";

    if (!value.preferred) errors.preferred = "choose how to talk";
    else if (!isPreferred(value.preferred)) errors.preferred = "choose one of the three";

    if (!value.message) errors.message = "add a message";
    else if (value.message.length < LIMITS.messageMin)
        errors.message = `a little more, at least ${LIMITS.messageMin} characters`;
    else if (value.message.length > LIMITS.messageMax)
        errors.message = `too long, at most ${LIMITS.messageMax} characters`;

    return errors;
}

export type ContactMessage = {
    name: string;
    email: string;
    phone: string;
    topic: Topic;
    preferred: Preferred;
    message: string;
};

export type BuiltEmail = {
    subject: string;
    text: string;
    html: string;
};

const ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}

/** Subject, labelled text and escaped HTML. Pure, so the verification script can pin it. */
export function buildEmail(fields: ContactMessage): BuiltEmail {
    const name = fields.name.replace(/\s+/g, " ").trim();
    const phone = fields.phone || "not given";
    const subject = `New enquiry — ${name} — ${fields.topic}`;

    const text = [
        "New enquiry from the portfolio contact form.",
        "",
        `Name: ${name}`,
        `Email: ${fields.email}`,
        `Phone: ${phone}`,
        `Topic: ${fields.topic}`,
        `Preferred reply: ${fields.preferred}`,
        "",
        "Message:",
        fields.message,
        "",
    ].join("\n");

    const row = (label: string, value: string) =>
        `<p style="margin:0 0 6px"><strong>${label}:</strong> ${escapeHtml(value)}</p>`;

    const html = [
        '<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:14px;line-height:1.6">',
        '<p style="margin:0 0 12px">New enquiry from the portfolio contact form.</p>',
        row("Name", name),
        row("Email", fields.email),
        row("Phone", phone),
        row("Topic", fields.topic),
        row("Preferred reply", fields.preferred),
        '<p style="margin:16px 0 6px"><strong>Message:</strong></p>',
        `<p style="margin:0;white-space:pre-wrap">${escapeHtml(fields.message)}</p>`,
        "</div>",
    ].join("");

    return { subject, text, html };
}

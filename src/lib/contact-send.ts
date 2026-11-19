/**
 * The only network call in the contact feature. Resend's REST API through `fetch` — no SDK.
 * `fetch` is injectable so a plain Node script can pin the payload without a key or a package.
 */

export type OutgoingEmail = {
    from: string;
    to: string;
    replyTo: string;
    subject: string;
    text: string;
    html: string;
};

export type SendOutcome =
    /** Resend accepted the message. */
    | "sent"
    /** Resend answered with an error status: nothing was sent. */
    | "rejected"
    /** No answer (timeout, abort, network): it may or may not have been sent. */
    | "unconfirmed";

export const RESEND_ENDPOINT = "https://api.resend.com/emails";
export const SEND_TIMEOUT_MS = 10_000;

export async function sendWithResend(
    email: OutgoingEmail,
    apiKey: string,
    fetchImpl: typeof fetch = fetch
): Promise<SendOutcome> {
    try {
        const response = await fetchImpl(RESEND_ENDPOINT, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: email.from,
                to: [email.to],
                reply_to: email.replyTo,
                subject: email.subject,
                text: email.text,
                html: email.html,
            }),
            signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        });

        return response.ok ? "sent" : "rejected";
    } catch {
        // A thrown fetch is an abort, a timeout or a transport failure. Any of them leaves the
        // send unproven; saying "failed" here would be a claim we cannot support.
        return "unconfirmed";
    }
}

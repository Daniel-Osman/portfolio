import type { Metadata } from "next";
import ContactForm from "@/app/components/contact-form";
import SiteNav from "@/app/components/site-nav";
import { isEmail } from "@/lib/contact-rules";

export const metadata: Metadata = {
    title: "Contact",
    description:
        "Start a conversation with Daniel Osman about a new project, working together, or a question. A short form reaches his inbox directly.",
};

/**
 * The page prints the fallback address from `CONTACT_TO`. Env is read per request, so a
 * prerendered page would bake in whatever was set at build time — usually nothing.
 */
export const dynamic = "force-dynamic";

/** `Name <addr>` or a bare address, and only when it really is one. Otherwise no fallback link. */
function fallbackAddress(): string | null {
    const raw = process.env.CONTACT_TO?.trim();
    if (!raw) return null;
    const angled = raw.match(/<([^<>]+)>/);
    const candidate = (angled ? angled[1] : raw).trim();
    return isEmail(candidate) ? candidate : null;
}

export default function ContactPage() {
    return (
        <div className="min-h-dvh w-full bg-background">
            <SiteNav />

            <main
                id="main"
                className="mx-auto w-full max-w-[56rem] px-6 pt-28 pb-40 font-sans lg:pt-40"
            >
                <header>
                    <p className="font-mono text-[12px] text-muted lowercase">contact</p>
                    <h1 className="mt-6 text-[28px] leading-[1.2] font-medium tracking-[-0.015em]">
                        Tell me about the work.
                    </h1>
                    <p className="mt-3 max-w-[46ch] text-[16px] leading-[1.7] [text-wrap:pretty] text-muted">
                        A short form reaches my inbox. I answer it myself, usually within two
                        business days.
                    </p>
                </header>

                <ContactForm fallbackAddress={fallbackAddress()} />
            </main>
        </div>
    );
}

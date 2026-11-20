"use client";

import Link from "next/link";
import MobileNav from "@/app/components/mobile-nav";
import TopNav from "@/app/components/top-nav";
import { profile } from "@/app/data/profile";
import { useGlobal } from "@/app/providers";

const BODY = "text-[16px] leading-[1.7] [text-wrap:pretty]";

/**
 * The quiet row of accounts under the closing note. Only the ones Daniel confirmed are
 * listed, so a missing account leaves no empty anchor behind.
 */
const ELSEWHERE = [
    { label: "github", href: profile.github },
    { label: "linkedin", href: profile.linkedin },
    { label: "x", href: profile.x },
    { label: "hugging face", href: profile.huggingFace },
].filter((account): account is { label: string; href: string } => account.href !== null);

export default function AboutView() {
    const { isMobile } = useGlobal();
    if (isMobile === null) return null;

    return (
        <div className="min-h-dvh w-full bg-background">
            {isMobile ? <MobileNav /> : <TopNav />}

            <main
                id="main"
                className="mx-auto w-full max-w-[56rem] px-6 pt-28 pb-40 font-sans lg:pt-40"
            >
                <header>
                    <p className="font-mono text-[12px] text-muted lowercase">about</p>
                    <h1 className="mt-6 text-[28px] leading-[1.2] font-medium tracking-[-0.015em]">
                        {profile.name}
                    </h1>
                    <p className="mt-1 text-[16px] text-muted">{profile.role}</p>
                </header>

                <div className="mt-10 space-y-5">
                    {profile.about.map((paragraph) => (
                        <p key={paragraph} className={BODY}>
                            {paragraph}
                        </p>
                    ))}
                </div>

                <section className="mt-16">
                    <h2 className="font-mono text-[12px] text-muted lowercase">areas of work</h2>
                    <dl className="mt-4 divide-y divide-foreground/10 border-y border-foreground/15">
                        {profile.capabilities.map((item) => (
                            <div
                                key={item.title}
                                className="grid gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-6"
                            >
                                <dt className="font-mono text-[12px] text-muted lowercase">
                                    {item.title.toLowerCase()}
                                </dt>
                                <dd className="text-[15px] leading-[1.6] text-foreground/85">
                                    {item.detail}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <section className="mt-16 font-mono text-[13px] leading-relaxed text-muted">
                    <p>
                        Based in Lebanon. Working across borders — with clients, carriers and teams
                        in the UAE, Saudi Arabia and beyond.
                    </p>
                    <p className="mt-3">
                        The{" "}
                        <Link href="/contact" className="ink-link">
                            contact form
                        </Link>{" "}
                        comes straight to me. I answer it myself, usually within two business days.
                    </p>
                </section>

                {ELSEWHERE.length ? (
                    <section className="mt-16 border-t border-foreground/15 pt-5">
                        <h2 className="font-mono text-[12px] text-muted lowercase">elsewhere</h2>
                        <ul className="mt-3 flex flex-wrap items-baseline gap-x-5 gap-y-2 font-mono text-[13px] text-muted">
                            {ELSEWHERE.map((account) => (
                                <li key={account.label}>
                                    <a
                                        href={account.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={`${account.label} (opens in a new tab)`}
                                        className="focus-ring transition-colors hover:text-foreground focus-visible:text-foreground"
                                    >
                                        {account.label}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : null}
            </main>
        </div>
    );
}

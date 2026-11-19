"use client";

import Link from "next/link";
import MobileNav from "@/app/components/mobile-nav";
import TopNav from "@/app/components/top-nav";
import { profile } from "@/app/data/profile";
import { useGlobal } from "@/app/providers";

const BODY = "text-[16px] leading-[1.7] [text-wrap:pretty]";

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
            </main>
        </div>
    );
}

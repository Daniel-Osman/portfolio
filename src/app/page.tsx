"use client";

import Link from "next/link";
import { useState } from "react";
import MobileNav from "@/app/components/mobile-nav";
import Pond, { type PondStats } from "@/app/components/pond/pond";
import TopNav from "@/app/components/top-nav";
import { useGlobal } from "@/app/providers";
import { profile } from "@/app/data/profile";

const UNDERLINE =
    "ink-link text-[14px] opacity-60 transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100";

export default function HomePage() {
    const { isMobile } = useGlobal();
    const [stats, setStats] = useState<PondStats>({ fish: 0, pellets: 0 });

    /*
     * No `isMobile === null` gate: the server and the first client render both read a null
     * `isMobile`, so the copy is in the HTML and hydration matches. A phone swaps the nav and
     * the layout over on hydration; both navs are fixed, so nothing below them moves.
     */
    return (
        <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
            <Pond className="absolute inset-0 h-full w-full" onStats={setStats} />
            {isMobile ? <MobileNav /> : <TopNav />}

            <main
                id="main"
                className={`relative z-20 mx-auto flex h-full w-full flex-col justify-end font-mono ${
                    isMobile ? "gap-8 px-6 pt-28 pb-12" : "gap-10 px-6 pt-32 pb-32 lg:px-[20vw]"
                }`}
            >
                {stats.fish > 0 ? (
                    <div
                        data-pond-avoid
                        aria-hidden="true"
                        className={`absolute right-6 text-[11px] leading-relaxed tabular-nums ${
                            isMobile ? "top-[26vw]" : "top-8 lg:right-[20vw]"
                        }`}
                    >
                        <div className="opacity-30">{stats.fish}</div>
                        <div className="opacity-30">{String(stats.pellets).padStart(2, "0")}</div>
                    </div>
                ) : null}

                <blockquote
                    data-pond-avoid
                    className={`rise lowercase opacity-60 ${
                        isMobile
                            ? "text-[13px] leading-relaxed tracking-[0.02em]"
                            : "text-[14px] leading-relaxed tracking-[0.02em]"
                    }`}
                >
                    software, operations,
                    <br />
                    and the work between them.
                </blockquote>

                <div
                    data-pond-avoid
                    className={`rise rise-1 ${isMobile ? "text-[14px] leading-[1.7]" : "max-w-[46rem] text-[15px] leading-[max(22px,3vh)]"}`}
                >
                    <h1>
                        I&apos;m Daniel.
                        <span aria-hidden="true" className="caret ml-1" />
                    </h1>
                    <p>
                        Independent developer and product-minded builder in Lebanon, working where
                        software, AI automation and business operations meet.
                    </p>
                    <p>
                        Cross-border operations, client platforms, and tools for supervising
                        agent-assisted work.
                    </p>
                    <p className="rise rise-2 mt-[1.5vh]">
                        <Link href="/projects" className={UNDERLINE}>
                            projects
                        </Link>
                        <span className="mx-2 opacity-40">/</span>
                        <Link href="/about" className={UNDERLINE}>
                            about
                        </Link>
                        <span className="mx-2 opacity-40">/</span>
                        <Link href="/contact" className={UNDERLINE}>
                            contact
                        </Link>
                    </p>
                </div>

                {isMobile ? null : (
                    <p
                        data-pond-avoid
                        className="rise rise-3 absolute bottom-10 left-6 font-mono text-[11px] lowercase opacity-30 lg:left-[20vw]"
                    >
                        {profile.name} · lebanon
                    </p>
                )}
            </main>
        </div>
    );
}

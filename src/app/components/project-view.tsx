"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import MobileNav from "@/app/components/mobile-nav";
import ProseText from "@/app/components/prose";
import TopNav from "@/app/components/top-nav";
import { getProject, projects } from "@/app/data/projects";
import { statusNotes } from "@/app/data/status";
import { useGlobal } from "@/app/providers";
import { LAST_PROJECT_KEY, pushWithTransition } from "@/lib/view-transition";

const BODY = "text-[16px] leading-[1.7] [text-wrap:pretty]";

export default function ProjectView({ slug }: { slug: string }) {
    const { isMobile } = useGlobal();
    const router = useRouter();
    const project = getProject(slug);

    useEffect(() => {
        sessionStorage.setItem(LAST_PROJECT_KEY, slug);
    }, [slug]);

    /*
     * No `isMobile === null` gate: the server and the first client render both read a null
     * `isMobile`, so the case study is in the HTML and hydration matches. A phone swaps the
     * nav in on hydration; both navs are fixed, so nothing below them moves.
     */
    if (!project?.page) return null;

    const { page } = project;
    const pages = [...projects].reverse().filter((item) => item.page);
    const at = pages.findIndex((item) => item.slug === slug);
    const prev = pages[(at - 1 + pages.length) % pages.length];
    const next = pages[(at + 1) % pages.length];

    const goBack = (event: React.MouseEvent) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
            return;
        event.preventDefault();
        pushWithTransition(router.push, "/projects", "back");
    };

    return (
        <div className="min-h-dvh w-full bg-background">
            {isMobile ? <MobileNav /> : <TopNav />}

            <main
                id="main"
                className="mx-auto w-full max-w-[56rem] px-6 pt-28 pb-40 font-sans lg:pt-40"
            >
                <header>
                    <Link
                        href="/projects"
                        onClick={goBack}
                        className="focus-ring text-[14px] text-muted transition-colors hover:text-foreground focus-visible:text-foreground"
                    >
                        ← projects
                    </Link>
                    <h1 className="mt-10 text-[28px] leading-[1.2] font-medium tracking-[-0.015em]">
                        {project.name}
                    </h1>
                    <p className="mt-1 text-[16px] text-muted">{page.tagline}</p>

                    <ProseText runs={page.about} className={`${BODY} mt-8`} />

                    <dl className="mt-10 grid gap-x-6 gap-y-2 border-t border-foreground/15 pt-4 font-mono text-[12px] sm:grid-cols-2">
                        {[
                            { term: "role", value: project.role },
                            { term: "status", value: project.status },
                            { term: "period", value: project.year },
                            { term: "disciplines", value: project.tech.join(" · ") },
                        ].map((row) => (
                            <div key={row.term} className="flex gap-3">
                                <dt className="w-[6.5rem] shrink-0 text-muted lowercase">
                                    {row.term}
                                </dt>
                                <dd>{row.value}</dd>
                            </div>
                        ))}
                    </dl>
                </header>

                {page.story?.length ? (
                    <section className="mt-16 space-y-6">
                        {page.story.map((block, index) => {
                            if (block.kind === "heading") {
                                return (
                                    <h2
                                        key={index}
                                        className="pt-4 text-[18px] font-medium tracking-[-0.01em]"
                                    >
                                        {block.text}
                                    </h2>
                                );
                            }
                            if (block.kind === "paragraph") {
                                return (
                                    <div key={index} className={`${BODY} text-foreground/80`}>
                                        <ProseText runs={block.runs} />
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </section>
                ) : null}

                <figure className="mt-16">
                    <div className="relative aspect-[3/2] w-full overflow-hidden rounded-[6px] bg-foreground/[0.06] ring-1 ring-foreground/10 ring-inset">
                        <Image
                            src={project.thumb}
                            alt={
                                project.thumbIsPlaceholder
                                    ? `Placeholder chart for ${project.name}, not a screenshot`
                                    : `${project.name} artwork`
                            }
                            fill
                            sizes="(min-width: 896px) 56rem, 100vw"
                            className="object-cover"
                        />
                    </div>
                    <figcaption className="mt-3 font-mono text-[12px] leading-relaxed text-muted">
                        {project.thumbIsPlaceholder
                            ? "placeholder artwork — not a screenshot"
                            : "project artwork"}
                    </figcaption>
                </figure>

                <section className="mt-14 border-t border-foreground/15 pt-5">
                    <h2 className="font-mono text-[12px] text-muted lowercase">where it stands</h2>
                    <p className="mt-3 text-[15px] leading-[1.7] text-foreground/80">
                        {statusNotes[project.status]}
                    </p>
                    <p className="mt-3 text-[15px] leading-[1.7] text-foreground/80">
                        No real screenshots, client documents or performance data are published for
                        this project yet. The artwork above is a layout placeholder, not evidence of
                        shipped functionality.
                    </p>
                </section>

                <nav
                    aria-label="Project navigation"
                    className="mt-20 flex items-baseline justify-between gap-6 border-t border-foreground/15 pt-6 font-mono text-[13px]"
                >
                    <Link
                        href={`/projects/${prev.slug}`}
                        onClick={(event) => {
                            if (
                                event.metaKey ||
                                event.ctrlKey ||
                                event.shiftKey ||
                                event.altKey ||
                                event.button !== 0
                            )
                                return;
                            event.preventDefault();
                            pushWithTransition(router.push, `/projects/${prev.slug}`, "forward");
                        }}
                        className="focus-ring text-muted hover:text-foreground focus-visible:text-foreground"
                    >
                        ← {prev.name}
                    </Link>
                    <Link
                        href={`/projects/${next.slug}`}
                        onClick={(event) => {
                            if (
                                event.metaKey ||
                                event.ctrlKey ||
                                event.shiftKey ||
                                event.altKey ||
                                event.button !== 0
                            )
                                return;
                            event.preventDefault();
                            pushWithTransition(router.push, `/projects/${next.slug}`, "forward");
                        }}
                        className="focus-ring text-right hover:text-foreground focus-visible:text-foreground"
                    >
                        {next.name} →
                    </Link>
                </nav>
            </main>
        </div>
    );
}

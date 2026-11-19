"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import MobileNav from "@/app/components/mobile-nav";
import PageNav from "@/app/components/page-nav";
import TopNav from "@/app/components/top-nav";
import { projects, type Project } from "@/app/data/projects";
import { useGlobal } from "@/app/providers";
import { LAST_PROJECT_KEY, pushWithTransition } from "@/lib/view-transition";

const GLIDE = 0.18; // share of the remaining distance the strip covers each frame

/** Newest first: the order the strip reads in. */
const stripProjects = [...projects].reverse();

function projectHref(project: Project) {
    return project.page ? `/projects/${project.slug}` : null;
}

/**
 * The index as one screen: a single row of work you scroll sideways, wheel included.
 * Nothing scrolls vertically here, so the strip is the whole navigation.
 */
export default function ProjectsView() {
    const { isMobile } = useGlobal();

    if (isMobile === null) return null;

    if (isMobile) {
        return (
            <div className="min-h-dvh w-full bg-background">
                <MobileNav />
                <main id="main" className="mx-auto w-full px-6 pt-[26vw] pb-[12vh]">
                    <h1 className="sr-only">Projects</h1>
                    {stripProjects.map((project, index) => {
                        const href = projectHref(project);
                        const card = (
                            <>
                                <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl bg-foreground/[0.06]">
                                    <Image
                                        src={project.thumb}
                                        alt={
                                            project.thumbIsPlaceholder
                                                ? `Placeholder artwork for ${project.name}, not a screenshot`
                                                : `${project.name} artwork`
                                        }
                                        fill
                                        sizes="100vw"
                                        priority={index === 0}
                                        className="object-cover"
                                    />
                                </div>
                                <h2 className="mt-[5vw] mb-2 font-sans text-[21px]">
                                    {project.name}
                                </h2>
                                <p className="font-sans text-[17px] opacity-60">
                                    {project.description}
                                </p>
                                <div className="mt-5">
                                    <p className="mb-1 font-sans text-[17px] opacity-60">Year</p>
                                    <p className="font-sans text-[17px]">{project.year}</p>
                                </div>
                                {project.thumbIsPlaceholder ? (
                                    <p className="mt-3 font-mono text-[12px] opacity-40">
                                        placeholder artwork — not a screenshot
                                    </p>
                                ) : null}
                                {href ? (
                                    <span className="mt-5 inline-flex items-center gap-3 rounded-full bg-foreground/[0.08] px-4 py-1 font-sans text-[15px]">
                                        view project
                                    </span>
                                ) : null}
                            </>
                        );

                        return (
                            <article key={project.slug} className="flex flex-col pb-[16vw]">
                                {href ? (
                                    <Link href={href} className="block">
                                        {card}
                                    </Link>
                                ) : (
                                    <div>{card}</div>
                                )}
                            </article>
                        );
                    })}
                    <PageNav
                        prev={{ href: "/", label: "home" }}
                        next={{ href: "/about", label: "about" }}
                    />
                </main>
            </div>
        );
    }

    return (
        <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
            <TopNav />
            <main id="main" className="flex h-full flex-col pt-12">
                <h1 className="sr-only">Projects</h1>
                <div className="flex flex-1 flex-col justify-center">
                    <DesktopStrip />
                </div>
                <div className="mx-auto w-full max-w-[56rem] px-6 pb-8">
                    <PageNav
                        prev={{ href: "/", label: "home" }}
                        next={{ href: "/about", label: "about" }}
                    />
                </div>
            </main>
        </div>
    );
}

function DesktopStrip() {
    const stripRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const strip = stripRef.current;
        if (!strip) return;

        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        // Coming back from a project, open on the one that was just read.
        const lastSlug = sessionStorage.getItem(LAST_PROJECT_KEY);
        const last = lastSlug
            ? strip.querySelector<HTMLElement>(`[data-slug="${lastSlug}"]`)
            : null;
        if (last) {
            const inset = parseFloat(getComputedStyle(strip).paddingLeft);
            strip.scrollLeft +=
                last.getBoundingClientRect().left - strip.getBoundingClientRect().left - inset;
        }

        let target = strip.scrollLeft;
        let raf = 0;

        const glide = () => {
            const gap = target - strip.scrollLeft;
            if (Math.abs(gap) < 0.5) {
                strip.scrollLeft = target;
                raf = 0;
                return;
            }
            strip.scrollLeft += gap * GLIDE;
            raf = requestAnimationFrame(glide);
        };

        // Anywhere on the page, a vertical wheel moves the strip sideways. A sideways swipe
        // over the strip itself is left to the browser.
        const onWheel = (event: WheelEvent) => {
            const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY);
            if (sideways && strip.contains(event.target as Node)) return;
            event.preventDefault();
            const delta = sideways ? event.deltaX : event.deltaY;
            const max = strip.scrollWidth - strip.clientWidth;
            if (!raf) target = strip.scrollLeft;
            target = Math.max(
                0,
                Math.min(max, target + (event.deltaMode === 1 ? delta * 16 : delta))
            );
            if (still) strip.scrollLeft = target;
            else if (!raf) raf = requestAnimationFrame(glide);
        };

        window.addEventListener("wheel", onWheel, { passive: false });
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("wheel", onWheel);
        };
    }, []);

    return (
        <div
            ref={stripRef}
            className="flex [scrollbar-width:none] gap-3 overflow-x-auto px-[max(1.5rem,calc((100vw-56rem)/2))] [&::-webkit-scrollbar]:hidden"
        >
            {stripProjects.map((project, index) => (
                <StripTile
                    key={project.slug}
                    project={project}
                    priority={index < 2}
                    onOpen={(href) => pushWithTransition(router.push, href, "forward")}
                />
            ))}
        </div>
    );
}

function StripTile({
    project,
    priority,
    onOpen,
}: {
    project: Project;
    priority: boolean;
    onOpen: (href: string) => void;
}) {
    const href = projectHref(project);

    const body = (
        <>
            <div
                data-slug={project.slug}
                className="relative aspect-[3/2] h-[min(62vh,42rem)] overflow-hidden bg-foreground/[0.06] [@media(max-height:820px)]:h-[min(calc(100dvh_-_22rem),42rem)]"
            >
                <Image
                    src={project.thumb}
                    alt=""
                    fill
                    priority={priority}
                    sizes="(min-height: 1100px) 63rem, 93vh"
                    className={`object-cover transition-transform duration-700 ease-out motion-reduce:transition-none ${
                        href ? "group-hover:scale-[1.03]" : ""
                    }`}
                />
                {href ? (
                    <span className="pointer-events-none absolute bottom-4 left-4 translate-y-1 rounded-full bg-black/55 px-3 py-1.5 font-mono text-[12px] text-[#fff7f0] opacity-0 backdrop-blur-md transition-[opacity,transform] duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                        view project
                    </span>
                ) : null}
            </div>
            <div className="mt-3 flex items-baseline gap-3">
                <span className="font-sans text-[15px] whitespace-nowrap">{project.name}</span>
                <span className="font-mono text-[12px] whitespace-nowrap text-muted">
                    {project.year}
                </span>
            </div>
            <p className="mt-1 text-[14px] leading-[1.5] text-muted">{project.description}</p>
            {project.thumbIsPlaceholder ? (
                <p className="mt-1 font-mono text-[11px] text-muted/70">
                    placeholder artwork — not a screenshot
                </p>
            ) : null}
        </>
    );

    const className = "group block w-min shrink-0 focus-ring";

    if (!href) return <div className={className}>{body}</div>;

    return (
        <Link
            href={href}
            aria-label={project.name}
            className={className}
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
                sessionStorage.setItem(LAST_PROJECT_KEY, project.slug);
                onOpen(href);
            }}
        >
            {body}
        </Link>
    );
}

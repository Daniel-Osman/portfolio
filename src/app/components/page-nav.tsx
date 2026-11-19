"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { pushWithTransition } from "@/lib/view-transition";

export type PageLink = { href: string; label: string };

/**
 * The project footer's hairline, looped across the four top-level pages:
 * home → projects → about → contact → home. No background, no card, one rule.
 */
export default function PageNav({ prev, next }: { prev: PageLink; next: PageLink }) {
    const router = useRouter();

    const open = (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
            return;
        event.preventDefault();
        pushWithTransition(router.push, href, "forward");
    };

    return (
        <nav
            aria-label="Page navigation"
            data-pond-avoid
            className="mt-20 flex items-baseline justify-between gap-6 border-t border-foreground/15 pt-6 font-mono text-[13px]"
        >
            <Link
                href={prev.href}
                onClick={open(prev.href)}
                className="focus-ring text-muted hover:text-foreground focus-visible:text-foreground"
            >
                <span aria-hidden="true">←</span> {prev.label}
            </Link>
            <Link
                href={next.href}
                onClick={open(next.href)}
                className="focus-ring text-right text-muted hover:text-foreground focus-visible:text-foreground"
            >
                {next.label} <span aria-hidden="true">→</span>
            </Link>
        </nav>
    );
}

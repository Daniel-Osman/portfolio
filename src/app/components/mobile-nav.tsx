"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGlobal } from "@/app/providers";
import ThemeIcon from "@/app/components/theme-icon";

const LINKS = [
    { label: "pond", href: "/" },
    { label: "projects", href: "/projects" },
    { label: "about", href: "/about" },
];

/** The phone's only chrome: a pill that opens the whole map. */
export default function MobileNav() {
    const { isLight, toggleTheme } = useGlobal();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [lastPath, setLastPath] = useState(pathname);

    // Any navigation closes the map behind it (adjusting state during render, not in an effect).
    if (lastPath !== pathname) {
        setLastPath(pathname);
        setOpen(false);
    }

    useEffect(() => {
        if (!open) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
                buttonRef.current?.focus();
            }
        };
        document.addEventListener("keydown", onKey);
        document.documentElement.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.documentElement.style.overflow = "";
        };
    }, [open]);

    return (
        <>
            <div className="fixed inset-x-[3vw] top-[3vw] z-50">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    aria-expanded={open}
                    aria-controls="mobile-map"
                    className="focus-ring flex w-full cursor-pointer items-center justify-between rounded-full bg-foreground/[0.06] px-[5vw] py-[3.5vw] backdrop-blur-md"
                >
                    <span className="font-sans text-[15px] tracking-normal">Daniel Osman</span>
                    <span className="min-size-4 relative block size-[5vw] text-foreground/50">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                            className="size-full"
                        >
                            {open ? (
                                <path
                                    d="M6 6l12 12M18 6L6 18"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                />
                            ) : (
                                <path
                                    d="M4 8h16M4 16h16"
                                    stroke="currentColor"
                                    strokeWidth="1.6"
                                    strokeLinecap="round"
                                />
                            )}
                        </svg>
                    </span>
                </button>
            </div>

            {open ? (
                <div
                    id="mobile-map"
                    className="fixed inset-0 z-40 flex flex-col justify-between bg-background px-[6vw] pt-[26vw] pb-[10vw]"
                >
                    <nav aria-label="Main" className="flex flex-col">
                        {LINKS.map(({ label, href }) => {
                            const isActive =
                                pathname === href ||
                                (href !== "/" && pathname.startsWith(`${href}/`));
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    aria-current={isActive ? "page" : undefined}
                                    className="focus-ring flex items-baseline justify-between border-b border-foreground/10 py-[3.5vw] text-[11vw] leading-none lowercase"
                                >
                                    <span className={isActive ? "" : "text-foreground/45"}>
                                        {label}
                                    </span>
                                    <span className="font-mono text-[11px] text-foreground/40">
                                        {isActive ? "here" : "↗"}
                                    </span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex items-center justify-between font-mono text-[12px] text-foreground/50">
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="focus-ring flex cursor-pointer items-center gap-2 lowercase"
                        >
                            <ThemeIcon isLight={isLight} size={13} />
                            {isLight ? "dark" : "light"}
                        </button>
                        <span>lebanon</span>
                    </div>
                </div>
            ) : null}
        </>
    );
}

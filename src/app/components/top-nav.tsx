"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGlobal } from "@/app/providers";
import ThemeIcon from "@/app/components/theme-icon";

const LINKS = [
    { label: "pond", href: "/" },
    { label: "projects", href: "/projects" },
    { label: "about", href: "/about" },
    { label: "contact", href: "/contact" },
];

const ITEM =
    "focus-ring transition-opacity duration-150 hover:opacity-100 focus-visible:opacity-100";

export default function TopNav() {
    const { isLight, toggleTheme } = useGlobal();
    const pathname = usePathname();
    const active = (href: string) =>
        pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

    return (
        <nav
            aria-label="Main"
            data-pond-avoid
            className="fixed inset-x-0 top-0 z-30 flex items-center justify-center gap-8 pt-8 font-mono text-[13px] lowercase"
        >
            {LINKS.map(({ label, href }) => (
                <Link
                    key={href}
                    href={href}
                    aria-current={active(href) ? "page" : undefined}
                    className={`${ITEM} ${active(href) ? "opacity-100" : "opacity-50"}`}
                >
                    {label}
                </Link>
            ))}
            <span className="-m-4 flex p-4">
                <button
                    type="button"
                    onClick={toggleTheme}
                    aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
                    className={`${ITEM} cursor-pointer opacity-50`}
                >
                    <ThemeIcon isLight={isLight} />
                </button>
            </span>
        </nav>
    );
}

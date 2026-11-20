import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL("https://danielosman.com"),
    title: {
        default: "Daniel Osman — software, operations and intelligent systems",
        template: "%s | Daniel Osman",
    },
    description:
        "Daniel Osman is an independent developer and product-minded builder in Lebanon, working where software, AI automation and business operations meet.",
    openGraph: {
        type: "website",
        siteName: "Daniel Osman",
        title: "Daniel Osman — software, operations and intelligent systems",
        description:
            "Independent developer and product-minded builder in Lebanon, working where software, automation and real operations meet.",
    },
    twitter: { card: "summary_large_image" },
};

/* Applied before first paint, so the page never flashes the wrong theme. */
const THEME_BOOT = `(function(){try{if(localStorage.getItem("theme")==="light")document.documentElement.classList.add("light")}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
            <head>
                <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
            </head>
            <body className="antialiased">
                <a
                    href="#main"
                    className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-3 focus:py-2 focus:text-[13px]"
                >
                    Skip to content
                </a>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}

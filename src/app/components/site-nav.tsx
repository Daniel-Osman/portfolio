"use client";

import MobileNav from "@/app/components/mobile-nav";
import TopNav from "@/app/components/top-nav";
import { useGlobal } from "@/app/providers";

/**
 * The nav decision the other views inline, packaged for a server-rendered page.
 * Only this waits for the breakpoint; the page around it is already painted.
 */
export default function SiteNav() {
    const { isMobile } = useGlobal();
    if (isMobile === null) return null;
    return isMobile ? <MobileNav /> : <TopNav />;
}

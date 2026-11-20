"use client";

import MobileNav from "@/app/components/mobile-nav";
import TopNav from "@/app/components/top-nav";
import { useGlobal } from "@/app/providers";

/**
 * The nav decision the other views inline, packaged for a server-rendered page.
 * No `isMobile === null` gate: the server renders the desktop nav, so the page below it is
 * painted at once and hydration matches. A phone swaps its nav in; both navs are fixed.
 */
export default function SiteNav() {
    const { isMobile } = useGlobal();
    return isMobile ? <MobileNav /> : <TopNav />;
}

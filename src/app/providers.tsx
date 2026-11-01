"use client";

import {
    createContext,
    useContext,
    useLayoutEffect,
    useState,
    useSyncExternalStore,
    type ReactNode,
} from "react";

/* The one definition of "mobile". The nav, the pond and the page layouts all read it. */
export const MOBILE_QUERY = "(max-width: 1023px)";

type GlobalState = {
    isMobile: boolean | null;
    isLight: boolean;
    toggleTheme: () => void;
};

const GlobalContext = createContext<GlobalState | undefined>(undefined);

/*
 * The theme lives on <html class="light"> — set before first paint by the boot script — so the
 * DOM is the source of truth and React subscribes to it instead of copying it into state.
 */
function subscribeTheme(onChange: () => void) {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("storage", onChange);
    return () => {
        observer.disconnect();
        window.removeEventListener("storage", onChange);
    };
}

const isLightNow = () => document.documentElement.classList.contains("light");

export function Providers({ children }: { children: ReactNode }) {
    const [isMobile, setIsMobile] = useState<boolean | null>(null);
    const isLight = useSyncExternalStore(subscribeTheme, isLightNow, () => false);

    useLayoutEffect(() => {
        const query = window.matchMedia(MOBILE_QUERY);
        const update = () => setIsMobile(query.matches);
        update();
        query.addEventListener("change", update);
        return () => query.removeEventListener("change", update);
    }, []);

    const toggleTheme = () => {
        const next = !isLightNow();
        document.documentElement.classList.toggle("light", next);
        try {
            localStorage.setItem("theme", next ? "light" : "dark");
        } catch {
            // Private mode with storage disabled: the class still changes for this visit.
        }
    };

    return (
        <GlobalContext.Provider value={{ isMobile, isLight, toggleTheme }}>
            {children}
        </GlobalContext.Provider>
    );
}

export function useGlobal() {
    const context = useContext(GlobalContext);
    if (!context) throw new Error("useGlobal must be used inside Providers");
    return context;
}

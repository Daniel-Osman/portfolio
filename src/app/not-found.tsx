import Link from "next/link";

export default function NotFound() {
    return (
        <main
            id="main"
            className="mx-auto flex min-h-dvh w-full max-w-[56rem] flex-col justify-center px-6 font-mono"
        >
            <p className="text-[12px] lowercase opacity-40">404</p>
            <h1 className="mt-3 text-[28px] leading-[1.2] tracking-[-0.01em]">
                that page isn&apos;t here.
            </h1>
            <p className="mt-4 max-w-[46ch] text-[14px] leading-relaxed opacity-60">
                The link may be old, or the page may never have existed. This site keeps three
                places: pond, projects and about.
            </p>
            <p className="mt-8 text-[14px]">
                <Link href="/" className="ink-link">
                    pond
                </Link>
                <span className="mx-2 opacity-40">/</span>
                <Link href="/projects" className="ink-link">
                    projects
                </Link>
                <span className="mx-2 opacity-40">/</span>
                <Link href="/about" className="ink-link">
                    about
                </Link>
            </p>
        </main>
    );
}

import Link from "next/link";
import type { RichText } from "@/app/data/projects";
import { isExternal } from "@/app/data/projects";

export default function ProseText({
    runs,
    className = "",
}: {
    runs: RichText;
    className?: string;
}) {
    return (
        <p className={className}>
            {runs.map((run, index) => {
                if (typeof run === "string") {
                    return <span key={index}>{run}</span>;
                }

                if (isExternal(run.href)) {
                    return (
                        <a
                            key={index}
                            href={run.href}
                            target="_blank"
                            rel="noreferrer"
                            className="ink-link"
                        >
                            {run.text}
                        </a>
                    );
                }

                return (
                    <Link key={index} href={run.href} className="ink-link">
                        {run.text}
                    </Link>
                );
            })}
        </p>
    );
}

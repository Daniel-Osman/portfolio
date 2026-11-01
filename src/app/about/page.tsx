import type { Metadata } from "next";
import AboutView from "@/app/components/about-view";

export const metadata: Metadata = {
    title: "About",
    description:
        "Daniel Osman is a developer and independent builder in Lebanon, working across full-stack software, AI-powered workflows and the business systems around them.",
};

export default function AboutPage() {
    return <AboutView />;
}

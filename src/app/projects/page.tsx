import type { Metadata } from "next";
import ProjectsView from "@/app/components/projects-view";

export const metadata: Metadata = {
    title: "Projects",
    description:
        "Selected work by Daniel Osman: cross-border operations, client platforms, B2B product architecture and agent-assisted development.",
};

export default function ProjectsPage() {
    return <ProjectsView />;
}

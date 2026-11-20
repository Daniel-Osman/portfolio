import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProjectView from "@/app/components/project-view";
import { getProject, projects } from "@/app/data/projects";

export const dynamicParams = false;

export function generateStaticParams() {
    return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const project = getProject(slug);
    if (!project) return {};

    return {
        title: project.name,
        description: project.description,
        openGraph: {
            type: "article",
            title: `${project.name} | Daniel Osman`,
            description: project.description,
            // This object replaces the root openGraph, so name the shared preview image here
            // too; without it the page ships no og:image at all.
            images: ["/opengraph-image"],
        },
    };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const project = getProject(slug);
    if (!project?.page) notFound();

    return <ProjectView slug={slug} />;
}

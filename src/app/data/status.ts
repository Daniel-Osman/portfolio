import type { ProjectStatus } from "./projects";

/**
 * What each status means on this site, in plain terms.
 * These notes describe the limits of the evidence; they are not performance claims.
 */
export const statusNotes: Record<ProjectStatus, string> = {
    "Operating business":
        "The service is operating. Customer figures, admin-tooling claims and performance outcomes are not published until they can be verified.",
    "Internal workflow":
        "Used inside Daniel's own workspace. No public release, customer adoption or benchmark is claimed.",
    "Client work":
        "Delivered as client work. Public samples, names and outcomes appear only with the client's approval.",
    "Architecture concept":
        "A product and systems concept. No shipped marketplace, live users or transaction volume is claimed.",
    "Workflow prototype":
        "A personal workflow prototype. It is not a public product and no usage metrics are claimed.",
};

/** Portfolio copy authored for this site. Facts trace to docs/BRAND_AND_CONTENT.md;
 * anything unconfirmed is labelled TBD, Ongoing or placeholder rather than guessed.
 *
 * A run is either literal text or a link. A case-study body is a list of blocks
 * so sub-headings and paragraphs keep their own rhythm inside one column.
 */
export type TextRun = string | { text: string; href: string };
export type RichText = TextRun[];
export type CaseStudyBlock =
    { kind: "heading"; text: string } | { kind: "paragraph"; runs: RichText };

export type ProjectStatus =
    | "Operating business"
    | "Internal workflow"
    | "Client work"
    | "Architecture concept"
    | "Workflow prototype";

export type Project = {
    slug: string;
    index: string;
    name: string;
    description: string;
    tech: string[];
    /** Time period. Unconfirmed periods are marked TBD, ongoing work says Ongoing. */
    year: string;
    /** Show on list cards, detail pages and teasers. */
    status: ProjectStatus;
    role: string;
    /** Optional public destination. No project has a verified demo URL yet. */
    link?: string;
    thumb: string;
    /** True while the supplied artwork is a layout-only placeholder. */
    thumbIsPlaceholder?: boolean;
    featured?: boolean;
    page?: {
        tagline: string;
        about: RichText;
        poster: string;
        story?: CaseStudyBlock[];
    };
};

export const projects: Project[] = [
    {
        index: "01",
        slug: "nfd-express",
        name: "NFD Express",
        description:
            "Operating business — UAE-to-Lebanon forwarding service. Work spans the service model, customer communication, digital brand, and shipment workflows.",
        tech: ["Operations", "Digital product", "Marketing"],
        year: "Ongoing",
        status: "Operating business",
        role: "Business operations, service design, branding, and software requirements",
        thumb: "/projects/nfd-express/preview.svg",
        thumbIsPlaceholder: true,
        featured: true,
        page: {
            tagline: "Making cross-border online shopping more accessible.",
            about: [
                "NFD Express is a forwarding operation that helps customers in Lebanon receive online purchases using a UAE delivery address. My work brings together service design, carrier coordination, pricing communication, brand assets, and an evolving vision for shipment administration.",
            ],
            poster: "/projects/nfd-express/preview.svg",
            story: [
                { kind: "heading", text: "The problem" },
                {
                    kind: "paragraph",
                    runs: [
                        "Some international shopping platforms are difficult to access directly from Lebanon. A forwarding service needs to make the handoff, shipment status and customer expectations understandable.",
                    ],
                },
                { kind: "heading", text: "My work" },
                {
                    kind: "paragraph",
                    runs: [
                        "I shaped the service offer, customer-facing messaging, campaign materials and workflow requirements around forwarding parcels from the UAE to Lebanon. The shipment admin app is not part of the public service yet, so it is not shown here.",
                    ],
                },
                { kind: "heading", text: "Where it stands" },
                {
                    kind: "paragraph",
                    runs: [
                        "This write-up is still being assembled. Approved campaign material, service pages and redacted shipment-status views are being prepared for publication, with customer names, addresses and tracking numbers left out.",
                    ],
                },
            ],
        },
    },
    {
        index: "02",
        slug: "helm",
        name: "Helm",
        description:
            "Internal workflow — an agent orchestration and review model for managing software and creative projects without reading every tool trace.",
        tech: ["OpenCode", "AI agents", "Governance"],
        year: "Ongoing",
        status: "Internal workflow",
        role: "Workflow design and agent orchestration",
        thumb: "/projects/helm/preview.svg",
        thumbIsPlaceholder: true,
        featured: true,
        page: {
            tagline: "A control layer for agent-assisted work.",
            about: [
                "Helm is my workspace-level agent routing approach: one user-facing captain delegates tasks to specialized decks, with scoped responsibilities and independent checks before work is accepted. The broader multi-machine Mission Control remains a separate design effort.",
            ],
            poster: "/projects/helm/preview.svg",
            story: [
                { kind: "heading", text: "Why it exists" },
                {
                    kind: "paragraph",
                    runs: [
                        "As AI coding workflows grew, supervising long execution traces became a bottleneck. The goal was to separate implementation from verification and make the results easier to trust.",
                    ],
                },
                { kind: "heading", text: "The system" },
                {
                    kind: "paragraph",
                    runs: [
                        "A routing layer assigns work to purpose-built decks, isolates access, and requires fresh-context milestone review. Build sessions do not certify their own output; documented evidence is required at acceptance gates.",
                    ],
                },
                { kind: "heading", text: "Where it stands" },
                {
                    kind: "paragraph",
                    runs: [
                        "A sanitized architecture diagram, an example task workflow and reviewer outcomes are being prepared. The status label above tracks what is actually in use, so nothing here reads as further along than it is.",
                    ],
                },
            ],
        },
    },
    {
        index: "03",
        slug: "americorp",
        name: "Americorp International",
        description:
            "Client work — product-content architecture, SEO planning, social media work, and marketing materials for a polymer distribution business.",
        tech: ["Content strategy", "SEO", "B2B"],
        year: "TBD",
        status: "Client work",
        role: "Digital marketing, product communication and content planning",
        thumb: "/projects/americorp/preview.svg",
        thumbIsPlaceholder: true,
        page: {
            tagline: "Making technical product information easier to find and use.",
            about: [
                "I worked on content and digital marketing initiatives for Americorp International, including communication around polymer categories, product information and B2B visibility. Sample deliverables are withheld here pending the client's approval.",
            ],
            poster: "/projects/americorp/preview.svg",
            story: [
                { kind: "heading", text: "Scope of work" },
                {
                    kind: "paragraph",
                    runs: [
                        "Activities included product information, SEO-oriented copy, campaign planning, and social media work.",
                    ],
                },
                { kind: "heading", text: "Where it stands" },
                {
                    kind: "paragraph",
                    runs: [
                        "Client-approved pages, campaign examples and product sheets are being collected. Performance figures will only appear here once analytics or the client can back them.",
                    ],
                },
            ],
        },
    },
    {
        index: "04",
        slug: "streamlnk",
        name: "StreamLnk",
        description:
            "Architecture concept — a multi-portal B2B platform connecting commodity buyers, suppliers, freight and operational partners.",
        tech: ["Product architecture", "B2B commerce", "Workflow design"],
        year: "TBD",
        status: "Architecture concept",
        role: "Product specification, workflows and systems architecture",
        thumb: "/projects/streamlnk/preview.svg",
        thumbIsPlaceholder: true,
        featured: true,
        page: {
            tagline: "One connected commercial workflow across multiple parties.",
            about: [
                "StreamLnk is a product architecture concept for multi-party B2B trade. The proposal covers buyer, agent, supplier, freight and services portals, with emphasis on verification, quote-to-order processes, pricing and fulfillment coordination. This entry documents design work, not a launched service.",
            ],
            poster: "/projects/streamlnk/preview.svg",
            story: [
                { kind: "heading", text: "The design challenge" },
                {
                    kind: "paragraph",
                    runs: [
                        "A B2B transaction involves many actors and handoffs: onboarding, RFQs, offers, payment decisions, logistics and documentation. The goal is to preserve clear states and responsibility boundaries across portals.",
                    ],
                },
                { kind: "heading", text: "Proposed architecture" },
                {
                    kind: "paragraph",
                    runs: [
                        "The concept separates buyer, supplier, freight and administration workflows, with shared transaction lifecycles and audit considerations.",
                    ],
                },
                { kind: "heading", text: "Status" },
                {
                    kind: "paragraph",
                    runs: [
                        "Architecture and product concept only. No working prototype has been built, and nothing here implies a launch.",
                    ],
                },
            ],
        },
    },
    {
        index: "05",
        slug: "isr",
        name: "International Skills Resource",
        description:
            "Client work — Saudi-market website messaging, localized Arabic content and advertising copy across services.",
        tech: ["Arabic localization", "Copywriting", "Campaign messaging"],
        year: "TBD",
        status: "Client work",
        role: "Localized copywriting and campaign content",
        thumb: "/projects/isr/preview.svg",
        thumbIsPlaceholder: true,
        page: {
            tagline: "Clearer service communication for a Saudi audience.",
            about: [
                "Client copywriting and marketing work focused on adapting service messaging for a Saudi audience, including localized site language and advertising concepts. Sample copy is not reproduced here.",
            ],
            poster: "/projects/isr/preview.svg",
            story: [
                { kind: "heading", text: "Approach" },
                {
                    kind: "paragraph",
                    runs: [
                        "Translate the business offer into audience-appropriate language instead of literal translation, keeping the service value proposition and campaign intent clear.",
                    ],
                },
                { kind: "heading", text: "What's public" },
                {
                    kind: "paragraph",
                    runs: [
                        "Side-by-side copy excerpts can appear here once the client approves their publication. Until then the work is described rather than reproduced.",
                    ],
                },
            ],
        },
    },
    {
        index: "06",
        slug: "mywiki",
        name: "MyWiki / First Mate",
        description:
            "Workflow prototype — a personal knowledge and project-management system connecting notes, research, local machines and developer tools.",
        tech: ["Knowledge systems", "Automation", "Obsidian"],
        year: "Ongoing",
        status: "Workflow prototype",
        role: "Personal systems design and workflow integration",
        thumb: "/projects/mywiki/preview.svg",
        thumbIsPlaceholder: true,
        page: {
            tagline: "A personal knowledge system built around practical work.",
            about: [
                "MyWiki / First Mate is an evolving approach to managing projects, reading, references and machine-local coding workflows. The emphasis is on durable information organization and moving tasks between a human, an orchestrator and specialist tools.",
            ],
            poster: "/projects/mywiki/preview.svg",
            story: [
                { kind: "heading", text: "Motivation" },
                {
                    kind: "paragraph",
                    runs: [
                        "As projects and research accumulate, finding the right note and continuing the right work becomes harder than collecting material.",
                    ],
                },
                { kind: "heading", text: "The workflow" },
                {
                    kind: "paragraph",
                    runs: [
                        "Separate active projects, reference libraries, machine-local tools and review steps; use a routing assistant to minimize manual context assembly.",
                    ],
                },
            ],
        },
    },
    {
        index: "07",
        slug: "tasteology",
        name: "Tasteology",
        description:
            "Client work — brand and content strategy covering messaging, outreach ideas and communication planning.",
        tech: ["Brand strategy", "Content", "Outreach"],
        year: "TBD",
        status: "Client work",
        role: "Digital messaging and content strategy",
        thumb: "/projects/tasteology/preview.svg",
        thumbIsPlaceholder: true,
        page: {
            tagline: "Making brand messaging useful across channels.",
            about: [
                "Work and planning around Tasteology's content direction, search themes and outreach messaging.",
            ],
            poster: "/projects/tasteology/preview.svg",
            story: [
                { kind: "heading", text: "Where it stands" },
                {
                    kind: "paragraph",
                    runs: [
                        "The brief, message framework, sample campaigns and final deliverables are being gathered for publication, subject to client approval.",
                    ],
                },
            ],
        },
    },
];

// Editorial order: deliberately not sorted by uncertain client-work dates.
export const featuredProjects = projects.filter((project) => project.featured).slice(0, 3);
export const getProject = (slug: string) => projects.find((project) => project.slug === slug);
export const projectHref = (project: Project): string | undefined =>
    project.page ? `/projects/${project.slug}` : project.link;
export const isExternal = (href: string) => /^https?:/.test(href);

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Next 16 rewrites an "agent rules" block into AGENTS.md on every dev start; this repo keeps
    // its own AGENTS.md as the single source of project instructions.
    agentRules: false,
    // Tailwind 4 runs as a Turbopack CSS loader in Next 16; there is no PostCSS config.
    turbopack: {
        rules: {
            "*.css": {
                loaders: ["@tailwindcss/turbopack"],
                as: "*.css",
            },
        },
    },
};

export default nextConfig;

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { profile } from "@/app/data/profile";

export const runtime = "nodejs";
export const alt = "Daniel Osman — full-stack developer and AI systems builder";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
 * The site's own typefaces, read from the `geist` package at build time. Same family the pages
 * use, so the picture and the page share a voice; no network fetch, this box cannot reach one.
 */
const fontsDir = join(process.cwd(), "node_modules/geist/dist/fonts");
const sansRegular = readFileSync(join(fontsDir, "geist-sans/Geist-Regular.ttf"));
const sansMedium = readFileSync(join(fontsDir, "geist-sans/Geist-Medium.ttf"));
const monoRegular = readFileSync(join(fontsDir, "geist-mono/GeistMono-Regular.ttf"));

// globals.css: --color-dark-background #1a1917, --color-dark-foreground #fff7f0.
const INK = "#1a1917";
const PAPER = "#fff7f0";
const CLAY = "#d95f2b";

export default function OpengraphImage() {
    return new ImageResponse(
        <div
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                backgroundColor: INK,
                color: PAPER,
                padding: "84px 88px 76px",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    flexGrow: 1,
                }}
            >
                <div
                    style={{
                        width: 52,
                        height: 3,
                        backgroundColor: CLAY,
                        marginBottom: 46,
                    }}
                />
                <div
                    style={{
                        fontSize: 108,
                        fontWeight: 500,
                        lineHeight: 1.02,
                        letterSpacing: "-0.045em",
                    }}
                >
                    Daniel Osman
                </div>
                <div
                    style={{
                        marginTop: 26,
                        fontSize: 34,
                        fontWeight: 400,
                        lineHeight: 1.3,
                        letterSpacing: "-0.01em",
                        color: "rgba(255, 247, 240, 0.62)",
                    }}
                >
                    {profile.role}
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
                <div
                    style={{
                        height: 1,
                        width: "100%",
                        backgroundColor: "rgba(255, 247, 240, 0.16)",
                        marginBottom: 28,
                    }}
                />
                <div
                    style={{
                        fontFamily: "Geist Mono",
                        fontSize: 22,
                        fontWeight: 400,
                        letterSpacing: "0.08em",
                        color: "rgba(255, 247, 240, 0.55)",
                    }}
                >
                    danielosman.com
                </div>
            </div>
        </div>,
        {
            ...size,
            fonts: [
                { name: "Geist Sans", data: sansRegular, style: "normal", weight: 400 },
                { name: "Geist Sans", data: sansMedium, style: "normal", weight: 500 },
                { name: "Geist Mono", data: monoRegular, style: "normal", weight: 400 },
            ],
        }
    );
}

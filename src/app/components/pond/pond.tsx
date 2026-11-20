"use client";

import { useEffect, useRef } from "react";

export type PondStats = { fish: number; pellets: number };

type Box = { left: number; top: number; right: number; bottom: number };

type Colourway = { body: string; back: string; patch: string; belly: string; eye: string };

/* Warm greys and one clay orange: the fish read on both the dark and the light pond. */
const COLOURWAYS: Colourway[] = [
    { body: "#8e8a82", back: "#4a4640", patch: "#d95f2b", belly: "#efe9df", eye: "#1a1917" },
    { body: "#d95f2b", back: "#a2441d", patch: "#f0a072", belly: "#f4e9dd", eye: "#241f1a" },
    { body: "#efe9df", back: "#8e8a82", patch: "#d95f2b", belly: "#fbf7f1", eye: "#241f1a" },
    { body: "#6f6a62", back: "#3a3630", patch: "#e0b17a", belly: "#c9c2b6", eye: "#0f0e0d" },
];

type Fish = {
    x: number;
    y: number;
    angle: number;
    speed: number;
    phase: number;
    length: number;
    way: Colourway;
    target: { x: number; y: number } | null;
    turn: number;
};

type Pellet = { x: number; y: number; age: number };

const AVOID = "[data-pond-avoid]";
const MAX_TURN = 0.022;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * The pond: a handful of pixel fish drifting behind the page, fed by a click.
 *
 * Every visit they start somewhere else. They steer around the text blocks, take pellets
 * dropped with the pointer, and are drawn as a lattice of cells following a curved spine,
 * so a fish is a shape rather than an image. Reduced motion gets one still frame.
 */
export default function Pond({
    className = "",
    onStats,
}: {
    className?: string;
    onStats?: (stats: PondStats) => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const statsRef = useRef(onStats);

    useEffect(() => {
        statsRef.current = onStats;
    }, [onStats]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
        let width = 0;
        let height = 0;
        let cell = 8;
        let fish: Fish[] = [];
        let pellets: Pellet[] = [];
        let avoid: Box[] = [];
        let frame = 0;
        let running = false;
        let last = 0;

        const measure = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = rect.width;
            height = rect.height;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            // A little coarser on phones, where the pond is smaller.
            cell = width < 700 ? 7 : 9;

            const base = canvas.getBoundingClientRect();
            avoid = Array.from(document.querySelectorAll<HTMLElement>(AVOID))
                .map((el) => el.getBoundingClientRect())
                .filter((r) => r.width > 0 && r.height > 0)
                .map((r) => ({
                    left: r.left - base.left - 24,
                    top: r.top - base.top - 24,
                    right: r.right - base.left + 24,
                    bottom: r.bottom - base.top + 24,
                }))
                .filter((b) => b.right > 0 && b.bottom > 0 && b.left < width && b.top < height);
        };

        const inside = (x: number, y: number, pad = 0) =>
            avoid.some(
                (b) =>
                    x > b.left - pad && x < b.right + pad && y > b.top - pad && y < b.bottom + pad
            );

        const roam = (from?: { x: number; y: number }) => {
            for (let attempt = 0; attempt < 30; attempt += 1) {
                const x = rand(width * 0.06, width * 0.94);
                const y = rand(height * 0.06, height * 0.94);
                if (inside(x, y, 14)) continue;
                if (from && Math.hypot(x - from.x, y - from.y) < width * 0.28) continue;
                return { x, y };
            }
            return { x: width * 0.5, y: height * 0.5 };
        };

        // Whether any part of the painted spine lies under a keep-out box, sampled where
        // drawFish puts the spine for this phase.
        const spineInType = (
            x: number,
            y: number,
            angle: number,
            length: number,
            phase: number
        ) => {
            const dirX = Math.cos(angle);
            const dirY = Math.sin(angle);
            for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
                const off = Math.sin(phase - t * 3.4) * Math.pow(t, 1.55) * 2.6 * cell;
                if (
                    inside(
                        x + dirX * t * length * cell - dirY * off,
                        y + dirY * t * length * cell + dirX * off
                    )
                ) {
                    return true;
                }
            }
            return false;
        };

        // Two spines keep this far apart: five cells each side clears a body's width (3.5 cells
        // of paint, plus sway) and leaves air between neighbours.
        const GAP = 2 * 5 * cell;

        // Closest approach between two painted spines, and the unit normal that pushes them
        // apart. Sampled at an eighth of a body, finer than the paint.
        const approach = (
            ax: number,
            ay: number,
            aAngle: number,
            aLength: number,
            bx: number,
            by: number,
            bAngle: number,
            bLength: number
        ) => {
            const adx = Math.cos(aAngle);
            const ady = Math.sin(aAngle);
            const bdx = Math.cos(bAngle);
            const bdy = Math.sin(bAngle);
            let distance = Infinity;
            let nx = 0;
            let ny = 0;
            for (let i = 0; i <= 8; i += 1) {
                const t = (i / 8) * aLength * cell;
                const px = ax + adx * t;
                const py = ay + ady * t;
                for (let j = 0; j <= 8; j += 1) {
                    const s = (j / 8) * bLength * cell;
                    const dx = bx + bdx * s - px;
                    const dy = by + bdy * s - py;
                    const d = Math.hypot(dx, dy);
                    if (d < distance) {
                        distance = d;
                        nx = dx;
                        ny = dy;
                    }
                }
            }
            const span = Math.hypot(nx, ny) || 0.001;
            return { distance, nx: nx / span, ny: ny / span };
        };

        const seed = () => {
            measure();
            const count = width < 700 ? 4 : 6;
            const placed: Fish[] = [];
            for (let index = 0; index < count; index += 1) {
                const length = Math.round(rand(24, 34));
                const angle = rand(-Math.PI, Math.PI);
                const phase = rand(0, Math.PI * 2);
                let spot = roam();
                for (let attempt = 0; attempt < 40; attempt += 1) {
                    if (
                        !spineInType(spot.x, spot.y, angle, length, phase) &&
                        placed.every(
                            (other) =>
                                approach(
                                    spot.x,
                                    spot.y,
                                    angle,
                                    length,
                                    other.x,
                                    other.y,
                                    other.angle,
                                    other.length
                                ).distance >= GAP
                        )
                    ) {
                        break;
                    }
                    spot = roam();
                }
                placed.push({
                    x: spot.x,
                    y: spot.y,
                    angle,
                    speed: rand(0.35, 0.7),
                    phase,
                    length,
                    way: COLOURWAYS[placed.length % COLOURWAYS.length],
                    target: null,
                    turn: rand(0.6, 1),
                });
            }
            fish = placed;
            pellets = [];
            statsRef.current?.({ fish: fish.length, pellets: 0 });
            emitStats();
        };

        let pelletsEaten = 0;
        const emitStats = () => statsRef.current?.({ fish: fish.length, pellets: pelletsEaten });

        const drawFish = (f: Fish) => {
            const { way } = f;
            const dirX = Math.cos(f.angle);
            const dirY = Math.sin(f.angle);
            const sideX = -dirY;
            const sideY = dirX;
            const total = f.length;
            const sway = (u: number) => Math.sin(f.phase - u * 3.4) * Math.pow(u, 1.55) * 2.6;

            // Round pixels: one arc per cell, about 1.2k a frame across the school, which is
            // dearer than a rect. The radius decides whether the lattice closes. At 0.62 the
            // dots pull apart and the body reads as a dot board rather than a solid shape;
            // 0.72 was the most solid setting measured.
            const paint = (x: number, y: number, colour: string) => {
                ctx.fillStyle = colour;
                ctx.beginPath();
                ctx.arc(
                    Math.round(x - cell / 2) + cell / 2,
                    Math.round(y - cell / 2) + cell / 2,
                    cell * 0.62,
                    0,
                    Math.PI * 2
                );
                ctx.fill();
            };

            // A body any part of which is under the type dims, so the copy stays readable while
            // the koi still swim behind it.
            ctx.globalAlpha = spineInType(f.x, f.y, f.angle, total, f.phase) ? 0.35 : 1;

            for (let i = 0; i < total; i += 1) {
                const u = i / (total - 1);
                const along = u * total * cell;
                const offset = sway(u) * cell;
                const cx = f.x + dirX * along + sideX * offset;
                const cy = f.y + dirY * along + sideY * offset;

                // Bream profile: blunt head, deepest chest, a wrist before the tail.
                const profile = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.62)), 0.85);
                const halfWidth = Math.max(0.52, 3.5 * profile * (1 - 0.42 * u));
                const rows = Math.max(1, Math.round(halfWidth));

                // The tail fan: the last few columns spread again to a fork.
                const tail = u > 0.9 ? Math.round((u - 0.9) * 26) : 0;

                for (let k = -rows - tail; k <= rows + tail; k += 1) {
                    if (tail > 0 && Math.abs(k) < rows && Math.abs(k) <= Math.abs(tail) - 1) {
                        continue; // leave the fork hollow
                    }
                    const band = k / (rows + 0.001);
                    let colour = way.body;
                    if (band < -0.32) colour = way.back;
                    else if (band > 0.66) colour = way.belly;

                    // One clay patch on the flank, offset along the body per fish.
                    if (u > 0.26 && u < 0.5 && Math.abs(band) < 0.62) colour = way.patch;
                    if (u > 0.56 && u < 0.66 && Math.abs(band) < 0.28) colour = way.back;

                    paint(cx + sideX * k * cell, cy + sideY * k * cell, colour);
                }

                // Eyes: two dark cells a little behind the nose, on the top edge.
                if (i === Math.round(total * 0.11)) {
                    const eye = rows * 0.72;
                    paint(cx + sideX * eye * cell, cy + sideY * eye * cell, way.eye);
                    paint(cx - sideX * eye * cell, cy - sideY * eye * cell, way.eye);
                }
            }

            ctx.globalAlpha = 1;
        };

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            for (const pellet of pellets) {
                const fade = Math.max(0.25, 1 - pellet.age / 600);
                ctx.fillStyle = `rgba(217, 95, 43, ${0.55 * fade})`;
                const size = Math.max(2, cell * 0.45);
                ctx.fillRect(pellet.x - size / 2, pellet.y - size / 2, size, size);
            }

            for (const f of fish) drawFish(f);
        };

        const step = (delta: number) => {
            for (const f of fish) {
                const nearest = f.target;
                const pellet = pellets.reduce<Pellet | null>((best, p) => {
                    const d = Math.hypot(p.x - f.x, p.y - f.y);
                    if (d > 340) return best;
                    if (!best) return p;
                    return d < Math.hypot(best.x - f.x, best.y - f.y) ? p : best;
                }, null);

                let goal = pellet ?? nearest;
                if (!goal) {
                    goal = { x: width * 0.5, y: height * 0.5 };
                }

                if (pellet) {
                    const d = Math.hypot(pellet.x - f.x, pellet.y - f.y);
                    if (d < cell * 2.2) {
                        pellets = pellets.filter((p) => p !== pellet);
                        pelletsEaten += 1;
                        emitStats();
                        f.target = roam(f);
                        continue;
                    }
                }
                if (!f.target || Math.hypot(f.target.x - f.x, f.target.y - f.y) < cell * 6) {
                    f.target = roam(f);
                }

                // Point at the pellet when there is one, otherwise wander.
                const aim = pellet ?? f.target;
                const desired = Math.atan2(aim.y - f.y, aim.x - f.x);
                let turn = desired - f.angle;
                while (turn > Math.PI) turn -= Math.PI * 2;
                while (turn < -Math.PI) turn += Math.PI * 2;
                const maxTurn = MAX_TURN * f.turn;
                f.angle += Math.max(-maxTurn, Math.min(maxTurn, turn));

                const urge = pellet ? 1.9 : 1;
                f.speed += ((pellet ? 1.5 : 0.7) - f.speed) * 0.02 * delta;
                f.x += Math.cos(f.angle) * f.speed * delta * urge;
                f.y += Math.sin(f.angle) * f.speed * delta * urge;
                f.phase += 0.16 * f.speed * delta + 0.04;

                // Stay inside the pond.
                f.x = Math.min(width - cell * 3, Math.max(cell * 3, f.x));
                f.y = Math.min(height - cell * 3, Math.max(cell * 3, f.y));

                // Turn back at the glass.
                if (
                    f.x < cell * 6 ||
                    f.x > width - cell * 6 ||
                    f.y < cell * 6 ||
                    f.y > height - cell * 6
                ) {
                    f.target = roam(f);
                }
            }

            // Bodies push apart rather than pass through each other. Purely positional, so it
            // can never jam a fish: three light passes, each moving both fish half the overlap.
            for (let pass = 0; pass < 3; pass += 1) {
                for (let i = 0; i < fish.length; i += 1) {
                    for (let j = i + 1; j < fish.length; j += 1) {
                        const a = fish[i];
                        const b = fish[j];
                        if (Math.hypot(b.x - a.x, b.y - a.y) > (a.length + b.length) * cell + GAP) {
                            continue;
                        }
                        const near = approach(
                            a.x,
                            a.y,
                            a.angle,
                            a.length,
                            b.x,
                            b.y,
                            b.angle,
                            b.length
                        );
                        if (near.distance >= GAP) continue;
                        const push = Math.min(3, (GAP - near.distance) / 2 / 3);
                        a.x -= near.nx * push;
                        a.y -= near.ny * push;
                        b.x += near.nx * push;
                        b.y += near.ny * push;
                    }
                }
            }

            for (const pellet of pellets) pellet.age += 1;
        };

        const loop = (time: number) => {
            if (!running) return;
            const delta = last ? Math.min(2.5, (time - last) / 16.67) : 1;
            last = time;
            step(delta);
            draw();
            frame = requestAnimationFrame(loop);
        };

        const start = () => {
            if (reduced.matches || running) return;
            running = true;
            last = 0;
            frame = requestAnimationFrame(loop);
        };

        const stop = () => {
            running = false;
            cancelAnimationFrame(frame);
        };

        const onPointerDown = (event: PointerEvent) => {
            // The page sits above the canvas, so the pond listens at the document and skips
            // anything the visitor meant to click: chrome, links, or the type itself.
            if (event.button !== 0) return;
            const target = event.target as Element | null;
            if (target?.closest("a, button, input, textarea, select")) return;
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
            if (inside(x, y)) return;
            if (pellets.length > 24) pellets.shift();
            pellets.push({ x, y, age: 0 });
            emitStats();
        };

        const onVisibility = () => (document.hidden ? stop() : start());
        const onMotion = () => {
            stop();
            if (reduced.matches) draw();
            else start();
        };

        seed();
        draw();
        start();

        const observer = new ResizeObserver(() => {
            seed();
            draw();
        });
        observer.observe(canvas);

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("visibilitychange", onVisibility);
        reduced.addEventListener("change", onMotion);

        return () => {
            stop();
            observer.disconnect();
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("visibilitychange", onVisibility);
            reduced.removeEventListener("change", onMotion);
        };
    }, []);

    return <canvas ref={canvasRef} aria-hidden className={className} />;
}

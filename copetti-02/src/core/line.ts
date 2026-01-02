/**
 * Line chart renderer.
 */

import type { Canvas } from "./canvas.ts";
import type { LinearScale } from "./scale.ts";
import type { ColorHex, Pixel } from "./types.ts";

/** Line data point. */
export interface LinePoint {
    readonly x: number;
    readonly y: number;
}

/** Line configuration. */
export interface LineConfig {
    readonly color: ColorHex;
    readonly width: Pixel;
    readonly smooth: boolean;
}

/** Default line configuration. */
export const DEFAULT_LINE_CONFIG: LineConfig = {
    color: "#4fc3f7",
    width: 2,
    smooth: false,
} as const;

/** Draws a line chart. */
export function drawLine(
    canvas: Canvas,
    points: readonly LinePoint[],
    xScale: LinearScale,
    yScale: LinearScale,
    config: LineConfig = DEFAULT_LINE_CONFIG,
): void {
    if (points.length < 2) return;

    const ctx = canvas.getContext();
    ctx.strokeStyle = config.color;
    ctx.lineWidth = config.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();

    const first = points[0];
    if (first === undefined) return;

    ctx.moveTo(xScale.toPixel(first.x), yScale.toPixel(first.y));

    for (let i = 1; i < points.length; i++) {
        const point = points[i];
        if (point === undefined) continue;

        const x = xScale.toPixel(point.x);
        const y = yScale.toPixel(point.y);

        if (config.smooth && i > 0) {
            const prev = points[i - 1];
            if (prev !== undefined) {
                const prevX = xScale.toPixel(prev.x);
                const prevY = yScale.toPixel(prev.y);
                const cpX = (prevX + x) / 2;
                ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
            }
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();
}

/** Draws a filled area under the line. */
export function drawArea(
    canvas: Canvas,
    points: readonly LinePoint[],
    xScale: LinearScale,
    yScale: LinearScale,
    baselineY: number,
    color: ColorHex,
    opacity = 0.2,
): void {
    if (points.length < 2) return;

    const ctx = canvas.getContext();
    const bounds = canvas.getBounds();

    const first = points[0];
    const last = points[points.length - 1];
    if (first === undefined || last === undefined) return;

    ctx.beginPath();
    ctx.moveTo(xScale.toPixel(first.x), yScale.toPixel(baselineY));

    for (const point of points) {
        ctx.lineTo(xScale.toPixel(point.x), yScale.toPixel(point.y));
    }

    ctx.lineTo(xScale.toPixel(last.x), yScale.toPixel(baselineY));
    ctx.closePath();

    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
}

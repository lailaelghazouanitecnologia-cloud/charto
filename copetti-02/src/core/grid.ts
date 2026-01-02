/**
 * Grid renderer for chart background.
 */

import type { Canvas } from "./canvas.ts";
import type { LinearScale } from "./scale.ts";
import type { ColorHex } from "./types.ts";

/** Grid configuration. */
export interface GridConfig {
    readonly color: ColorHex;
    readonly lineWidth: number;
    readonly horizontalLines: number;
    readonly verticalLines: number;
}

/** Default grid configuration. */
export const DEFAULT_GRID_CONFIG: GridConfig = {
    color: "#1a1a24",
    lineWidth: 1,
    horizontalLines: 5,
    verticalLines: 10,
} as const;

/** Draws the chart grid. */
export function drawGrid(
    canvas: Canvas,
    xScale: LinearScale,
    yScale: LinearScale,
    config: GridConfig = DEFAULT_GRID_CONFIG,
): void {
    const ctx = canvas.getContext();
    const bounds = canvas.getBounds();

    ctx.strokeStyle = config.color;
    ctx.lineWidth = config.lineWidth;

    const xConfig = xScale.getConfig();
    const yConfig = yScale.getConfig();

    // Horizontal lines.
    const hStep = (yConfig.domainMax - yConfig.domainMin) / config.horizontalLines;
    for (let i = 0; i <= config.horizontalLines; i++) {
        const value = yConfig.domainMin + i * hStep;
        const y = yScale.toPixel(value);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(bounds.width, y);
        ctx.stroke();
    }

    // Vertical lines.
    const vStep = (xConfig.domainMax - xConfig.domainMin) / config.verticalLines;
    for (let i = 0; i <= config.verticalLines; i++) {
        const value = xConfig.domainMin + i * vStep;
        const x = xScale.toPixel(value);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, bounds.height);
        ctx.stroke();
    }
}

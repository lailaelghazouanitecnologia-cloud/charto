/**
 * Axis renderer for price and time labels.
 */

import type { Canvas } from "./canvas.ts";
import type { LinearScale } from "./scale.ts";
import type { ColorHex, Pixel } from "./types.ts";

/** Axis configuration. */
export interface AxisConfig {
    readonly color: ColorHex;
    readonly font: string;
    readonly tickCount: number;
    readonly tickSize: Pixel;
    readonly padding: Pixel;
}

/** Default axis configuration. */
export const DEFAULT_AXIS_CONFIG: AxisConfig = {
    color: "#666666",
    font: "11px monospace",
    tickCount: 5,
    tickSize: 4,
    padding: 8,
} as const;

/** Formats a number for display. */
export type AxisFormatter = (value: number) => string;

/** Default price formatter. */
export const priceFormatter: AxisFormatter = (value) => value.toFixed(2);

/** Default time formatter. */
export const timeFormatter: AxisFormatter = (value) => {
    const date = new Date(value);
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
};

/** Draws the Y axis (price). */
export function drawYAxis(
    canvas: Canvas,
    scale: LinearScale,
    x: Pixel,
    config: AxisConfig = DEFAULT_AXIS_CONFIG,
    formatter: AxisFormatter = priceFormatter,
): void {
    const ctx = canvas.getContext();
    const scaleConfig = scale.getConfig();
    const range = scaleConfig.domainMax - scaleConfig.domainMin;
    const step = range / config.tickCount;

    ctx.fillStyle = config.color;
    ctx.font = config.font;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= config.tickCount; i++) {
        const value = scaleConfig.domainMin + i * step;
        const y = scale.toPixel(value);
        const label = formatter(value);

        // Draw tick.
        ctx.fillRect(x, y - 0.5, config.tickSize, 1);

        // Draw label.
        ctx.fillText(label, x + config.tickSize + config.padding, y);
    }
}

/** Draws the X axis (time). */
export function drawXAxis(
    canvas: Canvas,
    scale: LinearScale,
    y: Pixel,
    config: AxisConfig = DEFAULT_AXIS_CONFIG,
    formatter: AxisFormatter = timeFormatter,
): void {
    const ctx = canvas.getContext();
    const scaleConfig = scale.getConfig();
    const range = scaleConfig.domainMax - scaleConfig.domainMin;
    const step = range / config.tickCount;

    ctx.fillStyle = config.color;
    ctx.font = config.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (let i = 0; i <= config.tickCount; i++) {
        const value = scaleConfig.domainMin + i * step;
        const x = scale.toPixel(value);
        const label = formatter(value);

        // Draw tick.
        ctx.fillRect(x - 0.5, y, 1, config.tickSize);

        // Draw label.
        ctx.fillText(label, x, y + config.tickSize + config.padding);
    }
}

/** Calculates nice tick values for an axis. */
export function niceTickValues(
    min: number,
    max: number,
    count: number,
): number[] {
    const range = max - min;
    const roughStep = range / count;

    // Find a nice step size.
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
    const residual = roughStep / magnitude;

    let niceStep: number;
    if (residual <= 1.5) {
        niceStep = magnitude;
    } else if (residual <= 3) {
        niceStep = 2 * magnitude;
    } else if (residual <= 7) {
        niceStep = 5 * magnitude;
    } else {
        niceStep = 10 * magnitude;
    }

    const niceMin = Math.floor(min / niceStep) * niceStep;
    const niceMax = Math.ceil(max / niceStep) * niceStep;

    const values: number[] = [];
    for (let v = niceMin; v <= niceMax; v += niceStep) {
        values.push(v);
    }

    return values;
}

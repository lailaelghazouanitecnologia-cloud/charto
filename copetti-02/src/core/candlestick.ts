/**
 * Candlestick chart renderer.
 */

import type { Canvas } from "./canvas.ts";
import type { LinearScale } from "./scale.ts";
import type { Candle, ColorHex, Pixel } from "./types.ts";

/** Candlestick renderer configuration. */
export interface CandleConfig {
    readonly upColor: ColorHex;
    readonly downColor: ColorHex;
    readonly wickWidth: Pixel;
    readonly bodyWidth: Pixel;
}

/** Default candlestick configuration. */
export const DEFAULT_CANDLE_CONFIG: CandleConfig = {
    upColor: "#26a69a",
    downColor: "#ef5350",
    wickWidth: 1,
    bodyWidth: 8,
} as const;

/** Renders candlesticks on a canvas. */
export function drawCandles(
    canvas: Canvas,
    candles: readonly Candle[],
    xScale: LinearScale,
    yScale: LinearScale,
    config: CandleConfig = DEFAULT_CANDLE_CONFIG,
): void {
    const ctx = canvas.getContext();

    for (let i = 0; i < candles.length; i++) {
        const candle = candles[i];
        if (candle === undefined) continue;

        const x = xScale.toPixel(i);
        const isUp = candle.close >= candle.open;
        const color = isUp ? config.upColor : config.downColor;

        // Draw wick.
        const highY = yScale.toPixel(candle.high);
        const lowY = yScale.toPixel(candle.low);
        ctx.strokeStyle = color;
        ctx.lineWidth = config.wickWidth;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Draw body.
        const openY = yScale.toPixel(candle.open);
        const closeY = yScale.toPixel(candle.close);
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
        const halfWidth = config.bodyWidth / 2;

        ctx.fillStyle = color;
        ctx.fillRect(x - halfWidth, bodyTop, config.bodyWidth, bodyHeight);
    }
}

/** Gets price range from candles. */
export function getPriceRange(
    candles: readonly Candle[],
): { min: number; max: number } {
    if (candles.length === 0) {
        return { min: 0, max: 100 };
    }

    let min = Infinity;
    let max = -Infinity;

    for (const candle of candles) {
        if (candle.low < min) min = candle.low;
        if (candle.high > max) max = candle.high;
    }

    // Add padding.
    const range = max - min;
    const padding = range * 0.1;

    return {
        min: min - padding,
        max: max + padding,
    };
}

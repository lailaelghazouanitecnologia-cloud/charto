/**
 * Core types for the charting library.
 */

/** Pixel coordinate on canvas. */
export type Pixel = number;

/** Unit value in data space. */
export type Unit = number;

/** Hex color string. */
export type ColorHex = `#${string}`;

/** OHLC candlestick data point. */
export interface Candle {
    readonly timestamp: number;
    readonly open: number;
    readonly high: number;
    readonly low: number;
    readonly close: number;
    readonly volume?: number;
}

/** 2D point. */
export interface Point {
    readonly x: number;
    readonly y: number;
}

/** Rectangular bounds. */
export interface Bounds {
    readonly x: Pixel;
    readonly y: Pixel;
    readonly width: Pixel;
    readonly height: Pixel;
}

/** Chart configuration. */
export interface ChartConfig {
    readonly width: Pixel;
    readonly height: Pixel;
    readonly backgroundColor: ColorHex;
    readonly gridColor: ColorHex;
    readonly upColor: ColorHex;
    readonly downColor: ColorHex;
}

/** Default chart configuration. */
export const DEFAULT_CONFIG: ChartConfig = {
    width: 800,
    height: 400,
    backgroundColor: "transparent",
    gridColor: "rgba(255, 255, 255, 0.04)",
    upColor: "#22c55e",
    downColor: "#ef4444",
} as const;

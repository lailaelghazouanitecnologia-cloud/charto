/**
 * Candle drawer - renders candlestick charts.
 * Following Code Style Guide: Single responsibility, explicit types.
 *
 * @doc-tags core,drawer,candle
 */

import type { CanvasModel } from "../canvas/canvas.model.ts";
import type { Bounds } from "../../types/bounds.ts";
import type { Pixel, ColorHex } from "../../types/primitives.ts";
import type { VisualCandle } from "../model/visual-candle.ts";
import type { Viewable } from "../model/viewable.ts";
import type { PriceMovement } from "../../types/candle.ts";
import { BaseDrawer, type DrawerConfig } from "./drawer.ts";
import {
    getCandleBodyRect,
    getCandleYKeyPoints,
    getCandleWidthPixels,
    getCandleXCenter,
} from "../model/visual-candle.ts";

/**
 * Candle theme colors.
 */
export interface CandleTheme {
    readonly upColor: ColorHex;
    readonly downColor: ColorHex;
    readonly upWickColor: ColorHex;
    readonly downWickColor: ColorHex;
    readonly borderColor: ColorHex;
}

/**
 * Default candle theme (green/red).
 */
export const DEFAULT_CANDLE_THEME: CandleTheme = {
    upColor: "#26a69a",
    downColor: "#ef5350",
    upWickColor: "#26a69a",
    downWickColor: "#ef5350",
    borderColor: "#333333",
} as const;

/**
 * Candle drawer configuration.
 */
export interface CandleDrawerConfig extends DrawerConfig {
    readonly theme: CandleTheme;
    readonly showWicks: boolean;
    readonly showBorder: boolean;
    readonly candlePaddingPercent: number;
    readonly lineWidth: number;
}

/**
 * Default candle drawer configuration.
 */
export const DEFAULT_CANDLE_DRAWER_CONFIG: CandleDrawerConfig = {
    id: "candle-drawer",
    zIndex: 10,
    enabled: true,
    theme: DEFAULT_CANDLE_THEME,
    showWicks: true,
    showBorder: false,
    candlePaddingPercent: 0.15,
    lineWidth: 1,
} as const;

/**
 * Data required for candle drawing.
 */
export interface CandleDrawerData {
    readonly candles: readonly VisualCandle[];
    readonly viewable: Viewable;
}

/**
 * Candle drawer - renders candlestick charts.
 */
export class CandleDrawer extends BaseDrawer {
    private readonly config: CandleDrawerConfig;
    private data: CandleDrawerData | null = null;

    constructor(config: Partial<CandleDrawerConfig> = {}) {
        const merged = { ...DEFAULT_CANDLE_DRAWER_CONFIG, ...config };
        super(merged);
        this.config = merged;
    }

    /**
     * Sets the data to draw.
     */
    public setData(data: CandleDrawerData): void {
        this.data = data;
    }

    /**
     * Clears the data.
     */
    public clearData(): void {
        this.data = null;
    }

    /**
     * Draws all candles.
     */
    public draw(canvas: CanvasModel, _bounds: Bounds): void {
        if (this.data === null) {
            return;
        }

        const { candles, viewable } = this.data;
        if (candles.length === 0) {
            return;
        }

        const ctx = canvas.getContext();
        ctx.lineWidth = this.config.lineWidth;

        for (const candle of candles) {
            this.drawCandle(ctx, candle, viewable);
        }
    }

    /**
     * Draws a single candle.
     */
    private drawCandle(
        ctx: CanvasRenderingContext2D,
        candle: VisualCandle,
        viewable: Viewable,
    ): void {
        const { theme, showWicks, showBorder, candlePaddingPercent } = this.config;
        const direction = candle.direction;

        // Get colors based on direction.
        const bodyColor = this.getBodyColor(direction, theme);
        const wickColor = this.getWickColor(direction, theme);

        // Calculate pixel coordinates.
        const [wickTop, bodyTop, bodyBottom, wickBottom] = getCandleYKeyPoints(candle, viewable);
        const width = getCandleWidthPixels(candle, viewable);
        const centerX = getCandleXCenter(candle, viewable);

        // Draw based on width.
        if (width < 2) {
            // Very narrow - just draw a line.
            this.drawLine(ctx, centerX, wickTop, wickBottom, wickColor);
        } else if (width < 4) {
            // Narrow - draw wick and simple body.
            if (showWicks) {
                this.drawWicks(ctx, centerX, wickTop, wickBottom, bodyTop, bodyBottom, wickColor);
            }
            this.drawLine(ctx, centerX, bodyTop, bodyBottom, bodyColor);
        } else {
            // Normal width - draw full candle.
            const [x, y, w, h] = getCandleBodyRect(candle, viewable);

            // Apply padding.
            const padding = (w * candlePaddingPercent) / 2;
            const paddedX = x + padding;
            const paddedW = w - padding * 2;

            // Draw wicks.
            if (showWicks) {
                this.drawWicks(ctx, centerX, wickTop, wickBottom, bodyTop, bodyBottom, wickColor);
            }

            // Draw body.
            if (candle.isHollow) {
                this.drawHollowBody(ctx, paddedX, y, paddedW, h, wickColor);
            } else {
                this.drawFilledBody(ctx, paddedX, y, paddedW, h, bodyColor);
            }

            // Draw border.
            if (showBorder && !candle.isHollow) {
                this.drawBorder(ctx, paddedX, y, paddedW, h, theme.borderColor);
            }
        }
    }

    // ========================================================================
    // Drawing primitives
    // ========================================================================

    /**
     * Draws a vertical line.
     */
    private drawLine(
        ctx: CanvasRenderingContext2D,
        x: Pixel,
        y1: Pixel,
        y2: Pixel,
        color: ColorHex,
    ): void {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();
    }

    /**
     * Draws candle wicks.
     */
    private drawWicks(
        ctx: CanvasRenderingContext2D,
        x: Pixel,
        wickTop: Pixel,
        wickBottom: Pixel,
        bodyTop: Pixel,
        bodyBottom: Pixel,
        color: ColorHex,
    ): void {
        ctx.beginPath();
        ctx.strokeStyle = color;

        // Upper wick.
        ctx.moveTo(x, wickTop);
        ctx.lineTo(x, bodyTop);

        // Lower wick.
        ctx.moveTo(x, bodyBottom);
        ctx.lineTo(x, wickBottom);

        ctx.stroke();
    }

    /**
     * Draws a filled candle body.
     */
    private drawFilledBody(
        ctx: CanvasRenderingContext2D,
        x: Pixel,
        y: Pixel,
        width: Pixel,
        height: Pixel,
        color: ColorHex,
    ): void {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, width, Math.max(height, 1));
    }

    /**
     * Draws a hollow candle body (outline only).
     */
    private drawHollowBody(
        ctx: CanvasRenderingContext2D,
        x: Pixel,
        y: Pixel,
        width: Pixel,
        height: Pixel,
        color: ColorHex,
    ): void {
        ctx.strokeStyle = color;
        ctx.strokeRect(x, y, width, Math.max(height, 1));
    }

    /**
     * Draws candle border.
     */
    private drawBorder(
        ctx: CanvasRenderingContext2D,
        x: Pixel,
        y: Pixel,
        width: Pixel,
        height: Pixel,
        color: ColorHex,
    ): void {
        ctx.strokeStyle = color;
        ctx.strokeRect(x, y, width, height);
    }

    // ========================================================================
    // Color helpers
    // ========================================================================

    /**
     * Gets body color based on direction.
     */
    private getBodyColor(direction: PriceMovement, theme: CandleTheme): ColorHex {
        if (direction === "up") {
            return theme.upColor;
        }
        if (direction === "down") {
            return theme.downColor;
        }
        return theme.upColor; // "none" uses up color.
    }

    /**
     * Gets wick color based on direction.
     */
    private getWickColor(direction: PriceMovement, theme: CandleTheme): ColorHex {
        if (direction === "up") {
            return theme.upWickColor;
        }
        if (direction === "down") {
            return theme.downWickColor;
        }
        return theme.upWickColor; // "none" uses up color.
    }
}

/**
 * Creates a candle drawer.
 */
export function createCandleDrawer(
    config?: Partial<CandleDrawerConfig>,
): CandleDrawer {
    return new CandleDrawer(config);
}

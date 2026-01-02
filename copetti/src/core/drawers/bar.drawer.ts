/**
 * Bar drawer - renders OHLC bar charts.
 * Following Code Style Guide: Single responsibility, explicit types.
 *
 * @doc-tags core,drawer,bar,ohlc
 */

import type { CanvasModel } from "../canvas/canvas.model.ts";
import type { Bounds } from "../../types/bounds.ts";
import type { Pixel, ColorHex } from "../../types/primitives.ts";
import type { VisualCandle } from "../model/visual-candle.ts";
import type { Viewable } from "../model/viewable.ts";
import type { PriceMovement } from "../../types/candle.ts";
import { BaseDrawer, type DrawerConfig } from "./drawer.ts";
import { getCandleXCenter, getCandleWidthPixels } from "../model/visual-candle.ts";

/**
 * Bar drawer configuration.
 */
export interface BarDrawerConfig extends DrawerConfig {
    readonly upColor: ColorHex;
    readonly downColor: ColorHex;
    readonly noneColor: ColorHex;
    readonly lineWidth: number;
    readonly tickWidth: number;
}

/**
 * Default bar drawer configuration.
 */
export const DEFAULT_BAR_DRAWER_CONFIG: BarDrawerConfig = {
    id: "bar-drawer",
    zIndex: 10,
    enabled: true,
    upColor: "#26a69a",
    downColor: "#ef5350",
    noneColor: "#666666",
    lineWidth: 1,
    tickWidth: 4,
} as const;

/**
 * Data required for bar drawing.
 */
export interface BarDrawerData {
    readonly candles: readonly VisualCandle[];
    readonly viewable: Viewable;
}

/**
 * Bar drawer - renders OHLC bars.
 * Each bar shows: vertical line (high-low), left tick (open), right tick (close).
 */
export class BarDrawer extends BaseDrawer {
    private readonly config: BarDrawerConfig;
    private data: BarDrawerData | null = null;

    constructor(config: Partial<BarDrawerConfig> = {}) {
        const merged = { ...DEFAULT_BAR_DRAWER_CONFIG, ...config };
        super(merged);
        this.config = merged;
    }

    /**
     * Sets the data to draw.
     */
    public setData(data: BarDrawerData): void {
        this.data = data;
    }

    /**
     * Clears the data.
     */
    public clearData(): void {
        this.data = null;
    }

    /**
     * Draws all bars.
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
            this.drawBar(ctx, candle, viewable);
        }
    }

    /**
     * Draws a single OHLC bar.
     */
    private drawBar(
        ctx: CanvasRenderingContext2D,
        candle: VisualCandle,
        viewable: Viewable,
    ): void {
        const { open, high, low, close } = candle.candle;
        const centerX = getCandleXCenter(candle, viewable);
        const candleWidth = getCandleWidthPixels(candle, viewable);

        // Calculate tick width based on candle width.
        const tickWidth = Math.min(this.config.tickWidth, candleWidth / 2);

        // Convert prices to Y coordinates.
        const openY = viewable.toY(open);
        const highY = viewable.toY(high);
        const lowY = viewable.toY(low);
        const closeY = viewable.toY(close);

        // Get color based on direction.
        const color = this.getColor(candle.direction);
        ctx.strokeStyle = color;

        // Draw vertical line (high to low).
        ctx.beginPath();
        ctx.moveTo(centerX, highY);
        ctx.lineTo(centerX, lowY);
        ctx.stroke();

        // Draw open tick (left side).
        this.drawTick(ctx, centerX - tickWidth, centerX, openY);

        // Draw close tick (right side).
        this.drawTick(ctx, centerX, centerX + tickWidth, closeY);
    }

    /**
     * Draws a horizontal tick line.
     */
    private drawTick(
        ctx: CanvasRenderingContext2D,
        x1: Pixel,
        x2: Pixel,
        y: Pixel,
    ): void {
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
    }

    /**
     * Gets color based on price direction.
     */
    private getColor(direction: PriceMovement): ColorHex {
        if (direction === "up") {
            return this.config.upColor;
        }
        if (direction === "down") {
            return this.config.downColor;
        }
        return this.config.noneColor;
    }
}

/**
 * Creates a bar drawer.
 */
export function createBarDrawer(
    config?: Partial<BarDrawerConfig>,
): BarDrawer {
    return new BarDrawer(config);
}

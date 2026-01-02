/**
 * Volume drawer - renders volume bars.
 * Following Code Style Guide: Single responsibility, explicit types.
 *
 * @doc-tags core,drawer,volume
 */

import type { CanvasModel } from "../canvas/canvas.model.ts";
import type { Bounds } from "../../types/bounds.ts";
import type { Pixel, ColorHex, Volume } from "../../types/primitives.ts";
import type { VisualCandle } from "../model/visual-candle.ts";
import type { Viewable } from "../model/viewable.ts";
import type { PriceMovement } from "../../types/candle.ts";
import { BaseDrawer, type DrawerConfig } from "./drawer.ts";
import { getCandleXStart, getCandleWidthPixels } from "../model/visual-candle.ts";

/**
 * Volume bar data.
 */
export interface VolumeBar {
    readonly x: Pixel;
    readonly width: Pixel;
    readonly volume: Volume;
    readonly direction: PriceMovement;
}

/**
 * Volume drawer configuration.
 */
export interface VolumeDrawerConfig extends DrawerConfig {
    readonly upColor: ColorHex;
    readonly downColor: ColorHex;
    readonly noneColor: ColorHex;
    readonly opacity: number;
    readonly heightRatio: number;
    readonly showSeparately: boolean;
    readonly minBarHeight: Pixel;
}

/**
 * Default volume drawer configuration.
 */
export const DEFAULT_VOLUME_DRAWER_CONFIG: VolumeDrawerConfig = {
    id: "volume-drawer",
    zIndex: 5,
    enabled: true,
    upColor: "#26a69a",
    downColor: "#ef5350",
    noneColor: "#666666",
    opacity: 0.5,
    heightRatio: 0.25,
    showSeparately: false,
    minBarHeight: 2,
} as const;

/**
 * Data required for volume drawing.
 */
export interface VolumeDrawerData {
    readonly candles: readonly VisualCandle[];
    readonly viewable: Viewable;
    readonly maxVolume: Volume;
}

/**
 * Volume drawer - renders volume bars below or overlaid on chart.
 */
export class VolumeDrawer extends BaseDrawer {
    private readonly config: VolumeDrawerConfig;
    private data: VolumeDrawerData | null = null;

    constructor(config: Partial<VolumeDrawerConfig> = {}) {
        const merged = { ...DEFAULT_VOLUME_DRAWER_CONFIG, ...config };
        super(merged);
        this.config = merged;
    }

    /**
     * Sets the data to draw.
     */
    public setData(data: VolumeDrawerData): void {
        this.data = data;
    }

    /**
     * Clears the data.
     */
    public clearData(): void {
        this.data = null;
    }

    /**
     * Draws volume bars.
     */
    public draw(canvas: CanvasModel, bounds: Bounds): void {
        if (this.data === null) {
            return;
        }

        const { candles, viewable, maxVolume } = this.data;
        if (candles.length === 0 || maxVolume === 0) {
            return;
        }

        const ctx = canvas.getContext();
        ctx.globalAlpha = this.config.opacity;

        // Calculate volume area height.
        const volumeHeight = bounds.height * this.config.heightRatio;
        const volumeTop = bounds.y + bounds.height - volumeHeight;

        for (const candle of candles) {
            this.drawVolumeBar(ctx, candle, viewable, volumeTop, volumeHeight, maxVolume);
        }

        ctx.globalAlpha = 1;
    }

    /**
     * Draws a single volume bar.
     */
    private drawVolumeBar(
        ctx: CanvasRenderingContext2D,
        candle: VisualCandle,
        viewable: Viewable,
        volumeTop: Pixel,
        volumeHeight: Pixel,
        maxVolume: Volume,
    ): void {
        const volume = candle.candle.volume;
        if (volume === 0) {
            return;
        }

        // Calculate bar dimensions.
        const x = getCandleXStart(candle, viewable);
        const width = getCandleWidthPixels(candle, viewable);
        const normalizedHeight = (volume / maxVolume) * volumeHeight;
        const height = Math.max(normalizedHeight, this.config.minBarHeight);
        const y = volumeTop + volumeHeight - height;

        // Get color based on direction.
        const color = this.getColor(candle.direction);
        ctx.fillStyle = color;

        // Draw bar.
        if (width < 1) {
            // Very narrow - draw as line.
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + height);
            ctx.stroke();
        } else {
            ctx.fillRect(x, y, width, height);
        }
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
 * Creates a volume drawer.
 */
export function createVolumeDrawer(
    config?: Partial<VolumeDrawerConfig>,
): VolumeDrawer {
    return new VolumeDrawer(config);
}

/**
 * Calculates the maximum volume from a list of candles.
 */
export function calculateMaxVolume(candles: readonly VisualCandle[]): Volume {
    let max = 0;
    for (const candle of candles) {
        if (candle.candle.volume > max) {
            max = candle.candle.volume;
        }
    }
    return max;
}

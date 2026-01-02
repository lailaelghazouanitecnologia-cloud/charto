/**
 * Histogram drawer - renders histogram bars (e.g., for MACD).
 * Following Code Style Guide: Single responsibility, explicit types.
 *
 * @doc-tags core,drawer,histogram
 */

import type { CanvasModel } from "../canvas/canvas.model.ts";
import type { Bounds } from "../../types/bounds.ts";
import type { Pixel, ColorHex, Unit } from "../../types/primitives.ts";
import type { Viewable } from "../model/viewable.ts";
import { BaseDrawer, type DrawerConfig } from "./drawer.ts";

/**
 * Histogram data point.
 */
export interface HistogramPoint {
    readonly x: Unit;
    readonly value: number;
}

/**
 * Histogram drawer configuration.
 */
export interface HistogramDrawerConfig extends DrawerConfig {
    readonly positiveColor: ColorHex;
    readonly negativeColor: ColorHex;
    readonly positiveGrowingColor: ColorHex;
    readonly positiveFallingColor: ColorHex;
    readonly negativeGrowingColor: ColorHex;
    readonly negativeFallingColor: ColorHex;
    readonly useGradientColors: boolean;
    readonly barWidthRatio: number;
    readonly minBarWidth: Pixel;
    readonly maxBarWidth: Pixel;
    readonly opacity: number;
}

/**
 * Default histogram drawer configuration.
 */
export const DEFAULT_HISTOGRAM_DRAWER_CONFIG: HistogramDrawerConfig = {
    id: "histogram-drawer",
    zIndex: 8,
    enabled: true,
    positiveColor: "#26a69a",
    negativeColor: "#ef5350",
    positiveGrowingColor: "#4caf50",
    positiveFallingColor: "#81c784",
    negativeGrowingColor: "#e57373",
    negativeFallingColor: "#ef5350",
    useGradientColors: false,
    barWidthRatio: 0.8,
    minBarWidth: 1,
    maxBarWidth: 50,
    opacity: 1,
} as const;

/**
 * Data required for histogram drawing.
 */
export interface HistogramDrawerData {
    readonly points: readonly HistogramPoint[];
    readonly viewable: Viewable;
    readonly baselineY: number;
}

/**
 * Histogram drawer - renders vertical bars from baseline.
 */
export class HistogramDrawer extends BaseDrawer {
    private readonly config: HistogramDrawerConfig;
    private data: HistogramDrawerData | null = null;

    constructor(config: Partial<HistogramDrawerConfig> = {}) {
        const merged = { ...DEFAULT_HISTOGRAM_DRAWER_CONFIG, ...config };
        super(merged);
        this.config = merged;
    }

    /**
     * Sets the data to draw.
     */
    public setData(data: HistogramDrawerData): void {
        this.data = data;
    }

    /**
     * Clears the data.
     */
    public clearData(): void {
        this.data = null;
    }

    /**
     * Draws all histogram bars.
     */
    public draw(canvas: CanvasModel, _bounds: Bounds): void {
        if (this.data === null) {
            return;
        }

        const { points, viewable, baselineY } = this.data;
        if (points.length === 0) {
            return;
        }

        const ctx = canvas.getContext();
        ctx.globalAlpha = this.config.opacity;

        // Calculate baseline Y coordinate.
        const baselinePixelY = viewable.toY(baselineY);

        // Draw each bar.
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            if (point === undefined) {
                continue;
            }
            const prevPoint = i > 0 ? (points[i - 1] ?? null) : null;
            this.drawBar(ctx, point, prevPoint, viewable, baselinePixelY);
        }

        ctx.globalAlpha = 1;
    }

    /**
     * Draws a single histogram bar.
     */
    private drawBar(
        ctx: CanvasRenderingContext2D,
        point: HistogramPoint,
        prevPoint: HistogramPoint | null,
        viewable: Viewable,
        baselinePixelY: Pixel,
    ): void {
        const x = viewable.toX(point.x);
        const valueY = viewable.toY(point.value);

        // Calculate bar width.
        const barWidth = this.calculateBarWidth(viewable);
        const barX = x - barWidth / 2;

        // Calculate bar height and position.
        const barHeight = Math.abs(valueY - baselinePixelY);
        const barY = Math.min(valueY, baselinePixelY);

        // Get color based on value and trend.
        const color = this.getBarColor(point, prevPoint);
        ctx.fillStyle = color;

        // Draw bar.
        if (barWidth < 1) {
            // Very narrow - draw as line.
            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(x, barY);
            ctx.lineTo(x, barY + barHeight);
            ctx.stroke();
        } else {
            ctx.fillRect(barX, barY, barWidth, barHeight);
        }
    }

    /**
     * Calculates bar width based on viewable scale.
     */
    private calculateBarWidth(viewable: Viewable): Pixel {
        // Assume 1 unit spacing between points.
        const unitWidth = Math.abs(viewable.toX(1) - viewable.toX(0));
        const width = unitWidth * this.config.barWidthRatio;
        return Math.max(
            this.config.minBarWidth,
            Math.min(this.config.maxBarWidth, width),
        );
    }

    /**
     * Gets bar color based on value and trend.
     */
    private getBarColor(
        point: HistogramPoint,
        prevPoint: HistogramPoint | null,
    ): ColorHex {
        const isPositive = point.value >= 0;

        if (!this.config.useGradientColors || prevPoint === null) {
            return isPositive ? this.config.positiveColor : this.config.negativeColor;
        }

        // Use gradient colors based on trend.
        const isGrowing = point.value > prevPoint.value;

        if (isPositive) {
            return isGrowing
                ? this.config.positiveGrowingColor
                : this.config.positiveFallingColor;
        }

        return isGrowing
            ? this.config.negativeGrowingColor
            : this.config.negativeFallingColor;
    }
}

/**
 * Creates a histogram drawer.
 */
export function createHistogramDrawer(
    config?: Partial<HistogramDrawerConfig>,
): HistogramDrawer {
    return new HistogramDrawer(config);
}

/**
 * Creates histogram points from values.
 */
export function createHistogramPoints(
    values: readonly number[],
    startX: Unit = 0,
): HistogramPoint[] {
    return values.map((value, index) => ({
        x: startX + index,
        value,
    }));
}

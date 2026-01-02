/**
 * Axis drawers - renders X and Y axis with labels.
 * Following Code Style Guide: Single responsibility, explicit types.
 *
 * @doc-tags core,drawer,axis
 */

import type { CanvasModel } from "../canvas/canvas.model.ts";
import type { Bounds } from "../../types/bounds.ts";
import type { Pixel, ColorHex } from "../../types/primitives.ts";
import type { Viewable } from "../model/viewable.ts";
import { BaseDrawer, type DrawerConfig } from "./drawer.ts";

/**
 * Axis label data.
 */
export interface AxisLabel {
    readonly value: number;
    readonly text: string;
    readonly position: Pixel;
}

/**
 * Axis drawer configuration.
 */
export interface AxisDrawerConfig extends DrawerConfig {
    readonly lineColor: ColorHex;
    readonly textColor: ColorHex;
    readonly backgroundColor: ColorHex;
    readonly lineWidth: number;
    readonly fontSize: number;
    readonly fontFamily: string;
    readonly labelPadding: number;
    readonly tickSize: number;
    readonly showTicks: boolean;
    readonly showLine: boolean;
}

/**
 * Default axis drawer configuration.
 */
export const DEFAULT_AXIS_DRAWER_CONFIG: AxisDrawerConfig = {
    id: "axis-drawer",
    zIndex: 20,
    enabled: true,
    lineColor: "#444444",
    textColor: "#aaaaaa",
    backgroundColor: "#1a1a1a",
    lineWidth: 1,
    fontSize: 11,
    fontFamily: "monospace",
    labelPadding: 4,
    tickSize: 4,
    showTicks: true,
    showLine: true,
} as const;

// ============================================================================
// X-Axis Drawer
// ============================================================================

/**
 * X-Axis drawer configuration.
 */
export interface XAxisDrawerConfig extends AxisDrawerConfig {
    readonly height: Pixel;
    readonly labelCount: number;
}

/**
 * Default X-axis configuration.
 */
export const DEFAULT_X_AXIS_CONFIG: XAxisDrawerConfig = {
    ...DEFAULT_AXIS_DRAWER_CONFIG,
    id: "x-axis-drawer",
    height: 24,
    labelCount: 6,
} as const;

/**
 * X-Axis data.
 */
export interface XAxisData {
    readonly labels: readonly AxisLabel[];
    readonly viewable: Viewable;
}

/**
 * X-Axis drawer - renders horizontal axis with time labels.
 */
export class XAxisDrawer extends BaseDrawer {
    private readonly config: XAxisDrawerConfig;
    private data: XAxisData | null = null;

    constructor(config: Partial<XAxisDrawerConfig> = {}) {
        const merged = { ...DEFAULT_X_AXIS_CONFIG, ...config };
        super(merged);
        this.config = merged;
    }

    /**
     * Sets the data to draw.
     */
    public setData(data: XAxisData): void {
        this.data = data;
    }

    /**
     * Gets the axis height.
     */
    public getHeight(): Pixel {
        return this.config.height;
    }

    /**
     * Draws the X-axis.
     */
    public draw(canvas: CanvasModel, bounds: Bounds): void {
        const ctx = canvas.getContext();

        // Calculate axis bounds (at bottom of chart).
        const axisY = bounds.y + bounds.height - this.config.height;

        // Draw background.
        ctx.fillStyle = this.config.backgroundColor;
        ctx.fillRect(bounds.x, axisY, bounds.width, this.config.height);

        // Draw axis line.
        if (this.config.showLine) {
            ctx.strokeStyle = this.config.lineColor;
            ctx.lineWidth = this.config.lineWidth;
            ctx.beginPath();
            ctx.moveTo(bounds.x, axisY);
            ctx.lineTo(bounds.x + bounds.width, axisY);
            ctx.stroke();
        }

        // Draw labels.
        if (this.data !== null) {
            this.drawLabels(ctx, bounds, axisY, this.data.labels);
        }
    }

    /**
     * Draws axis labels.
     */
    private drawLabels(
        ctx: CanvasRenderingContext2D,
        bounds: Bounds,
        axisY: Pixel,
        labels: readonly AxisLabel[],
    ): void {
        ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
        ctx.fillStyle = this.config.textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        for (const label of labels) {
            const x = label.position;

            // Skip if outside bounds.
            if (x < bounds.x || x > bounds.x + bounds.width) {
                continue;
            }

            // Draw tick.
            if (this.config.showTicks) {
                ctx.strokeStyle = this.config.lineColor;
                ctx.beginPath();
                ctx.moveTo(x, axisY);
                ctx.lineTo(x, axisY + this.config.tickSize);
                ctx.stroke();
            }

            // Draw label.
            const labelY = axisY + this.config.tickSize + this.config.labelPadding;
            ctx.fillText(label.text, x, labelY);
        }
    }
}

// ============================================================================
// Y-Axis Drawer
// ============================================================================

/**
 * Y-Axis drawer configuration.
 */
export interface YAxisDrawerConfig extends AxisDrawerConfig {
    readonly width: Pixel;
    readonly labelCount: number;
    readonly position: "left" | "right";
}

/**
 * Default Y-axis configuration.
 */
export const DEFAULT_Y_AXIS_CONFIG: YAxisDrawerConfig = {
    ...DEFAULT_AXIS_DRAWER_CONFIG,
    id: "y-axis-drawer",
    width: 60,
    labelCount: 5,
    position: "right",
} as const;

/**
 * Y-Axis data.
 */
export interface YAxisData {
    readonly labels: readonly AxisLabel[];
    readonly viewable: Viewable;
}

/**
 * Y-Axis drawer - renders vertical axis with price labels.
 */
export class YAxisDrawer extends BaseDrawer {
    private readonly config: YAxisDrawerConfig;
    private data: YAxisData | null = null;

    constructor(config: Partial<YAxisDrawerConfig> = {}) {
        const merged = { ...DEFAULT_Y_AXIS_CONFIG, ...config };
        super(merged);
        this.config = merged;
    }

    /**
     * Sets the data to draw.
     */
    public setData(data: YAxisData): void {
        this.data = data;
    }

    /**
     * Gets the axis width.
     */
    public getWidth(): Pixel {
        return this.config.width;
    }

    /**
     * Gets the axis position.
     */
    public getPosition(): "left" | "right" {
        return this.config.position;
    }

    /**
     * Draws the Y-axis.
     */
    public draw(canvas: CanvasModel, bounds: Bounds): void {
        const ctx = canvas.getContext();

        // Calculate axis bounds.
        const axisX =
            this.config.position === "right"
                ? bounds.x + bounds.width - this.config.width
                : bounds.x;

        // Draw background.
        ctx.fillStyle = this.config.backgroundColor;
        ctx.fillRect(axisX, bounds.y, this.config.width, bounds.height);

        // Draw axis line.
        if (this.config.showLine) {
            ctx.strokeStyle = this.config.lineColor;
            ctx.lineWidth = this.config.lineWidth;
            const lineX = this.config.position === "right" ? axisX : axisX + this.config.width;
            ctx.beginPath();
            ctx.moveTo(lineX, bounds.y);
            ctx.lineTo(lineX, bounds.y + bounds.height);
            ctx.stroke();
        }

        // Draw labels.
        if (this.data !== null) {
            this.drawLabels(ctx, bounds, axisX, this.data.labels);
        }
    }

    /**
     * Draws axis labels.
     */
    private drawLabels(
        ctx: CanvasRenderingContext2D,
        bounds: Bounds,
        axisX: Pixel,
        labels: readonly AxisLabel[],
    ): void {
        ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
        ctx.fillStyle = this.config.textColor;
        ctx.textBaseline = "middle";

        const isRight = this.config.position === "right";
        ctx.textAlign = isRight ? "left" : "right";

        const labelX = isRight
            ? axisX + this.config.tickSize + this.config.labelPadding
            : axisX + this.config.width - this.config.tickSize - this.config.labelPadding;

        for (const label of labels) {
            const y = label.position;

            // Skip if outside bounds.
            if (y < bounds.y || y > bounds.y + bounds.height) {
                continue;
            }

            // Draw tick.
            if (this.config.showTicks) {
                ctx.strokeStyle = this.config.lineColor;
                ctx.beginPath();
                if (isRight) {
                    ctx.moveTo(axisX, y);
                    ctx.lineTo(axisX + this.config.tickSize, y);
                } else {
                    ctx.moveTo(axisX + this.config.width, y);
                    ctx.lineTo(axisX + this.config.width - this.config.tickSize, y);
                }
                ctx.stroke();
            }

            // Draw label.
            ctx.fillText(label.text, labelX, y);
        }
    }
}

// ============================================================================
// Factory functions
// ============================================================================

/**
 * Creates an X-axis drawer.
 */
export function createXAxisDrawer(
    config?: Partial<XAxisDrawerConfig>,
): XAxisDrawer {
    return new XAxisDrawer(config);
}

/**
 * Creates a Y-axis drawer.
 */
export function createYAxisDrawer(
    config?: Partial<YAxisDrawerConfig>,
): YAxisDrawer {
    return new YAxisDrawer(config);
}

// ============================================================================
// Label generation utilities
// ============================================================================

/**
 * Generates evenly spaced axis labels.
 *
 * @param min - Minimum value.
 * @param max - Maximum value.
 * @param count - Number of labels.
 * @param formatter - Value formatter.
 * @param toPixel - Function to convert value to pixel position.
 * @returns Array of axis labels.
 */
export function generateAxisLabels(
    min: number,
    max: number,
    count: number,
    formatter: (value: number) => string,
    toPixel: (value: number) => Pixel,
): AxisLabel[] {
    if (count <= 0 || max <= min) {
        return [];
    }

    const labels: AxisLabel[] = [];
    const step = (max - min) / (count + 1);

    for (let i = 1; i <= count; i++) {
        const value = min + step * i;
        labels.push({
            value,
            text: formatter(value),
            position: toPixel(value),
        });
    }

    return labels;
}

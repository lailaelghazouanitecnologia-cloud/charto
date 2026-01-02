/**
 * Area drawer - renders area charts.
 * Following Code Style Guide: Single responsibility, explicit types.
 *
 * @doc-tags core,drawer,area
 */

import type { CanvasModel } from "../canvas/canvas.model.ts";
import type { Bounds } from "../../types/bounds.ts";
import type { Pixel, ColorHex } from "../../types/primitives.ts";
import type { Viewable } from "../model/viewable.ts";
import type { LinePoint } from "./line.drawer.ts";
import { BaseDrawer, type DrawerConfig } from "./drawer.ts";

/**
 * Area drawer configuration.
 */
export interface AreaDrawerConfig extends DrawerConfig {
    readonly lineColor: ColorHex;
    readonly lineWidth: number;
    readonly fillColor: ColorHex;
    readonly fillOpacity: number;
    readonly gradientEnabled: boolean;
    readonly gradientTopColor: ColorHex;
    readonly gradientBottomColor: ColorHex;
    readonly baselineY: number | "bottom";
}

/**
 * Default area drawer configuration.
 */
export const DEFAULT_AREA_DRAWER_CONFIG: AreaDrawerConfig = {
    id: "area-drawer",
    zIndex: 5,
    enabled: true,
    lineColor: "#2196f3",
    lineWidth: 2,
    fillColor: "#2196f3",
    fillOpacity: 0.2,
    gradientEnabled: true,
    gradientTopColor: "rgba(33, 150, 243, 0.4)",
    gradientBottomColor: "rgba(33, 150, 243, 0)",
    baselineY: "bottom",
} as const;

/**
 * Data required for area drawing.
 */
export interface AreaDrawerData {
    readonly points: readonly LinePoint[];
    readonly viewable: Viewable;
}

/**
 * Area drawer - renders area charts with fill.
 */
export class AreaDrawer extends BaseDrawer {
    private readonly config: AreaDrawerConfig;
    private data: AreaDrawerData | null = null;

    constructor(config: Partial<AreaDrawerConfig> = {}) {
        const merged = { ...DEFAULT_AREA_DRAWER_CONFIG, ...config };
        super(merged);
        this.config = merged;
    }

    /**
     * Sets the data to draw.
     */
    public setData(data: AreaDrawerData): void {
        this.data = data;
    }

    /**
     * Clears the data.
     */
    public clearData(): void {
        this.data = null;
    }

    /**
     * Draws the area chart.
     */
    public draw(canvas: CanvasModel, bounds: Bounds): void {
        if (this.data === null) {
            return;
        }

        const { points, viewable } = this.data;
        if (points.length < 2) {
            return;
        }

        const ctx = canvas.getContext();

        // Calculate baseline Y.
        const baselineY =
            this.config.baselineY === "bottom"
                ? bounds.y + bounds.height
                : viewable.toY(this.config.baselineY);

        // Draw filled area.
        this.drawArea(ctx, points, viewable, baselineY, bounds);

        // Draw line on top.
        this.drawLine(ctx, points, viewable);
    }

    /**
     * Draws the filled area.
     */
    private drawArea(
        ctx: CanvasRenderingContext2D,
        points: readonly LinePoint[],
        viewable: Viewable,
        baselineY: Pixel,
        bounds: Bounds,
    ): void {
        const firstPoint = points[0];
        if (firstPoint === undefined) {
            return;
        }

        ctx.beginPath();

        // Start at first point.
        const firstX = viewable.toX(firstPoint.x);
        const firstY = viewable.toY(firstPoint.y);
        ctx.moveTo(firstX, firstY);

        // Draw line through all points.
        for (let i = 1; i < points.length; i++) {
            const point = points[i];
            if (point !== undefined) {
                ctx.lineTo(viewable.toX(point.x), viewable.toY(point.y));
            }
        }

        // Close the area to the baseline.
        const lastPoint = points[points.length - 1];
        if (lastPoint !== undefined) {
            const lastX = viewable.toX(lastPoint.x);
            ctx.lineTo(lastX, baselineY);
            ctx.lineTo(firstX, baselineY);
            ctx.closePath();
        }

        // Fill with gradient or solid color.
        if (this.config.gradientEnabled) {
            const gradient = ctx.createLinearGradient(0, bounds.y, 0, baselineY);
            gradient.addColorStop(0, this.config.gradientTopColor);
            gradient.addColorStop(1, this.config.gradientBottomColor);
            ctx.fillStyle = gradient;
        } else {
            ctx.globalAlpha = this.config.fillOpacity;
            ctx.fillStyle = this.config.fillColor;
        }

        ctx.fill();
        ctx.globalAlpha = 1;
    }

    /**
     * Draws the line on top of the area.
     */
    private drawLine(
        ctx: CanvasRenderingContext2D,
        points: readonly LinePoint[],
        viewable: Viewable,
    ): void {
        const firstPoint = points[0];
        if (firstPoint === undefined) {
            return;
        }

        ctx.strokeStyle = this.config.lineColor;
        ctx.lineWidth = this.config.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(viewable.toX(firstPoint.x), viewable.toY(firstPoint.y));

        for (let i = 1; i < points.length; i++) {
            const point = points[i];
            if (point !== undefined) {
                ctx.lineTo(viewable.toX(point.x), viewable.toY(point.y));
            }
        }

        ctx.stroke();
    }
}

/**
 * Creates an area drawer.
 */
export function createAreaDrawer(
    config?: Partial<AreaDrawerConfig>,
): AreaDrawer {
    return new AreaDrawer(config);
}

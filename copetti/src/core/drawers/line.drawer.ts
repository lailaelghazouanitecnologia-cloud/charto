/**
 * Line drawer - renders line charts.
 * Following Code Style Guide: Single responsibility, explicit types.
 *
 * @doc-tags core,drawer,line
 */

import type { CanvasModel } from "../canvas/canvas.model.ts";
import type { Bounds } from "../../types/bounds.ts";
import type { Pixel, ColorHex } from "../../types/primitives.ts";
import type { Viewable } from "../model/viewable.ts";
import { BaseDrawer, type DrawerConfig } from "./drawer.ts";

/**
 * Data point for line chart.
 */
export interface LinePoint {
    readonly x: number;
    readonly y: number;
}

/**
 * Line drawer configuration.
 */
export interface LineDrawerConfig extends DrawerConfig {
    readonly lineColor: ColorHex;
    readonly lineWidth: number;
    readonly lineCap: CanvasLineCap;
    readonly lineJoin: CanvasLineJoin;
    readonly lineDash: readonly number[];
    readonly showPoints: boolean;
    readonly pointRadius: Pixel;
    readonly pointColor: ColorHex;
}

/**
 * Default line drawer configuration.
 */
export const DEFAULT_LINE_DRAWER_CONFIG: LineDrawerConfig = {
    id: "line-drawer",
    zIndex: 10,
    enabled: true,
    lineColor: "#2196f3",
    lineWidth: 2,
    lineCap: "round",
    lineJoin: "round",
    lineDash: [],
    showPoints: false,
    pointRadius: 3,
    pointColor: "#2196f3",
} as const;

/**
 * Data required for line drawing.
 */
export interface LineDrawerData {
    readonly points: readonly LinePoint[];
    readonly viewable: Viewable;
}

/**
 * Line drawer - renders line charts.
 */
export class LineDrawer extends BaseDrawer {
    private readonly config: LineDrawerConfig;
    private data: LineDrawerData | null = null;

    constructor(config: Partial<LineDrawerConfig> = {}) {
        const merged = { ...DEFAULT_LINE_DRAWER_CONFIG, ...config };
        super(merged);
        this.config = merged;
    }

    /**
     * Sets the data to draw.
     */
    public setData(data: LineDrawerData): void {
        this.data = data;
    }

    /**
     * Clears the data.
     */
    public clearData(): void {
        this.data = null;
    }

    /**
     * Draws the line chart.
     */
    public draw(canvas: CanvasModel, _bounds: Bounds): void {
        if (this.data === null) {
            return;
        }

        const { points, viewable } = this.data;
        if (points.length < 2) {
            return;
        }

        const ctx = canvas.getContext();

        // Setup line style.
        ctx.strokeStyle = this.config.lineColor;
        ctx.lineWidth = this.config.lineWidth;
        ctx.lineCap = this.config.lineCap;
        ctx.lineJoin = this.config.lineJoin;

        if (this.config.lineDash.length > 0) {
            ctx.setLineDash([...this.config.lineDash]);
        }

        // Draw line.
        ctx.beginPath();

        const firstPoint = points[0];
        if (firstPoint !== undefined) {
            ctx.moveTo(viewable.toX(firstPoint.x), viewable.toY(firstPoint.y));
        }

        for (let i = 1; i < points.length; i++) {
            const point = points[i];
            if (point !== undefined) {
                ctx.lineTo(viewable.toX(point.x), viewable.toY(point.y));
            }
        }

        ctx.stroke();

        // Reset line dash.
        if (this.config.lineDash.length > 0) {
            ctx.setLineDash([]);
        }

        // Draw points if enabled.
        if (this.config.showPoints) {
            this.drawPoints(ctx, points, viewable);
        }
    }

    /**
     * Draws points on the line.
     */
    private drawPoints(
        ctx: CanvasRenderingContext2D,
        points: readonly LinePoint[],
        viewable: Viewable,
    ): void {
        ctx.fillStyle = this.config.pointColor;

        for (const point of points) {
            const x = viewable.toX(point.x);
            const y = viewable.toY(point.y);

            ctx.beginPath();
            ctx.arc(x, y, this.config.pointRadius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

/**
 * Creates a line drawer.
 */
export function createLineDrawer(
    config?: Partial<LineDrawerConfig>,
): LineDrawer {
    return new LineDrawer(config);
}

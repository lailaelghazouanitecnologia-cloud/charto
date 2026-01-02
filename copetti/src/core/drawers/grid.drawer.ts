/**
 * Grid drawer - renders chart grid lines.
 * Following Code Style Guide: Single responsibility, explicit types.
 *
 * @doc-tags core,drawer,grid
 */

import type { CanvasModel } from "../canvas/canvas.model.ts";
import type { Bounds } from "../../types/bounds.ts";
import type { Pixel, ColorHex } from "../../types/primitives.ts";
import { BaseDrawer, type DrawerConfig } from "./drawer.ts";

/**
 * Grid drawer configuration.
 */
export interface GridDrawerConfig extends DrawerConfig {
    readonly lineColor: ColorHex;
    readonly lineWidth: number;
    readonly lineDash: readonly number[];
    readonly horizontalLines: number;
    readonly verticalLines: number;
}

/**
 * Default grid drawer configuration.
 */
export const DEFAULT_GRID_DRAWER_CONFIG: GridDrawerConfig = {
    id: "grid-drawer",
    zIndex: 0,
    enabled: true,
    lineColor: "#2a2a2a",
    lineWidth: 1,
    lineDash: [],
    horizontalLines: 5,
    verticalLines: 6,
} as const;

/**
 * Grid line positions.
 */
export interface GridLines {
    readonly horizontalY: readonly Pixel[];
    readonly verticalX: readonly Pixel[];
}

/**
 * Grid drawer - renders horizontal and vertical grid lines.
 */
export class GridDrawer extends BaseDrawer {
    private readonly config: GridDrawerConfig;
    private customLines: GridLines | null = null;

    constructor(config: Partial<GridDrawerConfig> = {}) {
        const merged = { ...DEFAULT_GRID_DRAWER_CONFIG, ...config };
        super(merged);
        this.config = merged;
    }

    /**
     * Sets custom grid line positions.
     */
    public setCustomLines(lines: GridLines): void {
        this.customLines = lines;
    }

    /**
     * Clears custom line positions (uses automatic calculation).
     */
    public clearCustomLines(): void {
        this.customLines = null;
    }

    /**
     * Draws the grid.
     */
    public draw(canvas: CanvasModel, bounds: Bounds): void {
        const ctx = canvas.getContext();

        // Setup line style.
        ctx.strokeStyle = this.config.lineColor;
        ctx.lineWidth = this.config.lineWidth;

        if (this.config.lineDash.length > 0) {
            ctx.setLineDash([...this.config.lineDash]);
        }

        // Get line positions.
        const lines = this.customLines ?? this.calculateLines(bounds);

        // Draw horizontal lines.
        for (const y of lines.horizontalY) {
            this.drawHorizontalLine(ctx, bounds.x, bounds.x + bounds.width, y);
        }

        // Draw vertical lines.
        for (const x of lines.verticalX) {
            this.drawVerticalLine(ctx, x, bounds.y, bounds.y + bounds.height);
        }

        // Reset line dash.
        if (this.config.lineDash.length > 0) {
            ctx.setLineDash([]);
        }
    }

    /**
     * Calculates evenly spaced grid lines.
     */
    private calculateLines(bounds: Bounds): GridLines {
        const horizontalY: Pixel[] = [];
        const verticalX: Pixel[] = [];

        // Calculate horizontal line positions.
        const hSpacing = bounds.height / (this.config.horizontalLines + 1);
        for (let i = 1; i <= this.config.horizontalLines; i++) {
            horizontalY.push(bounds.y + i * hSpacing);
        }

        // Calculate vertical line positions.
        const vSpacing = bounds.width / (this.config.verticalLines + 1);
        for (let i = 1; i <= this.config.verticalLines; i++) {
            verticalX.push(bounds.x + i * vSpacing);
        }

        return { horizontalY, verticalX };
    }

    /**
     * Draws a horizontal line.
     */
    private drawHorizontalLine(
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
     * Draws a vertical line.
     */
    private drawVerticalLine(
        ctx: CanvasRenderingContext2D,
        x: Pixel,
        y1: Pixel,
        y2: Pixel,
    ): void {
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();
    }
}

/**
 * Creates a grid drawer.
 */
export function createGridDrawer(
    config?: Partial<GridDrawerConfig>,
): GridDrawer {
    return new GridDrawer(config);
}

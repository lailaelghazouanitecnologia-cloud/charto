/**
 * Highlight drawer - renders highlighted zones on chart.
 * Following Code Style Guide: Single responsibility, explicit types.
 *
 * @doc-tags core,drawer,highlight
 */

import type { CanvasModel } from "../canvas/canvas.model.ts";
import type { Bounds } from "../../types/bounds.ts";
import type { Pixel, ColorHex, Unit, Price } from "../../types/primitives.ts";
import type { Viewable } from "../model/viewable.ts";
import { BaseDrawer, type DrawerConfig } from "./drawer.ts";

/**
 * Highlight zone type.
 */
export type HighlightType = "vertical" | "horizontal" | "rectangle";

/**
 * Highlight zone definition.
 */
export interface HighlightZone {
    readonly id: string;
    readonly type: HighlightType;
    readonly start: number;
    readonly end: number;
    readonly color: ColorHex;
    readonly opacity: number;
    readonly borderColor?: ColorHex;
    readonly borderWidth?: number;
    readonly label?: string;
}

/**
 * Vertical highlight (time range).
 */
export interface VerticalHighlight extends HighlightZone {
    readonly type: "vertical";
    readonly start: Unit;
    readonly end: Unit;
}

/**
 * Horizontal highlight (price range).
 */
export interface HorizontalHighlight extends HighlightZone {
    readonly type: "horizontal";
    readonly start: Price;
    readonly end: Price;
}

/**
 * Rectangle highlight (both ranges).
 */
export interface RectangleHighlight extends HighlightZone {
    readonly type: "rectangle";
    readonly xStart: Unit;
    readonly xEnd: Unit;
    readonly yStart: Price;
    readonly yEnd: Price;
}

/**
 * Highlight drawer configuration.
 */
export interface HighlightDrawerConfig extends DrawerConfig {
    readonly defaultColor: ColorHex;
    readonly defaultOpacity: number;
    readonly labelFontSize: number;
    readonly labelFontFamily: string;
    readonly labelColor: ColorHex;
}

/**
 * Default highlight drawer configuration.
 */
export const DEFAULT_HIGHLIGHT_DRAWER_CONFIG: HighlightDrawerConfig = {
    id: "highlight-drawer",
    zIndex: 2,
    enabled: true,
    defaultColor: "#ffeb3b",
    defaultOpacity: 0.2,
    labelFontSize: 11,
    labelFontFamily: "sans-serif",
    labelColor: "#333333",
} as const;

/**
 * Data required for highlight drawing.
 */
export interface HighlightDrawerData {
    readonly highlights: readonly HighlightZone[];
    readonly viewable: Viewable;
}

/**
 * Highlight drawer - renders colored zones on chart.
 */
export class HighlightDrawer extends BaseDrawer {
    private readonly config: HighlightDrawerConfig;
    private data: HighlightDrawerData | null = null;

    constructor(config: Partial<HighlightDrawerConfig> = {}) {
        const merged = { ...DEFAULT_HIGHLIGHT_DRAWER_CONFIG, ...config };
        super(merged);
        this.config = merged;
    }

    /**
     * Sets the data to draw.
     */
    public setData(data: HighlightDrawerData): void {
        this.data = data;
    }

    /**
     * Clears the data.
     */
    public clearData(): void {
        this.data = null;
    }

    /**
     * Draws all highlights.
     */
    public draw(canvas: CanvasModel, bounds: Bounds): void {
        if (this.data === null) {
            return;
        }

        const { highlights, viewable } = this.data;
        if (highlights.length === 0) {
            return;
        }

        const ctx = canvas.getContext();

        for (const highlight of highlights) {
            this.drawHighlight(ctx, highlight, viewable, bounds);
        }
    }

    /**
     * Draws a single highlight.
     */
    private drawHighlight(
        ctx: CanvasRenderingContext2D,
        highlight: HighlightZone,
        viewable: Viewable,
        bounds: Bounds,
    ): void {
        switch (highlight.type) {
            case "vertical":
                this.drawVerticalHighlight(ctx, highlight as VerticalHighlight, viewable, bounds);
                break;
            case "horizontal":
                this.drawHorizontalHighlight(ctx, highlight as HorizontalHighlight, viewable, bounds);
                break;
            case "rectangle":
                this.drawRectangleHighlight(ctx, highlight as RectangleHighlight, viewable);
                break;
        }
    }

    /**
     * Draws a vertical highlight (time range).
     */
    private drawVerticalHighlight(
        ctx: CanvasRenderingContext2D,
        highlight: VerticalHighlight,
        viewable: Viewable,
        bounds: Bounds,
    ): void {
        const x1 = viewable.toX(highlight.start);
        const x2 = viewable.toX(highlight.end);
        const width = x2 - x1;

        ctx.globalAlpha = highlight.opacity ?? this.config.defaultOpacity;
        ctx.fillStyle = highlight.color ?? this.config.defaultColor;
        ctx.fillRect(x1, bounds.y, width, bounds.height);

        // Draw border if specified.
        if (highlight.borderColor !== undefined && highlight.borderWidth !== undefined) {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = highlight.borderColor;
            ctx.lineWidth = highlight.borderWidth;
            ctx.strokeRect(x1, bounds.y, width, bounds.height);
        }

        // Draw label if specified.
        if (highlight.label !== undefined) {
            this.drawLabel(ctx, highlight.label, x1 + width / 2, bounds.y + 20);
        }

        ctx.globalAlpha = 1;
    }

    /**
     * Draws a horizontal highlight (price range).
     */
    private drawHorizontalHighlight(
        ctx: CanvasRenderingContext2D,
        highlight: HorizontalHighlight,
        viewable: Viewable,
        bounds: Bounds,
    ): void {
        const y1 = viewable.toY(highlight.start);
        const y2 = viewable.toY(highlight.end);
        const height = Math.abs(y2 - y1);
        const top = Math.min(y1, y2);

        ctx.globalAlpha = highlight.opacity ?? this.config.defaultOpacity;
        ctx.fillStyle = highlight.color ?? this.config.defaultColor;
        ctx.fillRect(bounds.x, top, bounds.width, height);

        // Draw border if specified.
        if (highlight.borderColor !== undefined && highlight.borderWidth !== undefined) {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = highlight.borderColor;
            ctx.lineWidth = highlight.borderWidth;
            ctx.strokeRect(bounds.x, top, bounds.width, height);
        }

        // Draw label if specified.
        if (highlight.label !== undefined) {
            this.drawLabel(ctx, highlight.label, bounds.x + 10, top + height / 2);
        }

        ctx.globalAlpha = 1;
    }

    /**
     * Draws a rectangle highlight (both ranges).
     */
    private drawRectangleHighlight(
        ctx: CanvasRenderingContext2D,
        highlight: RectangleHighlight,
        viewable: Viewable,
    ): void {
        const x1 = viewable.toX(highlight.xStart);
        const x2 = viewable.toX(highlight.xEnd);
        const y1 = viewable.toY(highlight.yStart);
        const y2 = viewable.toY(highlight.yEnd);

        const x = Math.min(x1, x2);
        const y = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);

        ctx.globalAlpha = highlight.opacity ?? this.config.defaultOpacity;
        ctx.fillStyle = highlight.color ?? this.config.defaultColor;
        ctx.fillRect(x, y, width, height);

        // Draw border if specified.
        if (highlight.borderColor !== undefined && highlight.borderWidth !== undefined) {
            ctx.globalAlpha = 1;
            ctx.strokeStyle = highlight.borderColor;
            ctx.lineWidth = highlight.borderWidth;
            ctx.strokeRect(x, y, width, height);
        }

        // Draw label if specified.
        if (highlight.label !== undefined) {
            this.drawLabel(ctx, highlight.label, x + width / 2, y + height / 2);
        }

        ctx.globalAlpha = 1;
    }

    /**
     * Draws a label.
     */
    private drawLabel(ctx: CanvasRenderingContext2D, text: string, x: Pixel, y: Pixel): void {
        ctx.globalAlpha = 1;
        ctx.font = `${this.config.labelFontSize}px ${this.config.labelFontFamily}`;
        ctx.fillStyle = this.config.labelColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, x, y);
    }
}

/**
 * Creates a highlight drawer.
 */
export function createHighlightDrawer(
    config?: Partial<HighlightDrawerConfig>,
): HighlightDrawer {
    return new HighlightDrawer(config);
}

/**
 * Creates a vertical highlight.
 */
export function createVerticalHighlight(
    id: string,
    start: Unit,
    end: Unit,
    color: ColorHex,
    opacity = 0.2,
    label?: string,
): VerticalHighlight {
    const base = {
        id,
        type: "vertical" as const,
        start,
        end,
        color,
        opacity,
    };

    if (label !== undefined) {
        return { ...base, label };
    }

    return base;
}

/**
 * Creates a horizontal highlight.
 */
export function createHorizontalHighlight(
    id: string,
    start: Price,
    end: Price,
    color: ColorHex,
    opacity = 0.2,
    label?: string,
): HorizontalHighlight {
    const base = {
        id,
        type: "horizontal" as const,
        start,
        end,
        color,
        opacity,
    };

    if (label !== undefined) {
        return { ...base, label };
    }

    return base;
}

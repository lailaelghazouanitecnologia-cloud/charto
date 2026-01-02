/**
 * Cross tool (crosshair) for chart interaction.
 * Following Code Style Guide: Single responsibility, explicit types.
 *
 * @doc-tags core,interaction,crosshair
 */

import { Subject } from "rxjs";
import type { Pixel, ColorHex } from "../../types/primitives.ts";
import type { Bounds } from "../../types/bounds.ts";
import type { CanvasModel } from "../canvas/canvas.model.ts";
import { BaseDrawer, type DrawerConfig } from "../drawers/drawer.ts";

/**
 * Cross tool type.
 */
export type CrossToolType = "cross-and-labels" | "just-labels" | "none";

/**
 * Magnet target for snapping crosshair to candle points.
 */
export type MagnetTarget = "O" | "H" | "L" | "C" | "OHLC" | "none";

/**
 * Cross tool hover state.
 */
export interface CrossToolHover {
    readonly x: Pixel;
    readonly y: Pixel;
    readonly visible: boolean;
}

/**
 * Default cross tool hover (hidden).
 */
export const DEFAULT_CROSS_TOOL_HOVER: CrossToolHover = {
    x: 0,
    y: 0,
    visible: false,
} as const;

/**
 * Cross tool configuration.
 */
export interface CrossToolConfig {
    readonly type: CrossToolType;
    readonly magnetTarget: MagnetTarget;
    readonly lineColor: ColorHex;
    readonly lineWidth: number;
    readonly lineDash: readonly number[];
    readonly labelBackgroundColor: ColorHex;
    readonly labelTextColor: ColorHex;
    readonly labelFontSize: number;
    readonly labelFontFamily: string;
    readonly labelPadding: number;
}

/**
 * Default cross tool configuration.
 */
export const DEFAULT_CROSS_TOOL_CONFIG: CrossToolConfig = {
    type: "cross-and-labels",
    magnetTarget: "none",
    lineColor: "#666666",
    lineWidth: 1,
    lineDash: [4, 4],
    labelBackgroundColor: "#333333",
    labelTextColor: "#ffffff",
    labelFontSize: 11,
    labelFontFamily: "monospace",
    labelPadding: 4,
} as const;

/**
 * Cross tool model - manages crosshair state.
 */
export class CrossToolModel {
    private config: CrossToolConfig;
    private hover: CrossToolHover = DEFAULT_CROSS_TOOL_HOVER;

    // Observables.
    public readonly hoverChanged$ = new Subject<CrossToolHover>();
    public readonly typeChanged$ = new Subject<CrossToolType>();

    constructor(config: Partial<CrossToolConfig> = {}) {
        this.config = { ...DEFAULT_CROSS_TOOL_CONFIG, ...config };
    }

    /**
     * Gets the current configuration.
     */
    public getConfig(): CrossToolConfig {
        return { ...this.config };
    }

    /**
     * Gets the current hover state.
     */
    public getHover(): CrossToolHover {
        return this.hover;
    }

    /**
     * Gets the current type.
     */
    public getType(): CrossToolType {
        return this.config.type;
    }

    /**
     * Sets the cross tool type.
     */
    public setType(type: CrossToolType): void {
        if (this.config.type !== type) {
            this.config = { ...this.config, type };
            this.typeChanged$.next(type);
        }
    }

    /**
     * Sets visibility.
     */
    public setVisible(visible: boolean): void {
        this.setType(visible ? "cross-and-labels" : "none");
    }

    /**
     * Sets the magnet target.
     */
    public setMagnetTarget(target: MagnetTarget): void {
        this.config = { ...this.config, magnetTarget: target };
    }

    /**
     * Updates the hover position.
     */
    public setHover(x: Pixel, y: Pixel): void {
        this.hover = { x, y, visible: true };
        this.hoverChanged$.next(this.hover);
    }

    /**
     * Clears the hover (hides crosshair).
     */
    public clearHover(): void {
        if (this.hover.visible) {
            this.hover = DEFAULT_CROSS_TOOL_HOVER;
            this.hoverChanged$.next(this.hover);
        }
    }

    /**
     * Checks if the crosshair is visible.
     */
    public isVisible(): boolean {
        return this.hover.visible && this.config.type !== "none";
    }

    /**
     * Disposes of subscriptions.
     */
    public dispose(): void {
        this.hoverChanged$.complete();
        this.typeChanged$.complete();
    }
}

// ============================================================================
// Cross Tool Drawer
// ============================================================================

/**
 * Cross tool drawer configuration.
 */
export interface CrossToolDrawerConfig extends DrawerConfig {
    readonly lineColor: ColorHex;
    readonly lineWidth: number;
    readonly lineDash: readonly number[];
    readonly showLabels: boolean;
    readonly labelBackgroundColor: ColorHex;
    readonly labelTextColor: ColorHex;
    readonly labelFontSize: number;
    readonly labelFontFamily: string;
    readonly labelPadding: number;
    readonly xLabelFormatter: (x: Pixel) => string;
    readonly yLabelFormatter: (y: Pixel) => string;
}

/**
 * Default cross tool drawer configuration.
 */
export const DEFAULT_CROSS_TOOL_DRAWER_CONFIG: CrossToolDrawerConfig = {
    id: "cross-tool-drawer",
    zIndex: 100,
    enabled: true,
    lineColor: "#666666",
    lineWidth: 1,
    lineDash: [4, 4],
    showLabels: true,
    labelBackgroundColor: "#333333",
    labelTextColor: "#ffffff",
    labelFontSize: 11,
    labelFontFamily: "monospace",
    labelPadding: 4,
    xLabelFormatter: (x) => x.toFixed(0),
    yLabelFormatter: (y) => y.toFixed(2),
} as const;

/**
 * Cross tool drawer - renders crosshair lines and labels.
 */
export class CrossToolDrawer extends BaseDrawer {
    private readonly config: CrossToolDrawerConfig;
    private model: CrossToolModel | null = null;

    constructor(config: Partial<CrossToolDrawerConfig> = {}) {
        const merged = { ...DEFAULT_CROSS_TOOL_DRAWER_CONFIG, ...config };
        super(merged);
        this.config = merged;
    }

    /**
     * Sets the model to draw from.
     */
    public setModel(model: CrossToolModel): void {
        this.model = model;
    }

    /**
     * Sets the X label formatter.
     */
    public setXLabelFormatter(formatter: (x: Pixel) => string): void {
        (this.config as { xLabelFormatter: typeof formatter }).xLabelFormatter = formatter;
    }

    /**
     * Sets the Y label formatter.
     */
    public setYLabelFormatter(formatter: (y: Pixel) => string): void {
        (this.config as { yLabelFormatter: typeof formatter }).yLabelFormatter = formatter;
    }

    /**
     * Draws the cross tool.
     */
    public draw(canvas: CanvasModel, bounds: Bounds): void {
        if (this.model === null) {
            return;
        }

        const hover = this.model.getHover();
        const type = this.model.getType();

        if (!hover.visible || type === "none") {
            return;
        }

        const ctx = canvas.getContext();
        const { x, y } = hover;

        // Check if position is within bounds.
        if (x < bounds.x || x > bounds.x + bounds.width ||
            y < bounds.y || y > bounds.y + bounds.height) {
            return;
        }

        // Draw crosshair lines.
        if (type === "cross-and-labels") {
            this.drawCrosshairLines(ctx, bounds, x, y);
        }

        // Draw labels.
        if (this.config.showLabels) {
            this.drawLabels(ctx, bounds, x, y);
        }
    }

    /**
     * Draws crosshair lines.
     */
    private drawCrosshairLines(
        ctx: CanvasRenderingContext2D,
        bounds: Bounds,
        x: Pixel,
        y: Pixel,
    ): void {
        ctx.strokeStyle = this.config.lineColor;
        ctx.lineWidth = this.config.lineWidth;
        ctx.setLineDash([...this.config.lineDash]);

        // Vertical line.
        ctx.beginPath();
        ctx.moveTo(x, bounds.y);
        ctx.lineTo(x, bounds.y + bounds.height);
        ctx.stroke();

        // Horizontal line.
        ctx.beginPath();
        ctx.moveTo(bounds.x, y);
        ctx.lineTo(bounds.x + bounds.width, y);
        ctx.stroke();

        ctx.setLineDash([]);
    }

    /**
     * Draws X and Y labels.
     */
    private drawLabels(
        ctx: CanvasRenderingContext2D,
        bounds: Bounds,
        x: Pixel,
        y: Pixel,
    ): void {
        const { labelFontSize, labelFontFamily, labelPadding } = this.config;

        ctx.font = `${labelFontSize}px ${labelFontFamily}`;

        // X label (at bottom).
        const xLabelText = this.config.xLabelFormatter(x);
        this.drawLabel(
            ctx,
            xLabelText,
            x,
            bounds.y + bounds.height - labelFontSize - labelPadding * 2,
            "center",
        );

        // Y label (at right).
        const yLabelText = this.config.yLabelFormatter(y);
        this.drawLabel(
            ctx,
            yLabelText,
            bounds.x + bounds.width - ctx.measureText(yLabelText).width - labelPadding * 2,
            y,
            "right",
        );
    }

    /**
     * Draws a single label with background.
     */
    private drawLabel(
        ctx: CanvasRenderingContext2D,
        text: string,
        x: Pixel,
        y: Pixel,
        align: "center" | "right",
    ): void {
        const { labelPadding, labelBackgroundColor, labelTextColor, labelFontSize } = this.config;

        const textWidth = ctx.measureText(text).width;
        const labelWidth = textWidth + labelPadding * 2;
        const labelHeight = labelFontSize + labelPadding * 2;

        // Calculate position based on alignment.
        let labelX: Pixel;
        if (align === "center") {
            labelX = x - labelWidth / 2;
        } else {
            labelX = x;
        }

        // Draw background.
        ctx.fillStyle = labelBackgroundColor;
        ctx.fillRect(labelX, y - labelHeight / 2, labelWidth, labelHeight);

        // Draw text.
        ctx.fillStyle = labelTextColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, labelX + labelWidth / 2, y);
    }
}

// ============================================================================
// Factory functions
// ============================================================================

/**
 * Creates a cross tool model.
 */
export function createCrossToolModel(
    config?: Partial<CrossToolConfig>,
): CrossToolModel {
    return new CrossToolModel(config);
}

/**
 * Creates a cross tool drawer.
 */
export function createCrossToolDrawer(
    config?: Partial<CrossToolDrawerConfig>,
): CrossToolDrawer {
    return new CrossToolDrawer(config);
}

/**
 * Crosshair interaction for chart.
 */

import type { Canvas } from "./canvas.ts";
import type { LinearScale } from "./scale.ts";
import type { ColorHex, Pixel, Point } from "./types.ts";

/** Crosshair configuration. */
export interface CrosshairConfig {
    readonly color: ColorHex;
    readonly lineWidth: Pixel;
    readonly dashPattern: number[];
    readonly labelBackground: ColorHex;
    readonly labelColor: ColorHex;
    readonly labelFont: string;
    readonly labelPadding: Pixel;
}

/** Default crosshair configuration. */
export const DEFAULT_CROSSHAIR_CONFIG: CrosshairConfig = {
    color: "#555555",
    lineWidth: 1,
    dashPattern: [4, 4],
    labelBackground: "#333333",
    labelColor: "#ffffff",
    labelFont: "11px monospace",
    labelPadding: 4,
} as const;

/** Crosshair state. */
export interface CrosshairState {
    readonly visible: boolean;
    readonly x: Pixel;
    readonly y: Pixel;
    readonly dataX: number;
    readonly dataY: number;
}

/** Draws crosshair lines. */
export function drawCrosshair(
    canvas: Canvas,
    position: Point,
    xScale: LinearScale,
    yScale: LinearScale,
    config: CrosshairConfig = DEFAULT_CROSSHAIR_CONFIG,
): void {
    const ctx = canvas.getContext();
    const bounds = canvas.getBounds();

    ctx.strokeStyle = config.color;
    ctx.lineWidth = config.lineWidth;
    ctx.setLineDash(config.dashPattern);

    // Vertical line.
    ctx.beginPath();
    ctx.moveTo(position.x, 0);
    ctx.lineTo(position.x, bounds.height);
    ctx.stroke();

    // Horizontal line.
    ctx.beginPath();
    ctx.moveTo(0, position.y);
    ctx.lineTo(bounds.width, position.y);
    ctx.stroke();

    ctx.setLineDash([]);
}

/** Draws crosshair labels. */
export function drawCrosshairLabels(
    canvas: Canvas,
    position: Point,
    xScale: LinearScale,
    yScale: LinearScale,
    xFormatter: (value: number) => string,
    yFormatter: (value: number) => string,
    config: CrosshairConfig = DEFAULT_CROSSHAIR_CONFIG,
): void {
    const ctx = canvas.getContext();
    const bounds = canvas.getBounds();

    ctx.font = config.labelFont;

    // Y label (right side).
    const yValue = yScale.toValue(position.y);
    const yLabel = yFormatter(yValue);
    const yMetrics = ctx.measureText(yLabel);
    const yLabelWidth = yMetrics.width + config.labelPadding * 2;
    const yLabelHeight = 16;
    const yLabelX = bounds.width - yLabelWidth;
    const yLabelY = position.y - yLabelHeight / 2;

    ctx.fillStyle = config.labelBackground;
    ctx.fillRect(yLabelX, yLabelY, yLabelWidth, yLabelHeight);

    ctx.fillStyle = config.labelColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(yLabel, yLabelX + config.labelPadding, position.y);

    // X label (bottom).
    const xValue = xScale.toValue(position.x);
    const xLabel = xFormatter(xValue);
    const xMetrics = ctx.measureText(xLabel);
    const xLabelWidth = xMetrics.width + config.labelPadding * 2;
    const xLabelHeight = 16;
    const xLabelX = position.x - xLabelWidth / 2;
    const xLabelY = bounds.height - xLabelHeight;

    ctx.fillStyle = config.labelBackground;
    ctx.fillRect(xLabelX, xLabelY, xLabelWidth, xLabelHeight);

    ctx.fillStyle = config.labelColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(xLabel, position.x, xLabelY + xLabelHeight / 2);
}

/** Creates a crosshair state from mouse position. */
export function createCrosshairState(
    position: Point | null,
    xScale: LinearScale,
    yScale: LinearScale,
): CrosshairState {
    if (position === null) {
        return {
            visible: false,
            x: 0,
            y: 0,
            dataX: 0,
            dataY: 0,
        };
    }

    return {
        visible: true,
        x: position.x,
        y: position.y,
        dataX: xScale.toValue(position.x),
        dataY: yScale.toValue(position.y),
    };
}

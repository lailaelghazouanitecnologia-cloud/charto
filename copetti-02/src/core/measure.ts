/**
 * Measure tool for calculating price and time distances.
 */

import type { Pixel, ColorHex } from "./types.ts";

/** Measurement state. */
export type MeasureState = "idle" | "measuring" | "complete";

/** Measurement result. */
export interface Measurement {
    startIndex: number;
    startPrice: number;
    endIndex: number;
    endPrice: number;

    // Calculated values.
    priceDiff: number;
    pricePercent: number;
    candleCount: number;
    direction: "up" | "down" | "flat";
}

/** Measure tool configuration. */
export interface MeasureConfig {
    color: ColorHex;
    backgroundColor: string;
    textColor: ColorHex;
    lineWidth: number;
    fontSize: number;
}

/** Default measure configuration. */
export const DEFAULT_MEASURE_CONFIG: MeasureConfig = {
    color: "#a855f7",
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    textColor: "#e4e4e7",
    lineWidth: 1,
    fontSize: 11,
};

/** Measure tool class. */
export class MeasureTool {
    private state: MeasureState = "idle";
    private startIndex: number = 0;
    private startPrice: number = 0;
    private endIndex: number = 0;
    private endPrice: number = 0;
    private config: MeasureConfig;

    constructor(config: Partial<MeasureConfig> = {}) {
        this.config = { ...DEFAULT_MEASURE_CONFIG, ...config };
    }

    /** Get current state. */
    getState(): MeasureState {
        return this.state;
    }

    /** Start measuring from a point. */
    start(index: number, price: number): void {
        this.startIndex = index;
        this.startPrice = price;
        this.endIndex = index;
        this.endPrice = price;
        this.state = "measuring";
    }

    /** Update the end point while measuring. */
    update(index: number, price: number): void {
        if (this.state !== "measuring") return;
        this.endIndex = index;
        this.endPrice = price;
    }

    /** Complete the measurement. */
    complete(): Measurement | null {
        if (this.state !== "measuring") return null;

        this.state = "complete";
        return this.getMeasurement();
    }

    /** Cancel the current measurement. */
    cancel(): void {
        this.state = "idle";
    }

    /** Reset the tool. */
    reset(): void {
        this.state = "idle";
        this.startIndex = 0;
        this.startPrice = 0;
        this.endIndex = 0;
        this.endPrice = 0;
    }

    /** Get the current measurement. */
    getMeasurement(): Measurement | null {
        if (this.state === "idle") return null;

        const priceDiff = this.endPrice - this.startPrice;
        const pricePercent = this.startPrice !== 0
            ? (priceDiff / this.startPrice) * 100
            : 0;
        const candleCount = Math.abs(this.endIndex - this.startIndex);

        let direction: "up" | "down" | "flat";
        if (priceDiff > 0.0001) {
            direction = "up";
        } else if (priceDiff < -0.0001) {
            direction = "down";
        } else {
            direction = "flat";
        }

        return {
            startIndex: this.startIndex,
            startPrice: this.startPrice,
            endIndex: this.endIndex,
            endPrice: this.endPrice,
            priceDiff,
            pricePercent,
            candleCount,
            direction,
        };
    }

    /** Render the measurement on the canvas. */
    render(
        ctx: CanvasRenderingContext2D,
        toPixelX: (index: number) => Pixel,
        toPixelY: (price: number) => Pixel,
    ): void {
        if (this.state === "idle") return;

        const x1 = toPixelX(this.startIndex);
        const y1 = toPixelY(this.startPrice);
        const x2 = toPixelX(this.endIndex);
        const y2 = toPixelY(this.endPrice);

        const measurement = this.getMeasurement();
        if (measurement === null) return;

        ctx.save();

        // Draw filled rectangle.
        ctx.fillStyle = this.config.backgroundColor;
        ctx.fillRect(
            Math.min(x1, x2),
            Math.min(y1, y2),
            Math.abs(x2 - x1),
            Math.abs(y2 - y1),
        );

        // Draw border.
        ctx.strokeStyle = this.config.color;
        ctx.lineWidth = this.config.lineWidth;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(
            Math.min(x1, x2),
            Math.min(y1, y2),
            Math.abs(x2 - x1),
            Math.abs(y2 - y1),
        );
        ctx.setLineDash([]);

        // Draw diagonal line.
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Draw start and end points.
        ctx.fillStyle = this.config.color;
        ctx.beginPath();
        ctx.arc(x1, y1, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x2, y2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw measurement info box.
        this.drawInfoBox(ctx, x1, y1, x2, y2, measurement);

        ctx.restore();
    }

    /** Draw the info box with measurement details. */
    private drawInfoBox(
        ctx: CanvasRenderingContext2D,
        x1: Pixel,
        y1: Pixel,
        x2: Pixel,
        y2: Pixel,
        measurement: Measurement,
    ): void {
        // Position the box.
        const boxX = Math.max(x1, x2) + 10;
        const boxY = Math.min(y1, y2);

        // Format values.
        const priceSign = measurement.priceDiff >= 0 ? "+" : "";
        const percentSign = measurement.pricePercent >= 0 ? "+" : "";

        const lines = [
            `${measurement.candleCount} bars`,
            `${priceSign}${measurement.priceDiff.toFixed(2)} (${percentSign}${measurement.pricePercent.toFixed(2)}%)`,
            `${measurement.startPrice.toFixed(2)} → ${measurement.endPrice.toFixed(2)}`,
        ];

        // Measure text.
        ctx.font = `${this.config.fontSize}px monospace`;
        const lineHeight = this.config.fontSize + 4;
        const padding = 8;

        let maxWidth = 0;
        for (const line of lines) {
            const width = ctx.measureText(line).width;
            if (width > maxWidth) maxWidth = width;
        }

        const boxWidth = maxWidth + padding * 2;
        const boxHeight = lines.length * lineHeight + padding * 2 - 4;

        // Draw background.
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
        ctx.fill();

        // Draw border.
        ctx.strokeStyle = this.config.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
        ctx.stroke();

        // Draw text.
        ctx.fillStyle = this.config.textColor;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i]!;
            // Color the price change line.
            if (i === 1) {
                ctx.fillStyle = measurement.direction === "up"
                    ? "#22c55e"
                    : measurement.direction === "down"
                        ? "#ef4444"
                        : this.config.textColor;
            } else {
                ctx.fillStyle = this.config.textColor;
            }
            ctx.fillText(line, boxX + padding, boxY + padding + i * lineHeight);
        }
    }

    /** Update configuration. */
    setConfig(config: Partial<MeasureConfig>): void {
        this.config = { ...this.config, ...config };
    }
}

/** Format time difference. */
export function formatTimeDiff(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m`;
    } else {
        return `${seconds}s`;
    }
}

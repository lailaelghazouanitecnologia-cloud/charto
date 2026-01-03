/**
 * HighLow - Price high/low markers and labels
 * Displays the highest and lowest prices in the visible range
 */

import type { Candle, Bounds, ChartTheme, Pixel } from "./types.ts";

// ============================================================================
// Types
// ============================================================================

export interface HighLowConfig {
    enabled: boolean;
    highColor: string;
    lowColor: string;
    font: string;
    fontSize: number;
    padding: number;
    showLine: boolean;
    lineWidth: number;
    lineDash: number[];
    showLabel: boolean;
    labelBackground: boolean;
    labelBackgroundColor: string;
    labelBackgroundOpacity: number;
    labelPadding: { x: number; y: number };
    markerSize: number;
    showMarker: boolean;
    format?: (value: number) => string;
}

export interface HighLowPoint {
    price: number;
    index: number;
    x: Pixel;
    y: Pixel;
}

export interface HighLowState {
    high: HighLowPoint | null;
    low: HighLowPoint | null;
    visible: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_HIGH_LOW_CONFIG: HighLowConfig = {
    enabled: true,
    highColor: "#26a69a",
    lowColor: "#ef5350",
    font: "12px Arial, sans-serif",
    fontSize: 12,
    padding: 8,
    showLine: true,
    lineWidth: 1,
    lineDash: [4, 4],
    showLabel: true,
    labelBackground: true,
    labelBackgroundColor: "#1a1a1a",
    labelBackgroundOpacity: 0.9,
    labelPadding: { x: 6, y: 4 },
    markerSize: 6,
    showMarker: true,
};

// ============================================================================
// HighLow Class
// ============================================================================

export class HighLow {
    private config: HighLowConfig;
    private state: HighLowState;
    private formatter: (value: number) => string;

    constructor(config: Partial<HighLowConfig> = {}) {
        this.config = { ...DEFAULT_HIGH_LOW_CONFIG, ...config };
        this.state = {
            high: null,
            low: null,
            visible: true,
        };
        this.formatter = config.format ?? defaultPriceFormatter;
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<HighLowConfig>): void {
        this.config = { ...this.config, ...config };
        if (config.format) {
            this.formatter = config.format;
        }
    }

    /**
     * Set price formatter
     */
    setFormatter(formatter: (value: number) => string): void {
        this.formatter = formatter;
    }

    /**
     * Set visibility
     */
    setVisible(visible: boolean): void {
        this.state.visible = visible;
    }

    /**
     * Apply theme
     */
    applyTheme(theme: ChartTheme): void {
        this.config.highColor = theme.upColor;
        this.config.lowColor = theme.downColor;
        this.config.labelBackgroundColor = theme.background;
    }

    /**
     * Calculate high/low from visible candles
     */
    calculate(
        candles: Candle[],
        startIndex: number,
        endIndex: number,
        chartArea: Bounds,
        priceToY: (price: number) => Pixel,
        indexToX: (index: number) => Pixel
    ): void {
        if (candles.length === 0 || startIndex >= endIndex) {
            this.state.high = null;
            this.state.low = null;
            return;
        }

        const visibleCandles = candles.slice(
            Math.max(0, Math.floor(startIndex)),
            Math.min(candles.length, Math.ceil(endIndex))
        );

        if (visibleCandles.length === 0) {
            this.state.high = null;
            this.state.low = null;
            return;
        }

        let highPrice = -Infinity;
        let lowPrice = Infinity;
        let highIndex = 0;
        let lowIndex = 0;

        visibleCandles.forEach((candle, i) => {
            const actualIndex = Math.floor(startIndex) + i;
            if (candle.high > highPrice) {
                highPrice = candle.high;
                highIndex = actualIndex;
            }
            if (candle.low < lowPrice) {
                lowPrice = candle.low;
                lowIndex = actualIndex;
            }
        });

        this.state.high = {
            price: highPrice,
            index: highIndex,
            x: indexToX(highIndex),
            y: priceToY(highPrice),
        };

        this.state.low = {
            price: lowPrice,
            index: lowIndex,
            x: indexToX(lowIndex),
            y: priceToY(lowPrice),
        };
    }

    /**
     * Get current state
     */
    getState(): HighLowState {
        return { ...this.state };
    }

    /**
     * Render high/low markers and labels
     */
    render(ctx: CanvasRenderingContext2D, chartArea: Bounds): void {
        const { config, state } = this;

        if (!config.enabled || !state.visible) return;

        if (state.high) {
            this.renderPoint(ctx, chartArea, state.high, "high");
        }

        if (state.low) {
            this.renderPoint(ctx, chartArea, state.low, "low");
        }
    }

    // Private methods

    private renderPoint(
        ctx: CanvasRenderingContext2D,
        chartArea: Bounds,
        point: HighLowPoint,
        type: "high" | "low"
    ): void {
        const { config } = this;
        const color = type === "high" ? config.highColor : config.lowColor;

        ctx.save();

        // Draw horizontal line to Y-axis
        if (config.showLine) {
            ctx.strokeStyle = color;
            ctx.lineWidth = config.lineWidth;
            ctx.setLineDash(config.lineDash);

            ctx.beginPath();
            ctx.moveTo(point.x, point.y);
            ctx.lineTo(chartArea.x + chartArea.width, point.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw marker on candle
        if (config.showMarker) {
            this.drawMarker(ctx, point.x, point.y, color, type);
        }

        // Draw price label
        if (config.showLabel) {
            this.drawLabel(ctx, chartArea, point, color, type);
        }

        ctx.restore();
    }

    private drawMarker(
        ctx: CanvasRenderingContext2D,
        x: Pixel,
        y: Pixel,
        color: string,
        type: "high" | "low"
    ): void {
        const { config } = this;
        const size = config.markerSize;
        const direction = type === "high" ? -1 : 1;

        ctx.fillStyle = color;
        ctx.beginPath();

        // Draw triangle marker
        ctx.moveTo(x, y + direction * size * 0.5);
        ctx.lineTo(x - size * 0.6, y + direction * size * 1.5);
        ctx.lineTo(x + size * 0.6, y + direction * size * 1.5);
        ctx.closePath();
        ctx.fill();
    }

    private drawLabel(
        ctx: CanvasRenderingContext2D,
        chartArea: Bounds,
        point: HighLowPoint,
        color: string,
        type: "high" | "low"
    ): void {
        const { config, formatter } = this;
        const text = formatter(point.price);
        const labelX = chartArea.x + chartArea.width + config.padding;
        const labelY = point.y;

        ctx.font = config.font;
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;
        const textHeight = config.fontSize;

        // Background
        if (config.labelBackground) {
            ctx.fillStyle = config.labelBackgroundColor;
            ctx.globalAlpha = config.labelBackgroundOpacity;
            ctx.fillRect(
                labelX - config.labelPadding.x,
                labelY - textHeight / 2 - config.labelPadding.y,
                textWidth + config.labelPadding.x * 2,
                textHeight + config.labelPadding.y * 2
            );
            ctx.globalAlpha = 1;
        }

        // Text
        ctx.fillStyle = color;
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText(text, labelX, labelY);

        // Type indicator (H/L)
        const indicator = type === "high" ? "H" : "L";
        ctx.font = `bold ${config.fontSize - 2}px Arial`;
        ctx.fillText(indicator, labelX + textWidth + 4, labelY);
    }
}

// ============================================================================
// Utility functions
// ============================================================================

function defaultPriceFormatter(value: number): string {
    if (value >= 1000) {
        return value.toFixed(2);
    } else if (value >= 1) {
        return value.toFixed(4);
    } else {
        return value.toFixed(6);
    }
}

/**
 * Find high/low prices in a candle range
 */
export function findHighLow(
    candles: Candle[],
    startIndex: number = 0,
    endIndex: number = candles.length
): { high: { price: number; index: number }; low: { price: number; index: number } } {
    let highPrice = -Infinity;
    let lowPrice = Infinity;
    let highIndex = startIndex;
    let lowIndex = startIndex;

    for (let i = startIndex; i < Math.min(endIndex, candles.length); i++) {
        const candle = candles[i];
        if (candle.high > highPrice) {
            highPrice = candle.high;
            highIndex = i;
        }
        if (candle.low < lowPrice) {
            lowPrice = candle.low;
            lowIndex = i;
        }
    }

    return {
        high: { price: highPrice, index: highIndex },
        low: { price: lowPrice, index: lowIndex },
    };
}

/**
 * Draw simple high/low markers
 */
export function drawHighLowMarkers(
    ctx: CanvasRenderingContext2D,
    chartArea: Bounds,
    candles: Candle[],
    startIndex: number,
    endIndex: number,
    priceToY: (price: number) => Pixel,
    indexToX: (index: number) => Pixel,
    config: Partial<HighLowConfig> = {}
): void {
    const highLow = new HighLow(config);
    highLow.calculate(candles, startIndex, endIndex, chartArea, priceToY, indexToX);
    highLow.render(ctx, chartArea);
}

// ============================================================================
// Factory
// ============================================================================

export function createHighLow(config?: Partial<HighLowConfig>): HighLow {
    return new HighLow(config);
}

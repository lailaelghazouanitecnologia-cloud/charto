/**
 * Main chart class that orchestrates rendering.
 */

import { Canvas, createCanvas } from "./canvas.ts";
import { createXScale, createYScale, type LinearScale } from "./scale.ts";
import { drawCandles, getPriceRange, type CandleConfig } from "./candlestick.ts";
import { drawGrid, type GridConfig } from "./grid.ts";
import type { Candle, ChartConfig, Pixel } from "./types.ts";
import { DEFAULT_CONFIG } from "./types.ts";

/** Chart instance. */
export class Chart {
    private readonly canvas: Canvas;
    private xScale: LinearScale;
    private yScale: LinearScale;
    private candles: Candle[] = [];

    constructor(
        element: HTMLCanvasElement,
        private readonly config: ChartConfig = DEFAULT_CONFIG,
    ) {
        this.canvas = createCanvas(element, config.width, config.height);
        this.xScale = createXScale(0, 50, config.width);
        this.yScale = createYScale(0, 100, config.height);
    }

    /** Sets the candle data. */
    setData(candles: Candle[]): void {
        this.candles = candles;
        this.updateScales();
        this.render();
    }

    /** Updates scales based on current data. */
    private updateScales(): void {
        const count = this.candles.length;
        if (count === 0) return;

        const { min, max } = getPriceRange(this.candles);

        this.xScale = createXScale(0, count - 1, this.config.width);
        this.yScale = createYScale(min, max, this.config.height);
    }

    /** Renders the chart. */
    render(): void {
        // Clear canvas.
        this.canvas.clear(this.config.backgroundColor);

        // Draw grid.
        drawGrid(this.canvas, this.xScale, this.yScale, {
            color: this.config.gridColor,
            lineWidth: 1,
            horizontalLines: 5,
            verticalLines: 10,
        });

        // Draw candles.
        if (this.candles.length > 0) {
            drawCandles(this.canvas, this.candles, this.xScale, this.yScale, {
                upColor: this.config.upColor,
                downColor: this.config.downColor,
                wickWidth: 1,
                bodyWidth: 8,
            });
        }
    }

    /** Resizes the chart. */
    resize(width: Pixel, height: Pixel): void {
        this.canvas.resize(width, height);
        this.updateScales();
        this.render();
    }

    /** Gets the canvas element. */
    getCanvas(): HTMLCanvasElement {
        return this.canvas.getContext().canvas;
    }
}

/** Creates a new chart instance. */
export function createChart(
    element: HTMLCanvasElement,
    config?: Partial<ChartConfig>,
): Chart {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    return new Chart(element, mergedConfig);
}

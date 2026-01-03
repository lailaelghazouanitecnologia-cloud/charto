/**
 * Additional chart type renderers.
 * Provides bar, hollow candle, baseline, and heikin-ashi rendering.
 */

import type { Candle, ColorHex, Pixel } from "./types.ts";

/** Extended chart types. */
export type ExtendedChartType =
    | "candlestick"
    | "hollow"
    | "bar"
    | "line"
    | "area"
    | "baseline"
    | "heikinashi";

/** Baseline configuration. */
export interface BaselineConfig {
    /** Baseline price value. */
    baseValue: number;
    /** Color for values above baseline. */
    topColor: ColorHex;
    /** Color for values below baseline. */
    bottomColor: ColorHex;
    /** Fill opacity (0-1). */
    fillOpacity: number;
    /** Line width. */
    lineWidth: number;
}

/** Default baseline configuration. */
export const DEFAULT_BASELINE_CONFIG: BaselineConfig = {
    baseValue: 0,
    topColor: "#22c55e",
    bottomColor: "#ef4444",
    fillOpacity: 0.2,
    lineWidth: 2,
};

/** Draw OHLC bar chart. */
export function drawBarChart(
    ctx: CanvasRenderingContext2D,
    candles: readonly Candle[],
    startIndex: number,
    endIndex: number,
    toPixelX: (index: number) => Pixel,
    toPixelY: (price: number) => Pixel,
    upColor: ColorHex,
    downColor: ColorHex,
    barWidth: number,
): void {
    const tickWidth = Math.max(1, barWidth * 0.4);

    for (let i = startIndex; i <= endIndex && i < candles.length; i++) {
        const candle = candles[i];
        if (candle === undefined) continue;

        const x = toPixelX(i);
        const isUp = candle.close >= candle.open;
        const color = isUp ? upColor : downColor;

        const highY = toPixelY(candle.high);
        const lowY = toPixelY(candle.low);
        const openY = toPixelY(candle.open);
        const closeY = toPixelY(candle.close);

        ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, barWidth * 0.15);

        // Vertical line (high to low).
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Open tick (left).
        ctx.beginPath();
        ctx.moveTo(x - tickWidth, openY);
        ctx.lineTo(x, openY);
        ctx.stroke();

        // Close tick (right).
        ctx.beginPath();
        ctx.moveTo(x, closeY);
        ctx.lineTo(x + tickWidth, closeY);
        ctx.stroke();
    }
}

/** Draw hollow candlestick chart. */
export function drawHollowCandlesticks(
    ctx: CanvasRenderingContext2D,
    candles: readonly Candle[],
    startIndex: number,
    endIndex: number,
    toPixelX: (index: number) => Pixel,
    toPixelY: (price: number) => Pixel,
    upColor: ColorHex,
    downColor: ColorHex,
    candleWidth: number,
): void {
    const wickWidth = Math.max(1, candleWidth * 0.15);

    for (let i = startIndex; i <= endIndex && i < candles.length; i++) {
        const candle = candles[i];
        if (candle === undefined) continue;

        const x = toPixelX(i);
        const prevCandle = candles[i - 1];

        // Determine trend (compared to previous close).
        const isTrendUp = prevCandle === undefined || candle.close >= prevCandle.close;

        // Determine if candle body is bullish (close >= open).
        const isBullish = candle.close >= candle.open;

        const color = isTrendUp ? upColor : downColor;

        const highY = toPixelY(candle.high);
        const lowY = toPixelY(candle.low);
        const openY = toPixelY(candle.open);
        const closeY = toPixelY(candle.close);

        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(Math.abs(closeY - openY), 1);

        // Draw wick.
        ctx.fillStyle = color;
        ctx.fillRect(x - wickWidth / 2, highY, wickWidth, lowY - highY);

        if (isBullish) {
            // Hollow body (just outline).
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.strokeRect(
                x - candleWidth / 2,
                bodyTop,
                candleWidth,
                bodyHeight,
            );
        } else {
            // Filled body.
            ctx.fillStyle = color;
            ctx.fillRect(
                x - candleWidth / 2,
                bodyTop,
                candleWidth,
                bodyHeight,
            );
        }
    }
}

/** Draw baseline chart. */
export function drawBaselineChart(
    ctx: CanvasRenderingContext2D,
    candles: readonly Candle[],
    startIndex: number,
    endIndex: number,
    toPixelX: (index: number) => Pixel,
    toPixelY: (price: number) => Pixel,
    config: BaselineConfig,
    chartBounds: { x: number; y: number; width: number; height: number },
): void {
    if (candles.length < 2) return;

    const baselineY = toPixelY(config.baseValue);

    // Clamp baseline to chart bounds.
    const clampedBaselineY = Math.max(
        chartBounds.y,
        Math.min(chartBounds.y + chartBounds.height, baselineY),
    );

    // Build path points.
    const points: Array<{ x: number; y: number; price: number }> = [];

    for (let i = startIndex; i <= endIndex && i < candles.length; i++) {
        const candle = candles[i];
        if (candle === undefined) continue;

        points.push({
            x: toPixelX(i),
            y: toPixelY(candle.close),
            price: candle.close,
        });
    }

    if (points.length < 2) return;

    // Draw fills.
    ctx.save();
    ctx.beginPath();
    ctx.rect(chartBounds.x, chartBounds.y, chartBounds.width, chartBounds.height);
    ctx.clip();

    // Top fill (above baseline).
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, clampedBaselineY);

    for (const point of points) {
        const y = Math.min(point.y, clampedBaselineY);
        ctx.lineTo(point.x, y);
    }

    ctx.lineTo(points[points.length - 1]!.x, clampedBaselineY);
    ctx.closePath();
    ctx.fillStyle = config.topColor;
    ctx.globalAlpha = config.fillOpacity;
    ctx.fill();

    // Bottom fill (below baseline).
    ctx.beginPath();
    ctx.moveTo(points[0]!.x, clampedBaselineY);

    for (const point of points) {
        const y = Math.max(point.y, clampedBaselineY);
        ctx.lineTo(point.x, y);
    }

    ctx.lineTo(points[points.length - 1]!.x, clampedBaselineY);
    ctx.closePath();
    ctx.fillStyle = config.bottomColor;
    ctx.fill();

    ctx.globalAlpha = 1;

    // Draw line with gradient color.
    ctx.lineWidth = config.lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Draw segments with appropriate colors.
    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i]!;
        const p2 = points[i + 1]!;

        // Determine segment color based on position relative to baseline.
        const midPrice = (p1.price + p2.price) / 2;
        ctx.strokeStyle = midPrice >= config.baseValue ? config.topColor : config.bottomColor;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }

    // Draw baseline.
    ctx.strokeStyle = "#666666";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(chartBounds.x, clampedBaselineY);
    ctx.lineTo(chartBounds.x + chartBounds.width, clampedBaselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
}

/** Calculate Heikin-Ashi candles from regular candles. */
export function calculateHeikinAshi(candles: readonly Candle[]): Candle[] {
    if (candles.length === 0) return [];

    const haCandles: Candle[] = [];

    for (let i = 0; i < candles.length; i++) {
        const candle = candles[i]!;
        const prevHa = haCandles[i - 1];

        // HA Close = (Open + High + Low + Close) / 4
        const haClose = (candle.open + candle.high + candle.low + candle.close) / 4;

        // HA Open = (Previous HA Open + Previous HA Close) / 2
        const haOpen = prevHa
            ? (prevHa.open + prevHa.close) / 2
            : (candle.open + candle.close) / 2;

        // HA High = Max(High, HA Open, HA Close)
        const haHigh = Math.max(candle.high, haOpen, haClose);

        // HA Low = Min(Low, HA Open, HA Close)
        const haLow = Math.min(candle.low, haOpen, haClose);

        haCandles.push({
            timestamp: candle.timestamp,
            open: haOpen,
            high: haHigh,
            low: haLow,
            close: haClose,
            volume: candle.volume,
        });
    }

    return haCandles;
}

/** Draw Heikin-Ashi candlesticks. */
export function drawHeikinAshiCandlesticks(
    ctx: CanvasRenderingContext2D,
    candles: readonly Candle[],
    startIndex: number,
    endIndex: number,
    toPixelX: (index: number) => Pixel,
    toPixelY: (price: number) => Pixel,
    upColor: ColorHex,
    downColor: ColorHex,
    candleWidth: number,
): void {
    // Calculate HA candles first.
    const haCandles = calculateHeikinAshi(candles);

    const wickWidth = Math.max(1, candleWidth * 0.15);

    for (let i = startIndex; i <= endIndex && i < haCandles.length; i++) {
        const candle = haCandles[i];
        if (candle === undefined) continue;

        const x = toPixelX(i);
        const isUp = candle.close >= candle.open;
        const color = isUp ? upColor : downColor;

        const highY = toPixelY(candle.high);
        const lowY = toPixelY(candle.low);
        const openY = toPixelY(candle.open);
        const closeY = toPixelY(candle.close);

        // Wick.
        ctx.fillStyle = color;
        ctx.fillRect(x - wickWidth / 2, highY, wickWidth, lowY - highY);

        // Body.
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    }
}

/** Renderer configuration. */
export interface ChartTypeRenderer {
    type: ExtendedChartType;
    render: (
        ctx: CanvasRenderingContext2D,
        candles: readonly Candle[],
        startIndex: number,
        endIndex: number,
        toPixelX: (index: number) => Pixel,
        toPixelY: (price: number) => Pixel,
        config: {
            upColor: ColorHex;
            downColor: ColorHex;
            candleWidth: number;
            chartBounds: { x: number; y: number; width: number; height: number };
            baseline?: BaselineConfig;
        },
    ) => void;
}

/** Registry of chart type renderers. */
export const chartTypeRenderers: Record<ExtendedChartType, ChartTypeRenderer["render"]> = {
    candlestick: (ctx, candles, start, end, toPixelX, toPixelY, config) => {
        const wickWidth = Math.max(1, config.candleWidth * 0.15);

        for (let i = start; i <= end && i < candles.length; i++) {
            const candle = candles[i];
            if (candle === undefined) continue;

            const x = toPixelX(i);
            const isUp = candle.close >= candle.open;
            const color = isUp ? config.upColor : config.downColor;

            const highY = toPixelY(candle.high);
            const lowY = toPixelY(candle.low);
            const openY = toPixelY(candle.open);
            const closeY = toPixelY(candle.close);

            ctx.fillStyle = color;
            ctx.fillRect(x - wickWidth / 2, highY, wickWidth, lowY - highY);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
            ctx.fillRect(x - config.candleWidth / 2, bodyTop, config.candleWidth, bodyHeight);
        }
    },

    hollow: (ctx, candles, start, end, toPixelX, toPixelY, config) => {
        drawHollowCandlesticks(
            ctx, candles, start, end, toPixelX, toPixelY,
            config.upColor, config.downColor, config.candleWidth,
        );
    },

    bar: (ctx, candles, start, end, toPixelX, toPixelY, config) => {
        drawBarChart(
            ctx, candles, start, end, toPixelX, toPixelY,
            config.upColor, config.downColor, config.candleWidth,
        );
    },

    line: (ctx, candles, start, end, toPixelX, toPixelY, _config) => {
        ctx.strokeStyle = "#4fc3f7";
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        ctx.beginPath();
        let first = true;

        for (let i = start; i <= end && i < candles.length; i++) {
            const candle = candles[i];
            if (candle === undefined) continue;

            const x = toPixelX(i);
            const y = toPixelY(candle.close);

            if (first) {
                ctx.moveTo(x, y);
                first = false;
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
    },

    area: (ctx, candles, start, end, toPixelX, toPixelY, config) => {
        const { chartBounds } = config;

        ctx.beginPath();
        let firstX = 0;
        let first = true;

        for (let i = start; i <= end && i < candles.length; i++) {
            const candle = candles[i];
            if (candle === undefined) continue;

            const x = toPixelX(i);
            const y = toPixelY(candle.close);

            if (first) {
                firstX = x;
                ctx.moveTo(x, chartBounds.y + chartBounds.height);
                ctx.lineTo(x, y);
                first = false;
            } else {
                ctx.lineTo(x, y);
            }
        }

        const lastCandle = candles[Math.min(end, candles.length - 1)];
        if (lastCandle !== undefined) {
            const lastX = toPixelX(Math.min(end, candles.length - 1));
            ctx.lineTo(lastX, chartBounds.y + chartBounds.height);
        }
        ctx.closePath();

        const gradient = ctx.createLinearGradient(
            0, chartBounds.y,
            0, chartBounds.y + chartBounds.height,
        );
        gradient.addColorStop(0, "rgba(79, 195, 247, 0.4)");
        gradient.addColorStop(1, "rgba(79, 195, 247, 0.05)");
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw line on top.
        chartTypeRenderers.line(ctx, candles, start, end, toPixelX, toPixelY, config);
    },

    baseline: (ctx, candles, start, end, toPixelX, toPixelY, config) => {
        const baselineConfig = config.baseline ?? {
            ...DEFAULT_BASELINE_CONFIG,
            baseValue: candles[0]?.close ?? 100,
        };
        drawBaselineChart(
            ctx, candles, start, end, toPixelX, toPixelY,
            baselineConfig, config.chartBounds,
        );
    },

    heikinashi: (ctx, candles, start, end, toPixelX, toPixelY, config) => {
        drawHeikinAshiCandlesticks(
            ctx, candles, start, end, toPixelX, toPixelY,
            config.upColor, config.downColor, config.candleWidth,
        );
    },
};

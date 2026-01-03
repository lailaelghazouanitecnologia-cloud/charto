/**
 * Drawers - Specialized chart rendering components
 * Provides renderers for various chart elements and overlays
 */

import type { Candle, Bounds, ChartTheme, Pixel } from "./types.ts";

// ============================================================================
// Types
// ============================================================================

export interface DrawerContext {
    ctx: CanvasRenderingContext2D;
    bounds: Bounds;
    theme: ChartTheme;
    priceToY: (price: number) => Pixel;
    indexToX: (index: number) => Pixel;
    yToPrice: (y: Pixel) => number;
    xToIndex: (x: Pixel) => number;
}

export interface HistogramBar {
    index: number;
    value: number;
    color?: string;
}

export interface ScatterPoint {
    x: number;
    y: number;
    size?: number;
    color?: string;
    label?: string;
}

export interface DifferenceCloudPoint {
    index: number;
    value1: number;
    value2: number;
}

export interface TrendHistogramBar {
    index: number;
    value: number;
    trend: "up" | "down" | "neutral";
}

// ============================================================================
// Histogram Drawer
// ============================================================================

export interface HistogramConfig {
    barWidth: number;
    upColor: string;
    downColor: string;
    neutralColor: string;
    opacity: number;
    borderWidth: number;
    borderColor: string;
    baseline: number;
}

export const DEFAULT_HISTOGRAM_CONFIG: HistogramConfig = {
    barWidth: 0.8,
    upColor: "#26a69a",
    downColor: "#ef5350",
    neutralColor: "#666666",
    opacity: 1,
    borderWidth: 0,
    borderColor: "#ffffff",
    baseline: 0,
};

export function drawHistogram(
    context: DrawerContext,
    bars: HistogramBar[],
    config: Partial<HistogramConfig> = {}
): void {
    const { ctx, bounds } = context;
    const cfg = { ...DEFAULT_HISTOGRAM_CONFIG, ...config };

    if (bars.length === 0) return;

    const candleWidth = bounds.width / bars.length;
    const barWidth = candleWidth * cfg.barWidth;
    const baselineY = context.priceToY(cfg.baseline);

    ctx.save();
    ctx.globalAlpha = cfg.opacity;

    for (const bar of bars) {
        const x = context.indexToX(bar.index) - barWidth / 2;
        const y = context.priceToY(bar.value);
        const height = baselineY - y;

        // Determine color
        let color = cfg.neutralColor;
        if (bar.color) {
            color = bar.color;
        } else if (bar.value > cfg.baseline) {
            color = cfg.upColor;
        } else if (bar.value < cfg.baseline) {
            color = cfg.downColor;
        }

        ctx.fillStyle = color;
        ctx.fillRect(x, Math.min(y, baselineY), barWidth, Math.abs(height));

        // Border
        if (cfg.borderWidth > 0) {
            ctx.strokeStyle = cfg.borderColor;
            ctx.lineWidth = cfg.borderWidth;
            ctx.strokeRect(x, Math.min(y, baselineY), barWidth, Math.abs(height));
        }
    }

    ctx.restore();
}

// ============================================================================
// Scatter Plot Drawer
// ============================================================================

export interface ScatterConfig {
    pointSize: number;
    pointColor: string;
    pointShape: "circle" | "square" | "diamond" | "triangle";
    opacity: number;
    showLabels: boolean;
    labelFont: string;
    labelColor: string;
    labelOffset: number;
}

export const DEFAULT_SCATTER_CONFIG: ScatterConfig = {
    pointSize: 6,
    pointColor: "#4a9eff",
    pointShape: "circle",
    opacity: 1,
    showLabels: false,
    labelFont: "10px Arial, sans-serif",
    labelColor: "#ffffff",
    labelOffset: 8,
};

export function drawScatterPlot(
    context: DrawerContext,
    points: ScatterPoint[],
    config: Partial<ScatterConfig> = {}
): void {
    const { ctx } = context;
    const cfg = { ...DEFAULT_SCATTER_CONFIG, ...config };

    if (points.length === 0) return;

    ctx.save();
    ctx.globalAlpha = cfg.opacity;

    for (const point of points) {
        const x = context.indexToX(point.x);
        const y = context.priceToY(point.y);
        const size = point.size ?? cfg.pointSize;
        const color = point.color ?? cfg.pointColor;

        ctx.fillStyle = color;

        switch (cfg.pointShape) {
            case "circle":
                ctx.beginPath();
                ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case "square":
                ctx.fillRect(x - size / 2, y - size / 2, size, size);
                break;
            case "diamond":
                ctx.beginPath();
                ctx.moveTo(x, y - size / 2);
                ctx.lineTo(x + size / 2, y);
                ctx.lineTo(x, y + size / 2);
                ctx.lineTo(x - size / 2, y);
                ctx.closePath();
                ctx.fill();
                break;
            case "triangle":
                ctx.beginPath();
                ctx.moveTo(x, y - size / 2);
                ctx.lineTo(x + size / 2, y + size / 2);
                ctx.lineTo(x - size / 2, y + size / 2);
                ctx.closePath();
                ctx.fill();
                break;
        }

        // Label
        if (cfg.showLabels && point.label) {
            ctx.font = cfg.labelFont;
            ctx.fillStyle = cfg.labelColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.fillText(point.label, x, y - cfg.labelOffset);
        }
    }

    ctx.restore();
}

// ============================================================================
// Difference Cloud Drawer
// ============================================================================

export interface DifferenceCloudConfig {
    positiveColor: string;
    negativeColor: string;
    opacity: number;
    showBoundaryLines: boolean;
    line1Color: string;
    line2Color: string;
    lineWidth: number;
}

export const DEFAULT_DIFFERENCE_CLOUD_CONFIG: DifferenceCloudConfig = {
    positiveColor: "#26a69a",
    negativeColor: "#ef5350",
    opacity: 0.3,
    showBoundaryLines: true,
    line1Color: "#4a9eff",
    line2Color: "#ff9800",
    lineWidth: 1,
};

export function drawDifferenceCloud(
    context: DrawerContext,
    points: DifferenceCloudPoint[],
    config: Partial<DifferenceCloudConfig> = {}
): void {
    const { ctx, bounds } = context;
    const cfg = { ...DEFAULT_DIFFERENCE_CLOUD_CONFIG, ...config };

    if (points.length < 2) return;

    ctx.save();

    // Find crossover points
    const segments: Array<{
        startIndex: number;
        endIndex: number;
        isPositive: boolean;
        points: DifferenceCloudPoint[];
    }> = [];

    let currentSegment: DifferenceCloudPoint[] = [points[0]];
    let isPositive = points[0].value1 >= points[0].value2;

    for (let i = 1; i < points.length; i++) {
        const point = points[i];
        const pointIsPositive = point.value1 >= point.value2;

        if (pointIsPositive !== isPositive) {
            // Crossover - save current segment and start new one
            segments.push({
                startIndex: currentSegment[0].index,
                endIndex: currentSegment[currentSegment.length - 1].index,
                isPositive,
                points: currentSegment,
            });
            currentSegment = [point];
            isPositive = pointIsPositive;
        } else {
            currentSegment.push(point);
        }
    }

    // Add final segment
    if (currentSegment.length > 0) {
        segments.push({
            startIndex: currentSegment[0].index,
            endIndex: currentSegment[currentSegment.length - 1].index,
            isPositive,
            points: currentSegment,
        });
    }

    // Draw each segment as a filled area
    for (const segment of segments) {
        if (segment.points.length < 2) continue;

        ctx.beginPath();
        ctx.fillStyle = segment.isPositive ? cfg.positiveColor : cfg.negativeColor;
        ctx.globalAlpha = cfg.opacity;

        // Top line (value1)
        const firstPoint = segment.points[0];
        ctx.moveTo(context.indexToX(firstPoint.index), context.priceToY(firstPoint.value1));

        for (let i = 1; i < segment.points.length; i++) {
            const point = segment.points[i];
            ctx.lineTo(context.indexToX(point.index), context.priceToY(point.value1));
        }

        // Bottom line (value2) - reverse order
        for (let i = segment.points.length - 1; i >= 0; i--) {
            const point = segment.points[i];
            ctx.lineTo(context.indexToX(point.index), context.priceToY(point.value2));
        }

        ctx.closePath();
        ctx.fill();
    }

    // Draw boundary lines
    if (cfg.showBoundaryLines) {
        ctx.globalAlpha = 1;

        // Line 1
        ctx.beginPath();
        ctx.strokeStyle = cfg.line1Color;
        ctx.lineWidth = cfg.lineWidth;
        ctx.moveTo(context.indexToX(points[0].index), context.priceToY(points[0].value1));
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(context.indexToX(points[i].index), context.priceToY(points[i].value1));
        }
        ctx.stroke();

        // Line 2
        ctx.beginPath();
        ctx.strokeStyle = cfg.line2Color;
        ctx.moveTo(context.indexToX(points[0].index), context.priceToY(points[0].value2));
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(context.indexToX(points[i].index), context.priceToY(points[i].value2));
        }
        ctx.stroke();
    }

    ctx.restore();
}

// ============================================================================
// Trend Histogram Drawer (for MACD, etc.)
// ============================================================================

export interface TrendHistogramConfig {
    barWidth: number;
    upTrendColor: string;
    downTrendColor: string;
    upFadingColor: string;
    downFadingColor: string;
    opacity: number;
}

export const DEFAULT_TREND_HISTOGRAM_CONFIG: TrendHistogramConfig = {
    barWidth: 0.7,
    upTrendColor: "#26a69a",
    downTrendColor: "#ef5350",
    upFadingColor: "#80cbc4",
    downFadingColor: "#ef9a9a",
    opacity: 1,
};

export function drawTrendHistogram(
    context: DrawerContext,
    bars: TrendHistogramBar[],
    config: Partial<TrendHistogramConfig> = {}
): void {
    const { ctx, bounds } = context;
    const cfg = { ...DEFAULT_TREND_HISTOGRAM_CONFIG, ...config };

    if (bars.length === 0) return;

    const candleWidth = bounds.width / bars.length;
    const barWidth = candleWidth * cfg.barWidth;
    const baselineY = context.priceToY(0);

    ctx.save();
    ctx.globalAlpha = cfg.opacity;

    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        const prevBar = bars[i - 1];
        const x = context.indexToX(bar.index) - barWidth / 2;
        const y = context.priceToY(bar.value);
        const height = baselineY - y;

        // Determine color based on value and trend
        let color: string;
        if (bar.value >= 0) {
            // Above zero
            if (prevBar && bar.value > prevBar.value) {
                color = cfg.upTrendColor; // Growing
            } else {
                color = cfg.upFadingColor; // Shrinking
            }
        } else {
            // Below zero
            if (prevBar && bar.value < prevBar.value) {
                color = cfg.downTrendColor; // Growing negative
            } else {
                color = cfg.downFadingColor; // Shrinking negative
            }
        }

        ctx.fillStyle = color;
        ctx.fillRect(x, Math.min(y, baselineY), barWidth, Math.abs(height));
    }

    ctx.restore();
}

// ============================================================================
// Volume Profile Drawer
// ============================================================================

export interface VolumeProfileBar {
    priceLevel: number;
    volume: number;
    buyVolume?: number;
    sellVolume?: number;
}

export interface VolumeProfileConfig {
    width: number; // Percentage of chart width
    position: "left" | "right";
    buyColor: string;
    sellColor: string;
    neutralColor: string;
    opacity: number;
    pocColor: string; // Point of Control
    showPOC: boolean;
    valueAreaColor: string;
    valueAreaOpacity: number;
    showValueArea: boolean;
    valueAreaPercent: number;
}

export const DEFAULT_VOLUME_PROFILE_CONFIG: VolumeProfileConfig = {
    width: 0.15,
    position: "right",
    buyColor: "#26a69a",
    sellColor: "#ef5350",
    neutralColor: "#4a9eff",
    opacity: 0.7,
    pocColor: "#ffeb3b",
    showPOC: true,
    valueAreaColor: "#ffffff",
    valueAreaOpacity: 0.1,
    showValueArea: true,
    valueAreaPercent: 0.7,
};

export function drawVolumeProfile(
    context: DrawerContext,
    bars: VolumeProfileBar[],
    config: Partial<VolumeProfileConfig> = {}
): void {
    const { ctx, bounds } = context;
    const cfg = { ...DEFAULT_VOLUME_PROFILE_CONFIG, ...config };

    if (bars.length === 0) return;

    const maxVolume = Math.max(...bars.map(b => b.volume));
    if (maxVolume === 0) return;

    const profileWidth = bounds.width * cfg.width;
    const profileX = cfg.position === "left" ? bounds.x : bounds.x + bounds.width - profileWidth;

    // Find POC (Point of Control) - highest volume bar
    const poc = bars.reduce((max, bar) => bar.volume > max.volume ? bar : max, bars[0]);

    // Calculate value area
    const totalVolume = bars.reduce((sum, bar) => sum + bar.volume, 0);
    const targetVolume = totalVolume * cfg.valueAreaPercent;

    // Sort bars by volume descending
    const sortedBars = [...bars].sort((a, b) => b.volume - a.volume);
    let cumulativeVolume = 0;
    const valueAreaBars = new Set<VolumeProfileBar>();

    for (const bar of sortedBars) {
        if (cumulativeVolume >= targetVolume) break;
        valueAreaBars.add(bar);
        cumulativeVolume += bar.volume;
    }

    ctx.save();

    // Draw value area background
    if (cfg.showValueArea && valueAreaBars.size > 0) {
        const valueAreaPrices = Array.from(valueAreaBars).map(b => b.priceLevel);
        const minPrice = Math.min(...valueAreaPrices);
        const maxPrice = Math.max(...valueAreaPrices);

        ctx.fillStyle = cfg.valueAreaColor;
        ctx.globalAlpha = cfg.valueAreaOpacity;
        ctx.fillRect(
            bounds.x,
            context.priceToY(maxPrice),
            bounds.width,
            context.priceToY(minPrice) - context.priceToY(maxPrice)
        );
    }

    ctx.globalAlpha = cfg.opacity;

    // Draw volume bars
    const barHeight = bounds.height / bars.length;

    for (const bar of bars) {
        const y = context.priceToY(bar.priceLevel);
        const barWidth = (bar.volume / maxVolume) * profileWidth;

        const x = cfg.position === "left" ? profileX : profileX + profileWidth - barWidth;

        // Draw buy/sell split if available
        if (bar.buyVolume !== undefined && bar.sellVolume !== undefined) {
            const total = bar.buyVolume + bar.sellVolume;
            const buyWidth = (bar.buyVolume / total) * barWidth;
            const sellWidth = barWidth - buyWidth;

            if (cfg.position === "left") {
                ctx.fillStyle = cfg.buyColor;
                ctx.fillRect(x, y - barHeight / 2, buyWidth, barHeight);
                ctx.fillStyle = cfg.sellColor;
                ctx.fillRect(x + buyWidth, y - barHeight / 2, sellWidth, barHeight);
            } else {
                ctx.fillStyle = cfg.sellColor;
                ctx.fillRect(x, y - barHeight / 2, sellWidth, barHeight);
                ctx.fillStyle = cfg.buyColor;
                ctx.fillRect(x + sellWidth, y - barHeight / 2, buyWidth, barHeight);
            }
        } else {
            ctx.fillStyle = cfg.neutralColor;
            ctx.fillRect(x, y - barHeight / 2, barWidth, barHeight);
        }
    }

    // Draw POC line
    if (cfg.showPOC) {
        const pocY = context.priceToY(poc.priceLevel);
        ctx.strokeStyle = cfg.pocColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(bounds.x, pocY);
        ctx.lineTo(bounds.x + bounds.width, pocY);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    ctx.restore();
}

// ============================================================================
// Bid/Ask Spread Drawer
// ============================================================================

export interface BidAskPoint {
    index: number;
    bid: number;
    ask: number;
}

export interface BidAskConfig {
    bidColor: string;
    askColor: string;
    spreadColor: string;
    spreadOpacity: number;
    lineWidth: number;
    showSpread: boolean;
}

export const DEFAULT_BID_ASK_CONFIG: BidAskConfig = {
    bidColor: "#26a69a",
    askColor: "#ef5350",
    spreadColor: "#888888",
    spreadOpacity: 0.2,
    lineWidth: 1,
    showSpread: true,
};

export function drawBidAskSpread(
    context: DrawerContext,
    points: BidAskPoint[],
    config: Partial<BidAskConfig> = {}
): void {
    const { ctx } = context;
    const cfg = { ...DEFAULT_BID_ASK_CONFIG, ...config };

    if (points.length < 2) return;

    ctx.save();

    // Draw spread area
    if (cfg.showSpread) {
        ctx.beginPath();
        ctx.fillStyle = cfg.spreadColor;
        ctx.globalAlpha = cfg.spreadOpacity;

        // Upper edge (ask)
        ctx.moveTo(context.indexToX(points[0].index), context.priceToY(points[0].ask));
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(context.indexToX(points[i].index), context.priceToY(points[i].ask));
        }

        // Lower edge (bid) - reverse
        for (let i = points.length - 1; i >= 0; i--) {
            ctx.lineTo(context.indexToX(points[i].index), context.priceToY(points[i].bid));
        }

        ctx.closePath();
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.lineWidth = cfg.lineWidth;

    // Draw bid line
    ctx.beginPath();
    ctx.strokeStyle = cfg.bidColor;
    ctx.moveTo(context.indexToX(points[0].index), context.priceToY(points[0].bid));
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(context.indexToX(points[i].index), context.priceToY(points[i].bid));
    }
    ctx.stroke();

    // Draw ask line
    ctx.beginPath();
    ctx.strokeStyle = cfg.askColor;
    ctx.moveTo(context.indexToX(points[0].index), context.priceToY(points[0].ask));
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(context.indexToX(points[i].index), context.priceToY(points[i].ask));
    }
    ctx.stroke();

    ctx.restore();
}

// ============================================================================
// Range Bar Drawer
// ============================================================================

export interface RangeBar {
    index: number;
    high: number;
    low: number;
    color?: string;
}

export interface RangeBarConfig {
    barWidth: number;
    color: string;
    opacity: number;
    showWicks: boolean;
    wickWidth: number;
}

export const DEFAULT_RANGE_BAR_CONFIG: RangeBarConfig = {
    barWidth: 0.8,
    color: "#4a9eff",
    opacity: 0.6,
    showWicks: true,
    wickWidth: 1,
};

export function drawRangeBars(
    context: DrawerContext,
    bars: RangeBar[],
    config: Partial<RangeBarConfig> = {}
): void {
    const { ctx, bounds } = context;
    const cfg = { ...DEFAULT_RANGE_BAR_CONFIG, ...config };

    if (bars.length === 0) return;

    const candleWidth = bounds.width / bars.length;
    const barWidth = candleWidth * cfg.barWidth;

    ctx.save();
    ctx.globalAlpha = cfg.opacity;

    for (const bar of bars) {
        const x = context.indexToX(bar.index);
        const highY = context.priceToY(bar.high);
        const lowY = context.priceToY(bar.low);
        const color = bar.color ?? cfg.color;

        // Draw bar body
        ctx.fillStyle = color;
        ctx.fillRect(x - barWidth / 2, highY, barWidth, lowY - highY);

        // Draw wick/center line
        if (cfg.showWicks) {
            ctx.strokeStyle = color;
            ctx.lineWidth = cfg.wickWidth;
            ctx.beginPath();
            ctx.moveTo(x, highY);
            ctx.lineTo(x, lowY);
            ctx.stroke();
        }
    }

    ctx.restore();
}

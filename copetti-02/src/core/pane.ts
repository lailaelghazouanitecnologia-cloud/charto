/**
 * Multi-pane system for chart with separate indicator panels.
 * Allows RSI, MACD, and other indicators to be displayed in separate panes.
 */

import type { Candle, ColorHex, Pixel } from "./types.ts";
import { createScale, type LinearScale } from "./scale.ts";

/** Pane type. */
export type PaneType = "main" | "indicator";

/** Indicator type for panes. */
export type PaneIndicatorType = "rsi" | "macd" | "volume" | "stochastic" | "custom";

/** Pane configuration. */
export interface PaneConfig {
    id: string;
    type: PaneType;
    indicatorType?: PaneIndicatorType;
    height: number; // Percentage or fixed pixels
    minHeight: number;
    maxHeight: number;
    visible: boolean;
    title?: string;
}

/** Pane state. */
export interface PaneState {
    id: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    yScale: LinearScale;
    data: number[][] | null; // Indicator data
}

/** RSI configuration. */
export interface RSIConfig {
    period: number;
    overbought: number;
    oversold: number;
    lineColor: ColorHex;
    overboughtColor: ColorHex;
    oversoldColor: ColorHex;
}

/** MACD configuration. */
export interface MACDConfig {
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
    macdColor: ColorHex;
    signalColor: ColorHex;
    histogramUpColor: ColorHex;
    histogramDownColor: ColorHex;
}

/** Default configurations. */
export const DEFAULT_RSI_CONFIG: RSIConfig = {
    period: 14,
    overbought: 70,
    oversold: 30,
    lineColor: "#a855f7",
    overboughtColor: "#ef4444",
    oversoldColor: "#22c55e",
};

export const DEFAULT_MACD_CONFIG: MACDConfig = {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    macdColor: "#3b82f6",
    signalColor: "#f59e0b",
    histogramUpColor: "#22c55e",
    histogramDownColor: "#ef4444",
};

/** Calculate RSI values. */
export function calculateRSI(candles: readonly Candle[], period: number = 14): number[] {
    if (candles.length < period + 1) return [];

    const rsi: number[] = new Array(period).fill(NaN);
    let avgGain = 0;
    let avgLoss = 0;

    // Calculate initial average gain/loss.
    for (let i = 1; i <= period; i++) {
        const change = candles[i]!.close - candles[i - 1]!.close;
        if (change > 0) {
            avgGain += change;
        } else {
            avgLoss += Math.abs(change);
        }
    }

    avgGain /= period;
    avgLoss /= period;

    // First RSI value.
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));

    // Subsequent values using smoothed averages.
    for (let i = period + 1; i < candles.length; i++) {
        const change = candles[i]!.close - candles[i - 1]!.close;
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;

        const rsValue = avgLoss === 0 ? 100 : avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rsValue)));
    }

    return rsi;
}

/** Calculate MACD values. */
export function calculateMACD(
    candles: readonly Candle[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9,
): { macd: number[]; signal: number[]; histogram: number[] } {
    if (candles.length < slowPeriod) {
        return { macd: [], signal: [], histogram: [] };
    }

    // Calculate EMAs.
    const fastEMA: number[] = [];
    const slowEMA: number[] = [];
    const macd: number[] = [];
    const signal: number[] = [];
    const histogram: number[] = [];

    const fastMultiplier = 2 / (fastPeriod + 1);
    const slowMultiplier = 2 / (slowPeriod + 1);
    const signalMultiplier = 2 / (signalPeriod + 1);

    // Initialize EMAs.
    let fastSum = 0;
    let slowSum = 0;

    for (let i = 0; i < slowPeriod; i++) {
        const close = candles[i]!.close;
        if (i < fastPeriod) fastSum += close;
        slowSum += close;

        if (i === fastPeriod - 1) {
            fastEMA.push(fastSum / fastPeriod);
        } else if (i < fastPeriod - 1) {
            fastEMA.push(NaN);
        }

        if (i === slowPeriod - 1) {
            slowEMA.push(slowSum / slowPeriod);
            macd.push(fastEMA[i]! - slowEMA[0]!);
        } else {
            slowEMA.push(NaN);
            macd.push(NaN);
        }
    }

    // Calculate rest of EMAs and MACD.
    for (let i = slowPeriod; i < candles.length; i++) {
        const close = candles[i]!.close;

        const prevFastEMA = fastEMA[fastEMA.length - 1]!;
        const newFastEMA = (close - prevFastEMA) * fastMultiplier + prevFastEMA;
        fastEMA.push(newFastEMA);

        const prevSlowEMA = slowEMA[slowEMA.length - 1]!;
        const newSlowEMA = (close - prevSlowEMA) * slowMultiplier + prevSlowEMA;
        slowEMA.push(newSlowEMA);

        macd.push(newFastEMA - newSlowEMA);
    }

    // Calculate signal line.
    let signalSum = 0;
    for (let i = 0; i < macd.length; i++) {
        if (i < slowPeriod - 1 + signalPeriod - 1) {
            signal.push(NaN);
            histogram.push(NaN);

            if (i >= slowPeriod - 1) {
                signalSum += macd[i]!;
            }
        } else if (i === slowPeriod - 1 + signalPeriod - 1) {
            signalSum += macd[i]!;
            const signalValue = signalSum / signalPeriod;
            signal.push(signalValue);
            histogram.push(macd[i]! - signalValue);
        } else {
            const prevSignal = signal[signal.length - 1]!;
            const newSignal = (macd[i]! - prevSignal) * signalMultiplier + prevSignal;
            signal.push(newSignal);
            histogram.push(macd[i]! - newSignal);
        }
    }

    return { macd, signal, histogram };
}

/** Pane manager class. */
export class PaneManager {
    private panes: Map<string, PaneConfig> = new Map();
    private paneStates: Map<string, PaneState> = new Map();
    private totalHeight: number = 0;
    private chartWidth: number = 0;
    private padding: number = 10;

    constructor() {
        // Add main pane by default.
        this.addPane({
            id: "main",
            type: "main",
            height: 70, // 70% of total height
            minHeight: 30,
            maxHeight: 90,
            visible: true,
        });
    }

    /** Add a new pane. */
    addPane(config: PaneConfig): void {
        this.panes.set(config.id, config);
        this.recalculateLayout();
    }

    /** Remove a pane. */
    removePane(id: string): boolean {
        if (id === "main") return false; // Can't remove main pane.

        const deleted = this.panes.delete(id);
        if (deleted) {
            this.paneStates.delete(id);
            this.recalculateLayout();
        }
        return deleted;
    }

    /** Set pane visibility. */
    setPaneVisible(id: string, visible: boolean): void {
        const pane = this.panes.get(id);
        if (pane) {
            pane.visible = visible;
            this.recalculateLayout();
        }
    }

    /** Set total chart dimensions. */
    setDimensions(width: number, height: number): void {
        this.chartWidth = width;
        this.totalHeight = height;
        this.recalculateLayout();
    }

    /** Recalculate pane layout. */
    private recalculateLayout(): void {
        const visiblePanes = Array.from(this.panes.values()).filter(p => p.visible);
        const totalPercent = visiblePanes.reduce((sum, p) => sum + p.height, 0);

        let currentY = this.padding;
        const availableHeight = this.totalHeight - this.padding * 2;
        const resizerHeight = 4;

        for (const pane of visiblePanes) {
            const normalizedHeight = (pane.height / totalPercent) * availableHeight;
            const paneHeight = normalizedHeight - (pane.type === "main" ? 0 : resizerHeight);

            const bounds = {
                x: this.padding,
                y: currentY,
                width: this.chartWidth - this.padding * 2 - 70, // Reserve space for Y-axis
                height: paneHeight,
            };

            // Create or update Y scale.
            let yScale = this.paneStates.get(pane.id)?.yScale;
            if (!yScale) {
                yScale = createScale({
                    domainMin: 0,
                    domainMax: 100,
                    rangeMin: bounds.y + bounds.height,
                    rangeMax: bounds.y,
                });
            } else {
                yScale.update({
                    rangeMin: bounds.y + bounds.height,
                    rangeMax: bounds.y,
                });
            }

            this.paneStates.set(pane.id, {
                id: pane.id,
                bounds,
                yScale,
                data: this.paneStates.get(pane.id)?.data ?? null,
            });

            currentY += normalizedHeight;
        }
    }

    /** Get pane state. */
    getPaneState(id: string): PaneState | undefined {
        return this.paneStates.get(id);
    }

    /** Get all visible pane states. */
    getVisiblePanes(): PaneState[] {
        return Array.from(this.panes.values())
            .filter(p => p.visible)
            .map(p => this.paneStates.get(p.id)!)
            .filter(Boolean);
    }

    /** Get pane config. */
    getPaneConfig(id: string): PaneConfig | undefined {
        return this.panes.get(id);
    }

    /** Update pane height (for resizing). */
    setPaneHeight(id: string, height: number): void {
        const pane = this.panes.get(id);
        if (pane) {
            pane.height = Math.max(pane.minHeight, Math.min(pane.maxHeight, height));
            this.recalculateLayout();
        }
    }

    /** Update indicator data for a pane. */
    updatePaneData(id: string, data: number[][]): void {
        const state = this.paneStates.get(id);
        if (state) {
            state.data = data;

            // Auto-scale Y axis based on data.
            let min = Infinity;
            let max = -Infinity;

            for (const series of data) {
                for (const value of series) {
                    if (!isNaN(value)) {
                        if (value < min) min = value;
                        if (value > max) max = value;
                    }
                }
            }

            if (min !== Infinity && max !== -Infinity) {
                const padding = (max - min) * 0.1;
                state.yScale.update({
                    domainMin: min - padding,
                    domainMax: max + padding,
                });
            }
        }
    }

    /** Set fixed Y scale range for a pane (e.g., RSI 0-100). */
    setPaneYRange(id: string, min: number, max: number): void {
        const state = this.paneStates.get(id);
        if (state) {
            state.yScale.update({
                domainMin: min,
                domainMax: max,
            });
        }
    }
}

/** Draw RSI indicator in a pane. */
export function drawRSIPane(
    ctx: CanvasRenderingContext2D,
    rsiValues: number[],
    startIndex: number,
    endIndex: number,
    toPixelX: (index: number) => Pixel,
    state: PaneState,
    config: RSIConfig = DEFAULT_RSI_CONFIG,
): void {
    const { bounds, yScale } = state;

    // Draw background.
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Draw overbought/oversold zones.
    const overboughtY = yScale.toPixel(config.overbought);
    const oversoldY = yScale.toPixel(config.oversold);
    const midlineY = yScale.toPixel(50);

    // Overbought zone.
    ctx.fillStyle = "rgba(239, 68, 68, 0.1)";
    ctx.fillRect(bounds.x, bounds.y, bounds.width, overboughtY - bounds.y);

    // Oversold zone.
    ctx.fillStyle = "rgba(34, 197, 94, 0.1)";
    ctx.fillRect(bounds.x, oversoldY, bounds.width, bounds.y + bounds.height - oversoldY);

    // Draw horizontal lines.
    ctx.strokeStyle = config.overboughtColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(bounds.x, overboughtY);
    ctx.lineTo(bounds.x + bounds.width, overboughtY);
    ctx.stroke();

    ctx.strokeStyle = config.oversoldColor;
    ctx.beginPath();
    ctx.moveTo(bounds.x, oversoldY);
    ctx.lineTo(bounds.x + bounds.width, oversoldY);
    ctx.stroke();

    ctx.strokeStyle = "#666666";
    ctx.beginPath();
    ctx.moveTo(bounds.x, midlineY);
    ctx.lineTo(bounds.x + bounds.width, midlineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw RSI line.
    ctx.strokeStyle = config.lineColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();
    let first = true;

    for (let i = startIndex; i <= endIndex && i < rsiValues.length; i++) {
        const value = rsiValues[i];
        if (value === undefined || isNaN(value)) continue;

        const x = toPixelX(i);
        const y = yScale.toPixel(value);

        if (first) {
            ctx.moveTo(x, y);
            first = false;
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();

    // Draw Y-axis labels.
    ctx.fillStyle = "#888888";
    ctx.font = "10px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    ctx.fillText("70", bounds.x + bounds.width + 5, overboughtY);
    ctx.fillText("50", bounds.x + bounds.width + 5, midlineY);
    ctx.fillText("30", bounds.x + bounds.width + 5, oversoldY);

    // Draw title.
    ctx.fillStyle = "#e4e4e7";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`RSI(${config.period})`, bounds.x + 5, bounds.y + 5);
}

/** Draw MACD indicator in a pane. */
export function drawMACDPane(
    ctx: CanvasRenderingContext2D,
    macdData: { macd: number[]; signal: number[]; histogram: number[] },
    startIndex: number,
    endIndex: number,
    toPixelX: (index: number) => Pixel,
    state: PaneState,
    config: MACDConfig = DEFAULT_MACD_CONFIG,
    barWidth: number = 4,
): void {
    const { bounds, yScale } = state;

    // Draw background.
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Draw zero line.
    const zeroY = yScale.toPixel(0);
    ctx.strokeStyle = "#666666";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(bounds.x, zeroY);
    ctx.lineTo(bounds.x + bounds.width, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw histogram.
    for (let i = startIndex; i <= endIndex && i < macdData.histogram.length; i++) {
        const value = macdData.histogram[i];
        if (value === undefined || isNaN(value)) continue;

        const x = toPixelX(i);
        const y = yScale.toPixel(value);
        const height = Math.abs(y - zeroY);

        ctx.fillStyle = value >= 0 ? config.histogramUpColor : config.histogramDownColor;
        ctx.globalAlpha = 0.7;

        if (value >= 0) {
            ctx.fillRect(x - barWidth / 2, y, barWidth, height);
        } else {
            ctx.fillRect(x - barWidth / 2, zeroY, barWidth, height);
        }
    }

    ctx.globalAlpha = 1;

    // Draw MACD line.
    ctx.strokeStyle = config.macdColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    ctx.beginPath();
    let first = true;

    for (let i = startIndex; i <= endIndex && i < macdData.macd.length; i++) {
        const value = macdData.macd[i];
        if (value === undefined || isNaN(value)) continue;

        const x = toPixelX(i);
        const y = yScale.toPixel(value);

        if (first) {
            ctx.moveTo(x, y);
            first = false;
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();

    // Draw signal line.
    ctx.strokeStyle = config.signalColor;

    ctx.beginPath();
    first = true;

    for (let i = startIndex; i <= endIndex && i < macdData.signal.length; i++) {
        const value = macdData.signal[i];
        if (value === undefined || isNaN(value)) continue;

        const x = toPixelX(i);
        const y = yScale.toPixel(value);

        if (first) {
            ctx.moveTo(x, y);
            first = false;
        } else {
            ctx.lineTo(x, y);
        }
    }

    ctx.stroke();

    // Draw title.
    ctx.fillStyle = "#e4e4e7";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(
        `MACD(${config.fastPeriod},${config.slowPeriod},${config.signalPeriod})`,
        bounds.x + 5,
        bounds.y + 5,
    );

    // Legend.
    ctx.fillStyle = config.macdColor;
    ctx.fillRect(bounds.x + 150, bounds.y + 5, 12, 3);
    ctx.fillStyle = "#888888";
    ctx.font = "9px monospace";
    ctx.fillText("MACD", bounds.x + 165, bounds.y + 8);

    ctx.fillStyle = config.signalColor;
    ctx.fillRect(bounds.x + 205, bounds.y + 5, 12, 3);
    ctx.fillText("Signal", bounds.x + 220, bounds.y + 8);
}

/** Draw pane separator/resizer. */
export function drawPaneSeparator(
    ctx: CanvasRenderingContext2D,
    y: number,
    width: number,
    isHovered: boolean = false,
): void {
    const height = 4;

    ctx.fillStyle = isHovered ? "#4a4a5a" : "#2a2a36";
    ctx.fillRect(0, y, width, height);

    // Draw grip dots.
    ctx.fillStyle = isHovered ? "#888888" : "#666666";
    const centerX = width / 2;
    const dotSize = 2;
    const dotSpacing = 6;

    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.arc(centerX + i * dotSpacing, y + height / 2, dotSize, 0, Math.PI * 2);
        ctx.fill();
    }
}

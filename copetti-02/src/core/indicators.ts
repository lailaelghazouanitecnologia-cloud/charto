/**
 * Technical indicators for chart analysis.
 */

import type { Candle, ColorHex } from "./types.ts";

/** Indicator data point. */
export interface IndicatorPoint {
    readonly index: number;
    readonly value: number;
}

/** Indicator series with styling. */
export interface IndicatorSeries {
    readonly name: string;
    readonly points: IndicatorPoint[];
    readonly color: ColorHex;
    readonly lineWidth: number;
}

/** Bollinger Bands result. */
export interface BollingerBands {
    readonly upper: IndicatorPoint[];
    readonly middle: IndicatorPoint[];
    readonly lower: IndicatorPoint[];
}

/**
 * Simple Moving Average (SMA).
 */
export function sma(candles: readonly Candle[], period: number): IndicatorPoint[] {
    if (candles.length < period) return [];

    const result: IndicatorPoint[] = [];

    for (let i = period - 1; i < candles.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            const candle = candles[i - j];
            if (candle !== undefined) {
                sum += candle.close;
            }
        }
        result.push({
            index: i,
            value: sum / period,
        });
    }

    return result;
}

/**
 * Exponential Moving Average (EMA).
 */
export function ema(candles: readonly Candle[], period: number): IndicatorPoint[] {
    if (candles.length < period) return [];

    const result: IndicatorPoint[] = [];
    const multiplier = 2 / (period + 1);

    // Start with SMA for first value.
    let sum = 0;
    for (let i = 0; i < period; i++) {
        const candle = candles[i];
        if (candle !== undefined) {
            sum += candle.close;
        }
    }
    let prevEma = sum / period;

    result.push({
        index: period - 1,
        value: prevEma,
    });

    // Calculate EMA for rest.
    for (let i = period; i < candles.length; i++) {
        const candle = candles[i];
        if (candle !== undefined) {
            const currentEma = (candle.close - prevEma) * multiplier + prevEma;
            result.push({
                index: i,
                value: currentEma,
            });
            prevEma = currentEma;
        }
    }

    return result;
}

/**
 * Bollinger Bands.
 */
export function bollingerBands(
    candles: readonly Candle[],
    period: number = 20,
    stdDev: number = 2,
): BollingerBands {
    if (candles.length < period) {
        return { upper: [], middle: [], lower: [] };
    }

    const middle: IndicatorPoint[] = [];
    const upper: IndicatorPoint[] = [];
    const lower: IndicatorPoint[] = [];

    for (let i = period - 1; i < candles.length; i++) {
        // Calculate SMA.
        let sum = 0;
        for (let j = 0; j < period; j++) {
            const candle = candles[i - j];
            if (candle !== undefined) {
                sum += candle.close;
            }
        }
        const smaValue = sum / period;

        // Calculate standard deviation.
        let sqSum = 0;
        for (let j = 0; j < period; j++) {
            const candle = candles[i - j];
            if (candle !== undefined) {
                sqSum += Math.pow(candle.close - smaValue, 2);
            }
        }
        const std = Math.sqrt(sqSum / period);

        middle.push({ index: i, value: smaValue });
        upper.push({ index: i, value: smaValue + stdDev * std });
        lower.push({ index: i, value: smaValue - stdDev * std });
    }

    return { upper, middle, lower };
}

/**
 * Relative Strength Index (RSI).
 */
export function rsi(candles: readonly Candle[], period: number = 14): IndicatorPoint[] {
    if (candles.length < period + 1) return [];

    const result: IndicatorPoint[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    // Calculate initial gains/losses.
    for (let i = 1; i <= period; i++) {
        const prev = candles[i - 1];
        const curr = candles[i];
        if (prev !== undefined && curr !== undefined) {
            const change = curr.close - prev.close;
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? -change : 0);
        }
    }

    let avgGain = gains.reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.reduce((a, b) => a + b, 0) / period;

    // First RSI value.
    const firstRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({
        index: period,
        value: 100 - 100 / (1 + firstRs),
    });

    // Calculate rest using smoothed averages.
    for (let i = period + 1; i < candles.length; i++) {
        const prev = candles[i - 1];
        const curr = candles[i];
        if (prev !== undefined && curr !== undefined) {
            const change = curr.close - prev.close;
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? -change : 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;

            const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
            result.push({
                index: i,
                value: 100 - 100 / (1 + rs),
            });
        }
    }

    return result;
}

/**
 * Moving Average Convergence Divergence (MACD).
 */
export function macd(
    candles: readonly Candle[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9,
): {
    macd: IndicatorPoint[];
    signal: IndicatorPoint[];
    histogram: IndicatorPoint[];
} {
    const fastEma = ema(candles, fastPeriod);
    const slowEma = ema(candles, slowPeriod);

    if (fastEma.length === 0 || slowEma.length === 0) {
        return { macd: [], signal: [], histogram: [] };
    }

    // Calculate MACD line.
    const macdLine: IndicatorPoint[] = [];
    const slowStart = slowPeriod - fastPeriod;

    for (let i = 0; i < slowEma.length; i++) {
        const slow = slowEma[i];
        const fast = fastEma[i + slowStart];
        if (slow !== undefined && fast !== undefined) {
            macdLine.push({
                index: slow.index,
                value: fast.value - slow.value,
            });
        }
    }

    // Calculate signal line (EMA of MACD).
    if (macdLine.length < signalPeriod) {
        return { macd: macdLine, signal: [], histogram: [] };
    }

    const signalLine: IndicatorPoint[] = [];
    const histogram: IndicatorPoint[] = [];
    const multiplier = 2 / (signalPeriod + 1);

    // Start with SMA.
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) {
        const point = macdLine[i];
        if (point !== undefined) {
            sum += point.value;
        }
    }
    let prevSignal = sum / signalPeriod;

    const firstMacd = macdLine[signalPeriod - 1];
    if (firstMacd !== undefined) {
        signalLine.push({
            index: firstMacd.index,
            value: prevSignal,
        });
        histogram.push({
            index: firstMacd.index,
            value: firstMacd.value - prevSignal,
        });
    }

    for (let i = signalPeriod; i < macdLine.length; i++) {
        const point = macdLine[i];
        if (point !== undefined) {
            const currentSignal = (point.value - prevSignal) * multiplier + prevSignal;
            signalLine.push({
                index: point.index,
                value: currentSignal,
            });
            histogram.push({
                index: point.index,
                value: point.value - currentSignal,
            });
            prevSignal = currentSignal;
        }
    }

    return { macd: macdLine, signal: signalLine, histogram };
}

/** Indicator configuration. */
export interface IndicatorConfig {
    readonly type: "sma" | "ema" | "bollinger" | "rsi" | "macd";
    readonly period?: number;
    readonly color?: ColorHex;
    readonly enabled: boolean;
}

/** Default indicator colors. */
export const INDICATOR_COLORS = {
    sma: "#fbbf24" as ColorHex,
    ema: "#a78bfa" as ColorHex,
    bollingerUpper: "#60a5fa" as ColorHex,
    bollingerMiddle: "#60a5fa" as ColorHex,
    bollingerLower: "#60a5fa" as ColorHex,
    rsi: "#f472b6" as ColorHex,
    macdLine: "#22d3ee" as ColorHex,
    macdSignal: "#fb923c" as ColorHex,
    macdHistogramUp: "#22c55e" as ColorHex,
    macdHistogramDown: "#ef4444" as ColorHex,
} as const;

/**
 * React Hooks for Graph Module
 * Provides easy integration with React components.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Candle } from "../core/types.ts";
import {
    CandleAggregator,
    SimulatedDataStream,
    createChartDataManager,
    type AggregatorConfig,
    type StreamingState,
} from "../core/streaming.ts";
import { sma, ema, bollingerBands, type IndicatorPoint, type BollingerBands } from "../core/indicators.ts";
import { calculateRSI, calculateMACD } from "../core/pane.ts";

/**
 * Hook for managing chart data with live updates.
 */
export function useChartData(initialCandles: Candle[] = []) {
    const managerRef = useRef(createChartDataManager(initialCandles));
    const [candles, setCandles] = useState<Candle[]>(initialCandles);

    useEffect(() => {
        const unsubscribe = managerRef.current.subscribe(setCandles);
        return unsubscribe;
    }, []);

    const actions = useMemo(() => ({
        setCandles: managerRef.current.setCandles,
        appendCandle: managerRef.current.appendCandle,
        updateLastCandle: managerRef.current.updateLastCandle,
        clear: managerRef.current.clear,
    }), []);

    return { candles, ...actions };
}

/**
 * Hook for simulated data streaming.
 */
export function useSimulatedStream(
    startPrice: number = 100,
    volatility: number = 0.002,
    autoStart: boolean = false,
) {
    const streamRef = useRef<SimulatedDataStream | null>(null);
    const [state, setState] = useState<StreamingState>("disconnected");
    const [lastTick, setLastTick] = useState<{ price: number; timestamp: number } | null>(null);

    useEffect(() => {
        const stream = new SimulatedDataStream(startPrice, volatility);
        streamRef.current = stream;

        const unsubscribe = stream.subscribe((event) => {
            if (event.type === "state") {
                setState(event.state);
            } else if (event.type === "tick") {
                setLastTick({ price: event.price, timestamp: event.timestamp });
            }
        });

        if (autoStart) {
            stream.start();
        }

        return () => {
            unsubscribe();
            stream.stop();
        };
    }, [startPrice, volatility, autoStart]);

    const start = useCallback((intervalMs = 100) => {
        streamRef.current?.start(intervalMs);
    }, []);

    const stop = useCallback(() => {
        streamRef.current?.stop();
    }, []);

    const setPrice = useCallback((price: number) => {
        streamRef.current?.setLastPrice(price);
    }, []);

    return { state, lastTick, start, stop, setPrice };
}

/**
 * Hook for candle aggregation from ticks.
 */
export function useCandleAggregator(
    interval: AggregatorConfig["interval"] = "1m",
    onCandle?: (candle: Candle) => void,
) {
    const [currentCandle, setCurrentCandle] = useState<Candle | null>(null);
    const aggregatorRef = useRef<CandleAggregator | null>(null);

    useEffect(() => {
        aggregatorRef.current = new CandleAggregator({
            interval,
            onCandle: (candle) => {
                onCandle?.(candle);
            },
            onUpdate: setCurrentCandle,
        });

        return () => {
            aggregatorRef.current?.reset();
        };
    }, [interval, onCandle]);

    const processTick = useCallback((price: number, timestamp?: number, volume?: number) => {
        aggregatorRef.current?.processTick(price, timestamp ?? Date.now(), volume ?? 0);
    }, []);

    const reset = useCallback(() => {
        aggregatorRef.current?.reset();
        setCurrentCandle(null);
    }, []);

    return { currentCandle, processTick, reset };
}

/**
 * Hook for calculating indicators.
 */
export function useIndicators(candles: readonly Candle[]) {
    return useMemo(() => {
        if (candles.length === 0) {
            return {
                sma: () => [],
                ema: () => [],
                bollinger: () => ({ upper: [], middle: [], lower: [] }),
                rsi: () => [],
                macd: () => ({ macd: [], signal: [], histogram: [] }),
            };
        }

        return {
            sma: (period: number): IndicatorPoint[] => sma(candles, period),
            ema: (period: number): IndicatorPoint[] => ema(candles, period),
            bollinger: (period: number, stdDev = 2): BollingerBands => bollingerBands(candles, period, stdDev),
            rsi: (period = 14): IndicatorPoint[] => calculateRSI(candles, period),
            macd: (fast = 12, slow = 26, signal = 9) => calculateMACD(candles, fast, slow, signal),
        };
    }, [candles]);
}

/**
 * Hook for viewport management.
 */
export function useViewport(
    candleCount: number,
    initialVisibleBars = 100,
) {
    const [viewport, setViewport] = useState({
        startIndex: Math.max(0, candleCount - initialVisibleBars),
        endIndex: candleCount - 1,
    });

    // Update viewport when candle count changes.
    useEffect(() => {
        setViewport((prev) => {
            const visibleBars = prev.endIndex - prev.startIndex;
            const newEnd = candleCount - 1;
            const newStart = Math.max(0, newEnd - visibleBars);
            return { startIndex: newStart, endIndex: newEnd };
        });
    }, [candleCount]);

    const pan = useCallback((deltaIndex: number) => {
        setViewport((prev) => {
            const newStart = Math.max(0, prev.startIndex + deltaIndex);
            const visibleBars = prev.endIndex - prev.startIndex;
            const newEnd = Math.min(candleCount - 1, newStart + visibleBars);
            return {
                startIndex: Math.max(0, newEnd - visibleBars),
                endIndex: newEnd,
            };
        });
    }, [candleCount]);

    const zoom = useCallback((factor: number, centerIndex?: number) => {
        setViewport((prev) => {
            const visibleBars = prev.endIndex - prev.startIndex;
            const center = centerIndex ?? (prev.startIndex + prev.endIndex) / 2;
            const newVisibleBars = Math.max(10, Math.min(candleCount, visibleBars * factor));
            const halfBars = newVisibleBars / 2;

            let newStart = Math.round(center - halfBars);
            let newEnd = Math.round(center + halfBars);

            // Clamp to bounds.
            if (newStart < 0) {
                newStart = 0;
                newEnd = newVisibleBars;
            }
            if (newEnd > candleCount - 1) {
                newEnd = candleCount - 1;
                newStart = Math.max(0, newEnd - newVisibleBars);
            }

            return { startIndex: newStart, endIndex: newEnd };
        });
    }, [candleCount]);

    const scrollToEnd = useCallback(() => {
        setViewport((prev) => {
            const visibleBars = prev.endIndex - prev.startIndex;
            return {
                startIndex: Math.max(0, candleCount - 1 - visibleBars),
                endIndex: candleCount - 1,
            };
        });
    }, [candleCount]);

    return { viewport, pan, zoom, scrollToEnd };
}

/**
 * Hook for price formatting.
 */
export function usePriceFormatter(decimals = 2, currency?: string) {
    return useCallback((price: number): string => {
        const formatted = price.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
        return currency ? `${formatted} ${currency}` : formatted;
    }, [decimals, currency]);
}

/**
 * Hook for volume formatting.
 */
export function useVolumeFormatter() {
    return useCallback((volume: number): string => {
        if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
        if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
        if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
        return volume.toFixed(0);
    }, []);
}

/**
 * Hook for time formatting.
 */
export function useTimeFormatter(format: "short" | "medium" | "long" = "medium") {
    return useCallback((timestamp: number): string => {
        const date = new Date(timestamp);

        switch (format) {
            case "short":
                return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
            case "long":
                return date.toLocaleString();
            case "medium":
            default:
                return date.toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                });
        }
    }, [format]);
}

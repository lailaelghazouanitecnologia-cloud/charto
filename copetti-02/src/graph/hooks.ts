/**
 * React Hooks for Graph Module
 * Provides easy integration with React components.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Candle, Point } from "../core/types.ts";
import {
    CandleAggregator,
    SimulatedDataStream,
    createChartDataManager,
    type AggregatorConfig,
    type StreamingState,
} from "../core/streaming.ts";
import { sma, ema, bollingerBands, type IndicatorPoint, type BollingerBands } from "../core/indicators.ts";
import { calculateRSI, calculateMACD } from "../core/pane.ts";
import { TouchHandler, type TouchCallbacks, type TouchConfig, type TouchState } from "../core/touch.ts";
import { MeasureTool, type Measurement, type MeasureState, type MeasureConfig } from "../core/measure.ts";
import { ThemeManager, type ChartTheme, type ThemeType, getTheme } from "../core/theme.ts";
import { DrawingManager, type DrawingToolType, type AnyDrawing } from "../core/drawing.ts";
import { ChartEngine, type ChartConfig, type ChartCallbacks, type Viewport } from "../core/chart.ts";

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

/**
 * Hook for touch gesture handling on mobile.
 */
export function useTouchGestures(
    elementRef: React.RefObject<HTMLElement>,
    callbacks: TouchCallbacks,
    config?: Partial<TouchConfig>,
) {
    const handlerRef = useRef<TouchHandler | null>(null);
    const [touchState, setTouchState] = useState<TouchState | null>(null);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        handlerRef.current = new TouchHandler(element, {
            ...callbacks,
            onPanStart: (point) => {
                setTouchState(handlerRef.current?.getState() ?? null);
                callbacks.onPanStart?.(point);
            },
            onPanMove: (point, delta) => {
                setTouchState(handlerRef.current?.getState() ?? null);
                callbacks.onPanMove?.(point, delta);
            },
            onPanEnd: (point) => {
                setTouchState(handlerRef.current?.getState() ?? null);
                callbacks.onPanEnd?.(point);
            },
            onPinchStart: (center, distance) => {
                setTouchState(handlerRef.current?.getState() ?? null);
                callbacks.onPinchStart?.(center, distance);
            },
            onPinchMove: (center, scale) => {
                setTouchState(handlerRef.current?.getState() ?? null);
                callbacks.onPinchMove?.(center, scale);
            },
            onPinchEnd: () => {
                setTouchState(handlerRef.current?.getState() ?? null);
                callbacks.onPinchEnd?.();
            },
        }, config);

        return () => {
            handlerRef.current?.detach();
        };
    }, [elementRef, callbacks, config]);

    const updateConfig = useCallback((newConfig: Partial<TouchConfig>) => {
        handlerRef.current?.setConfig(newConfig);
    }, []);

    return { touchState, updateConfig };
}

/**
 * Hook for measure tool.
 */
export function useMeasureTool(config?: Partial<MeasureConfig>) {
    const toolRef = useRef(new MeasureTool(config));
    const [state, setState] = useState<MeasureState>("idle");
    const [measurement, setMeasurement] = useState<Measurement | null>(null);

    const start = useCallback((index: number, price: number) => {
        toolRef.current.start(index, price);
        setState("measuring");
        setMeasurement(toolRef.current.getMeasurement());
    }, []);

    const update = useCallback((index: number, price: number) => {
        toolRef.current.update(index, price);
        setMeasurement(toolRef.current.getMeasurement());
    }, []);

    const complete = useCallback(() => {
        const result = toolRef.current.complete();
        setState("complete");
        setMeasurement(result);
        return result;
    }, []);

    const cancel = useCallback(() => {
        toolRef.current.cancel();
        setState("idle");
        setMeasurement(null);
    }, []);

    const reset = useCallback(() => {
        toolRef.current.reset();
        setState("idle");
        setMeasurement(null);
    }, []);

    const render = useCallback((
        ctx: CanvasRenderingContext2D,
        toPixelX: (index: number) => number,
        toPixelY: (price: number) => number,
    ) => {
        toolRef.current.render(ctx, toPixelX, toPixelY);
    }, []);

    return { state, measurement, start, update, complete, cancel, reset, render };
}

/**
 * Hook for theme management.
 */
export function useTheme(initialTheme: ThemeType = "dark") {
    const managerRef = useRef(new ThemeManager(initialTheme));
    const [theme, setTheme] = useState<ChartTheme>(() => getTheme(initialTheme));

    useEffect(() => {
        const unsubscribe = managerRef.current.subscribe(setTheme);
        return unsubscribe;
    }, []);

    const setThemeType = useCallback((type: ThemeType) => {
        managerRef.current.setTheme(type);
    }, []);

    const setCustomTheme = useCallback((customTheme: ChartTheme) => {
        managerRef.current.setCustomTheme(customTheme);
    }, []);

    const toggle = useCallback(() => {
        return managerRef.current.toggle();
    }, []);

    return { theme, setTheme: setThemeType, setCustomTheme, toggle };
}

/**
 * Hook for drawing tool management.
 */
export function useDrawingTool() {
    const managerRef = useRef(new DrawingManager());
    const [activeTool, setActiveTool] = useState<DrawingToolType | null>(null);
    const [drawings, setDrawings] = useState<readonly AnyDrawing[]>([]);
    const [selectedDrawing, setSelectedDrawing] = useState<AnyDrawing | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const setTool = useCallback((tool: DrawingToolType | null) => {
        managerRef.current.setActiveTool(tool);
        setActiveTool(tool);
        setIsDrawing(false);
    }, []);

    const startDrawing = useCallback((index: number, price: number) => {
        const drawing = managerRef.current.startDrawing(index, price);
        if (drawing) {
            setIsDrawing(true);
            setDrawings([...managerRef.current.getDrawings()]);
        }
        return drawing;
    }, []);

    const updateDrawing = useCallback((index: number, price: number) => {
        managerRef.current.updateDrawing(index, price);
    }, []);

    const finishDrawing = useCallback(() => {
        managerRef.current.finishDrawing();
        setIsDrawing(false);
        setDrawings([...managerRef.current.getDrawings()]);
    }, []);

    const cancelDrawing = useCallback(() => {
        managerRef.current.cancelDrawing();
        setIsDrawing(false);
    }, []);

    const selectDrawing = useCallback((id: string | null) => {
        managerRef.current.selectDrawing(id);
        setSelectedDrawing(managerRef.current.getSelectedDrawing());
    }, []);

    const deleteSelected = useCallback(() => {
        const deleted = managerRef.current.deleteSelected();
        if (deleted) {
            setDrawings([...managerRef.current.getDrawings()]);
            setSelectedDrawing(null);
        }
        return deleted;
    }, []);

    const clearAll = useCallback(() => {
        managerRef.current.clearAll();
        setDrawings([]);
        setSelectedDrawing(null);
    }, []);

    const getActiveDrawing = useCallback(() => {
        return managerRef.current.getActiveDrawing();
    }, []);

    const findDrawingAt = useCallback((
        mouseX: number,
        mouseY: number,
        toPixelX: (index: number) => number,
        toPixelY: (price: number) => number,
        chartBounds: { x: number; y: number; width: number; height: number },
    ) => {
        return managerRef.current.findDrawingAt(mouseX, mouseY, toPixelX, toPixelY, chartBounds);
    }, []);

    return {
        activeTool,
        drawings,
        selectedDrawing,
        isDrawing,
        setTool,
        startDrawing,
        updateDrawing,
        finishDrawing,
        cancelDrawing,
        selectDrawing,
        deleteSelected,
        clearAll,
        getActiveDrawing,
        findDrawingAt,
        manager: managerRef.current,
    };
}

/**
 * Hook for managing a ChartEngine instance.
 */
export function useChartEngine(
    canvasRef: React.RefObject<HTMLCanvasElement>,
    config?: Partial<ChartConfig>,
    theme?: ChartTheme,
) {
    const engineRef = useRef<ChartEngine | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [viewport, setViewport] = useState<Viewport | null>(null);
    const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

    // Initialize engine when canvas is available.
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        engineRef.current = new ChartEngine(canvas, config, theme);
        setIsReady(true);

        return () => {
            engineRef.current?.destroy();
            engineRef.current = null;
            setIsReady(false);
        };
    }, [canvasRef, config, theme]);

    // Set up callbacks.
    useEffect(() => {
        if (!engineRef.current) return;

        engineRef.current.setCallbacks({
            onViewportChange: setViewport,
            onCandleHover: (candle) => setHoveredCandle(candle),
        });
    }, [isReady]);

    const setData = useCallback((candles: Candle[]) => {
        engineRef.current?.setData(candles);
    }, []);

    const updateLastCandle = useCallback((candle: Candle) => {
        engineRef.current?.updateLastCandle(candle);
    }, []);

    const appendCandle = useCallback((candle: Candle) => {
        engineRef.current?.appendCandle(candle);
    }, []);

    const setChartType = useCallback((type: "candlestick" | "line" | "area") => {
        engineRef.current?.setChartType(type);
    }, []);

    const setZoom = useCallback((level: number) => {
        engineRef.current?.setZoom(level);
    }, []);

    const scrollToEnd = useCallback((animated = true) => {
        engineRef.current?.scrollToEnd(animated);
    }, []);

    const setIndicators = useCallback((indicators: any[]) => {
        engineRef.current?.setIndicators(indicators);
    }, []);

    const toggleRSI = useCallback((show?: boolean) => {
        engineRef.current?.toggleRSI(show);
    }, []);

    const toggleMACD = useCallback((show?: boolean) => {
        engineRef.current?.toggleMACD(show);
    }, []);

    const setDrawingTool = useCallback((tool: DrawingToolType | null) => {
        engineRef.current?.setDrawingTool(tool);
    }, []);

    const resize = useCallback((width: number, height: number) => {
        engineRef.current?.resize(width, height);
    }, []);

    const render = useCallback(() => {
        engineRef.current?.render();
    }, []);

    const exportToPNG = useCallback(() => {
        return engineRef.current?.exportToPNG() ?? "";
    }, []);

    const downloadPNG = useCallback((filename = "chart.png") => {
        engineRef.current?.downloadPNG(filename);
    }, []);

    return {
        engine: engineRef.current,
        isReady,
        viewport,
        hoveredCandle,
        setData,
        updateLastCandle,
        appendCandle,
        setChartType,
        setZoom,
        scrollToEnd,
        setIndicators,
        toggleRSI,
        toggleMACD,
        setDrawingTool,
        resize,
        render,
        exportToPNG,
        downloadPNG,
    };
}

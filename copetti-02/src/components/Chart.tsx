import { useEffect, useRef, useState } from "react";
import {
    createChart,
    type ChartEngine,
    type ChartType,
    type Candle,
    type CrosshairState,
    type IndicatorConfig,
} from "../core/chart.ts";
import { cn } from "../lib/utils.ts";

interface ChartProps {
    data: Candle[];
    chartType?: ChartType;
    zoom?: number;
    indicators?: IndicatorConfig[];
    width?: number;
    height?: number;
    className?: string;
    onCandleHover?: (candle: Candle | null) => void;
}

export function Chart({
    data,
    chartType = "candlestick",
    zoom = 1,
    indicators = [],
    width = 800,
    height = 450,
    className,
    onCandleHover,
}: ChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<ChartEngine | null>(null);
    const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
    const [crosshair, setCrosshair] = useState<CrosshairState | null>(null);

    // Initialize chart.
    useEffect(() => {
        if (canvasRef.current === null) return;

        const chart = createChart(canvasRef.current, {
            width,
            height,
            backgroundColor: "#0a0a0f",
            gridColor: "#1a1a24",
            upColor: "#22c55e",
            downColor: "#ef4444",
        });

        chart.setCallbacks({
            onCandleHover: (candle) => {
                setHoveredCandle(candle);
                onCandleHover?.(candle);
            },
            onCrosshairMove: (state) => {
                setCrosshair(state);
            },
        });

        chartRef.current = chart;

        return () => {
            chart.destroy();
            chartRef.current = null;
        };
    }, [width, height, onCandleHover]);

    // Update data.
    useEffect(() => {
        if (chartRef.current !== null && data.length > 0) {
            chartRef.current.setData(data);
        }
    }, [data]);

    // Update chart type.
    useEffect(() => {
        if (chartRef.current !== null) {
            chartRef.current.setChartType(chartType);
        }
    }, [chartType]);

    // Update zoom.
    useEffect(() => {
        if (chartRef.current !== null) {
            chartRef.current.setZoom(zoom);
        }
    }, [zoom]);

    // Update indicators.
    useEffect(() => {
        if (chartRef.current !== null) {
            chartRef.current.setIndicators(indicators);
        }
    }, [indicators]);

    // Format price display.
    const formatPrice = (price: number) => price.toFixed(2);
    const formatVolume = (volume: number) => {
        if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
        if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
        return volume.toString();
    };

    // Get price change info.
    const getPriceChange = (candle: Candle) => {
        const change = candle.close - candle.open;
        const percent = ((change / candle.open) * 100).toFixed(2);
        const isUp = change >= 0;
        return { change, percent, isUp };
    };

    return (
        <div className={cn("relative", className)}>
            {/* OHLC Display */}
            <div className="absolute top-2 left-3 z-10 flex items-center gap-4 text-xs font-mono">
                {hoveredCandle !== null ? (
                    <>
                        <span className="text-muted-foreground">
                            O{" "}
                            <span className="text-foreground">
                                {formatPrice(hoveredCandle.open)}
                            </span>
                        </span>
                        <span className="text-muted-foreground">
                            H{" "}
                            <span className="text-foreground">
                                {formatPrice(hoveredCandle.high)}
                            </span>
                        </span>
                        <span className="text-muted-foreground">
                            L{" "}
                            <span className="text-foreground">
                                {formatPrice(hoveredCandle.low)}
                            </span>
                        </span>
                        <span className="text-muted-foreground">
                            C{" "}
                            <span
                                className={
                                    getPriceChange(hoveredCandle).isUp
                                        ? "text-[#22c55e]"
                                        : "text-[#ef4444]"
                                }
                            >
                                {formatPrice(hoveredCandle.close)}
                            </span>
                        </span>
                        {hoveredCandle.volume !== undefined && (
                            <span className="text-muted-foreground">
                                Vol{" "}
                                <span className="text-foreground">
                                    {formatVolume(hoveredCandle.volume)}
                                </span>
                            </span>
                        )}
                        <span
                            className={
                                getPriceChange(hoveredCandle).isUp
                                    ? "text-[#22c55e]"
                                    : "text-[#ef4444]"
                            }
                        >
                            {getPriceChange(hoveredCandle).isUp ? "+" : ""}
                            {getPriceChange(hoveredCandle).percent}%
                        </span>
                    </>
                ) : (
                    <span className="text-muted-foreground">
                        Hover over chart for details
                    </span>
                )}
            </div>

            {/* Canvas */}
            <canvas
                ref={canvasRef}
                className="block rounded-lg cursor-crosshair"
                style={{ width, height }}
            />

            {/* Instructions */}
            <div className="absolute bottom-2 right-3 text-[10px] text-muted-foreground/50">
                Scroll to zoom • Drag to pan
            </div>
        </div>
    );
}

// Re-export types for convenience.
export type { ChartType, Candle, CrosshairState };

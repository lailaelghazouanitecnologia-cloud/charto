"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Chart, type ChartRef, type ChartType, type AnyDrawing } from "./components/Chart.tsx";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "./components/ui/tooltip.tsx";
import { cn } from "./lib/utils.ts";
import type { Candle } from "./core/types.ts";
import type { IndicatorConfig } from "./core/chart.ts";
import type { DrawingToolType } from "./core/drawing.ts";
import {
    TrendingUp,
    TrendingDown,
    Minus,
    MousePointer2,
    PenLine,
    Ruler,
    Square,
    Crosshair,
    CandlestickChart,
    LineChart,
    AreaChart,
    Camera,
    Maximize2,
    Star,
    Activity,
    Trash2,
    PanelRight,
    Circle,
    Menu,
} from "lucide-react";

function generateCandles(count: number, startPrice: number, symbol: string): Candle[] {
    const candles: Candle[] = [];
    let price = startPrice;
    const now = Date.now();
    const interval = 60000 * 5;
    const volatility = symbol.includes("BTC") ? 0.015 : symbol.includes("ETH") ? 0.02 : 0.008;

    for (let i = 0; i < count; i++) {
        const timestamp = now - (count - i) * interval;
        const change = (Math.random() - 0.48) * volatility * price;
        const open = price;
        price = Math.max(1, price + change);
        const close = price;
        const high = Math.max(open, close) * (1 + Math.random() * 0.005);
        const low = Math.min(open, close) * (1 - Math.random() * 0.005);
        const volume = Math.random() * 1000000 + 100000;
        candles.push({ timestamp, open, high, low, close, volume });
    }
    return candles;
}

const WATCHLIST = [
    { symbol: "BTC/USD", name: "Bitcoin", price: 43250.50, change: 2.34 },
    { symbol: "ETH/USD", name: "Ethereum", price: 2280.75, change: -1.12 },
    { symbol: "SOL/USD", name: "Solana", price: 98.42, change: 5.67 },
    { symbol: "AAPL", name: "Apple", price: 178.25, change: 0.85 },
    { symbol: "NVDA", name: "NVIDIA", price: 495.20, change: 4.15 },
    { symbol: "TSLA", name: "Tesla", price: 248.50, change: 3.21 },
];

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D", "1W"];

const DRAWING_TOOLS: { tool: DrawingToolType | null; icon: typeof MousePointer2 }[] = [
    { tool: null, icon: MousePointer2 },
    { tool: "trendline", icon: TrendingUp },
    { tool: "horizontal", icon: Minus },
    { tool: "ray", icon: PenLine },
    { tool: "rectangle", icon: Square },
    { tool: "fibonacci", icon: Ruler },
    { tool: "measure", icon: Crosshair },
];

const CHART_TYPES: { type: ChartType; icon: typeof CandlestickChart }[] = [
    { type: "candlestick", icon: CandlestickChart },
    { type: "line", icon: LineChart },
    { type: "area", icon: AreaChart },
];

const PRESET_INDICATORS: IndicatorConfig[] = [
    { type: "sma", period: 20, color: "#3b82f6", enabled: false },
    { type: "ema", period: 12, color: "#8b5cf6", enabled: false },
    { type: "bollinger", period: 20, color: "#06b6d4", enabled: false },
];

function ToolButton({ active, onClick, children, className }: {
    active?: boolean;
    onClick?: () => void;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-all active:scale-95",
                active ? "bg-[#1a1a1a] text-white" : "text-[#666] hover:text-[#999]",
                className
            )}
        >
            {children}
        </button>
    );
}

export default function TradingApp() {
    const [activeSymbol, setActiveSymbol] = useState(WATCHLIST[0]!);
    const [candles, setCandles] = useState<Candle[]>(() =>
        generateCandles(200, activeSymbol.price, activeSymbol.symbol)
    );
    const [chartType, setChartType] = useState<ChartType>("candlestick");
    const [timeframe, setTimeframe] = useState("4H");
    const [indicators, setIndicators] = useState<IndicatorConfig[]>(PRESET_INDICATORS);
    const [drawingTool, setDrawingTool] = useState<DrawingToolType | null>(null);
    const [drawings, setDrawings] = useState<readonly AnyDrawing[]>([]);
    const [selectedDrawing, setSelectedDrawing] = useState<AnyDrawing | null>(null);
    const [panelOpen, setPanelOpen] = useState(true);
    const [favorites, setFavorites] = useState<Set<string>>(new Set(["BTC/USD", "ETH/USD"]));
    const [showIndicators, setShowIndicators] = useState(false);
    const [showDrawingTools, setShowDrawingTools] = useState(false);
    const chartRef = useRef<ChartRef>(null);
    const [chartDimensions, setChartDimensions] = useState({ width: 1200, height: 600 });

    useEffect(() => {
        const updateDimensions = () => {
            const panelWidth = panelOpen ? 240 : 0;
            setChartDimensions({
                width: Math.max(400, window.innerWidth - panelWidth),
                height: Math.max(300, window.innerHeight),
            });
        };
        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, [panelOpen]);

    useEffect(() => {
        setCandles(generateCandles(200, activeSymbol.price, activeSymbol.symbol));
    }, [activeSymbol]);

    const handleExport = useCallback(() => {
        chartRef.current?.downloadPNG(`${activeSymbol.symbol}.png`);
    }, [activeSymbol.symbol]);

    const handleDrawingChange = useCallback((newDrawings: readonly AnyDrawing[]) => {
        setDrawings(newDrawings);
    }, []);

    const handleDrawingSelect = useCallback((drawing: AnyDrawing | null) => {
        setSelectedDrawing(drawing);
    }, []);

    const handleClearDrawings = useCallback(() => {
        chartRef.current?.clearAllDrawings();
        setDrawings([]);
    }, []);

    const toggleIndicator = (index: number) => {
        setIndicators(prev => prev.map((ind, i) =>
            i === index ? { ...ind, enabled: !ind.enabled } : ind
        ));
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setDrawingTool(null);
                setShowDrawingTools(false);
                setShowIndicators(false);
                chartRef.current?.cancelDrawing();
            }
            if ((e.key === "Delete" || e.key === "Backspace") && selectedDrawing) {
                chartRef.current?.deleteSelectedDrawing();
                setSelectedDrawing(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedDrawing]);

    const lastCandle = candles[candles.length - 1];
    const priceChange = lastCandle && candles[0]
        ? ((lastCandle.close - candles[0].open) / candles[0].open * 100)
        : 0;

    return (
        <TooltipProvider delayDuration={200}>
            <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a]">
                {/* Full Screen Chart */}
                <Chart
                    ref={chartRef}
                    data={candles}
                    chartType={chartType}
                    indicators={indicators}
                    drawingTool={drawingTool}
                    onDrawingChange={handleDrawingChange}
                    onDrawingSelect={handleDrawingSelect}
                    width={chartDimensions.width}
                    height={chartDimensions.height}
                />

                {/* Top Left - Symbol & Price */}
                <div className="absolute left-4 top-3 z-10">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{activeSymbol.symbol}</span>
                        <span className="text-[10px] text-[#444]">{timeframe}</span>
                    </div>
                    <div className="mt-0.5 flex items-baseline gap-2">
                        <span className="text-xl font-light tabular-nums tracking-tight text-white">
                            {lastCandle?.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={cn(
                            "text-xs font-semibold tabular-nums",
                            priceChange >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
                        )}>
                            {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                        </span>
                    </div>
                </div>

                {/* Left Floating Toolbar */}
                <div className="absolute left-2.5 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1.5">
                    <div className="flex flex-col gap-0.5 rounded-xl bg-[#111] p-1">
                        {showDrawingTools ? (
                            <>
                                {DRAWING_TOOLS.map(({ tool, icon: Icon }) => (
                                    <ToolButton
                                        key={tool ?? "select"}
                                        active={drawingTool === tool}
                                        onClick={() => {
                                            setDrawingTool(tool);
                                            if (tool === null) setShowDrawingTools(false);
                                        }}
                                    >
                                        <Icon size={14} strokeWidth={1.5} />
                                    </ToolButton>
                                ))}
                                {drawings.length > 0 && (
                                    <ToolButton onClick={handleClearDrawings} className="text-[#ef4444]/60 hover:text-[#ef4444]">
                                        <Trash2 size={14} strokeWidth={1.5} />
                                    </ToolButton>
                                )}
                            </>
                        ) : (
                            <ToolButton onClick={() => setShowDrawingTools(true)} active={drawingTool !== null}>
                                <PenLine size={14} strokeWidth={1.5} />
                            </ToolButton>
                        )}
                    </div>

                    <div className="flex flex-col gap-0.5 rounded-xl bg-[#111] p-1">
                        {CHART_TYPES.map(({ type, icon: Icon }) => (
                            <ToolButton key={type} active={chartType === type} onClick={() => setChartType(type)}>
                                <Icon size={14} strokeWidth={1.5} />
                            </ToolButton>
                        ))}
                    </div>

                    <div className="relative">
                        <div className="rounded-xl bg-[#111] p-1">
                            <ToolButton
                                active={showIndicators || indicators.some(i => i.enabled)}
                                onClick={() => setShowIndicators(!showIndicators)}
                            >
                                <Activity size={14} strokeWidth={1.5} />
                            </ToolButton>
                        </div>
                        {showIndicators && (
                            <div className="absolute left-full top-0 ml-1.5 w-36 rounded-xl bg-[#111] p-1.5">
                                {indicators.map((ind, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => toggleIndicator(idx)}
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] transition-colors",
                                            ind.enabled ? "bg-[#1a1a1a] text-white" : "text-[#666] hover:text-[#999]"
                                        )}
                                    >
                                        <Circle size={6} fill={ind.enabled ? ind.color : "transparent"} stroke={ind.color} strokeWidth={2} />
                                        {ind.type.toUpperCase()}({ind.period})
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Center - Timeframes */}
                <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2">
                    <div className="flex gap-0.5 rounded-xl bg-[#111] p-0.5">
                        {TIMEFRAMES.map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={cn(
                                    "rounded-lg px-2.5 py-1 text-[10px] font-medium transition-all active:scale-95",
                                    timeframe === tf ? "bg-[#1a1a1a] text-white" : "text-[#666] hover:text-[#999]"
                                )}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Top Right - Actions */}
                <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
                    <div className="flex gap-0.5 rounded-xl bg-[#111] p-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <ToolButton onClick={handleExport}>
                                    <Camera size={14} strokeWidth={1.5} />
                                </ToolButton>
                            </TooltipTrigger>
                            <TooltipContent>Screenshot</TooltipContent>
                        </Tooltip>
                        <ToolButton>
                            <Maximize2 size={14} strokeWidth={1.5} />
                        </ToolButton>
                        <ToolButton active={panelOpen} onClick={() => setPanelOpen(!panelOpen)}>
                            <PanelRight size={14} strokeWidth={1.5} />
                        </ToolButton>
                    </div>
                </div>

                {/* Right Panel */}
                <div className={cn(
                    "absolute right-0 top-0 z-10 flex h-full flex-col gap-1.5 bg-transparent p-1.5 transition-all duration-300",
                    panelOpen ? "w-[240px] translate-x-0" : "w-0 translate-x-full overflow-hidden p-0"
                )}>
                    {/* Symbol Card */}
                    <div className="rounded-xl bg-[#111] p-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex h-5 w-5 items-center justify-center rounded bg-[#ef4444] text-[8px] font-bold text-white">
                                    {activeSymbol.symbol.slice(0, 2)}
                                </div>
                                <span className="text-xs font-bold text-white">{activeSymbol.symbol}</span>
                            </div>
                            <button
                                onClick={() => {
                                    setFavorites(prev => {
                                        const next = new Set(prev);
                                        next.has(activeSymbol.symbol) ? next.delete(activeSymbol.symbol) : next.add(activeSymbol.symbol);
                                        return next;
                                    });
                                }}
                                className={favorites.has(activeSymbol.symbol) ? "text-yellow-500" : "text-[#444]"}
                            >
                                <Star size={12} fill={favorites.has(activeSymbol.symbol) ? "currentColor" : "none"} />
                            </button>
                        </div>
                        <div className="mt-1 text-[9px] text-[#666]">{activeSymbol.name}</div>
                        <div className="mt-2 text-[22px] font-light tabular-nums tracking-tight text-white">
                            {lastCandle?.close.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            <span className="ml-1 text-[10px] text-[#444]">USD</span>
                        </div>
                        <div className={cn("mt-0.5 text-[11px] font-semibold tabular-nums", priceChange >= 0 ? "text-[#22c55e]" : "text-[#ef4444]")}>
                            {priceChange >= 0 ? "+" : ""}{(lastCandle?.close ?? 0 - (candles[0]?.open ?? 0)).toFixed(2)} ({priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%)
                        </div>
                    </div>

                    {/* Performance Card */}
                    <div className="rounded-xl bg-[#111] p-3">
                        <div className="mb-2 text-[10px] font-semibold text-white">Performance</div>
                        <div className="grid grid-cols-3 gap-1">
                            {[
                                { l: "1W", v: -5.25 }, { l: "1M", v: -7.15 }, { l: "3M", v: -8.40 },
                                { l: "6M", v: -5.14 }, { l: "YTD", v: -8.58 }, { l: "1Y", v: 3.89 },
                            ].map(({ l, v }) => (
                                <div key={l} className={cn(
                                    "rounded-lg p-1.5 text-center",
                                    v >= 0 ? "bg-[#22c55e]/10" : "bg-[#ef4444]/10"
                                )}>
                                    <div className={cn("text-[10px] font-bold tabular-nums", v >= 0 ? "text-[#22c55e]" : "text-[#ef4444]")}>
                                        {v >= 0 ? "+" : ""}{v.toFixed(2)}%
                                    </div>
                                    <div className="text-[7px] uppercase text-[#444]">{l}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Watchlist Card */}
                    <div className="flex flex-1 flex-col overflow-hidden rounded-xl bg-[#111]">
                        <div className="flex items-center justify-between p-3 pb-2">
                            <span className="text-[10px] font-semibold text-white">Watchlist</span>
                        </div>
                        <div className="flex-1 overflow-y-auto px-1.5 pb-1.5">
                            <div className="mb-1 px-1.5 text-[7px] font-semibold uppercase tracking-wide text-[#444]">Assets</div>
                            {WATCHLIST.map((item) => (
                                <button
                                    key={item.symbol}
                                    onClick={() => setActiveSymbol(item)}
                                    className={cn(
                                        "flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1.5 transition-colors",
                                        activeSymbol.symbol === item.symbol ? "bg-[#1a1a1a]" : "hover:bg-[#161616]"
                                    )}
                                >
                                    <div className={cn(
                                        "h-1.5 w-1.5 rounded-full",
                                        item.change >= 0 ? "bg-[#22c55e]" : "bg-[#ef4444]"
                                    )} />
                                    <span className="flex-1 text-left text-[10px] font-semibold text-white">{item.symbol}</span>
                                    <span className="text-[10px] tabular-nums text-[#888]">{item.price.toFixed(2)}</span>
                                    <span className={cn(
                                        "w-12 text-right text-[9px] tabular-nums",
                                        item.change >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
                                    )}>
                                        {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Left - Status */}
                <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 text-[9px] text-[#444]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
                    Live
                </div>
            </div>
        </TooltipProvider>
    );
}

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
    Search,
    Star,
    Activity,
    Trash2,
    PanelRight,
    Circle,
    X,
    ChevronRight,
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

// Floating toolbar button
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
                "flex h-8 w-8 items-center justify-center rounded-xl transition-all active:scale-95",
                active
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
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

    // Update dimensions when panel state changes
    useEffect(() => {
        const updateDimensions = () => {
            const panelWidth = panelOpen ? 260 : 0;
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
            <div className="relative h-screen w-screen overflow-hidden bg-[#08080c]">
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
                <div className="absolute left-4 top-4 z-10">
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-white">{activeSymbol.symbol}</span>
                        <span className="text-xs text-zinc-500">{timeframe}</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-bold tabular-nums text-white">
                            {lastCandle?.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={cn(
                            "text-sm font-medium tabular-nums",
                            priceChange >= 0 ? "text-emerald-400" : "text-red-400"
                        )}>
                            {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                        </span>
                    </div>
                    <div className="mt-1 flex gap-3 text-[11px] text-zinc-500">
                        <span>O <span className="text-zinc-400">{lastCandle?.open.toFixed(2)}</span></span>
                        <span>H <span className="text-emerald-400/80">{lastCandle?.high.toFixed(2)}</span></span>
                        <span>L <span className="text-red-400/80">{lastCandle?.low.toFixed(2)}</span></span>
                        <span>C <span className="text-zinc-400">{lastCandle?.close.toFixed(2)}</span></span>
                    </div>
                </div>

                {/* Left Floating Toolbar */}
                <div className="absolute left-4 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1.5">
                    {/* Drawing Tools */}
                    <div className="flex flex-col gap-0.5 rounded-2xl border border-white/5 bg-zinc-900/80 p-1.5 shadow-2xl backdrop-blur-xl">
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
                                        <Icon size={16} strokeWidth={1.5} />
                                    </ToolButton>
                                ))}
                                {drawings.length > 0 && (
                                    <ToolButton onClick={handleClearDrawings} className="text-red-400/60 hover:text-red-400">
                                        <Trash2 size={16} strokeWidth={1.5} />
                                    </ToolButton>
                                )}
                            </>
                        ) : (
                            <ToolButton onClick={() => setShowDrawingTools(true)} active={drawingTool !== null}>
                                <PenLine size={16} strokeWidth={1.5} />
                            </ToolButton>
                        )}
                    </div>

                    {/* Chart Types */}
                    <div className="flex flex-col gap-0.5 rounded-2xl border border-white/5 bg-zinc-900/80 p-1.5 shadow-2xl backdrop-blur-xl">
                        {CHART_TYPES.map(({ type, icon: Icon }) => (
                            <ToolButton key={type} active={chartType === type} onClick={() => setChartType(type)}>
                                <Icon size={16} strokeWidth={1.5} />
                            </ToolButton>
                        ))}
                    </div>

                    {/* Indicators */}
                    <div className="relative">
                        <div className="rounded-2xl border border-white/5 bg-zinc-900/80 p-1.5 shadow-2xl backdrop-blur-xl">
                            <ToolButton
                                active={showIndicators || indicators.some(i => i.enabled)}
                                onClick={() => setShowIndicators(!showIndicators)}
                            >
                                <Activity size={16} strokeWidth={1.5} />
                            </ToolButton>
                        </div>
                        {showIndicators && (
                            <div className="absolute left-full top-0 ml-2 w-40 rounded-xl border border-white/5 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur-xl">
                                {indicators.map((ind, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => toggleIndicator(idx)}
                                        className={cn(
                                            "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                                            ind.enabled ? "bg-white/10 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                                        )}
                                    >
                                        <Circle size={8} fill={ind.enabled ? ind.color : "transparent"} stroke={ind.color} strokeWidth={2} />
                                        {ind.type.toUpperCase()}({ind.period})
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Center - Timeframes */}
                <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
                    <div className="flex gap-0.5 rounded-2xl border border-white/5 bg-zinc-900/80 p-1 shadow-2xl backdrop-blur-xl">
                        {TIMEFRAMES.map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={cn(
                                    "rounded-xl px-3 py-1.5 text-xs font-medium transition-all active:scale-95",
                                    timeframe === tf
                                        ? "bg-white/10 text-white"
                                        : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Top Right - Actions */}
                <div className="absolute right-4 top-4 z-10 flex items-center gap-1.5">
                    <div className="flex gap-0.5 rounded-2xl border border-white/5 bg-zinc-900/80 p-1.5 shadow-2xl backdrop-blur-xl">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <ToolButton onClick={handleExport}>
                                    <Camera size={16} strokeWidth={1.5} />
                                </ToolButton>
                            </TooltipTrigger>
                            <TooltipContent>Screenshot</TooltipContent>
                        </Tooltip>
                        <ToolButton>
                            <Maximize2 size={16} strokeWidth={1.5} />
                        </ToolButton>
                        <ToolButton active={panelOpen} onClick={() => setPanelOpen(!panelOpen)}>
                            <PanelRight size={16} strokeWidth={1.5} />
                        </ToolButton>
                    </div>
                </div>

                {/* Right Panel */}
                <div className={cn(
                    "absolute right-0 top-0 z-10 flex h-full flex-col border-l border-white/5 bg-[#0c0c10]/95 backdrop-blur-xl transition-all duration-300",
                    panelOpen ? "w-[260px] translate-x-0" : "w-0 translate-x-full overflow-hidden"
                )}>
                    {/* Symbol Header */}
                    <div className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-semibold text-white">{activeSymbol.symbol}</div>
                                <div className="text-[11px] text-zinc-500">{activeSymbol.name}</div>
                            </div>
                            <button
                                onClick={() => {
                                    setFavorites(prev => {
                                        const next = new Set(prev);
                                        next.has(activeSymbol.symbol) ? next.delete(activeSymbol.symbol) : next.add(activeSymbol.symbol);
                                        return next;
                                    });
                                }}
                                className={favorites.has(activeSymbol.symbol) ? "text-yellow-500" : "text-zinc-600"}
                            >
                                <Star size={14} fill={favorites.has(activeSymbol.symbol) ? "currentColor" : "none"} />
                            </button>
                        </div>
                        <div className="mt-2">
                            <div className="text-xl font-bold tabular-nums text-white">
                                ${lastCandle?.close.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                            <div className={cn("flex items-center gap-1 text-sm", priceChange >= 0 ? "text-emerald-400" : "text-red-400")}>
                                {priceChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                <span className="tabular-nums">{priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Performance */}
                    <div className="border-t border-white/5 p-4">
                        <div className="mb-2 text-[11px] font-medium text-zinc-500">Performance</div>
                        <div className="grid grid-cols-4 gap-1.5">
                            {[{ l: "1D", v: 1.2 }, { l: "1W", v: -2.4 }, { l: "1M", v: 5.6 }, { l: "YTD", v: 12.3 }].map(({ l, v }) => (
                                <div key={l} className="rounded-lg bg-white/5 p-2 text-center">
                                    <div className="text-[9px] text-zinc-600">{l}</div>
                                    <div className={cn("text-[11px] font-medium tabular-nums", v >= 0 ? "text-emerald-400" : "text-red-400")}>
                                        {v >= 0 ? "+" : ""}{v.toFixed(1)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Watchlist */}
                    <div className="flex flex-1 flex-col overflow-hidden border-t border-white/5">
                        <div className="flex items-center justify-between px-4 py-2">
                            <span className="text-[11px] font-medium text-zinc-500">Watchlist</span>
                        </div>
                        <div className="flex-1 overflow-y-auto px-2">
                            {WATCHLIST.map((item) => (
                                <button
                                    key={item.symbol}
                                    onClick={() => setActiveSymbol(item)}
                                    className={cn(
                                        "flex w-full items-center justify-between rounded-xl px-3 py-2.5 transition-colors",
                                        activeSymbol.symbol === item.symbol ? "bg-white/5" : "hover:bg-white/[0.02]"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <Star
                                            size={10}
                                            className={favorites.has(item.symbol) ? "text-yellow-500" : "text-zinc-700"}
                                            fill={favorites.has(item.symbol) ? "currentColor" : "none"}
                                        />
                                        <div className="text-left">
                                            <div className="text-sm font-medium text-zinc-200">{item.symbol}</div>
                                            <div className="text-[10px] text-zinc-600">{item.name}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm tabular-nums text-zinc-300">{item.price.toFixed(2)}</div>
                                        <div className={cn("text-[10px] tabular-nums", item.change >= 0 ? "text-emerald-400" : "text-red-400")}>
                                            {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Bottom Status */}
                <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2 text-[11px] text-zinc-600">
                    <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Live
                    </span>
                </div>
            </div>
        </TooltipProvider>
    );
}

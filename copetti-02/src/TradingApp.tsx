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
    Settings,
    Camera,
    Maximize2,
    ChevronDown,
    Search,
    Star,
    Plus,
    Clock,
    Activity,
    Trash2,
    PanelRightClose,
    PanelRightOpen,
    Circle,
    X,
} from "lucide-react";

// Generate realistic candle data
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

// Watchlist data
const WATCHLIST = [
    { symbol: "BTC/USD", name: "Bitcoin", price: 43250.50, change: 2.34 },
    { symbol: "ETH/USD", name: "Ethereum", price: 2280.75, change: -1.12 },
    { symbol: "SOL/USD", name: "Solana", price: 98.42, change: 5.67 },
    { symbol: "AAPL", name: "Apple Inc.", price: 178.25, change: 0.85 },
    { symbol: "NVDA", name: "NVIDIA", price: 495.20, change: 4.15 },
    { symbol: "TSLA", name: "Tesla", price: 248.50, change: 3.21 },
    { symbol: "META", name: "Meta", price: 355.90, change: 1.78 },
    { symbol: "GOOGL", name: "Alphabet", price: 141.80, change: -0.32 },
];

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D", "1W", "1M"];

const CHART_TYPES: { type: ChartType; icon: typeof CandlestickChart; label: string }[] = [
    { type: "candlestick", icon: CandlestickChart, label: "Candles" },
    { type: "line", icon: LineChart, label: "Line" },
    { type: "area", icon: AreaChart, label: "Area" },
];

const DRAWING_TOOLS: { tool: DrawingToolType | null; icon: typeof MousePointer2; label: string }[] = [
    { tool: null, icon: MousePointer2, label: "Select" },
    { tool: "trendline", icon: TrendingUp, label: "Trend Line" },
    { tool: "horizontal", icon: Minus, label: "Horizontal Line" },
    { tool: "ray", icon: PenLine, label: "Ray" },
    { tool: "rectangle", icon: Square, label: "Rectangle" },
    { tool: "fibonacci", icon: Ruler, label: "Fibonacci" },
    { tool: "measure", icon: Crosshair, label: "Measure" },
];

const PRESET_INDICATORS: IndicatorConfig[] = [
    { type: "sma", period: 20, color: "#3b82f6", enabled: false },
    { type: "sma", period: 50, color: "#f59e0b", enabled: false },
    { type: "ema", period: 12, color: "#8b5cf6", enabled: false },
    { type: "bollinger", period: 20, color: "#06b6d4", enabled: false },
];

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
    const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
    const [favorites, setFavorites] = useState<Set<string>>(new Set(["BTC/USD", "ETH/USD"]));
    const [searchQuery, setSearchQuery] = useState("");
    const [showIndicators, setShowIndicators] = useState(false);
    const chartRef = useRef<ChartRef>(null);
    const [chartDimensions, setChartDimensions] = useState({ width: 1200, height: 600 });

    useEffect(() => {
        const updateDimensions = () => {
            const leftToolbar = 48;
            const rightSidebar = rightSidebarOpen ? 280 : 0;
            const topBar = 48;
            const bottomBar = 32;
            setChartDimensions({
                width: Math.max(400, window.innerWidth - leftToolbar - rightSidebar - 16),
                height: Math.max(300, window.innerHeight - topBar - bottomBar - 16),
            });
        };
        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, [rightSidebarOpen]);

    useEffect(() => {
        setCandles(generateCandles(200, activeSymbol.price, activeSymbol.symbol));
    }, [activeSymbol]);

    const handleExport = useCallback(() => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        chartRef.current?.downloadPNG(`${activeSymbol.symbol}-${timestamp}.png`);
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
        setSelectedDrawing(null);
    }, []);

    const toggleFavorite = (symbol: string) => {
        setFavorites(prev => {
            const next = new Set(prev);
            next.has(symbol) ? next.delete(symbol) : next.add(symbol);
            return next;
        });
    };

    const toggleIndicator = (index: number) => {
        setIndicators(prev => prev.map((ind, i) =>
            i === index ? { ...ind, enabled: !ind.enabled } : ind
        ));
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (drawingTool !== null) {
                    chartRef.current?.cancelDrawing();
                    setDrawingTool(null);
                }
            }
            if ((e.key === "Delete" || e.key === "Backspace") && selectedDrawing !== null) {
                chartRef.current?.deleteSelectedDrawing();
                setSelectedDrawing(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [drawingTool, selectedDrawing]);

    const filteredWatchlist = WATCHLIST.filter(item =>
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const lastCandle = candles[candles.length - 1];
    const priceChange = lastCandle && candles[0]
        ? ((lastCandle.close - candles[0].open) / candles[0].open * 100)
        : 0;

    return (
        <TooltipProvider delayDuration={100}>
            <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0f] text-zinc-100">
                {/* Left Toolbar */}
                <div className="flex w-12 flex-col items-center border-r border-zinc-800/60 bg-[#0d0d12] py-2">
                    {/* Drawing Tools */}
                    <div className="flex flex-col gap-0.5">
                        {DRAWING_TOOLS.map(({ tool, icon: Icon, label }) => (
                            <Tooltip key={label}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setDrawingTool(tool)}
                                        className={cn(
                                            "flex h-9 w-9 items-center justify-center rounded transition-colors",
                                            drawingTool === tool
                                                ? "bg-blue-500/20 text-blue-400"
                                                : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                                        )}
                                    >
                                        <Icon size={18} strokeWidth={1.5} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">{label}</TooltipContent>
                            </Tooltip>
                        ))}
                    </div>

                    <div className="my-3 h-px w-6 bg-zinc-800" />

                    {/* Chart Types */}
                    <div className="flex flex-col gap-0.5">
                        {CHART_TYPES.map(({ type, icon: Icon, label }) => (
                            <Tooltip key={type}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setChartType(type)}
                                        className={cn(
                                            "flex h-9 w-9 items-center justify-center rounded transition-colors",
                                            chartType === type
                                                ? "bg-blue-500/20 text-blue-400"
                                                : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                                        )}
                                    >
                                        <Icon size={18} strokeWidth={1.5} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">{label}</TooltipContent>
                            </Tooltip>
                        ))}
                    </div>

                    <div className="my-3 h-px w-6 bg-zinc-800" />

                    {/* Actions */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setShowIndicators(!showIndicators)}
                                className={cn(
                                    "flex h-9 w-9 items-center justify-center rounded transition-colors",
                                    showIndicators || indicators.some(i => i.enabled)
                                        ? "bg-purple-500/20 text-purple-400"
                                        : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                                )}
                            >
                                <Activity size={18} strokeWidth={1.5} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Indicators</TooltipContent>
                    </Tooltip>

                    {drawings.length > 0 && (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={handleClearDrawings}
                                    className="flex h-9 w-9 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-red-500/20 hover:text-red-400"
                                >
                                    <Trash2 size={18} strokeWidth={1.5} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Clear drawings</TooltipContent>
                        </Tooltip>
                    )}

                    <div className="flex-1" />

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="flex h-9 w-9 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300">
                                <Settings size={18} strokeWidth={1.5} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Settings</TooltipContent>
                    </Tooltip>
                </div>

                {/* Main Content */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    {/* Top Bar */}
                    <div className="flex h-12 items-center justify-between border-b border-zinc-800/60 bg-[#0d0d12] px-3">
                        <div className="flex items-center gap-3">
                            {/* Symbol Selector */}
                            <button className="flex items-center gap-2 rounded-md bg-zinc-800/50 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-zinc-800">
                                <span className="text-zinc-100">{activeSymbol.symbol}</span>
                                <ChevronDown size={14} className="text-zinc-500" />
                            </button>

                            {/* Timeframe */}
                            <div className="flex items-center gap-0.5 rounded-md bg-zinc-800/30 p-0.5">
                                {TIMEFRAMES.map((tf) => (
                                    <button
                                        key={tf}
                                        onClick={() => setTimeframe(tf)}
                                        className={cn(
                                            "rounded px-2 py-1 text-xs font-medium transition-colors",
                                            timeframe === tf
                                                ? "bg-zinc-700 text-zinc-100"
                                                : "text-zinc-500 hover:text-zinc-300"
                                        )}
                                    >
                                        {tf}
                                    </button>
                                ))}
                            </div>

                            <div className="h-5 w-px bg-zinc-800" />

                            {/* OHLC */}
                            <div className="flex items-center gap-3 text-xs">
                                <span className="text-zinc-500">O <span className="text-zinc-300 tabular-nums">{lastCandle?.open.toFixed(2)}</span></span>
                                <span className="text-zinc-500">H <span className="text-emerald-400 tabular-nums">{lastCandle?.high.toFixed(2)}</span></span>
                                <span className="text-zinc-500">L <span className="text-red-400 tabular-nums">{lastCandle?.low.toFixed(2)}</span></span>
                                <span className="text-zinc-500">C <span className={cn("tabular-nums", priceChange >= 0 ? "text-emerald-400" : "text-red-400")}>{lastCandle?.close.toFixed(2)}</span></span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={handleExport}
                                        className="flex h-8 w-8 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                                    >
                                        <Camera size={16} strokeWidth={1.5} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>Screenshot</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button className="flex h-8 w-8 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300">
                                        <Maximize2 size={16} strokeWidth={1.5} />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>Fullscreen</TooltipContent>
                            </Tooltip>

                            <div className="h-5 w-px bg-zinc-800" />

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
                                        className="flex h-8 w-8 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                                    >
                                        {rightSidebarOpen ? <PanelRightClose size={16} strokeWidth={1.5} /> : <PanelRightOpen size={16} strokeWidth={1.5} />}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent>{rightSidebarOpen ? "Hide panel" : "Show panel"}</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="relative flex-1 overflow-hidden bg-[#0a0a0f]">
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

                        {/* Indicators Panel (Floating) */}
                        {showIndicators && (
                            <div className="absolute left-4 top-4 z-20 w-56 rounded-lg border border-zinc-800 bg-[#0f0f14]/95 p-3 shadow-xl backdrop-blur-sm">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-sm font-medium">Indicators</span>
                                    <button
                                        onClick={() => setShowIndicators(false)}
                                        className="text-zinc-500 hover:text-zinc-300"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {indicators.map((ind, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => toggleIndicator(idx)}
                                            className={cn(
                                                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors",
                                                ind.enabled
                                                    ? "bg-zinc-800 text-zinc-100"
                                                    : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                                            )}
                                        >
                                            <Circle
                                                size={10}
                                                fill={ind.enabled ? ind.color : "transparent"}
                                                stroke={ind.color}
                                                strokeWidth={2}
                                            />
                                            <span>{ind.type.toUpperCase()}({ind.period})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Status */}
                    <div className="flex h-8 items-center justify-between border-t border-zinc-800/60 bg-[#0d0d12] px-3 text-[11px] text-zinc-500">
                        <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Live
                            </span>
                            <span>Vol: <span className="text-zinc-400 tabular-nums">{((lastCandle?.volume ?? 0) / 1000000).toFixed(2)}M</span></span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                                <Clock size={11} />
                                {new Date().toLocaleTimeString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className={cn(
                    "flex flex-col border-l border-zinc-800/60 bg-[#0d0d12] transition-all duration-200",
                    rightSidebarOpen ? "w-[280px]" : "w-0 overflow-hidden"
                )}>
                    {/* Symbol Info */}
                    <div className="border-b border-zinc-800/60 p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="text-lg font-semibold">{activeSymbol.symbol}</div>
                                <div className="text-xs text-zinc-500">{activeSymbol.name}</div>
                            </div>
                            <button
                                onClick={() => toggleFavorite(activeSymbol.symbol)}
                                className={cn(
                                    "transition-colors",
                                    favorites.has(activeSymbol.symbol) ? "text-yellow-500" : "text-zinc-600 hover:text-zinc-400"
                                )}
                            >
                                <Star size={16} fill={favorites.has(activeSymbol.symbol) ? "currentColor" : "none"} />
                            </button>
                        </div>
                        <div className="mt-3">
                            <div className="text-2xl font-semibold tabular-nums">
                                ${lastCandle?.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className={cn(
                                "mt-0.5 flex items-center gap-1 text-sm",
                                priceChange >= 0 ? "text-emerald-400" : "text-red-400"
                            )}>
                                {priceChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                <span className="tabular-nums">{priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Performance */}
                    <div className="border-b border-zinc-800/60 p-4">
                        <div className="mb-2 text-xs font-medium text-zinc-500">Performance</div>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { label: "1D", value: 1.23 },
                                { label: "1W", value: -2.45 },
                                { label: "1M", value: 5.67 },
                                { label: "YTD", value: 12.34 },
                            ].map(({ label, value }) => (
                                <div key={label} className="rounded bg-zinc-800/30 p-2 text-center">
                                    <div className="text-[10px] text-zinc-500">{label}</div>
                                    <div className={cn(
                                        "text-xs font-medium tabular-nums",
                                        value >= 0 ? "text-emerald-400" : "text-red-400"
                                    )}>
                                        {value >= 0 ? "+" : ""}{value.toFixed(1)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Watchlist */}
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <div className="flex items-center justify-between border-b border-zinc-800/60 px-4 py-2">
                            <span className="text-xs font-medium text-zinc-400">Watchlist</span>
                            <button className="text-zinc-500 hover:text-zinc-300">
                                <Plus size={14} />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="p-3">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-8 w-full rounded border border-zinc-800 bg-zinc-900/50 pl-8 pr-3 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-700"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto px-2 pb-2">
                            {filteredWatchlist.map((item) => (
                                <button
                                    key={item.symbol}
                                    onClick={() => setActiveSymbol(item)}
                                    className={cn(
                                        "flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors",
                                        activeSymbol.symbol === item.symbol
                                            ? "bg-zinc-800/80"
                                            : "hover:bg-zinc-800/40"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <span
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFavorite(item.symbol);
                                            }}
                                            className={cn(
                                                "cursor-pointer transition-colors",
                                                favorites.has(item.symbol) ? "text-yellow-500" : "text-zinc-700 hover:text-zinc-500"
                                            )}
                                        >
                                            <Star size={12} fill={favorites.has(item.symbol) ? "currentColor" : "none"} />
                                        </span>
                                        <div>
                                            <div className="text-sm font-medium">{item.symbol}</div>
                                            <div className="text-[10px] text-zinc-600">{item.name}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm tabular-nums">{item.price.toFixed(2)}</div>
                                        <div className={cn(
                                            "text-[10px] tabular-nums",
                                            item.change >= 0 ? "text-emerald-400" : "text-red-400"
                                        )}>
                                            {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

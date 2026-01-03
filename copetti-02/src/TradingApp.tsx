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
    Search,
    Filter,
    Clock,
    ChevronDown,
    ArrowRight,
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

const STOCKS = [
    { symbol: "AAPL", name: "Apple Inc.", price: 223.89, change: 0.70, changePct: 0.31, volume: "35.91M", rating: "Neutral" },
    { symbol: "MSFT", name: "Microsoft Corporation", price: 382.14, change: -0.01, changePct: -0.05, volume: "16.09M", rating: "Sell" },
    { symbol: "NVDA", name: "NVIDIA Corporation", price: 110.42, change: 0.27, changePct: 0.25, volume: "220.6M", rating: "Strong Sell" },
    { symbol: "AMZN", name: "Amazon.com, Inc.", price: 196.01, change: 3.84, changePct: 2.00, volume: "53.67M", rating: "Sell" },
    { symbol: "GOOG", name: "Alphabet Inc.", price: 158.86, change: -0.02, changePct: -0.01, volume: "17.11M", rating: "Sell" },
];

const TIMEFRAMES = ["1D", "5D", "1W", "1M", "3M", "6M", "YTD", "1Y", "ALL"];

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
                "flex h-6 w-6 items-center justify-center rounded-md transition-all active:scale-95",
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
    const [chartType, setChartType] = useState<ChartType>("area");
    const [timeframe, setTimeframe] = useState("6M");
    const [indicators, setIndicators] = useState<IndicatorConfig[]>(PRESET_INDICATORS);
    const [drawingTool, setDrawingTool] = useState<DrawingToolType | null>(null);
    const [drawings, setDrawings] = useState<readonly AnyDrawing[]>([]);
    const [selectedDrawing, setSelectedDrawing] = useState<AnyDrawing | null>(null);
    const [panelOpen, setPanelOpen] = useState(true);
    const [favorites, setFavorites] = useState<Set<string>>(new Set(["BTC/USD", "ETH/USD"]));
    const [showIndicators, setShowIndicators] = useState(false);
    const [showDrawingTools, setShowDrawingTools] = useState(false);
    const [searchQuery, setSearchQuery] = useState("SPX");
    const chartRef = useRef<ChartRef>(null);
    const [chartDimensions, setChartDimensions] = useState({ width: 1200, height: 600 });

    useEffect(() => {
        const updateDimensions = () => {
            const panelWidth = panelOpen ? 240 : 0;
            const headerHeight = 40;
            const screenerHeight = 160;
            setChartDimensions({
                width: Math.max(400, window.innerWidth - panelWidth),
                height: Math.max(300, window.innerHeight - headerHeight - screenerHeight),
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
            <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#000]">
                {/* Sci-fi Grid Background */}
                <div className="pointer-events-none absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(20,20,40,0.3)_0%,_transparent_70%)]" />
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                        backgroundImage: `
                            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
                        `,
                        backgroundSize: '50px 50px'
                    }} />
                </div>

                {/* Header */}
                <header className="relative z-50 flex h-10 flex-shrink-0 items-center justify-between px-3">
                    <div className="flex items-center gap-3">
                        <button className="text-[#888] hover:text-white">
                            <Menu size={14} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-500">
                                <Clock size={12} className="text-white" />
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-[11px] font-semibold tracking-tight text-white">MoonBucks</span>
                                <span className="text-[8px] text-[#444]">not only to the moon, but beyond</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <div className="flex items-center rounded-md bg-[#111] p-0.5">
                            {CHART_TYPES.map(({ type, icon: Icon }) => (
                                <button
                                    key={type}
                                    onClick={() => setChartType(type)}
                                    className={cn(
                                        "flex h-[22px] w-6 items-center justify-center rounded transition-colors",
                                        chartType === type ? "bg-[#1a1a1a] text-white" : "text-[#666] hover:text-[#999]"
                                    )}
                                >
                                    <Icon size={11} />
                                </button>
                            ))}
                        </div>
                        <button className="flex h-6 items-center gap-1 rounded-md bg-[#111] px-2 text-[10px] font-medium text-[#888]">
                            2h
                        </button>
                        <div className="flex h-6 items-center gap-1.5 rounded-md bg-[#111] px-2">
                            <Search size={11} className="text-[#444]" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-14 bg-transparent text-[11px] text-white outline-none placeholder:text-[#444]"
                            />
                        </div>
                        <button className="flex h-6 w-6 items-center justify-center rounded-md bg-[#111] text-[#666] hover:text-[#999]">
                            <Filter size={11} />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <span className="text-[11px] font-semibold text-white">$39,551.76</span>
                                    <span className="rounded bg-[#22c55e]/10 px-1 py-0.5 text-[9px] font-bold text-[#22c55e]">5.31%</span>
                                </div>
                                <span className="text-[8px] text-[#444]">Unified Trading, USD</span>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                    <span className="text-[11px] font-semibold text-white">$7,960.11</span>
                                    <span className="rounded bg-[#ef4444]/10 px-1 py-0.5 text-[9px] font-bold text-[#ef4444]">0.69%</span>
                                </div>
                                <span className="text-[8px] text-[#444]">Funding, USD</span>
                            </div>
                        </div>
                        <div className="h-6 w-6 overflow-hidden rounded-full bg-gradient-to-br from-pink-500 to-purple-500">
                            <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face" alt="" className="h-full w-full object-cover" />
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="relative flex flex-1 overflow-hidden">
                    {/* Chart Area */}
                    <div className="relative flex-1">
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

                        {/* Left Tools */}
                        <div className="absolute left-2.5 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1">
                            <div className="flex flex-col gap-0.5 rounded-lg bg-[#111] p-1">
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
                                                <Icon size={12} strokeWidth={1.5} />
                                            </ToolButton>
                                        ))}
                                        {drawings.length > 0 && (
                                            <ToolButton onClick={handleClearDrawings} className="text-[#ef4444]/60 hover:text-[#ef4444]">
                                                <Trash2 size={12} strokeWidth={1.5} />
                                            </ToolButton>
                                        )}
                                    </>
                                ) : (
                                    <ToolButton onClick={() => setShowDrawingTools(true)} active={drawingTool !== null}>
                                        <PenLine size={12} strokeWidth={1.5} />
                                    </ToolButton>
                                )}
                            </div>

                            <div className="relative">
                                <div className="rounded-lg bg-[#111] p-1">
                                    <ToolButton
                                        active={showIndicators || indicators.some(i => i.enabled)}
                                        onClick={() => setShowIndicators(!showIndicators)}
                                    >
                                        <Activity size={12} strokeWidth={1.5} />
                                    </ToolButton>
                                </div>
                                {showIndicators && (
                                    <div className="absolute left-full top-0 ml-1.5 w-32 rounded-lg bg-[#111] p-1">
                                        {indicators.map((ind, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => toggleIndicator(idx)}
                                                className={cn(
                                                    "flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-[9px] transition-colors",
                                                    ind.enabled ? "bg-[#1a1a1a] text-white" : "text-[#666] hover:text-[#999]"
                                                )}
                                            >
                                                <Circle size={5} fill={ind.enabled ? ind.color : "transparent"} stroke={ind.color} strokeWidth={2} />
                                                {ind.type.toUpperCase()}({ind.period})
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Timeframe Bar */}
                        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
                            <div className="flex gap-0.5 rounded-lg bg-[#111] p-0.5">
                                {TIMEFRAMES.map((tf) => (
                                    <button
                                        key={tf}
                                        onClick={() => setTimeframe(tf)}
                                        className={cn(
                                            "rounded px-2 py-1 text-[9px] font-medium transition-all",
                                            timeframe === tf ? "bg-[#1a1a1a] text-white" : "text-[#666] hover:text-[#999]"
                                        )}
                                    >
                                        {tf}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div className={cn(
                        "flex h-full flex-col gap-1.5 p-1.5 transition-all duration-300",
                        panelOpen ? "w-[240px]" : "w-0 overflow-hidden p-0"
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
                                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
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

                    {/* Panel Toggle */}
                    <button
                        onClick={() => setPanelOpen(!panelOpen)}
                        className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-md bg-[#111] text-[#666] hover:text-white"
                    >
                        <PanelRight size={12} />
                    </button>
                </main>

                {/* Bottom Screener */}
                <div className="relative z-40 mx-1.5 mb-1.5 h-[160px] flex-shrink-0 rounded-xl bg-[#111]">
                    <div className="flex h-8 items-center justify-between px-3">
                        <span className="text-[11px] font-semibold text-white">Stock screener</span>
                        <div className="flex gap-1">
                            <button className="text-[#444] hover:text-[#888]"><ChevronDown size={11} /></button>
                            <button className="text-[#444] hover:text-[#888]"><Filter size={11} /></button>
                            <button className="text-[#444] hover:text-[#888]"><Maximize2 size={11} /></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-6 gap-2 px-3 text-[8px] uppercase tracking-wide text-[#444]">
                        <div>Ticket</div>
                        <div className="text-right">Price</div>
                        <div className="text-right">Chg</div>
                        <div className="text-right">Chg %</div>
                        <div className="text-right">Vol</div>
                        <div className="text-right">Technical Rating</div>
                    </div>
                    <div className="mt-1 max-h-[110px] overflow-y-auto px-1">
                        {STOCKS.map((stock) => (
                            <div key={stock.symbol} className="grid grid-cols-6 items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] hover:bg-[#161616]">
                                <div className="flex items-center gap-2">
                                    <div className="flex h-[18px] w-[18px] items-center justify-center rounded bg-[#333] text-[8px] font-bold text-white">
                                        {stock.symbol.slice(0, 1)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-white">{stock.symbol}</div>
                                        <div className="text-[8px] text-[#444]">{stock.name}</div>
                                    </div>
                                </div>
                                <div className="text-right tabular-nums text-[#888]">{stock.price.toFixed(2)} <span className="text-[7px] text-[#444]">USD</span></div>
                                <div className={cn("text-right tabular-nums", stock.change >= 0 ? "text-[#22c55e]" : "text-[#ef4444]")}>
                                    {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(2)}
                                </div>
                                <div className={cn("text-right tabular-nums", stock.changePct >= 0 ? "text-[#22c55e]" : "text-[#ef4444]")}>
                                    {stock.changePct >= 0 ? "+" : ""}{stock.changePct.toFixed(2)}%
                                </div>
                                <div className="text-right tabular-nums text-[#666]">{stock.volume}</div>
                                <div className={cn(
                                    "flex items-center justify-end gap-1 text-[9px]",
                                    stock.rating.includes("Sell") ? "text-[#ef4444]" : stock.rating === "Neutral" ? "text-[#666]" : "text-[#22c55e]"
                                )}>
                                    <ArrowRight size={10} />
                                    {stock.rating}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Chart, type ChartRef, type ChartType, type AnyDrawing } from "./components/Chart.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { cn } from "./lib/utils.ts";
import type { Candle } from "./core/types.ts";
import type { IndicatorConfig } from "./core/chart.ts";
import type { DrawingToolType } from "./core/drawing.ts";
import {
    TrendingUp,
    Minus,
    MousePointer2,
    PenLine,
    Ruler,
    Square,
    Crosshair,
    CandlestickChart,
    LineChart,
    AreaChart,
    Star,
    Activity,
    Trash2,
    Circle,
    Menu,
    Search,
    Filter,
    Clock,
    ChevronDown,
    ChevronRight,
    Play,
    Terminal,
    Eye,
    EyeOff,
    X,
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
];

const TIMEFRAMES = ["15m", "1H", "4H", "1D", "1W"];

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

const DEFAULT_SCRIPT = `// MMS Scripting Console
// Ctrl+Enter to run

const price = @query("BTC/USD")
const sma = @sma(price, 20)

if price > sma {
    @print("Bullish trend")
} else {
    @print("Bearish trend")
}`;

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
                "flex h-6 w-6 items-center justify-center rounded transition-all active:scale-95",
                active ? "bg-[#1a1a1a] text-white" : "text-[#555] hover:text-[#888]",
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
    const [timeframe, setTimeframe] = useState("4H");
    const [indicators, setIndicators] = useState<IndicatorConfig[]>(PRESET_INDICATORS);
    const [drawingTool, setDrawingTool] = useState<DrawingToolType | null>(null);
    const [drawings, setDrawings] = useState<readonly AnyDrawing[]>([]);
    const [selectedDrawing, setSelectedDrawing] = useState<AnyDrawing | null>(null);
    const [favorites, setFavorites] = useState<Set<string>>(new Set(["BTC/USD", "ETH/USD"]));
    const [showIndicators, setShowIndicators] = useState(false);
    const [showDrawingTools, setShowDrawingTools] = useState(false);
    const [showWatchlist, setShowWatchlist] = useState(false);
    const [showScripting, setShowScripting] = useState(true);
    const [scriptCode, setScriptCode] = useState(DEFAULT_SCRIPT);
    const [scriptOutput, setScriptOutput] = useState("");
    const chartRef = useRef<ChartRef>(null);
    const [chartDimensions, setChartDimensions] = useState({ width: 1200, height: 600 });

    useEffect(() => {
        const updateDimensions = () => {
            const watchlistWidth = showWatchlist ? 200 : 0;
            const headerHeight = 40;
            const scriptingHeight = showScripting ? 140 : 0;
            setChartDimensions({
                width: Math.max(400, window.innerWidth - watchlistWidth),
                height: Math.max(300, window.innerHeight - headerHeight - scriptingHeight),
            });
        };
        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, [showWatchlist, showScripting]);

    useEffect(() => {
        setCandles(generateCandles(200, activeSymbol.price, activeSymbol.symbol));
    }, [activeSymbol]);

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

    const runScript = () => {
        setScriptOutput("Running...\n> Bullish trend detected\n> Price: $43,250.50\n> SMA(20): $42,180.25");
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
            if (e.ctrlKey && e.key === "Enter" && showScripting) {
                e.preventDefault();
                runScript();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selectedDrawing, showScripting]);

    const lastCandle = candles[candles.length - 1];
    const priceChange = lastCandle && candles[0]
        ? ((lastCandle.close - candles[0].open) / candles[0].open * 100)
        : 0;

    return (
        <TooltipProvider delayDuration={200}>
            <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#050505]">
                {/* Subtle Grid Background */}
                <div className="pointer-events-none absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(15,15,25,0.4)_0%,_transparent_70%)]" />
                    <div className="absolute inset-0 opacity-[0.015]" style={{
                        backgroundImage: `
                            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
                        `,
                        backgroundSize: '60px 60px'
                    }} />
                </div>

                {/* Header */}
                <header className="relative z-50 flex h-10 flex-shrink-0 items-center justify-between px-3">
                    <div className="flex items-center gap-3">
                        <button className="text-[#444] hover:text-white">
                            <Menu size={14} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-indigo-600 to-purple-600">
                                <Clock size={10} className="text-white" />
                            </div>
                            <span className="text-[11px] font-semibold text-white">MoonBucks</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <div className="flex items-center rounded bg-[#0a0a0a]/80 p-0.5">
                            {CHART_TYPES.map(({ type, icon: Icon }) => (
                                <button
                                    key={type}
                                    onClick={() => setChartType(type)}
                                    className={cn(
                                        "flex h-[22px] w-6 items-center justify-center rounded transition-colors",
                                        chartType === type ? "bg-[#151515] text-white" : "text-[#444] hover:text-[#888]"
                                    )}
                                >
                                    <Icon size={11} />
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center rounded bg-[#0a0a0a]/80 p-0.5">
                            {TIMEFRAMES.map((tf) => (
                                <button
                                    key={tf}
                                    onClick={() => setTimeframe(tf)}
                                    className={cn(
                                        "flex h-[22px] items-center justify-center rounded px-2 text-[10px] font-medium transition-colors",
                                        timeframe === tf ? "bg-[#151515] text-white" : "text-[#444] hover:text-[#888]"
                                    )}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>
                        <div className="flex h-6 items-center gap-1.5 rounded bg-[#0a0a0a]/80 px-2">
                            <Search size={11} className="text-[#333]" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="w-16 bg-transparent text-[10px] text-white outline-none placeholder:text-[#333]"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowWatchlist(!showWatchlist)}
                            className={cn("rounded p-1.5 transition-colors", showWatchlist ? "bg-[#111] text-white" : "text-[#444] hover:text-white")}
                        >
                            {showWatchlist ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button
                            onClick={() => setShowScripting(!showScripting)}
                            className={cn("rounded p-1.5 transition-colors", showScripting ? "bg-[#111] text-white" : "text-[#444] hover:text-white")}
                        >
                            <Terminal size={12} />
                        </button>
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

                        {/* Price & Performance - Always Visible */}
                        <div className="absolute right-3 top-3 z-10">
                            <div className="rounded-lg bg-[#080808]/90 p-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-white">{activeSymbol.symbol}</span>
                                    <button
                                        onClick={() => {
                                            setFavorites(prev => {
                                                const next = new Set(prev);
                                                next.has(activeSymbol.symbol) ? next.delete(activeSymbol.symbol) : next.add(activeSymbol.symbol);
                                                return next;
                                            });
                                        }}
                                        className={favorites.has(activeSymbol.symbol) ? "text-yellow-500" : "text-[#333]"}
                                    >
                                        <Star size={10} fill={favorites.has(activeSymbol.symbol) ? "currentColor" : "none"} />
                                    </button>
                                </div>
                                <div className="mt-1 text-xl font-light tabular-nums text-white">
                                    ${lastCandle?.close.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                                <div className={cn("text-[11px] font-semibold tabular-nums", priceChange >= 0 ? "text-[#22c55e]" : "text-[#ef4444]")}>
                                    {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                                </div>

                                {/* Performance grid - no title */}
                                <div className="mt-2 grid grid-cols-3 gap-1">
                                    {[
                                        { l: "1W", v: -5.25 }, { l: "1M", v: -7.15 }, { l: "3M", v: -8.40 },
                                        { l: "6M", v: -5.14 }, { l: "YTD", v: -8.58 }, { l: "1Y", v: 3.89 },
                                    ].map(({ l, v }) => (
                                        <div key={l} className={cn(
                                            "rounded px-1.5 py-1 text-center",
                                            v >= 0 ? "bg-[#22c55e]/10" : "bg-[#ef4444]/10"
                                        )}>
                                            <div className={cn("text-[9px] font-bold tabular-nums", v >= 0 ? "text-[#22c55e]" : "text-[#ef4444]")}>
                                                {v >= 0 ? "+" : ""}{v.toFixed(1)}%
                                            </div>
                                            <div className="text-[7px] text-[#444]">{l}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Left Tools */}
                        <div className="absolute left-2 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1">
                            <div className="flex flex-col gap-0.5 rounded bg-[#0a0a0a]/80 p-1">
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
                                                <Icon size={11} strokeWidth={1.5} />
                                            </ToolButton>
                                        ))}
                                        {drawings.length > 0 && (
                                            <ToolButton onClick={handleClearDrawings} className="text-[#ef4444]/50 hover:text-[#ef4444]">
                                                <Trash2 size={11} strokeWidth={1.5} />
                                            </ToolButton>
                                        )}
                                    </>
                                ) : (
                                    <ToolButton onClick={() => setShowDrawingTools(true)} active={drawingTool !== null}>
                                        <PenLine size={11} strokeWidth={1.5} />
                                    </ToolButton>
                                )}
                            </div>

                            <div className="relative">
                                <div className="rounded bg-[#0a0a0a]/80 p-1">
                                    <ToolButton
                                        active={showIndicators || indicators.some(i => i.enabled)}
                                        onClick={() => setShowIndicators(!showIndicators)}
                                    >
                                        <Activity size={11} strokeWidth={1.5} />
                                    </ToolButton>
                                </div>
                                {showIndicators && (
                                    <div className="absolute left-full top-0 ml-1 w-28 rounded bg-[#0a0a0a]/95 p-1">
                                        {indicators.map((ind, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => toggleIndicator(idx)}
                                                className={cn(
                                                    "flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-[9px] transition-colors",
                                                    ind.enabled ? "bg-[#151515] text-white" : "text-[#555] hover:text-[#888]"
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
                    </div>

                    {/* Watchlist Panel - Right */}
                    <div className={cn(
                        "flex h-full flex-col transition-all duration-200",
                        showWatchlist ? "w-[200px]" : "w-0 overflow-hidden"
                    )}>
                        <div className="flex h-8 items-center justify-between px-3">
                            <span className="text-[10px] font-semibold text-[#888]">Watchlist</span>
                            <button onClick={() => setShowWatchlist(false)} className="text-[#444] hover:text-white">
                                <X size={10} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto px-1.5">
                            {WATCHLIST.map((item) => (
                                <button
                                    key={item.symbol}
                                    onClick={() => setActiveSymbol(item)}
                                    className={cn(
                                        "flex w-full items-center gap-1.5 rounded px-2 py-1.5 transition-colors",
                                        activeSymbol.symbol === item.symbol ? "bg-[#111]" : "hover:bg-[#0a0a0a]"
                                    )}
                                >
                                    <div className={cn(
                                        "h-1 w-1 rounded-full",
                                        item.change >= 0 ? "bg-[#22c55e]" : "bg-[#ef4444]"
                                    )} />
                                    <span className="flex-1 text-left text-[10px] font-medium text-white">{item.symbol}</span>
                                    <span className={cn(
                                        "text-[9px] tabular-nums",
                                        item.change >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"
                                    )}>
                                        {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </main>

                {/* Scripting Panel */}
                {showScripting && (
                    <div className="relative z-40 flex h-[140px] flex-shrink-0 bg-[#080808]/95">
                        <div className="flex flex-1 flex-col">
                            {/* Scripting Header */}
                            <div className="flex h-7 items-center justify-between px-3">
                                <div className="flex items-center gap-2">
                                    <Terminal size={10} className="text-[#444]" />
                                    <span className="text-[10px] font-medium text-[#666]">Scripting</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={runScript}
                                        className="flex items-center gap-1 rounded bg-[#22c55e]/20 px-2 py-0.5 text-[9px] font-medium text-[#22c55e] hover:bg-[#22c55e]/30"
                                    >
                                        <Play size={9} /> Run
                                    </button>
                                    <button onClick={() => setShowScripting(false)} className="text-[#444] hover:text-white">
                                        <ChevronDown size={12} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-1 overflow-hidden">
                                {/* Editor */}
                                <div className="flex-1 overflow-hidden">
                                    <textarea
                                        value={scriptCode}
                                        onChange={(e) => setScriptCode(e.target.value)}
                                        spellCheck={false}
                                        className="h-full w-full resize-none bg-transparent p-2 font-mono text-[10px] leading-relaxed text-[#888] outline-none"
                                        placeholder="// Write your script here..."
                                    />
                                </div>

                                {/* Output */}
                                <div className="w-[280px] overflow-auto bg-[#050505]/50 p-2">
                                    <div className="mb-1 text-[8px] uppercase tracking-wide text-[#333]">Output</div>
                                    <pre className="font-mono text-[9px] leading-relaxed text-[#22c55e]">
                                        {scriptOutput || "// Run script to see output"}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}

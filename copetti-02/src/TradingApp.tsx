"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Chart, type ChartRef, type ChartType, type AnyDrawing } from "./components/Chart.tsx";
import { ChartControls } from "./components/ChartControls.tsx";
import { IndicatorControls, PRESET_INDICATORS } from "./components/IndicatorControls.tsx";
import { DrawingControls } from "./components/DrawingControls.tsx";
import { TimeRangeSelector, TIME_RANGES, type TimeRange, calculateVisibleRange } from "./components/TimeRangeSelector.tsx";
import { Button } from "./components/ui/button.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { cn } from "./lib/utils.ts";
import type { Candle } from "./core/types.ts";
import type { IndicatorConfig } from "./core/chart.ts";
import type { DrawingToolType } from "./core/drawing.ts";

// Generate realistic candle data
function generateCandles(count: number, startPrice: number, symbol: string): Candle[] {
    const candles: Candle[] = [];
    let price = startPrice;
    const now = Date.now();
    const interval = 60000 * 5; // 5 minute candles

    // Add some symbol-specific volatility
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
    { symbol: "BTC/USDT", name: "Bitcoin", price: 43250.50, change: 2.34 },
    { symbol: "ETH/USDT", name: "Ethereum", price: 2280.75, change: -1.12 },
    { symbol: "SOL/USDT", name: "Solana", price: 98.42, change: 5.67 },
    { symbol: "AAPL", name: "Apple Inc.", price: 178.25, change: 0.85 },
    { symbol: "GOOGL", name: "Alphabet", price: 141.80, change: -0.32 },
    { symbol: "TSLA", name: "Tesla", price: 248.50, change: 3.21 },
    { symbol: "NVDA", name: "NVIDIA", price: 495.20, change: 4.15 },
    { symbol: "META", name: "Meta", price: 355.90, change: 1.78 },
];

// Icon components
function ChartIcon({ className }: { className?: string }) {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M18 9l-5 5-4-4-3 3" />
        </svg>
    );
}

function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
        </svg>
    );
}

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
    return (
        <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
    );
}

function MenuIcon({ className }: { className?: string }) {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
    );
}

function SettingsIcon({ className }: { className?: string }) {
    return (
        <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
    );
}

function FullscreenIcon({ className }: { className?: string }) {
    return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
    );
}

function CameraIcon({ className }: { className?: string }) {
    return (
        <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
        </svg>
    );
}

export default function TradingApp() {
    const [activeSymbol, setActiveSymbol] = useState(WATCHLIST[0]!);
    const [candles, setCandles] = useState<Candle[]>(() =>
        generateCandles(200, activeSymbol.price, activeSymbol.symbol)
    );
    const [chartType, setChartType] = useState<ChartType>("candlestick");
    const [zoom, setZoom] = useState(1);
    const [indicators, setIndicators] = useState<IndicatorConfig[]>(PRESET_INDICATORS);
    const [drawingTool, setDrawingTool] = useState<DrawingToolType | null>(null);
    const [drawings, setDrawings] = useState<readonly AnyDrawing[]>([]);
    const [selectedDrawing, setSelectedDrawing] = useState<AnyDrawing | null>(null);
    const [timeRange, setTimeRange] = useState<TimeRange>(TIME_RANGES[2]!);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [favorites, setFavorites] = useState<Set<string>>(new Set(["BTC/USDT", "ETH/USDT"]));
    const [searchQuery, setSearchQuery] = useState("");
    const chartRef = useRef<ChartRef>(null);

    // Chart dimensions
    const [chartDimensions, setChartDimensions] = useState({ width: 1200, height: 600 });

    useEffect(() => {
        const updateDimensions = () => {
            const sidebarWidth = sidebarOpen ? 280 : 0;
            const toolbarHeight = 48;
            const headerHeight = 56;
            const bottomBarHeight = 40;

            setChartDimensions({
                width: window.innerWidth - sidebarWidth - 32,
                height: window.innerHeight - toolbarHeight - headerHeight - bottomBarHeight - 32,
            });
        };

        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, [sidebarOpen]);

    // Update candles when symbol changes
    useEffect(() => {
        setCandles(generateCandles(200, activeSymbol.price, activeSymbol.symbol));
    }, [activeSymbol]);

    const handleTimeRangeChange = useCallback((range: TimeRange) => {
        setTimeRange(range);
        const { start, end } = calculateVisibleRange(range, candles.length);
        chartRef.current?.setVisibleRange(start, end);
    }, [candles.length]);

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

    const handleDeleteSelected = useCallback(() => {
        chartRef.current?.deleteSelectedDrawing();
        setSelectedDrawing(null);
    }, []);

    const handleClearAll = useCallback(() => {
        chartRef.current?.clearAllDrawings();
        setDrawings([]);
        setSelectedDrawing(null);
    }, []);

    const toggleFavorite = (symbol: string) => {
        setFavorites(prev => {
            const next = new Set(prev);
            if (next.has(symbol)) {
                next.delete(symbol);
            } else {
                next.add(symbol);
            }
            return next;
        });
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                if (drawingTool !== null) {
                    chartRef.current?.cancelDrawing();
                    setDrawingTool(null);
                } else if (selectedDrawing !== null) {
                    setSelectedDrawing(null);
                }
            }
            if ((e.key === "Delete" || e.key === "Backspace") && selectedDrawing !== null) {
                handleDeleteSelected();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [drawingTool, selectedDrawing, handleDeleteSelected]);

    const filteredWatchlist = WATCHLIST.filter(item =>
        item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const lastCandle = candles[candles.length - 1];
    const firstVisibleCandle = candles[Math.max(0, candles.length - 50)];
    const priceChange = lastCandle && firstVisibleCandle
        ? ((lastCandle.close - firstVisibleCandle.open) / firstVisibleCandle.open * 100)
        : 0;

    return (
        <TooltipProvider>
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0a0a0f] text-zinc-100">
            {/* Header */}
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-800/50 bg-[#0f0f14] px-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                    >
                        <MenuIcon />
                    </button>
                    <div className="flex items-center gap-2">
                        <ChartIcon className="text-blue-500" />
                        <span className="text-lg font-semibold">Copetti Charts</span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Symbol Info */}
                    <div className="flex items-center gap-4 rounded-lg bg-zinc-800/50 px-4 py-2">
                        <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{activeSymbol.symbol}</span>
                            <span className="text-sm text-zinc-500">{activeSymbol.name}</span>
                        </div>
                        <div className="h-6 w-px bg-zinc-700" />
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-semibold tabular-nums">
                                ${lastCandle?.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className={cn(
                                "rounded px-2 py-0.5 text-sm font-medium tabular-nums",
                                priceChange >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                            )}>
                                {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100">
                        <SettingsIcon />
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className={cn(
                    "flex shrink-0 flex-col border-r border-zinc-800/50 bg-[#0f0f14] transition-all duration-300",
                    sidebarOpen ? "w-[280px]" : "w-0 overflow-hidden"
                )}>
                    {/* Search */}
                    <div className="border-b border-zinc-800/50 p-3">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search symbols..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none transition-colors focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25"
                            />
                        </div>
                    </div>

                    {/* Watchlist */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="p-2">
                            <div className="mb-2 flex items-center justify-between px-2">
                                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">Watchlist</span>
                                <span className="text-xs text-zinc-600">{filteredWatchlist.length} symbols</span>
                            </div>
                            <div className="space-y-0.5">
                                {filteredWatchlist.map((item) => (
                                    <div
                                        key={item.symbol}
                                        onClick={() => setActiveSymbol(item)}
                                        className={cn(
                                            "group flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors",
                                            activeSymbol.symbol === item.symbol
                                                ? "bg-blue-500/10 text-blue-400"
                                                : "hover:bg-zinc-800/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFavorite(item.symbol);
                                                }}
                                                className={cn(
                                                    "text-zinc-600 transition-colors hover:scale-110",
                                                    favorites.has(item.symbol) ? "text-yellow-500" : "group-hover:text-zinc-400"
                                                )}
                                            >
                                                <StarIcon filled={favorites.has(item.symbol)} />
                                            </button>
                                            <div>
                                                <div className="font-medium">{item.symbol}</div>
                                                <div className="text-xs text-zinc-500">{item.name}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium tabular-nums">
                                                ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                            <div className={cn(
                                                "text-xs tabular-nums",
                                                item.change >= 0 ? "text-emerald-400" : "text-red-400"
                                            )}>
                                                {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="border-t border-zinc-800/50 p-3">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg bg-zinc-800/30 p-2">
                                <div className="text-xs text-zinc-500">24h High</div>
                                <div className="font-medium text-emerald-400 tabular-nums">
                                    ${(activeSymbol.price * 1.02).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                            <div className="rounded-lg bg-zinc-800/30 p-2">
                                <div className="text-xs text-zinc-500">24h Low</div>
                                <div className="font-medium text-red-400 tabular-nums">
                                    ${(activeSymbol.price * 0.98).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="flex flex-1 flex-col overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800/50 bg-[#0c0c11] px-4">
                        <div className="flex items-center gap-2">
                            <TimeRangeSelector
                                value={timeRange.value}
                                onChange={handleTimeRangeChange}
                            />
                            <div className="mx-2 h-5 w-px bg-zinc-800" />
                            <ChartControls
                                chartType={chartType}
                                onChartTypeChange={setChartType}
                                zoom={zoom}
                                onZoomChange={setZoom}
                            />
                            <div className="mx-2 h-5 w-px bg-zinc-800" />
                            <IndicatorControls
                                indicators={indicators}
                                onIndicatorsChange={setIndicators}
                            />
                            <DrawingControls
                                activeTool={drawingTool}
                                onToolChange={setDrawingTool}
                                onClearAll={handleClearAll}
                                onDeleteSelected={handleDeleteSelected}
                                hasSelection={selectedDrawing !== null}
                                drawingCount={drawings.length}
                            />
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleExport}
                                className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                            >
                                <CameraIcon />
                                <span className="hidden sm:inline">Screenshot</span>
                            </button>
                            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100">
                                <FullscreenIcon />
                            </button>
                        </div>
                    </div>

                    {/* Chart Area */}
                    <div className="flex-1 overflow-hidden p-4">
                        <div className="h-full w-full rounded-xl border border-zinc-800/50 bg-[#0c0c11] p-2">
                            <Chart
                                ref={chartRef}
                                data={candles}
                                chartType={chartType}
                                zoom={zoom}
                                indicators={indicators}
                                drawingTool={drawingTool}
                                onDrawingChange={handleDrawingChange}
                                onDrawingSelect={handleDrawingSelect}
                                width={chartDimensions.width}
                                height={chartDimensions.height}
                            />
                        </div>
                    </div>
                </main>
            </div>

            {/* Bottom Bar */}
            <footer className="flex h-10 shrink-0 items-center justify-between border-t border-zinc-800/50 bg-[#0f0f14] px-4 text-xs text-zinc-500">
                <div className="flex items-center gap-4">
                    <span>O: <span className="text-zinc-300 tabular-nums">{lastCandle?.open.toFixed(2)}</span></span>
                    <span>H: <span className="text-emerald-400 tabular-nums">{lastCandle?.high.toFixed(2)}</span></span>
                    <span>L: <span className="text-red-400 tabular-nums">{lastCandle?.low.toFixed(2)}</span></span>
                    <span>C: <span className="text-zinc-300 tabular-nums">{lastCandle?.close.toFixed(2)}</span></span>
                    <span>Vol: <span className="text-zinc-300 tabular-nums">{lastCandle?.volume?.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Connected
                    </span>
                    <span>UTC {new Date().toISOString().slice(11, 19)}</span>
                </div>
            </footer>
        </div>
        </TooltipProvider>
    );
}

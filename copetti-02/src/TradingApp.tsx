"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Chart, type ChartRef, type ChartType, type AnyDrawing } from "./components/Chart.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { cn } from "./lib/utils.ts";
import type { Candle } from "./core/types.ts";
import type { IndicatorConfig } from "./core/chart.ts";
import type { DrawingToolType } from "./core/drawing.ts";
import {
    LayoutProvider,
    useLayout,
    useZoneGadgets,
    GadgetWrapper,
    getRegisteredGadgets,
} from "./gadget/index.ts";
import {
    ScriptingPanel,
    OpenPositionsPanel,
    BottomTabs,
    type BottomTab,
} from "./components/BottomPanel.tsx";
import {
    Menu,
    Search,
    Filter,
    Clock,
    Plus,
    MousePointer2,
    TrendingUp,
    Minus,
    PenLine,
    Square,
    Ruler,
    Crosshair,
    CandlestickChart,
    LineChart,
    AreaChart,
    Trash2,
    MoreVertical,
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

const TIMEFRAMES = ["1D", "5D", "1W", "1M", "3M", "6M", "YTD", "1Y", "5Y", "ALL"];

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
                "flex h-6 w-6 items-center justify-center rounded transition-all",
                active ? "bg-[#161616] text-white" : "text-[#888] hover:text-white",
                className
            )}
        >
            {children}
        </button>
    );
}

function GadgetAddMenu() {
    const { addGadget } = useLayout();
    const [open, setOpen] = useState(false);
    const gadgets = getRegisteredGadgets();

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex h-6 items-center gap-1 rounded bg-[#111] px-2 text-[10px] text-[#888] hover:text-white"
            >
                <Plus size={10} />
                <span>Add Gadget</span>
            </button>
            {open && (
                <div className="absolute right-0 top-full z-50 mt-1 w-40 rounded-lg bg-[#111] p-1 shadow-xl">
                    {gadgets.map((g) => (
                        <button
                            key={g.type}
                            onClick={() => {
                                addGadget(g.type);
                                setOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[10px] text-[#888] hover:bg-[#1a1a1a] hover:text-white"
                        >
                            {g.title}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function Sidebar() {
    const gadgets = useZoneGadgets("sidebar");

    return (
        <aside className="flex h-full w-[240px] flex-col gap-1.5 overflow-y-auto p-1.5">
            {gadgets.map((config) => (
                <GadgetWrapper key={config.id} config={config} />
            ))}
        </aside>
    );
}

function TradingAppContent() {
    const [candles, setCandles] = useState<Candle[]>(() =>
        generateCandles(200, 5670.98, "SPX")
    );
    const [chartType, setChartType] = useState<ChartType>("area");
    const [timeframe, setTimeframe] = useState("6M");
    const [indicators, setIndicators] = useState<IndicatorConfig[]>(PRESET_INDICATORS);
    const [drawingTool, setDrawingTool] = useState<DrawingToolType | null>(null);
    const [drawings, setDrawings] = useState<readonly AnyDrawing[]>([]);
    const [selectedDrawing, setSelectedDrawing] = useState<AnyDrawing | null>(null);
    const [bottomTab, setBottomTab] = useState<BottomTab>(null);
    const chartRef = useRef<ChartRef>(null);
    const [chartDimensions, setChartDimensions] = useState({ width: 1200, height: 600 });

    const { sidebarVisible, sidebarWidth } = useLayout();

    useEffect(() => {
        const updateDimensions = () => {
            const rightWidth = sidebarVisible ? sidebarWidth : 0;
            const headerHeight = 40;
            const bottomPanelHeight = bottomTab ? 200 : 0;
            setChartDimensions({
                width: Math.max(400, window.innerWidth - rightWidth - 12),
                height: Math.max(300, window.innerHeight - headerHeight - bottomPanelHeight - 12),
            });
        };
        updateDimensions();
        window.addEventListener("resize", updateDimensions);
        return () => window.removeEventListener("resize", updateDimensions);
    }, [sidebarVisible, sidebarWidth, bottomTab]);

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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setDrawingTool(null);
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

    return (
        <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#0a0a0a]">
            {/* Header */}
            <header className="relative z-50 flex h-10 flex-shrink-0 items-center justify-between px-3">
                <div className="flex items-center gap-3">
                    <button className="text-[#888] hover:text-white">
                        <Menu size={14} />
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-gradient-to-br from-indigo-600 to-purple-600">
                            <Clock size={12} className="text-white" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-[11px] font-semibold text-white">MoonBucks</span>
                            <span className="text-[8px] text-[#444]">not only to the moon, but beyond</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Chart Type */}
                    <div className="flex items-center rounded-md bg-[#111] p-0.5">
                        {CHART_TYPES.map(({ type, icon: Icon }) => (
                            <button
                                key={type}
                                onClick={() => setChartType(type)}
                                className={cn(
                                    "flex h-[22px] w-6 items-center justify-center rounded transition-colors",
                                    chartType === type ? "bg-[#161616] text-white" : "text-[#888] hover:text-white"
                                )}
                            >
                                <Icon size={11} />
                            </button>
                        ))}
                    </div>

                    {/* Interval */}
                    <button className="flex h-6 items-center rounded-md bg-[#111] px-2 text-[10px] font-medium text-[#888] hover:text-white">
                        2h
                    </button>

                    {/* Search */}
                    <div className="flex h-6 items-center gap-1.5 rounded-md bg-[#111] px-2">
                        <Search size={11} className="text-[#444]" />
                        <input
                            type="text"
                            defaultValue="SPX"
                            className="w-12 bg-transparent text-[11px] text-white outline-none"
                        />
                    </div>

                    {/* Filter */}
                    <button className="flex h-6 w-6 items-center justify-center rounded-md bg-[#111] text-[#888] hover:text-white">
                        <Filter size={11} />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {/* Portfolio Stats */}
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                                $39,551.76
                                <span className="rounded bg-[#22c55e]/15 px-1 py-0.5 text-[9px] font-bold text-[#22c55e]">
                                    5.31%
                                </span>
                            </div>
                            <span className="text-[8px] text-[#444]">Unified Trading, USD</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white">
                                $7,960.11
                                <span className="rounded bg-[#ef4444]/15 px-1 py-0.5 text-[9px] font-bold text-[#ef4444]">
                                    0.69%
                                </span>
                            </div>
                            <span className="text-[8px] text-[#444]">Funding, USD</span>
                        </div>
                    </div>

                    {/* Avatar */}
                    <div className="h-6 w-6 overflow-hidden rounded-full bg-gradient-to-br from-pink-500 to-purple-500">
                        <img
                            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=64&h=64&fit=crop&crop=face"
                            alt=""
                            className="h-full w-full object-cover"
                        />
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

                    {/* Chart Tools - Left */}
                    <div className="absolute left-2 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-0.5 rounded-lg bg-[#111] p-1">
                        <ToolButton>
                            <MoreVertical size={12} />
                        </ToolButton>
                        {DRAWING_TOOLS.slice(0, 5).map(({ tool, icon: Icon }) => (
                            <ToolButton
                                key={tool ?? "select"}
                                active={drawingTool === tool}
                                onClick={() => setDrawingTool(tool)}
                            >
                                <Icon size={12} />
                            </ToolButton>
                        ))}
                        {drawings.length > 0 && (
                            <ToolButton onClick={handleClearDrawings} className="text-[#ef4444]/50 hover:text-[#ef4444]">
                                <Trash2 size={12} />
                            </ToolButton>
                        )}
                    </div>

                    {/* Timeframe Bar - Bottom Center */}
                    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-lg bg-[#111] p-1">
                        {TIMEFRAMES.map((tf) => (
                            <button
                                key={tf}
                                onClick={() => setTimeframe(tf)}
                                className={cn(
                                    "rounded px-2 py-1 text-[9px] font-medium transition-colors",
                                    timeframe === tf ? "bg-[#161616] text-white" : "text-[#888] hover:text-white"
                                )}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sidebar */}
                {sidebarVisible && <Sidebar />}
            </main>

            {/* Bottom Panels */}
            <ScriptingPanel
                visible={bottomTab === "scripting"}
                onClose={() => setBottomTab(null)}
            />
            <OpenPositionsPanel
                visible={bottomTab === "positions"}
                onClose={() => setBottomTab(null)}
            />

            {/* Bottom Tabs */}
            <BottomTabs activeTab={bottomTab} onTabChange={setBottomTab} />

            {/* Gadget Add Button - Top Right of Chart */}
            <div className="absolute right-[252px] top-12 z-10">
                <GadgetAddMenu />
            </div>
        </div>
    );
}

export default function TradingApp() {
    return (
        <TooltipProvider delayDuration={200}>
            <LayoutProvider
                initialGadgets={[
                    { type: "symbol" },
                    { type: "performance" },
                    { type: "technicals" },
                    { type: "watchlist" },
                    { type: "screener", collapsed: true },
                ]}
            >
                <TradingAppContent />
            </LayoutProvider>
        </TooltipProvider>
    );
}

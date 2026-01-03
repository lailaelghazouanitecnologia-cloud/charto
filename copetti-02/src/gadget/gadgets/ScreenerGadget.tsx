/**
 * Stock Screener Gadget
 * Displays a table of stocks with ratings.
 */

import { ChevronDown, Filter, Maximize2, Settings } from "lucide-react";
import { cn } from "../../lib/utils.ts";
import type { GadgetProps } from "../types.ts";
import { registerGadget } from "../GadgetManager.tsx";

type TechnicalRating = "strong-sell" | "sell" | "neutral" | "buy" | "strong-buy";

interface ScreenerStock {
    symbol: string;
    name: string;
    icon?: string;
    iconBg: string;
    price: number;
    currency: string;
    change: number;
    changePercent: number;
    volume: string;
    rating: TechnicalRating;
}

interface ScreenerData {
    stocks: ScreenerStock[];
}

const RATING_LABELS: Record<TechnicalRating, string> = {
    "strong-sell": "Strong Sell",
    "sell": "Sell",
    "neutral": "Neutral",
    "buy": "Buy",
    "strong-buy": "Strong Buy",
};

const RATING_COLORS: Record<TechnicalRating, string> = {
    "strong-sell": "#ef4444",
    "sell": "#ef4444",
    "neutral": "#888888",
    "buy": "#22c55e",
    "strong-buy": "#22c55e",
};

const DEFAULT_STOCKS: ScreenerStock[] = [
    { symbol: "AAPL", name: "Apple Inc.", iconBg: "#333", price: 223.89, currency: "USD", change: 0.70, changePercent: 0.31, volume: "35.91 M", rating: "neutral" },
    { symbol: "MSFT", name: "Microsoft Corporation", iconBg: "#00a2ed", price: 382.14, currency: "USD", change: -0.01, changePercent: -0.05, volume: "16.09 M", rating: "sell" },
    { symbol: "NVDA", name: "NVIDIA Corporation", iconBg: "#76b900", price: 110.42, currency: "USD", change: 0.27, changePercent: 0.25, volume: "220.6 M", rating: "strong-sell" },
    { symbol: "AMZN", name: "Amazon.com, Inc.", iconBg: "#ff9900", price: 196.01, currency: "USD", change: 3.84, changePercent: 2.00, volume: "53.67 M", rating: "sell" },
    { symbol: "GOOG", name: "Alphabet Inc.", iconBg: "#4285f4", price: 158.86, currency: "USD", change: -0.02, changePercent: -0.01, volume: "17.11 M", rating: "sell" },
];

export function ScreenerGadget({ data }: GadgetProps) {
    const screener = (data as ScreenerData | undefined) ?? { stocks: DEFAULT_STOCKS };

    return (
        <div className="-mx-3 -mb-3">
            {/* Header */}
            <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex items-center gap-2">
                    <button className="flex h-[18px] w-[18px] items-center justify-center text-[#444] hover:text-[#888]">
                        <ChevronDown size={11} />
                    </button>
                    <button className="flex h-[18px] w-[18px] items-center justify-center text-[#444] hover:text-[#888]">
                        <Filter size={11} />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex h-[18px] w-[18px] items-center justify-center text-[#444] hover:text-[#888]">
                        <Maximize2 size={11} />
                    </button>
                    <button className="flex h-[18px] w-[18px] items-center justify-center text-[#444] hover:text-[#888]">
                        <Settings size={11} />
                    </button>
                </div>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1.2fr] gap-2 border-b border-white/5 px-3 py-1.5 text-[8px] uppercase tracking-wide text-[#444]">
                <div>Ticker</div>
                <div className="text-right">Price</div>
                <div className="text-right">Chg</div>
                <div className="text-right">Chg %</div>
                <div className="text-right">Vol</div>
                <div className="text-right">Technical Rating</div>
            </div>

            {/* Table Body */}
            <div className="max-h-[120px] overflow-y-auto">
                {screener.stocks.map((stock) => {
                    const isPositive = stock.change >= 0;
                    return (
                        <div
                            key={stock.symbol}
                            className="grid cursor-pointer grid-cols-[2.5fr_1fr_1fr_1fr_1fr_1.2fr] items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-white/[0.015]"
                        >
                            {/* Ticker */}
                            <div className="flex items-center gap-2">
                                <div
                                    className="flex h-[18px] w-[18px] items-center justify-center rounded text-[8px] font-bold text-white"
                                    style={{ background: stock.iconBg }}
                                >
                                    {stock.symbol[0]}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-semibold text-white">{stock.symbol}</span>
                                    <span className="truncate text-[8px] text-[#444]">{stock.name}</span>
                                </div>
                            </div>

                            {/* Price */}
                            <div className="text-right font-mono text-[10px] text-white">
                                {stock.price.toFixed(2)} <sub className="text-[7px] text-[#444]">{stock.currency}</sub>
                            </div>

                            {/* Change */}
                            <div className={cn("text-right font-mono text-[10px]", isPositive ? "text-[#22c55e]" : "text-[#ef4444]")}>
                                {isPositive ? "+" : ""}{stock.change.toFixed(2)} <sub className="text-[7px] text-[#444]">{stock.currency}</sub>
                            </div>

                            {/* Change % */}
                            <div className={cn("text-right font-mono text-[10px]", isPositive ? "text-[#22c55e]" : "text-[#ef4444]")}>
                                {isPositive ? "+" : ""}{stock.changePercent.toFixed(2)}%
                            </div>

                            {/* Volume */}
                            <div className="text-right font-mono text-[10px] text-[#888]">
                                {stock.volume}
                            </div>

                            {/* Rating */}
                            <div
                                className="flex items-center justify-end gap-1 text-[9px]"
                                style={{ color: RATING_COLORS[stock.rating] }}
                            >
                                <span>→</span>
                                <span>{RATING_LABELS[stock.rating]}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Register the gadget
registerGadget({
    type: "screener",
    title: "Stock Screener",
    defaultZone: "sidebar",
    defaultCollapsed: true,
    component: ScreenerGadget,
});

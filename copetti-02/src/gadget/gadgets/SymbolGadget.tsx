/**
 * Symbol Info Gadget
 * Displays current symbol information, price, and change.
 */

import { Star, Share, Grid, Settings } from "lucide-react";
import { cn } from "../../lib/utils.ts";
import type { GadgetProps } from "../types.ts";
import { registerGadget } from "../GadgetManager.tsx";

interface SymbolData {
    symbol: string;
    name: string;
    exchange: string;
    type: string;
    price: number;
    currency: string;
    change: number;
    changePercent: number;
    lastUpdate: string;
    isFavorite?: boolean;
    news?: { time: string; text: string };
}

export function SymbolGadget({ data }: GadgetProps) {
    const symbol = (data as SymbolData | undefined) ?? {
        symbol: "SPX",
        name: "S&P 500 Index",
        exchange: "SP",
        type: "Index",
        price: 5670.98,
        currency: "USD",
        change: 17.89,
        changePercent: 0.32,
        lastUpdate: "Apr 2 at 03:41 PM, UTC -5",
        isFavorite: true,
        news: {
            time: "15m ago",
            text: "S&P 500 Wipes Out $2 Trillion as Trump Says Tariff Response Is 'Going Very Well'",
        },
    };

    const isPositive = symbol.change >= 0;

    return (
        <div className="space-y-3">
            {/* Symbol Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div
                        className="flex h-5 w-5 items-center justify-center rounded text-[8px] font-bold text-white"
                        style={{ background: isPositive ? "#22c55e" : "#ef4444" }}
                    >
                        {symbol.symbol.slice(0, 2)}
                    </div>
                    <span className="text-xs font-bold text-white">{symbol.symbol}</span>
                    <button className={symbol.isFavorite ? "text-yellow-500" : "text-[#444]"}>
                        <Star size={10} fill={symbol.isFavorite ? "currentColor" : "none"} />
                    </button>
                </div>
                <div className="flex gap-1">
                    <button className="flex h-[18px] w-[18px] items-center justify-center text-[#444] hover:text-[#888]">
                        <Share size={10} />
                    </button>
                    <button className="flex h-[18px] w-[18px] items-center justify-center text-[#444] hover:text-[#888]">
                        <Grid size={10} />
                    </button>
                    <button className="flex h-[18px] w-[18px] items-center justify-center text-[#444] hover:text-[#888]">
                        <Settings size={10} />
                    </button>
                </div>
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-1.5 text-[9px] text-[#888]">
                <span>{symbol.name}</span>
                <span className="h-0.5 w-0.5 rounded-full bg-[#444]" />
                <span>{symbol.exchange}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-[#888]">
                <span>{symbol.type}</span>
                <span className="h-0.5 w-0.5 rounded-full bg-[#444]" />
                <span>Cfd</span>
            </div>

            {/* Price */}
            <div>
                <div className="text-2xl font-light tracking-tight text-white">
                    {symbol.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    <sub className="ml-1 text-[10px] text-[#444]">{symbol.currency}</sub>
                </div>
                <div className={cn("text-[11px] font-semibold", isPositive ? "text-[#22c55e]" : "text-[#ef4444]")}>
                    {isPositive ? "+" : ""}{symbol.change.toFixed(2)} ({isPositive ? "+" : ""}{symbol.changePercent.toFixed(2)}%)
                </div>
                <div className="mt-0.5 text-[8px] text-[#444]">
                    Last update {symbol.lastUpdate}
                </div>
            </div>

            {/* News Alert */}
            {symbol.news && (
                <div className="flex gap-2 rounded-lg bg-blue-500/10 p-2">
                    <div className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-blue-500">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
                        </svg>
                    </div>
                    <div>
                        <div className="text-[8px] font-semibold text-blue-500">{symbol.news.time}</div>
                        <div className="text-[9px] leading-snug text-[#888]">• {symbol.news.text}</div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Register the gadget
registerGadget({
    type: "symbol",
    title: "Symbol",
    defaultZone: "sidebar",
    defaultCollapsed: false,
    component: SymbolGadget,
});

/**
 * Watchlist Gadget
 * Displays grouped list of watched symbols.
 */

import { Plus, Edit, Settings } from "lucide-react";
import { cn } from "../../lib/utils.ts";
import type { GadgetProps } from "../types.ts";
import { registerGadget } from "../GadgetManager.tsx";

interface WatchlistItem {
    symbol: string;
    price: number;
    change: number;
    changePercent: number;
    trend: "up" | "down" | "neutral";
}

interface WatchlistGroup {
    name: string;
    items: WatchlistItem[];
}

interface WatchlistData {
    groups: WatchlistGroup[];
    onSelect?: (symbol: string) => void;
}

const DEFAULT_GROUPS: WatchlistGroup[] = [
    {
        name: "INDICES",
        items: [
            { symbol: "SPX", price: 5670.98, change: 37.32, changePercent: 0.67, trend: "down" },
            { symbol: "NDQ", price: 19581.78, change: 145.35, changePercent: 0.75, trend: "up" },
            { symbol: "DJI", price: 42225.32, change: 235.36, changePercent: 0.56, trend: "up" },
            { symbol: "VIX", price: 21.51, change: -0.26, changePercent: -1.19, trend: "up" },
        ],
    },
    {
        name: "STOCKS",
        items: [
            { symbol: "AAPL", price: 223.89, change: 0.70, changePercent: 0.31, trend: "up" },
            { symbol: "NFLX", price: 282.76, change: 14.30, changePercent: 5.33, trend: "down" },
            { symbol: "TSLA", price: 395.52, change: 7.14, changePercent: 0.77, trend: "down" },
        ],
    },
    {
        name: "FUTURES",
        items: [
            { symbol: "USOIL", price: 69.88, change: -0.78, changePercent: -1.10, trend: "up" },
            { symbol: "GOLD", price: 3129.45, change: -8.78, changePercent: -0.28, trend: "neutral" },
            { symbol: "SILVER", price: 33.22, change: -0.66, changePercent: -1.96, trend: "neutral" },
        ],
    },
];

const TREND_COLORS: Record<WatchlistItem["trend"], string> = {
    up: "#22c55e",
    down: "#ef4444",
    neutral: "#f97316",
};

export function WatchlistGadget({ data }: GadgetProps) {
    const watchlist = (data as WatchlistData | undefined) ?? { groups: DEFAULT_GROUPS };

    return (
        <div className="-mx-3 -mb-3">
            {/* Header actions */}
            <div className="flex justify-end gap-1 px-3 pb-2">
                <button className="flex h-[18px] w-[18px] items-center justify-center text-[#444] hover:text-[#888]">
                    <Plus size={10} />
                </button>
                <button className="flex h-[18px] w-[18px] items-center justify-center text-[#444] hover:text-[#888]">
                    <Edit size={10} />
                </button>
                <button className="flex h-[18px] w-[18px] items-center justify-center text-[#444] hover:text-[#888]">
                    <Settings size={10} />
                </button>
            </div>

            {/* Groups */}
            <div className="max-h-[200px] overflow-y-auto">
                {watchlist.groups.map((group) => (
                    <div key={group.name}>
                        <div className="px-4 py-1.5 text-[7px] font-semibold uppercase tracking-wider text-[#444]">
                            {group.name}
                        </div>
                        {group.items.map((item) => {
                            const isPositive = item.change >= 0;
                            return (
                                <button
                                    key={item.symbol}
                                    className="grid w-full grid-cols-[16px_1fr_auto_auto_auto] items-center gap-1.5 px-3 py-1 hover:bg-[#161616]"
                                    onClick={() => watchlist.onSelect?.(item.symbol)}
                                >
                                    <div
                                        className="h-1.5 w-1.5 rounded-full"
                                        style={{ background: TREND_COLORS[item.trend] }}
                                    />
                                    <span className="text-left text-[10px] font-semibold text-white">
                                        {item.symbol}
                                    </span>
                                    <span className="font-mono text-[10px] text-white">
                                        {item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                    <span
                                        className={cn(
                                            "w-10 text-right font-mono text-[9px]",
                                            isPositive ? "text-[#22c55e]" : "text-[#ef4444]"
                                        )}
                                    >
                                        {isPositive ? "+" : ""}{item.change.toFixed(2)}
                                    </span>
                                    <span
                                        className={cn(
                                            "w-10 text-right font-mono text-[9px]",
                                            isPositive ? "text-[#22c55e]" : "text-[#ef4444]"
                                        )}
                                    >
                                        {isPositive ? "+" : ""}{item.changePercent.toFixed(2)}%
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}

// Register the gadget
registerGadget({
    type: "watchlist",
    title: "Watchlist",
    defaultZone: "sidebar",
    defaultCollapsed: false,
    component: WatchlistGadget,
});

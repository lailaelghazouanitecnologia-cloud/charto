/**
 * Technicals Gadget
 * Displays technical analysis gauge (Strong Sell to Strong Buy).
 */

import { cn } from "../../lib/utils.ts";
import type { GadgetProps } from "../types.ts";
import { registerGadget } from "../GadgetManager.tsx";

type TechnicalRating = "strong-sell" | "sell" | "neutral" | "buy" | "strong-buy";

interface TechnicalsData {
    rating: TechnicalRating;
    score: number; // 0-100, 0 = strong sell, 100 = strong buy
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
    "sell": "#f97316",
    "neutral": "#888888",
    "buy": "#22c55e",
    "strong-buy": "#10b981",
};

export function TechnicalsGadget({ data }: GadgetProps) {
    const technicals = (data as TechnicalsData | undefined) ?? {
        rating: "strong-sell" as TechnicalRating,
        score: 15,
    };

    // Calculate needle angle (0 = strong sell = -90deg, 100 = strong buy = 90deg)
    const needleAngle = -90 + (technicals.score / 100) * 180;

    return (
        <div className="flex justify-center py-2">
            <div className="relative h-[75px] w-[140px]">
                {/* Gauge SVG */}
                <svg viewBox="0 0 200 100" className="h-[70px] w-[140px]">
                    {/* Background arc */}
                    <path
                        d="M10,90 A80,80 0 0,1 190,90"
                        fill="none"
                        stroke="#1a1a1a"
                        strokeWidth="10"
                        strokeLinecap="round"
                    />
                    {/* Sell zone */}
                    <path
                        d="M10,90 A80,80 0 0,1 50,25"
                        fill="none"
                        stroke="rgba(239,68,68,0.25)"
                        strokeWidth="10"
                        strokeLinecap="round"
                    />
                    {/* Buy zone */}
                    <path
                        d="M155,25 A80,80 0 0,1 190,90"
                        fill="none"
                        stroke="rgba(34,197,94,0.25)"
                        strokeWidth="10"
                        strokeLinecap="round"
                    />
                    {/* Needle */}
                    <g transform={`rotate(${needleAngle}, 100, 90)`}>
                        <line
                            x1="100"
                            y1="90"
                            x2="100"
                            y2="25"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </g>
                    {/* Center dot */}
                    <circle cx="100" cy="90" r="5" fill="#111" stroke="white" strokeWidth="2" />
                </svg>

                {/* Labels */}
                <div className="absolute inset-x-0 bottom-0 flex justify-between px-1 text-[6px] uppercase text-[#444]">
                    <span className="text-left leading-tight">STRONG<br/>SELL</span>
                    <span className="text-right leading-tight">STRONG<br/>BUY</span>
                </div>
                <div className="absolute left-1/2 top-1 -translate-x-1/2 text-[6px] uppercase text-[#444]">
                    NEUTRAL
                </div>

                {/* Result badge */}
                <div
                    className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded px-2 py-0.5 text-[8px] font-bold text-white"
                    style={{ background: RATING_COLORS[technicals.rating] }}
                >
                    {RATING_LABELS[technicals.rating]}
                </div>
            </div>
        </div>
    );
}

// Register the gadget (no background)
registerGadget({
    type: "technicals",
    title: "Technicals",
    defaultZone: "sidebar",
    defaultCollapsed: false,
    component: TechnicalsGadget,
    noBackground: true,
});

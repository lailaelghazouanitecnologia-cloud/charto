/**
 * Performance Gadget
 * Displays performance metrics across different time periods.
 */

import { cn } from "../../lib/utils.ts";
import type { GadgetProps } from "../types.ts";
import { registerGadget } from "../GadgetManager.tsx";

interface PerformanceData {
    periods: Array<{ label: string; value: number }>;
}

export function PerformanceGadget({ data }: GadgetProps) {
    const performance = (data as PerformanceData | undefined)?.periods ?? [
        { label: "1W", value: -5.25 },
        { label: "1M", value: -7.15 },
        { label: "3M", value: -8.40 },
        { label: "6M", value: -5.14 },
        { label: "YTD", value: -8.58 },
        { label: "1Y", value: 3.89 },
    ];

    return (
        <div className="grid grid-cols-3 gap-1">
            {performance.map(({ label, value }) => {
                const isPositive = value >= 0;
                return (
                    <div
                        key={label}
                        className={cn(
                            "rounded-md px-2 py-1.5 text-center",
                            isPositive ? "bg-[#22c55e]/10" : "bg-[#ef4444]/10"
                        )}
                    >
                        <div
                            className={cn(
                                "text-[10px] font-bold tabular-nums",
                                isPositive ? "text-[#22c55e]" : "text-[#ef4444]"
                            )}
                        >
                            {isPositive ? "+" : ""}{value.toFixed(2)}%
                        </div>
                        <div className="text-[7px] uppercase text-[#444]">{label}</div>
                    </div>
                );
            })}
        </div>
    );
}

// Register the gadget
registerGadget({
    type: "performance",
    title: "Performance",
    defaultZone: "sidebar",
    defaultCollapsed: false,
    component: PerformanceGadget,
});

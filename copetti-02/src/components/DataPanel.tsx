import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover.tsx";
import type { Candle } from "../core/types.ts";
import type { ReactNode } from "react";

interface DataPanelProps {
    candle: Candle | null;
    trigger: ReactNode;
}

export function DataPanel({ candle, trigger }: DataPanelProps) {
    if (candle === null) return <>{trigger}</>;

    const change = candle.close - candle.open;
    const changePercent = ((change / candle.open) * 100).toFixed(2);
    const isUp = change >= 0;

    return (
        <Popover>
            <PopoverTrigger asChild>{trigger}</PopoverTrigger>
            <PopoverContent side="right" className="w-48">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Open</span>
                        <span className="font-mono">{candle.open.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">High</span>
                        <span className="font-mono">{candle.high.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Low</span>
                        <span className="font-mono">{candle.low.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Close</span>
                        <span className="font-mono">{candle.close.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                        <span className="text-muted-foreground">Change</span>
                        <span
                            className={`font-mono ${isUp ? "text-[--color-chart-up]" : "text-[--color-chart-down]"}`}
                        >
                            {isUp ? "+" : ""}
                            {change.toFixed(2)} ({changePercent}%)
                        </span>
                    </div>
                    {candle.volume !== undefined && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Volume</span>
                            <span className="font-mono">
                                {candle.volume.toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

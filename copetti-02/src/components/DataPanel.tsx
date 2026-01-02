import * as Popover from "@radix-ui/react-popover";
import type { Candle } from "../core/types.ts";

interface DataPanelProps {
    candle: Candle | null;
    trigger: React.ReactNode;
}

export function DataPanel({ candle, trigger }: DataPanelProps) {
    if (candle === null) return <>{trigger}</>;

    const change = candle.close - candle.open;
    const changePercent = ((change / candle.open) * 100).toFixed(2);
    const isUp = change >= 0;

    return (
        <Popover.Root>
            <Popover.Trigger asChild>{trigger}</Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    side="right"
                    sideOffset={8}
                    className="w-48 p-3 bg-[#1a1a24] border border-[#333] rounded-lg shadow-xl z-50"
                >
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-[#666]">Open</span>
                            <span className="text-white font-mono">
                                {candle.open.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#666]">High</span>
                            <span className="text-white font-mono">
                                {candle.high.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#666]">Low</span>
                            <span className="text-white font-mono">
                                {candle.low.toFixed(2)}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#666]">Close</span>
                            <span className="text-white font-mono">
                                {candle.close.toFixed(2)}
                            </span>
                        </div>
                        <div className="border-t border-[#333] pt-2 flex justify-between">
                            <span className="text-[#666]">Change</span>
                            <span
                                className={`font-mono ${isUp ? "text-[#26a69a]" : "text-[#ef5350]"}`}
                            >
                                {isUp ? "+" : ""}
                                {change.toFixed(2)} ({changePercent}%)
                            </span>
                        </div>
                        {candle.volume !== undefined && (
                            <div className="flex justify-between">
                                <span className="text-[#666]">Volume</span>
                                <span className="text-white font-mono">
                                    {candle.volume.toLocaleString()}
                                </span>
                            </div>
                        )}
                    </div>
                    <Popover.Arrow className="fill-[#333]" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}

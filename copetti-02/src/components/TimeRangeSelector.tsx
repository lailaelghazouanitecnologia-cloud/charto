import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group.tsx";
import { cn } from "../lib/utils.ts";

/** Time range option. */
export interface TimeRange {
    label: string;
    value: string;
    candleCount: number;
    interval: "1m" | "5m" | "15m" | "1h" | "4h" | "1d" | "1w";
}

/** Predefined time ranges. */
export const TIME_RANGES: TimeRange[] = [
    { label: "1H", value: "1h", candleCount: 60, interval: "1m" },
    { label: "4H", value: "4h", candleCount: 48, interval: "5m" },
    { label: "1D", value: "1d", candleCount: 96, interval: "15m" },
    { label: "1W", value: "1w", candleCount: 168, interval: "1h" },
    { label: "1M", value: "1m", candleCount: 180, interval: "4h" },
    { label: "3M", value: "3m", candleCount: 90, interval: "1d" },
    { label: "1Y", value: "1y", candleCount: 365, interval: "1d" },
    { label: "ALL", value: "all", candleCount: -1, interval: "1w" },
];

interface TimeRangeSelectorProps {
    value: string;
    onChange: (range: TimeRange) => void;
    className?: string;
}

export function TimeRangeSelector({
    value,
    onChange,
    className,
}: TimeRangeSelectorProps) {
    const handleValueChange = (newValue: string) => {
        if (newValue) {
            const range = TIME_RANGES.find((r) => r.value === newValue);
            if (range) {
                onChange(range);
            }
        }
    };

    return (
        <ToggleGroup
            type="single"
            value={value}
            onValueChange={handleValueChange}
            className={cn("gap-1", className)}
        >
            {TIME_RANGES.map((range) => (
                <ToggleGroupItem
                    key={range.value}
                    value={range.value}
                    size="sm"
                    className="px-2 text-xs font-medium"
                >
                    {range.label}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}

/** Get candle count for a time range. */
export function getCandleCount(range: TimeRange, totalCandles: number): number {
    if (range.candleCount === -1) {
        return totalCandles;
    }
    return Math.min(range.candleCount, totalCandles);
}

/** Calculate visible range based on time range selection. */
export function calculateVisibleRange(
    range: TimeRange,
    totalCandles: number,
): { start: number; end: number } {
    const count = getCandleCount(range, totalCandles);
    return {
        start: Math.max(0, totalCandles - count),
        end: totalCandles - 1,
    };
}

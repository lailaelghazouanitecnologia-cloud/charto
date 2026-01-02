import { useState } from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
    Button,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "./ui/index.ts";
import { cn } from "../lib/utils.ts";
import type { IndicatorConfig } from "../core/chart.ts";
import { INDICATOR_COLORS } from "../core/indicators.ts";

interface IndicatorControlsProps {
    indicators: IndicatorConfig[];
    onIndicatorsChange: (indicators: IndicatorConfig[]) => void;
}

const PRESET_INDICATORS: IndicatorConfig[] = [
    { type: "sma", period: 20, color: INDICATOR_COLORS.sma, enabled: false },
    { type: "sma", period: 50, color: "#f97316", enabled: false },
    { type: "ema", period: 12, color: INDICATOR_COLORS.ema, enabled: false },
    { type: "ema", period: 26, color: "#ec4899", enabled: false },
    { type: "bollinger", period: 20, color: INDICATOR_COLORS.bollingerMiddle, enabled: false },
];

export function IndicatorControls({
    indicators,
    onIndicatorsChange,
}: IndicatorControlsProps) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleIndicator = (index: number) => {
        const newIndicators = [...indicators];
        const indicator = newIndicators[index];
        if (indicator !== undefined) {
            newIndicators[index] = { ...indicator, enabled: !indicator.enabled };
            onIndicatorsChange(newIndicators);
        }
    };

    const enabledCount = indicators.filter((i) => i.enabled).length;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "gap-2",
                                enabledCount > 0 && "border-primary",
                            )}
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M3 3v18h18" />
                                <path d="m19 9-5 5-4-4-3 3" />
                            </svg>
                            Indicators
                            {enabledCount > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                                    {enabledCount}
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Technical indicators</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-64" align="start">
                <div className="space-y-3">
                    <h4 className="font-medium text-sm">Technical Indicators</h4>
                    <div className="space-y-2">
                        {indicators.map((indicator, index) => (
                            <button
                                key={`${indicator.type}-${indicator.period}`}
                                onClick={() => toggleIndicator(index)}
                                className={cn(
                                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                                    indicator.enabled
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-muted",
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className="h-3 w-3 rounded-full"
                                        style={{ backgroundColor: indicator.color }}
                                    />
                                    <span className="font-medium">
                                        {indicator.type.toUpperCase()}
                                    </span>
                                    <span className="text-muted-foreground">
                                        ({indicator.period})
                                    </span>
                                </div>
                                <div
                                    className={cn(
                                        "h-4 w-4 rounded-sm border",
                                        indicator.enabled
                                            ? "border-primary bg-primary"
                                            : "border-muted-foreground",
                                    )}
                                >
                                    {indicator.enabled && (
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="white"
                                            strokeWidth="3"
                                            className="h-4 w-4"
                                        >
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                    <div className="border-t pt-2">
                        <p className="text-xs text-muted-foreground">
                            SMA = Simple Moving Average
                            <br />
                            EMA = Exponential Moving Average
                            <br />
                            BB = Bollinger Bands
                        </p>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export { PRESET_INDICATORS };

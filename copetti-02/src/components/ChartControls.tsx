import {
    ToggleGroup,
    ToggleGroupItem,
    Slider,
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "./ui/index.ts";

export type ChartType = "candlestick" | "line" | "area";

interface ChartControlsProps {
    chartType: ChartType;
    onChartTypeChange: (type: ChartType) => void;
    zoom: number;
    onZoomChange: (zoom: number) => void;
}

export function ChartControls({
    chartType,
    onChartTypeChange,
    zoom,
    onZoomChange,
}: ChartControlsProps) {
    return (
        <TooltipProvider>
            <div className="flex items-center gap-4 rounded-lg border bg-card p-2">
                {/* Chart type toggle */}
                <ToggleGroup
                    type="single"
                    value={chartType}
                    onValueChange={(value) => {
                        if (value) onChartTypeChange(value as ChartType);
                    }}
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <ToggleGroupItem value="candlestick" size="sm">
                                Candle
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent>Candlestick chart</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <ToggleGroupItem value="line" size="sm">
                                Line
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent>Line chart</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <ToggleGroupItem value="area" size="sm">
                                Area
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent>Area chart</TooltipContent>
                    </Tooltip>
                </ToggleGroup>

                {/* Zoom slider */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Zoom</span>
                    <Slider
                        value={[zoom]}
                        onValueChange={([value]) => {
                            if (value !== undefined) onZoomChange(value);
                        }}
                        min={0.5}
                        max={3}
                        step={0.1}
                        className="w-24"
                    />
                    <span className="w-8 text-xs text-muted-foreground">
                        {zoom.toFixed(1)}x
                    </span>
                </div>
            </div>
        </TooltipProvider>
    );
}

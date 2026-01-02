import * as ToggleGroup from "@radix-ui/react-toggle-group";
import * as Slider from "@radix-ui/react-slider";
import { Tooltip } from "./Tooltip.tsx";

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
        <div className="flex items-center gap-4 p-2 bg-[#1a1a24] rounded-lg">
            {/* Chart type toggle */}
            <ToggleGroup.Root
                type="single"
                value={chartType}
                onValueChange={(value) => {
                    if (value) onChartTypeChange(value as ChartType);
                }}
                className="flex gap-1"
            >
                <Tooltip content="Candlestick">
                    <ToggleGroup.Item
                        value="candlestick"
                        className="px-3 py-1.5 rounded text-sm text-[#888] data-[state=on]:bg-[#333] data-[state=on]:text-white hover:text-white transition-colors"
                    >
                        Candle
                    </ToggleGroup.Item>
                </Tooltip>
                <Tooltip content="Line chart">
                    <ToggleGroup.Item
                        value="line"
                        className="px-3 py-1.5 rounded text-sm text-[#888] data-[state=on]:bg-[#333] data-[state=on]:text-white hover:text-white transition-colors"
                    >
                        Line
                    </ToggleGroup.Item>
                </Tooltip>
                <Tooltip content="Area chart">
                    <ToggleGroup.Item
                        value="area"
                        className="px-3 py-1.5 rounded text-sm text-[#888] data-[state=on]:bg-[#333] data-[state=on]:text-white hover:text-white transition-colors"
                    >
                        Area
                    </ToggleGroup.Item>
                </Tooltip>
            </ToggleGroup.Root>

            {/* Zoom slider */}
            <div className="flex items-center gap-2">
                <span className="text-xs text-[#666]">Zoom</span>
                <Slider.Root
                    value={[zoom]}
                    onValueChange={([value]) => {
                        if (value !== undefined) onZoomChange(value);
                    }}
                    min={0.5}
                    max={3}
                    step={0.1}
                    className="relative flex items-center w-24 h-5 select-none touch-none"
                >
                    <Slider.Track className="relative grow h-1 bg-[#333] rounded-full">
                        <Slider.Range className="absolute h-full bg-[#26a69a] rounded-full" />
                    </Slider.Track>
                    <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#26a69a]" />
                </Slider.Root>
                <span className="text-xs text-[#666] w-8">{zoom.toFixed(1)}x</span>
            </div>
        </div>
    );
}

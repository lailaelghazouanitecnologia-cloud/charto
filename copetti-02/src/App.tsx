import { useState } from "react";
import { Chart } from "./components/Chart.tsx";
import { ChartControls, type ChartType } from "./components/ChartControls.tsx";
import { Button } from "./components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card.tsx";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "./components/ui/tooltip.tsx";
import type { Candle } from "./core/types.ts";

function generateCandles(count: number, startPrice: number): Candle[] {
    const candles: Candle[] = [];
    let price = startPrice;
    const now = Date.now();

    for (let i = 0; i < count; i++) {
        const change = (Math.random() - 0.5) * 10;
        const open = price;
        const close = price + change;
        const high = Math.max(open, close) + Math.random() * 5;
        const low = Math.min(open, close) - Math.random() * 5;

        candles.push({
            timestamp: now + i * 60000,
            open,
            high,
            low,
            close,
            volume: Math.floor(Math.random() * 10000),
        });

        price = close;
    }

    return candles;
}

export default function App() {
    const [candles, setCandles] = useState(() => generateCandles(50, 100));
    const [chartType, setChartType] = useState<ChartType>("candlestick");
    const [zoom, setZoom] = useState(1);

    const handleRandomize = () => {
        setCandles(generateCandles(50, 80 + Math.random() * 40));
    };

    const lastCandle = candles[candles.length - 1];
    const firstCandle = candles[0];
    const priceChange =
        lastCandle && firstCandle ? lastCandle.close - firstCandle.open : 0;
    const priceChangePercent =
        firstCandle && priceChange
            ? ((priceChange / firstCandle.open) * 100).toFixed(2)
            : "0.00";
    const isPositive = priceChange >= 0;

    return (
        <TooltipProvider>
            <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
                <h1 className="text-2xl font-semibold text-muted-foreground">
                    Copetti Charts
                </h1>

                <Card className="w-auto">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">BTC/USD</CardTitle>
                            <span
                                className={`text-sm font-mono ${isPositive ? "text-[--color-chart-up]" : "text-[--color-chart-down]"}`}
                            >
                                {isPositive ? "+" : ""}
                                {priceChangePercent}%
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ChartControls
                            chartType={chartType}
                            onChartTypeChange={setChartType}
                            zoom={zoom}
                            onZoomChange={setZoom}
                        />

                        <div className="rounded-lg bg-[--color-chart-bg] p-2">
                            <Chart data={candles} width={800} height={400} />
                        </div>

                        <div className="flex justify-center gap-3">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={handleRandomize}>
                                        Randomize Data
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Generate new random chart data
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="outline">Export</Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    Export chart as image
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}

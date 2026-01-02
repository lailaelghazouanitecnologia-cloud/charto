import { useState } from "react";
import { Chart, type ChartType } from "./components/Chart.tsx";
import { ChartControls } from "./components/ChartControls.tsx";
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

    // Add some trend and volatility.
    let trend = Math.random() > 0.5 ? 1 : -1;
    let volatility = 2 + Math.random() * 3;

    for (let i = 0; i < count; i++) {
        // Occasionally change trend.
        if (Math.random() < 0.1) {
            trend *= -1;
        }

        // Random walk with trend.
        const change = (Math.random() - 0.45) * volatility + trend * 0.3;
        const open = price;
        const close = price + change;

        // High/low with wicks.
        const wickUp = Math.random() * volatility * 0.5;
        const wickDown = Math.random() * volatility * 0.5;
        const high = Math.max(open, close) + wickUp;
        const low = Math.min(open, close) - wickDown;

        // Volume correlates with price movement.
        const volumeBase = 5000 + Math.random() * 10000;
        const volumeSpike = Math.abs(change) > volatility ? 2 : 1;

        candles.push({
            timestamp: now + i * 60000,
            open,
            high,
            low,
            close,
            volume: Math.floor(volumeBase * volumeSpike),
        });

        price = close;

        // Adjust volatility occasionally.
        if (Math.random() < 0.05) {
            volatility = 2 + Math.random() * 4;
        }
    }

    return candles;
}

export default function App() {
    const [candles, setCandles] = useState(() => generateCandles(150, 100));
    const [chartType, setChartType] = useState<ChartType>("candlestick");
    const [zoom, setZoom] = useState(1);

    const handleRandomize = () => {
        setCandles(generateCandles(150, 80 + Math.random() * 40));
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
    const currentPrice = lastCandle?.close ?? 0;

    return (
        <TooltipProvider>
            <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
                <h1 className="text-2xl font-semibold text-muted-foreground">
                    Copetti Charts
                </h1>

                <Card className="w-auto">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-8">
                            <div className="flex items-center gap-3">
                                <CardTitle className="text-lg">BTC/USD</CardTitle>
                                <span className="text-2xl font-mono font-semibold">
                                    ${currentPrice.toFixed(2)}
                                </span>
                            </div>
                            <span
                                className={`text-sm font-mono ${isPositive ? "text-[#22c55e]" : "text-[#ef4444]"}`}
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

                        <Chart
                            data={candles}
                            chartType={chartType}
                            zoom={zoom}
                            width={850}
                            height={450}
                        />

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

import { useState } from "react";
import { Chart } from "./components/Chart.tsx";
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

    const handleRandomize = () => {
        setCandles(generateCandles(50, 80 + Math.random() * 40));
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8">
            <h1 className="text-2xl font-semibold text-[--color-text-muted]">
                Copetti Charts
            </h1>

            <Chart data={candles} width={800} height={400} />

            <button
                onClick={handleRandomize}
                className="px-4 py-2 bg-[--color-chart-up] text-white rounded-md hover:opacity-90 transition-opacity"
            >
                Randomize Data
            </button>
        </div>
    );
}

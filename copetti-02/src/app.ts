/**
 * Client-side chart demo application.
 */

import { createChart, type Candle } from "./index.ts";

/** Generates random candle data. */
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

/** Initializes the chart. */
function init(): void {
    const canvas = document.getElementById("chart") as HTMLCanvasElement;
    if (canvas === null) {
        console.error("Canvas not found");
        return;
    }

    const chart = createChart(canvas, {
        width: 800,
        height: 400,
        backgroundColor: "#0f0f14",
        gridColor: "#1a1a24",
        upColor: "#26a69a",
        downColor: "#ef5350",
    });

    // Initial data.
    const candles = generateCandles(50, 100);
    chart.setData(candles);

    // Randomize button.
    const btn = document.getElementById("randomize");
    if (btn !== null) {
        btn.addEventListener("click", () => {
            const newCandles = generateCandles(50, 80 + Math.random() * 40);
            chart.setData(newCandles);
        });
    }
}

// Start app.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}

/**
 * Development entry point.
 */

import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "./styles/globals.css";
import { Chart, type ChartAPI, type Candle } from "./index.ts";

/**
 * Generates sample candle data for testing.
 */
function generateSampleData(count: number): Candle[] {
    const candles: Candle[] = [];
    const baseTimestamp = Date.now();
    const interval = 60000; // 1 minute

    let previousClose = 100;

    for (let i = 0; i < count; i++) {
        const change = (Math.random() - 0.5) * 4;
        const open = previousClose;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * 2;
        const low = Math.min(open, close) - Math.random() * 2;
        const volume = Math.floor(Math.random() * 10000) + 1000;

        candles.push({
            id: `candle-${i}`,
            timestamp: baseTimestamp + i * interval,
            open,
            high,
            low,
            close,
            volume,
            index: i,
        });

        previousClose = close;
    }

    return candles;
}

/**
 * Demo application component.
 */
function App(): React.ReactElement {
    const sampleData = generateSampleData(100);

    const handleChartReady = (api: ChartAPI): void => {
        console.log("Chart ready:", api);
    };

    return (
        <Theme appearance="dark" accentColor="blue" radius="medium">
            <div className="min-h-screen p-8">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        Copetti Charts
                    </h1>
                    <p className="text-gray-400">
                        Modern TypeScript charting library
                    </p>
                </header>

                <main className="space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-4">
                            Candlestick Chart
                        </h2>
                        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                            <Chart
                                data={sampleData}
                                width={800}
                                height={400}
                                config={{
                                    autoScale: true,
                                    showGrid: true,
                                    showCrosshair: true,
                                    theme: "dark",
                                }}
                                onReady={handleChartReady}
                            />
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-4">
                            Controls
                        </h2>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                            >
                                Zoom In
                            </button>
                            <button
                                type="button"
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                            >
                                Zoom Out
                            </button>
                            <button
                                type="button"
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                            >
                                Reset View
                            </button>
                        </div>
                    </section>
                </main>

                <footer className="mt-16 text-gray-500 text-sm">
                    <p>Built with React, TypeScript, Tailwind CSS 4, and Radix UI</p>
                </footer>
            </div>
        </Theme>
    );
}

// Mount application.
const rootElement = document.getElementById("root");

if (rootElement !== null) {
    const root = createRoot(rootElement);
    root.render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
}

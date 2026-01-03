/**
 * Real-time data streaming module.
 * Provides utilities for live candle updates and WebSocket integration.
 */

import type { Candle } from "./types.ts";

/** Streaming state. */
export type StreamingState = "disconnected" | "connecting" | "connected" | "error";

/** Streaming event types. */
export type StreamingEvent =
    | { type: "candle"; candle: Candle }
    | { type: "tick"; price: number; timestamp: number; volume?: number }
    | { type: "state"; state: StreamingState }
    | { type: "error"; error: Error };

/** Streaming event callback. */
export type StreamingCallback = (event: StreamingEvent) => void;

/** Candle aggregator configuration. */
export interface AggregatorConfig {
    interval: "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
    onCandle: (candle: Candle) => void;
    onUpdate: (candle: Candle) => void;
}

/** Interval durations in milliseconds. */
const INTERVAL_MS: Record<string, number> = {
    "1m": 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
    "1d": 24 * 60 * 60 * 1000,
};

/**
 * Candle aggregator - converts ticks to OHLCV candles.
 */
export class CandleAggregator {
    private config: AggregatorConfig;
    private currentCandle: Candle | null = null;
    private intervalMs: number;

    constructor(config: AggregatorConfig) {
        this.config = config;
        this.intervalMs = INTERVAL_MS[config.interval] ?? 60000;
    }

    /** Get the candle start timestamp for a given time. */
    private getCandleStart(timestamp: number): number {
        return Math.floor(timestamp / this.intervalMs) * this.intervalMs;
    }

    /** Process a new tick. */
    processTick(price: number, timestamp: number, volume: number = 0): void {
        const candleStart = this.getCandleStart(timestamp);

        if (this.currentCandle === null) {
            // Create first candle.
            this.currentCandle = {
                timestamp: candleStart,
                open: price,
                high: price,
                low: price,
                close: price,
                volume,
            };
            this.config.onUpdate(this.currentCandle);
            return;
        }

        if (candleStart > this.currentCandle.timestamp) {
            // New candle period - emit completed candle.
            this.config.onCandle(this.currentCandle);

            // Start new candle.
            this.currentCandle = {
                timestamp: candleStart,
                open: price,
                high: price,
                low: price,
                close: price,
                volume,
            };
            this.config.onUpdate(this.currentCandle);
            return;
        }

        // Update current candle.
        this.currentCandle = {
            ...this.currentCandle,
            high: Math.max(this.currentCandle.high, price),
            low: Math.min(this.currentCandle.low, price),
            close: price,
            volume: (this.currentCandle.volume ?? 0) + volume,
        };
        this.config.onUpdate(this.currentCandle);
    }

    /** Get the current incomplete candle. */
    getCurrentCandle(): Candle | null {
        return this.currentCandle;
    }

    /** Reset the aggregator. */
    reset(): void {
        this.currentCandle = null;
    }
}

/**
 * Data stream manager for WebSocket connections.
 */
export class DataStreamManager {
    private ws: WebSocket | null = null;
    private state: StreamingState = "disconnected";
    private callbacks: Set<StreamingCallback> = new Set();
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private url: string = "";

    /** Subscribe to streaming events. */
    subscribe(callback: StreamingCallback): () => void {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }

    /** Emit an event to all subscribers. */
    private emit(event: StreamingEvent): void {
        for (const callback of this.callbacks) {
            try {
                callback(event);
            } catch (err) {
                console.error("Streaming callback error:", err);
            }
        }
    }

    /** Update and emit state change. */
    private setState(state: StreamingState): void {
        this.state = state;
        this.emit({ type: "state", state });
    }

    /** Connect to a WebSocket URL. */
    connect(url: string): void {
        if (this.ws !== null) {
            this.disconnect();
        }

        this.url = url;
        this.setState("connecting");

        try {
            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
                this.setState("connected");
            };

            this.ws.onclose = () => {
                this.ws = null;
                this.setState("disconnected");
                this.attemptReconnect();
            };

            this.ws.onerror = (event) => {
                this.emit({ type: "error", error: new Error("WebSocket error") });
                this.setState("error");
            };

            this.ws.onmessage = (event) => {
                this.handleMessage(event.data);
            };
        } catch (err) {
            this.emit({ type: "error", error: err instanceof Error ? err : new Error(String(err)) });
            this.setState("error");
        }
    }

    /** Handle incoming WebSocket message. */
    private handleMessage(data: string): void {
        try {
            const parsed = JSON.parse(data);

            // Handle different message formats.
            if (parsed.type === "candle" && parsed.data) {
                const candle: Candle = {
                    timestamp: parsed.data.timestamp ?? parsed.data.t ?? Date.now(),
                    open: parsed.data.open ?? parsed.data.o,
                    high: parsed.data.high ?? parsed.data.h,
                    low: parsed.data.low ?? parsed.data.l,
                    close: parsed.data.close ?? parsed.data.c,
                    volume: parsed.data.volume ?? parsed.data.v,
                };
                this.emit({ type: "candle", candle });
            } else if (parsed.type === "tick" || parsed.price !== undefined) {
                this.emit({
                    type: "tick",
                    price: parsed.price ?? parsed.p,
                    timestamp: parsed.timestamp ?? parsed.t ?? Date.now(),
                    volume: parsed.volume ?? parsed.v,
                });
            }
        } catch (err) {
            // Not JSON or unknown format - ignore.
        }
    }

    /** Attempt to reconnect after disconnect. */
    private attemptReconnect(): void {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.emit({ type: "error", error: new Error("Max reconnection attempts reached") });
            return;
        }

        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
        }

        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;

        this.reconnectTimer = setTimeout(() => {
            if (this.url) {
                this.connect(this.url);
            }
        }, delay);
    }

    /** Send a message through the WebSocket. */
    send(message: string | object): boolean {
        if (this.ws === null || this.state !== "connected") {
            return false;
        }

        const data = typeof message === "string" ? message : JSON.stringify(message);
        this.ws.send(data);
        return true;
    }

    /** Disconnect from the WebSocket. */
    disconnect(): void {
        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws !== null) {
            this.ws.onclose = null; // Prevent reconnect attempt.
            this.ws.close();
            this.ws = null;
        }

        this.reconnectAttempts = 0;
        this.setState("disconnected");
    }

    /** Get current connection state. */
    getState(): StreamingState {
        return this.state;
    }
}

/**
 * Simulated data stream for testing and demos.
 */
export class SimulatedDataStream {
    private timer: ReturnType<typeof setInterval> | null = null;
    private callbacks: Set<StreamingCallback> = new Set();
    private lastPrice: number;
    private volatility: number;

    constructor(startPrice: number = 100, volatility: number = 0.002) {
        this.lastPrice = startPrice;
        this.volatility = volatility;
    }

    /** Subscribe to streaming events. */
    subscribe(callback: StreamingCallback): () => void {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }

    /** Emit an event to all subscribers. */
    private emit(event: StreamingEvent): void {
        for (const callback of this.callbacks) {
            callback(event);
        }
    }

    /** Start simulated streaming. */
    start(intervalMs: number = 100): void {
        if (this.timer !== null) return;

        this.emit({ type: "state", state: "connected" });

        this.timer = setInterval(() => {
            // Random walk price simulation.
            const change = (Math.random() - 0.5) * 2 * this.volatility * this.lastPrice;
            this.lastPrice = Math.max(0.01, this.lastPrice + change);

            this.emit({
                type: "tick",
                price: this.lastPrice,
                timestamp: Date.now(),
                volume: Math.random() * 1000,
            });
        }, intervalMs);
    }

    /** Stop simulated streaming. */
    stop(): void {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.emit({ type: "state", state: "disconnected" });
    }

    /** Check if streaming is active. */
    isActive(): boolean {
        return this.timer !== null;
    }

    /** Set last price (for syncing with historical data). */
    setLastPrice(price: number): void {
        this.lastPrice = price;
    }
}

/**
 * Hook-style manager for integrating streaming with chart.
 */
export function createChartDataManager(initialCandles: Candle[] = []) {
    let candles = [...initialCandles];
    let listeners: Array<(candles: Candle[]) => void> = [];

    const notify = () => {
        for (const listener of listeners) {
            listener([...candles]);
        }
    };

    return {
        /** Get current candles. */
        getCandles: () => [...candles],

        /** Set initial candles. */
        setCandles: (newCandles: Candle[]) => {
            candles = [...newCandles];
            notify();
        },

        /** Append a completed candle. */
        appendCandle: (candle: Candle) => {
            candles = [...candles, candle];
            notify();
        },

        /** Update the last candle (for live updates). */
        updateLastCandle: (candle: Candle) => {
            if (candles.length === 0) {
                candles = [candle];
            } else {
                const last = candles[candles.length - 1]!;
                if (last.timestamp === candle.timestamp) {
                    candles = [...candles.slice(0, -1), candle];
                } else {
                    candles = [...candles, candle];
                }
            }
            notify();
        },

        /** Subscribe to candle updates. */
        subscribe: (callback: (candles: Candle[]) => void) => {
            listeners.push(callback);
            return () => {
                listeners = listeners.filter((l) => l !== callback);
            };
        },

        /** Clear all candles. */
        clear: () => {
            candles = [];
            notify();
        },
    };
}

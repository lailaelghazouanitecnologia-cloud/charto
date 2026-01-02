/**
 * Candle data model.
 * Following Code Style Guide: Single responsibility, explicit types.
 *
 * @doc-tags model,candle
 */

import type { Index, Price, Timestamp, Volume } from "./primitives.ts";

/**
 * Represents a single candlestick data point.
 * All properties are readonly to ensure immutability.
 */
export interface Candle {
    readonly id: string;
    readonly timestamp: Timestamp;
    readonly open: Price;
    readonly high: Price;
    readonly low: Price;
    readonly close: Price;
    readonly volume: Volume;
    readonly index?: Index;
    readonly expansion?: boolean;
}

/**
 * Partial candle for updates - requires at minimum id, timestamp, and close.
 */
export interface PartialCandle {
    readonly id: string;
    readonly timestamp: Timestamp;
    readonly close: Price;
    readonly open?: Price;
    readonly high?: Price;
    readonly low?: Price;
    readonly volume?: Volume;
}

/**
 * Price movement direction.
 */
export type PriceMovement = "up" | "down" | "none";

/**
 * Determines the price movement direction.
 *
 * @param open - Opening price.
 * @param close - Closing price.
 * @returns The direction of price movement.
 */
export function determinePriceMovement(open: Price, close: Price): PriceMovement {
    if (close > open) {
        return "up";
    }
    if (close < open) {
        return "down";
    }
    return "none";
}

/**
 * Creates a complete candle from partial data.
 * Missing OHLC values default to close price.
 *
 * @param partial - Partial candle data.
 * @returns Complete candle with all fields populated.
 */
export function createCandleFromPartial(partial: PartialCandle): Candle {
    const { close } = partial;

    return {
        id: partial.id,
        timestamp: partial.timestamp,
        open: partial.open ?? close,
        high: partial.high ?? close,
        low: partial.low ?? close,
        close,
        volume: partial.volume ?? 0,
    };
}

/**
 * Validates that a candle has valid OHLC relationships.
 *
 * @param candle - Candle to validate.
 * @returns True if candle is valid.
 */
export function validateCandle(candle: Candle): boolean {
    // High must be >= all other prices.
    const isHighValid = candle.high >= candle.open && candle.high >= candle.close;

    // Low must be <= all other prices.
    const isLowValid = candle.low <= candle.open && candle.low <= candle.close;

    // High must be >= low.
    const isRangeValid = candle.high >= candle.low;

    // Volume must be non-negative.
    const isVolumeValid = candle.volume >= 0;

    return isHighValid && isLowValid && isRangeValid && isVolumeValid;
}

/**
 * Sorts candles by timestamp in ascending order.
 *
 * @param candles - Array of candles to sort.
 * @returns New sorted array.
 */
export function sortCandlesByTimestamp(candles: readonly Candle[]): Candle[] {
    return [...candles].sort((a, b) => a.timestamp - b.timestamp);
}

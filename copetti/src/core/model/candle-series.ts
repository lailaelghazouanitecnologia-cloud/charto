/**
 * Candle series model for managing collections of candles.
 * Following Code Style Guide: State machine pattern, bounded operations.
 *
 * @doc-tags core,model,candle-series
 */

import { Subject } from "rxjs";
import type { Candle, PriceMovement } from "../../types/candle.ts";
import { determinePriceMovement, sortCandlesByTimestamp } from "../../types/candle.ts";
import type { Index, Price, Unit } from "../../types/primitives.ts";
import type { VisualCandle } from "./visual-candle.ts";
import { createVisualCandle } from "./visual-candle.ts";
import { assert } from "../assert.ts";

/**
 * Maximum number of candles allowed in a series.
 * Following Code Style Guide: "Put a limit on everything."
 */
const MAX_CANDLES = 100_000;

/**
 * High-low data with index positions.
 */
export interface HighLow {
    readonly high: Price;
    readonly low: Price;
    readonly highIndex: Index;
    readonly lowIndex: Index;
}

/**
 * Default high-low (for empty series).
 */
export const DEFAULT_HIGH_LOW: HighLow = {
    high: Number.NEGATIVE_INFINITY,
    low: Number.POSITIVE_INFINITY,
    highIndex: 0,
    lowIndex: 0,
} as const;

/**
 * Viewport range for visible candles.
 */
export interface ViewportRange {
    readonly startIndex: Index;
    readonly endIndex: Index;
}

/**
 * Candle series configuration.
 */
export interface CandleSeriesConfig {
    readonly id: string;
    readonly name: string;
    readonly candleWidth: Unit;
    readonly candleSpacing: Unit;
}

/**
 * Default candle series configuration.
 */
export const DEFAULT_CANDLE_SERIES_CONFIG: CandleSeriesConfig = {
    id: "main",
    name: "Main Series",
    candleWidth: 0.8,
    candleSpacing: 0.2,
} as const;

/**
 * Candle series model.
 * Manages a collection of candles and their visual representations.
 */
export class CandleSeriesModel {
    private readonly config: CandleSeriesConfig;
    private candles: readonly Candle[] = [];
    private visualCandles: readonly VisualCandle[] = [];
    private highLow: HighLow = DEFAULT_HIGH_LOW;
    private viewportRange: ViewportRange = { startIndex: 0, endIndex: 0 };
    private lastPriceMovement: PriceMovement = "none";

    // Observables for state changes.
    public readonly candlesChanged$ = new Subject<readonly Candle[]>();
    public readonly visualCandlesChanged$ = new Subject<readonly VisualCandle[]>();
    public readonly highLowChanged$ = new Subject<HighLow>();
    public readonly lastCandleChanged$ = new Subject<Candle>();

    constructor(config: Partial<CandleSeriesConfig> = {}) {
        this.config = { ...DEFAULT_CANDLE_SERIES_CONFIG, ...config };
    }

    // ========================================================================
    // Getters
    // ========================================================================

    /**
     * Gets the series ID.
     */
    public getId(): string {
        return this.config.id;
    }

    /**
     * Gets the series name.
     */
    public getName(): string {
        return this.config.name;
    }

    /**
     * Gets all candles.
     */
    public getCandles(): readonly Candle[] {
        return this.candles;
    }

    /**
     * Gets all visual candles.
     */
    public getVisualCandles(): readonly VisualCandle[] {
        return this.visualCandles;
    }

    /**
     * Gets the candle count.
     */
    public getCandleCount(): number {
        return this.candles.length;
    }

    /**
     * Gets the high-low values.
     */
    public getHighLow(): HighLow {
        return this.highLow;
    }

    /**
     * Gets the current viewport range.
     */
    public getViewportRange(): ViewportRange {
        return this.viewportRange;
    }

    /**
     * Gets the visible candles within the viewport.
     */
    public getVisibleCandles(): readonly VisualCandle[] {
        const { startIndex, endIndex } = this.viewportRange;
        return this.visualCandles.slice(startIndex, endIndex + 1);
    }

    /**
     * Gets the last candle.
     */
    public getLastCandle(): Candle | null {
        const len = this.candles.length;
        if (len === 0) {
            return null;
        }
        return this.candles[len - 1] ?? null;
    }

    /**
     * Gets the last visual candle.
     */
    public getLastVisualCandle(): VisualCandle | null {
        const len = this.visualCandles.length;
        if (len === 0) {
            return null;
        }
        return this.visualCandles[len - 1] ?? null;
    }

    /**
     * Gets the last price movement direction.
     */
    public getLastPriceMovement(): PriceMovement {
        return this.lastPriceMovement;
    }

    /**
     * Checks if the series is empty.
     */
    public isEmpty(): boolean {
        return this.candles.length === 0;
    }

    // ========================================================================
    // Data manipulation
    // ========================================================================

    /**
     * Sets the candles, replacing existing data.
     *
     * @param candles - New candles to set.
     */
    public setCandles(candles: readonly Candle[]): void {
        assert(candles.length <= MAX_CANDLES, `Too many candles: ${candles.length}. Max: ${MAX_CANDLES}`);

        // Sort by timestamp.
        this.candles = sortCandlesByTimestamp([...candles]);

        // Recalculate derived data.
        this.recalculateVisualCandles();
        this.recalculateHighLow();
        this.updateLastPriceMovement();

        // Notify subscribers.
        this.candlesChanged$.next(this.candles);
        this.visualCandlesChanged$.next(this.visualCandles);
    }

    /**
     * Appends candles to the end of the series.
     *
     * @param candles - Candles to append.
     */
    public appendCandles(candles: readonly Candle[]): void {
        const newTotal = this.candles.length + candles.length;
        assert(newTotal <= MAX_CANDLES, `Too many candles: ${newTotal}. Max: ${MAX_CANDLES}`);

        this.candles = [...this.candles, ...candles];
        this.recalculateVisualCandles();
        this.recalculateHighLow();
        this.updateLastPriceMovement();

        this.candlesChanged$.next(this.candles);
        this.visualCandlesChanged$.next(this.visualCandles);
    }

    /**
     * Updates the last candle (for real-time updates).
     *
     * @param candle - Updated candle data.
     */
    public updateLastCandle(candle: Candle): void {
        if (this.candles.length === 0) {
            this.setCandles([candle]);
            return;
        }

        const lastIndex = this.candles.length - 1;
        const mutableCandles = [...this.candles];
        mutableCandles[lastIndex] = candle;
        this.candles = mutableCandles;

        // Update only the last visual candle.
        this.updateLastVisualCandle();
        this.recalculateHighLow();
        this.updateLastPriceMovement();

        this.lastCandleChanged$.next(candle);
    }

    /**
     * Clears all candles.
     */
    public clear(): void {
        this.candles = [];
        this.visualCandles = [];
        this.highLow = DEFAULT_HIGH_LOW;
        this.viewportRange = { startIndex: 0, endIndex: 0 };
        this.lastPriceMovement = "none";

        this.candlesChanged$.next(this.candles);
        this.visualCandlesChanged$.next(this.visualCandles);
    }

    // ========================================================================
    // Viewport management
    // ========================================================================

    /**
     * Sets the viewport range.
     *
     * @param startUnit - Start position in units.
     * @param endUnit - End position in units.
     */
    public setViewportRange(startUnit: Unit, endUnit: Unit): void {
        const startIndex = this.findCandleIndexAtUnit(startUnit);
        const endIndex = this.findCandleIndexAtUnit(endUnit);

        this.viewportRange = {
            startIndex: Math.max(0, startIndex),
            endIndex: Math.min(this.visualCandles.length - 1, endIndex),
        };
    }

    /**
     * Calculates high-low for the current viewport.
     */
    public getViewportHighLow(): HighLow {
        const visible = this.getVisibleCandles();
        return calculateHighLow(visible.map((vc) => vc.candle));
    }

    // ========================================================================
    // Private methods
    // ========================================================================

    /**
     * Recalculates all visual candles from source candles.
     */
    private recalculateVisualCandles(): void {
        const { candleWidth, candleSpacing } = this.config;
        const unitWidth = candleWidth + candleSpacing;

        this.visualCandles = this.candles.map((candle, index) => {
            const centerUnit = index * unitWidth + unitWidth / 2;
            const direction = determinePriceMovement(candle.open, candle.close);

            return createVisualCandle(candle, centerUnit, candleWidth, direction);
        });
    }

    /**
     * Updates only the last visual candle.
     */
    private updateLastVisualCandle(): void {
        if (this.visualCandles.length === 0 || this.candles.length === 0) {
            return;
        }

        const lastIndex = this.visualCandles.length - 1;
        const lastCandle = this.candles[lastIndex];

        if (lastCandle === undefined) {
            return;
        }

        const { candleWidth, candleSpacing } = this.config;
        const unitWidth = candleWidth + candleSpacing;
        const centerUnit = lastIndex * unitWidth + unitWidth / 2;
        const direction = determinePriceMovement(lastCandle.open, lastCandle.close);

        const mutableVisuals = [...this.visualCandles];
        mutableVisuals[lastIndex] = createVisualCandle(lastCandle, centerUnit, candleWidth, direction);
        this.visualCandles = mutableVisuals;
    }

    /**
     * Recalculates high-low from all candles.
     */
    private recalculateHighLow(): void {
        this.highLow = calculateHighLow(this.candles);
        this.highLowChanged$.next(this.highLow);
    }

    /**
     * Updates the last price movement.
     */
    private updateLastPriceMovement(): void {
        const lastCandle = this.getLastCandle();
        if (lastCandle !== null) {
            this.lastPriceMovement = determinePriceMovement(lastCandle.open, lastCandle.close);
        }
    }

    /**
     * Finds the candle index at a given unit position using binary search.
     */
    private findCandleIndexAtUnit(unit: Unit): Index {
        const { candleWidth, candleSpacing } = this.config;
        const unitWidth = candleWidth + candleSpacing;

        // Simple calculation based on uniform candle width.
        const index = Math.floor(unit / unitWidth);
        return Math.max(0, Math.min(index, this.visualCandles.length - 1));
    }

    /**
     * Cleans up subscriptions.
     */
    public dispose(): void {
        this.candlesChanged$.complete();
        this.visualCandlesChanged$.complete();
        this.highLowChanged$.complete();
        this.lastCandleChanged$.complete();
    }
}

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Calculates high-low from a collection of candles.
 *
 * @param candles - Candles to analyze.
 * @returns High-low data.
 */
export function calculateHighLow(candles: readonly Candle[]): HighLow {
    if (candles.length === 0) {
        return DEFAULT_HIGH_LOW;
    }

    let high = Number.NEGATIVE_INFINITY;
    let low = Number.POSITIVE_INFINITY;
    let highIndex = 0;
    let lowIndex = 0;

    for (let i = 0; i < candles.length; i++) {
        const candle = candles[i];
        if (candle === undefined) {
            continue;
        }

        if (candle.high > high) {
            high = candle.high;
            highIndex = i;
        }

        if (candle.low < low) {
            low = candle.low;
            lowIndex = i;
        }
    }

    return { high, low, highIndex, lowIndex };
}

/**
 * Creates a candle series model.
 */
export function createCandleSeriesModel(
    config?: Partial<CandleSeriesConfig>,
): CandleSeriesModel {
    return new CandleSeriesModel(config);
}

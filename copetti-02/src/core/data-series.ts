/**
 * Data Series - Generic time series data management
 * Provides efficient data storage, viewport-aware views, and change tracking
 */

import type { Candle, Pixel, Bounds } from "./types.ts";
import { EventBus, ChartEvents } from "./event-bus.ts";

// ============================================================================
// Types
// ============================================================================

export interface TimeSeriesPoint {
    timestamp: number;
    value: number;
}

export interface OHLCPoint {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface DataSeriesConfig {
    id: string;
    name: string;
    type: "line" | "candle" | "bar" | "area" | "scatter";
    color?: string;
    visible: boolean;
    yAxisId?: string;
}

export interface DataSeriesState {
    dataVersion: number;
    viewVersion: number;
    minValue: number;
    maxValue: number;
    minTimestamp: number;
    maxTimestamp: number;
    length: number;
}

export interface ViewportRange {
    startIndex: number;
    endIndex: number;
    startTimestamp: number;
    endTimestamp: number;
}

export interface DataSeriesView<T> {
    data: T[];
    startIndex: number;
    endIndex: number;
    minValue: number;
    maxValue: number;
}

// ============================================================================
// Base DataSeries Class
// ============================================================================

export class DataSeries<T extends { timestamp: number }> {
    protected config: DataSeriesConfig;
    protected data: T[] = [];
    protected state: DataSeriesState;
    protected eventBus?: EventBus<ChartEvents>;
    protected viewCache: Map<string, DataSeriesView<T>> = new Map();

    constructor(config: DataSeriesConfig) {
        this.config = config;
        this.state = {
            dataVersion: 0,
            viewVersion: 0,
            minValue: 0,
            maxValue: 0,
            minTimestamp: 0,
            maxTimestamp: 0,
            length: 0,
        };
    }

    /**
     * Set event bus
     */
    setEventBus(bus: EventBus<ChartEvents>): void {
        this.eventBus = bus;
    }

    /**
     * Get configuration
     */
    getConfig(): DataSeriesConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<DataSeriesConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get series ID
     */
    getId(): string {
        return this.config.id;
    }

    /**
     * Get series name
     */
    getName(): string {
        return this.config.name;
    }

    /**
     * Check if visible
     */
    isVisible(): boolean {
        return this.config.visible;
    }

    /**
     * Set visibility
     */
    setVisible(visible: boolean): void {
        this.config.visible = visible;
    }

    /**
     * Set data (replaces all data)
     */
    setData(data: T[]): void {
        this.data = [...data];
        this.state.dataVersion++;
        this.state.length = data.length;
        this.updateStats();
        this.invalidateViewCache();
        this.eventBus?.emit("data:set", { count: data.length });
    }

    /**
     * Append data point(s)
     */
    append(point: T | T[]): void {
        const points = Array.isArray(point) ? point : [point];
        this.data.push(...points);
        this.state.dataVersion++;
        this.state.length = this.data.length;
        this.updateStats();
        this.invalidateViewCache();
        this.eventBus?.emit("data:append", { candle: points[points.length - 1] });
    }

    /**
     * Update last data point
     */
    updateLast(point: T): void {
        if (this.data.length === 0) {
            this.append(point);
            return;
        }
        this.data[this.data.length - 1] = point;
        this.state.dataVersion++;
        this.updateStats();
        this.invalidateViewCache();
        this.eventBus?.emit("data:update", { count: 1 });
    }

    /**
     * Clear all data
     */
    clear(): void {
        this.data = [];
        this.state.dataVersion++;
        this.state.length = 0;
        this.state.minValue = 0;
        this.state.maxValue = 0;
        this.state.minTimestamp = 0;
        this.state.maxTimestamp = 0;
        this.invalidateViewCache();
        this.eventBus?.emit("data:clear");
    }

    /**
     * Get all data
     */
    getData(): T[] {
        return [...this.data];
    }

    /**
     * Get data point at index
     */
    getAt(index: number): T | undefined {
        return this.data[index];
    }

    /**
     * Get last data point
     */
    getLast(): T | undefined {
        return this.data[this.data.length - 1];
    }

    /**
     * Get data length
     */
    getLength(): number {
        return this.data.length;
    }

    /**
     * Get state
     */
    getState(): DataSeriesState {
        return { ...this.state };
    }

    /**
     * Get view for viewport (with caching)
     */
    getView(startIndex: number, endIndex: number): DataSeriesView<T> {
        const cacheKey = `${startIndex}-${endIndex}-${this.state.dataVersion}`;

        if (this.viewCache.has(cacheKey)) {
            return this.viewCache.get(cacheKey)!;
        }

        const start = Math.max(0, Math.floor(startIndex));
        const end = Math.min(this.data.length, Math.ceil(endIndex));

        const viewData = this.data.slice(start, end);
        const { min, max } = this.calculateValueRange(viewData);

        const view: DataSeriesView<T> = {
            data: viewData,
            startIndex: start,
            endIndex: end,
            minValue: min,
            maxValue: max,
        };

        this.viewCache.set(cacheKey, view);

        // Limit cache size
        if (this.viewCache.size > 10) {
            const firstKey = this.viewCache.keys().next().value;
            if (firstKey) this.viewCache.delete(firstKey);
        }

        return view;
    }

    /**
     * Find index by timestamp (binary search)
     */
    findIndexByTimestamp(timestamp: number): number {
        let low = 0;
        let high = this.data.length - 1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const midTimestamp = this.data[mid].timestamp;

            if (midTimestamp === timestamp) {
                return mid;
            } else if (midTimestamp < timestamp) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return low;
    }

    /**
     * Get index at or before timestamp
     */
    getIndexAtTimestamp(timestamp: number): number {
        const index = this.findIndexByTimestamp(timestamp);
        if (index > 0 && this.data[index]?.timestamp > timestamp) {
            return index - 1;
        }
        return Math.min(index, this.data.length - 1);
    }

    /**
     * Get timestamp range
     */
    getTimestampRange(): { min: number; max: number } {
        return {
            min: this.state.minTimestamp,
            max: this.state.maxTimestamp,
        };
    }

    /**
     * Get value range
     */
    getValueRange(): { min: number; max: number } {
        return {
            min: this.state.minValue,
            max: this.state.maxValue,
        };
    }

    // Protected methods

    protected updateStats(): void {
        if (this.data.length === 0) {
            this.state.minValue = 0;
            this.state.maxValue = 0;
            this.state.minTimestamp = 0;
            this.state.maxTimestamp = 0;
            return;
        }

        this.state.minTimestamp = this.data[0].timestamp;
        this.state.maxTimestamp = this.data[this.data.length - 1].timestamp;

        const { min, max } = this.calculateValueRange(this.data);
        this.state.minValue = min;
        this.state.maxValue = max;
    }

    protected calculateValueRange(data: T[]): { min: number; max: number } {
        // Override in subclasses
        return { min: 0, max: 0 };
    }

    protected invalidateViewCache(): void {
        this.viewCache.clear();
        this.state.viewVersion++;
    }
}

// ============================================================================
// CandleSeries - OHLCV data series
// ============================================================================

export class CandleSeries extends DataSeries<Candle> {
    constructor(id: string, name: string = id) {
        super({
            id,
            name,
            type: "candle",
            visible: true,
        });
    }

    /**
     * Calculate high/low for visible range
     */
    protected calculateValueRange(data: Candle[]): { min: number; max: number } {
        if (data.length === 0) {
            return { min: 0, max: 0 };
        }

        let min = Infinity;
        let max = -Infinity;

        for (const candle of data) {
            if (candle.low < min) min = candle.low;
            if (candle.high > max) max = candle.high;
        }

        return { min, max };
    }

    /**
     * Get OHLCV at index
     */
    getOHLCV(index: number): Candle | undefined {
        return this.getAt(index);
    }

    /**
     * Get volume range for visible data
     */
    getVolumeRange(startIndex: number, endIndex: number): { min: number; max: number } {
        const view = this.getView(startIndex, endIndex);
        if (view.data.length === 0) {
            return { min: 0, max: 0 };
        }

        let min = Infinity;
        let max = -Infinity;

        for (const candle of view.data) {
            if (candle.volume < min) min = candle.volume;
            if (candle.volume > max) max = candle.volume;
        }

        return { min, max };
    }
}

// ============================================================================
// LineSeries - Single value time series
// ============================================================================

export class LineSeries extends DataSeries<TimeSeriesPoint> {
    constructor(id: string, name: string = id, color?: string) {
        super({
            id,
            name,
            type: "line",
            color,
            visible: true,
        });
    }

    protected calculateValueRange(data: TimeSeriesPoint[]): { min: number; max: number } {
        if (data.length === 0) {
            return { min: 0, max: 0 };
        }

        let min = Infinity;
        let max = -Infinity;

        for (const point of data) {
            if (point.value < min) min = point.value;
            if (point.value > max) max = point.value;
        }

        return { min, max };
    }

    /**
     * Set values from candle close prices
     */
    setFromCandles(candles: Candle[]): void {
        const data: TimeSeriesPoint[] = candles.map(c => ({
            timestamp: c.timestamp,
            value: c.close,
        }));
        this.setData(data);
    }
}

// ============================================================================
// MultiSeries Manager - Manages multiple series
// ============================================================================

export interface MultiSeriesConfig {
    mainSeriesId?: string;
}

export class MultiSeriesManager {
    private series: Map<string, DataSeries<any>> = new Map();
    private mainSeriesId: string | null = null;
    private eventBus?: EventBus<ChartEvents>;

    constructor(config: MultiSeriesConfig = {}) {
        if (config.mainSeriesId) {
            this.mainSeriesId = config.mainSeriesId;
        }
    }

    /**
     * Set event bus
     */
    setEventBus(bus: EventBus<ChartEvents>): void {
        this.eventBus = bus;
        for (const s of this.series.values()) {
            s.setEventBus(bus);
        }
    }

    /**
     * Add a series
     */
    addSeries<T extends { timestamp: number }>(series: DataSeries<T>): void {
        this.series.set(series.getId(), series);
        if (this.eventBus) {
            series.setEventBus(this.eventBus);
        }
        if (!this.mainSeriesId) {
            this.mainSeriesId = series.getId();
        }
    }

    /**
     * Remove a series
     */
    removeSeries(id: string): void {
        this.series.delete(id);
        if (this.mainSeriesId === id) {
            this.mainSeriesId = this.series.keys().next().value ?? null;
        }
    }

    /**
     * Get a series by ID
     */
    getSeries<T extends { timestamp: number }>(id: string): DataSeries<T> | undefined {
        return this.series.get(id);
    }

    /**
     * Get all series
     */
    getAllSeries(): DataSeries<any>[] {
        return Array.from(this.series.values());
    }

    /**
     * Get visible series
     */
    getVisibleSeries(): DataSeries<any>[] {
        return Array.from(this.series.values()).filter(s => s.isVisible());
    }

    /**
     * Get main series
     */
    getMainSeries<T extends { timestamp: number }>(): DataSeries<T> | undefined {
        if (!this.mainSeriesId) return undefined;
        return this.series.get(this.mainSeriesId);
    }

    /**
     * Set main series
     */
    setMainSeries(id: string): void {
        if (this.series.has(id)) {
            this.mainSeriesId = id;
        }
    }

    /**
     * Get combined value range for visible series
     */
    getCombinedValueRange(startIndex: number, endIndex: number): { min: number; max: number } {
        let min = Infinity;
        let max = -Infinity;

        for (const series of this.getVisibleSeries()) {
            const view = series.getView(startIndex, endIndex);
            if (view.minValue < min) min = view.minValue;
            if (view.maxValue > max) max = view.maxValue;
        }

        if (min === Infinity || max === -Infinity) {
            return { min: 0, max: 100 };
        }

        return { min, max };
    }

    /**
     * Get combined timestamp range
     */
    getCombinedTimestampRange(): { min: number; max: number } {
        let min = Infinity;
        let max = -Infinity;

        for (const series of this.series.values()) {
            const range = series.getTimestampRange();
            if (range.min < min) min = range.min;
            if (range.max > max) max = range.max;
        }

        if (min === Infinity || max === -Infinity) {
            return { min: 0, max: Date.now() };
        }

        return { min, max };
    }

    /**
     * Clear all series data
     */
    clearAll(): void {
        for (const series of this.series.values()) {
            series.clear();
        }
    }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createCandleSeries(id: string, name?: string): CandleSeries {
    return new CandleSeries(id, name);
}

export function createLineSeries(id: string, name?: string, color?: string): LineSeries {
    return new LineSeries(id, name, color);
}

export function createMultiSeriesManager(config?: MultiSeriesConfig): MultiSeriesManager {
    return new MultiSeriesManager(config);
}

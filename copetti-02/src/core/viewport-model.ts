/**
 * ViewportModel - Advanced viewport and scale management
 * Handles complex viewport manipulation, auto-scaling, and constraints
 */

import type { Candle, Bounds, Pixel } from "./types.ts";
import { EventBus, ChartEvents } from "./event-bus.ts";

// ============================================================================
// Types
// ============================================================================

export interface ViewportState {
    // Horizontal (index/time)
    startIndex: number;
    endIndex: number;

    // Vertical (price)
    priceMin: number;
    priceMax: number;

    // Computed
    visibleCount: number;
    candleWidth: number;
    priceRange: number;
}

export interface ViewportConstraints {
    minVisibleCandles: number;
    maxVisibleCandles: number;
    minCandleWidth: Pixel;
    maxCandleWidth: Pixel;
    minPriceRange: number;
    maxZoomFactor: number;
    rightMarginCandles: number;
    leftMarginCandles: number;
    priceMarginPercent: number;
}

export interface ViewportConfig {
    autoScale: boolean;
    lockPriceToData: boolean;
    lockRatio: boolean;
    magnetToCandle: boolean;
    invertYAxis: boolean;
    constraints: ViewportConstraints;
}

export interface ZoomOptions {
    center?: { x: Pixel; y: Pixel };
    factor?: number;
    animate?: boolean;
}

export interface PanOptions {
    animate?: boolean;
    clamp?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_VIEWPORT_CONSTRAINTS: ViewportConstraints = {
    minVisibleCandles: 5,
    maxVisibleCandles: 10000,
    minCandleWidth: 1,
    maxCandleWidth: 50,
    minPriceRange: 0.0001,
    maxZoomFactor: 100,
    rightMarginCandles: 10,
    leftMarginCandles: 0,
    priceMarginPercent: 0.05,
};

export const DEFAULT_VIEWPORT_CONFIG: ViewportConfig = {
    autoScale: true,
    lockPriceToData: true,
    lockRatio: false,
    magnetToCandle: false,
    invertYAxis: false,
    constraints: DEFAULT_VIEWPORT_CONSTRAINTS,
};

// ============================================================================
// ViewportModel Class
// ============================================================================

export class ViewportModel {
    private state: ViewportState;
    private config: ViewportConfig;
    private bounds: Bounds;
    private data: Candle[] = [];
    private eventBus?: EventBus<ChartEvents>;
    private history: ViewportState[] = [];
    private historyIndex: number = -1;
    private maxHistory: number = 50;

    constructor(config: Partial<ViewportConfig> = {}) {
        this.config = {
            ...DEFAULT_VIEWPORT_CONFIG,
            ...config,
            constraints: { ...DEFAULT_VIEWPORT_CONSTRAINTS, ...config.constraints },
        };

        this.state = {
            startIndex: 0,
            endIndex: 100,
            priceMin: 0,
            priceMax: 100,
            visibleCount: 100,
            candleWidth: 10,
            priceRange: 100,
        };

        this.bounds = { x: 0, y: 0, width: 800, height: 600 };
    }

    /**
     * Set event bus for integration
     */
    setEventBus(bus: EventBus<ChartEvents>): void {
        this.eventBus = bus;
    }

    /**
     * Set chart bounds
     */
    setBounds(bounds: Bounds): void {
        this.bounds = bounds;
        this.updateComputedState();
    }

    /**
     * Set candle data
     */
    setData(data: Candle[]): void {
        this.data = data;
        if (this.config.autoScale) {
            this.fitToData();
        }
    }

    /**
     * Get current state
     */
    getState(): Readonly<ViewportState> {
        return { ...this.state };
    }

    /**
     * Get configuration
     */
    getConfig(): Readonly<ViewportConfig> {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<ViewportConfig>): void {
        this.config = {
            ...this.config,
            ...config,
            constraints: { ...this.config.constraints, ...config.constraints },
        };
    }

    /**
     * Set horizontal range (indices)
     */
    setHorizontalRange(startIndex: number, endIndex: number): void {
        const { constraints } = this.config;

        // Clamp values
        const count = endIndex - startIndex;
        if (count < constraints.minVisibleCandles) {
            endIndex = startIndex + constraints.minVisibleCandles;
        }
        if (count > constraints.maxVisibleCandles) {
            endIndex = startIndex + constraints.maxVisibleCandles;
        }

        // Ensure we don't go past data bounds
        const maxEnd = this.data.length + constraints.rightMarginCandles;
        if (endIndex > maxEnd) {
            const shift = endIndex - maxEnd;
            endIndex = maxEnd;
            startIndex = Math.max(-constraints.leftMarginCandles, startIndex - shift);
        }

        if (startIndex < -constraints.leftMarginCandles) {
            startIndex = -constraints.leftMarginCandles;
        }

        this.state.startIndex = startIndex;
        this.state.endIndex = endIndex;
        this.updateComputedState();

        if (this.config.autoScale) {
            this.autoScalePrice();
        }

        this.emitChange();
    }

    /**
     * Set vertical range (price)
     */
    setVerticalRange(priceMin: number, priceMax: number): void {
        const { constraints } = this.config;

        // Ensure min range
        let range = priceMax - priceMin;
        if (range < constraints.minPriceRange) {
            const center = (priceMin + priceMax) / 2;
            priceMin = center - constraints.minPriceRange / 2;
            priceMax = center + constraints.minPriceRange / 2;
        }

        this.state.priceMin = priceMin;
        this.state.priceMax = priceMax;
        this.state.priceRange = priceMax - priceMin;

        this.emitChange();
    }

    /**
     * Auto-scale price to visible data
     */
    autoScalePrice(): void {
        const visibleCandles = this.getVisibleCandles();
        if (visibleCandles.length === 0) return;

        let min = Infinity;
        let max = -Infinity;

        for (const candle of visibleCandles) {
            if (candle.low < min) min = candle.low;
            if (candle.high > max) max = candle.high;
        }

        const range = max - min;
        const margin = range * this.config.constraints.priceMarginPercent;

        this.setVerticalRange(min - margin, max + margin);
    }

    /**
     * Fit viewport to all data
     */
    fitToData(): void {
        if (this.data.length === 0) return;

        this.setHorizontalRange(0, this.data.length);
        this.autoScalePrice();
    }

    /**
     * Fit viewport to most recent data
     */
    fitToRecent(visibleCount?: number): void {
        if (this.data.length === 0) return;

        const count = visibleCount ?? Math.min(100, this.data.length);
        const endIndex = this.data.length;
        const startIndex = Math.max(0, endIndex - count);

        this.setHorizontalRange(startIndex, endIndex);
    }

    /**
     * Pan the viewport
     */
    pan(deltaIndex: number, deltaPrice: number = 0, options: PanOptions = {}): void {
        let newStart = this.state.startIndex - deltaIndex;
        let newEnd = this.state.endIndex - deltaIndex;

        if (options.clamp !== false) {
            const { constraints } = this.config;
            const maxEnd = this.data.length + constraints.rightMarginCandles;
            const minStart = -constraints.leftMarginCandles;

            if (newEnd > maxEnd) {
                const shift = newEnd - maxEnd;
                newEnd = maxEnd;
                newStart -= shift;
            }

            if (newStart < minStart) {
                const shift = minStart - newStart;
                newStart = minStart;
                newEnd += shift;
            }
        }

        this.state.startIndex = newStart;
        this.state.endIndex = newEnd;
        this.updateComputedState();

        if (deltaPrice !== 0 && !this.config.autoScale) {
            this.state.priceMin -= deltaPrice;
            this.state.priceMax -= deltaPrice;
        } else if (this.config.autoScale) {
            this.autoScalePrice();
        }

        this.emitChange();
    }

    /**
     * Pan by pixel coordinates
     */
    panByPixels(deltaX: Pixel, deltaY: Pixel, options: PanOptions = {}): void {
        const deltaIndex = deltaX / this.state.candleWidth;
        const deltaPrice = this.config.autoScale
            ? 0
            : (deltaY / this.bounds.height) * this.state.priceRange * (this.config.invertYAxis ? 1 : -1);

        this.pan(deltaIndex, deltaPrice, options);
    }

    /**
     * Zoom the viewport
     */
    zoom(factor: number, options: ZoomOptions = {}): void {
        const { constraints } = this.config;
        const currentCount = this.state.visibleCount;
        let newCount = currentCount / factor;

        // Clamp
        newCount = Math.max(constraints.minVisibleCandles, Math.min(constraints.maxVisibleCandles, newCount));

        // Check candle width constraint
        const newCandleWidth = this.bounds.width / newCount;
        if (newCandleWidth < constraints.minCandleWidth) {
            newCount = this.bounds.width / constraints.minCandleWidth;
        }
        if (newCandleWidth > constraints.maxCandleWidth) {
            newCount = this.bounds.width / constraints.maxCandleWidth;
        }

        // Calculate new range centered on zoom point
        let centerIndex: number;
        if (options.center) {
            centerIndex = this.xToIndex(options.center.x);
        } else {
            centerIndex = (this.state.startIndex + this.state.endIndex) / 2;
        }

        const newStart = centerIndex - (newCount / 2);
        const newEnd = centerIndex + (newCount / 2);

        this.setHorizontalRange(newStart, newEnd);

        // Zoom price axis if not auto-scaling
        if (!this.config.autoScale && options.center) {
            const centerPrice = this.yToPrice(options.center.y);
            const newRange = this.state.priceRange / factor;
            this.setVerticalRange(
                centerPrice - newRange / 2,
                centerPrice + newRange / 2
            );
        }
    }

    /**
     * Zoom in
     */
    zoomIn(factor: number = 1.2, options: ZoomOptions = {}): void {
        this.zoom(factor, options);
    }

    /**
     * Zoom out
     */
    zoomOut(factor: number = 1.2, options: ZoomOptions = {}): void {
        this.zoom(1 / factor, options);
    }

    /**
     * Reset to default view
     */
    reset(): void {
        this.fitToRecent();
        this.saveHistory();
    }

    /**
     * Enable/disable auto-scaling
     */
    setAutoScale(enabled: boolean): void {
        this.config.autoScale = enabled;
        if (enabled) {
            this.autoScalePrice();
        }
        this.eventBus?.emit("scale:auto", { enabled });
    }

    /**
     * Lock price scale to data
     */
    setLockPriceToData(locked: boolean): void {
        this.config.lockPriceToData = locked;
        this.eventBus?.emit("scale:lock", { enabled: locked });
    }

    // Coordinate transformations

    /**
     * Convert index to X coordinate
     */
    indexToX(index: number): Pixel {
        const ratio = (index - this.state.startIndex) / this.state.visibleCount;
        return this.bounds.x + ratio * this.bounds.width;
    }

    /**
     * Convert X coordinate to index
     */
    xToIndex(x: Pixel): number {
        const ratio = (x - this.bounds.x) / this.bounds.width;
        return this.state.startIndex + ratio * this.state.visibleCount;
    }

    /**
     * Convert price to Y coordinate
     */
    priceToY(price: number): Pixel {
        const ratio = (price - this.state.priceMin) / this.state.priceRange;
        if (this.config.invertYAxis) {
            return this.bounds.y + ratio * this.bounds.height;
        }
        return this.bounds.y + this.bounds.height - ratio * this.bounds.height;
    }

    /**
     * Convert Y coordinate to price
     */
    yToPrice(y: Pixel): number {
        const ratio = (y - this.bounds.y) / this.bounds.height;
        if (this.config.invertYAxis) {
            return this.state.priceMin + ratio * this.state.priceRange;
        }
        return this.state.priceMax - ratio * this.state.priceRange;
    }

    // History management

    /**
     * Save current state to history
     */
    saveHistory(): void {
        // Remove any future states if we went back
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        this.history.push({ ...this.state });

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        this.historyIndex = this.history.length - 1;
    }

    /**
     * Go back in history
     */
    undo(): boolean {
        if (this.historyIndex <= 0) return false;

        this.historyIndex--;
        this.state = { ...this.history[this.historyIndex] };
        this.emitChange();
        return true;
    }

    /**
     * Go forward in history
     */
    redo(): boolean {
        if (this.historyIndex >= this.history.length - 1) return false;

        this.historyIndex++;
        this.state = { ...this.history[this.historyIndex] };
        this.emitChange();
        return true;
    }

    /**
     * Check if can undo
     */
    canUndo(): boolean {
        return this.historyIndex > 0;
    }

    /**
     * Check if can redo
     */
    canRedo(): boolean {
        return this.historyIndex < this.history.length - 1;
    }

    // Helpers

    /**
     * Get visible candles
     */
    getVisibleCandles(): Candle[] {
        const start = Math.max(0, Math.floor(this.state.startIndex));
        const end = Math.min(this.data.length, Math.ceil(this.state.endIndex));
        return this.data.slice(start, end);
    }

    /**
     * Get visible index range
     */
    getVisibleRange(): { start: number; end: number } {
        return {
            start: Math.max(0, Math.floor(this.state.startIndex)),
            end: Math.min(this.data.length, Math.ceil(this.state.endIndex)),
        };
    }

    /**
     * Check if an index is visible
     */
    isIndexVisible(index: number): boolean {
        return index >= this.state.startIndex && index <= this.state.endIndex;
    }

    /**
     * Check if a price is visible
     */
    isPriceVisible(price: number): boolean {
        return price >= this.state.priceMin && price <= this.state.priceMax;
    }

    /**
     * Scroll to make an index visible
     */
    scrollToIndex(index: number, position: "center" | "left" | "right" = "center"): void {
        const count = this.state.visibleCount;
        let newStart: number;

        switch (position) {
            case "left":
                newStart = index;
                break;
            case "right":
                newStart = index - count;
                break;
            case "center":
            default:
                newStart = index - count / 2;
        }

        this.setHorizontalRange(newStart, newStart + count);
    }

    /**
     * Scroll to make a price visible
     */
    scrollToPrice(price: number, position: "center" | "top" | "bottom" = "center"): void {
        if (this.config.autoScale) return;

        const range = this.state.priceRange;
        let newMin: number;

        switch (position) {
            case "top":
                newMin = price - range;
                break;
            case "bottom":
                newMin = price;
                break;
            case "center":
            default:
                newMin = price - range / 2;
        }

        this.setVerticalRange(newMin, newMin + range);
    }

    // Private methods

    private updateComputedState(): void {
        this.state.visibleCount = this.state.endIndex - this.state.startIndex;
        this.state.candleWidth = this.bounds.width / this.state.visibleCount;
        this.state.priceRange = this.state.priceMax - this.state.priceMin;
    }

    private emitChange(): void {
        this.eventBus?.emit("viewport:change", {
            startIndex: this.state.startIndex,
            endIndex: this.state.endIndex,
            priceMin: this.state.priceMin,
            priceMax: this.state.priceMax,
        });
    }
}

// ============================================================================
// Factory
// ============================================================================

export function createViewportModel(config?: Partial<ViewportConfig>): ViewportModel {
    return new ViewportModel(config);
}

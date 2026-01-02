/**
 * Scale model for viewport management.
 * Following Code Style Guide: State machine pattern, explicit control flow.
 *
 * @doc-tags core,model,scale
 */

import { Subject, type Subscription } from "rxjs";
import { assert, assertPositive, assertInRange } from "../assert.ts";
import type { Price, Unit, Zoom, ViewportPercent } from "../../types/primitives.ts";

/**
 * Viewport state representation.
 */
export interface ViewportState {
    readonly xStart: Unit;
    readonly xEnd: Unit;
    readonly yStart: Price;
    readonly yEnd: Price;
}

/**
 * Scale configuration.
 */
export interface ScaleConfig {
    readonly autoScale: boolean;
    readonly lockPriceToBarRatio: boolean;
    readonly inverse: boolean;
    readonly zoomSensitivity: number;
    readonly defaultViewportItems: number;
    readonly minCandleWidth: number;
    readonly maxCandleWidth: number;
}

/**
 * Default scale configuration.
 */
export const DEFAULT_SCALE_CONFIG: ScaleConfig = {
    autoScale: true,
    lockPriceToBarRatio: false,
    inverse: false,
    zoomSensitivity: 0.25,
    defaultViewportItems: 100,
    minCandleWidth: 0.5,
    maxCandleWidth: 50,
} as const;

/**
 * Zoom limit state.
 */
export interface ZoomLimits {
    readonly zoomInReached: boolean;
    readonly zoomOutReached: boolean;
}

/**
 * Scale model for managing chart viewport.
 *
 * Responsibilities:
 * - Viewport state management.
 * - Zoom and pan operations.
 * - Auto-scale calculations.
 * - Coordinate transformations.
 */
export class ScaleModel {
    // State.
    private state: ViewportState;
    private readonly config: ScaleConfig;
    private zoomLimits: ZoomLimits = { zoomInReached: false, zoomOutReached: false };

    // Observables for state changes.
    public readonly stateChanged$ = new Subject<ViewportState>();
    public readonly zoomLimitsChanged$ = new Subject<ZoomLimits>();
    public readonly inverseChanged$ = new Subject<boolean>();

    private readonly subscriptions: Subscription[] = [];

    constructor(config: Partial<ScaleConfig> = {}) {
        this.config = { ...DEFAULT_SCALE_CONFIG, ...config };

        // Initialize with default state.
        this.state = {
            xStart: 0,
            xEnd: this.config.defaultViewportItems,
            yStart: 0,
            yEnd: 100,
        };

        // Validate initial state.
        this.validateState(this.state);
    }

    /**
     * Validates viewport state.
     */
    private validateState(state: ViewportState): void {
        assert(state.xEnd > state.xStart, "xEnd must be > xStart", state);
        assert(state.yEnd > state.yStart, "yEnd must be > yStart", state);
    }

    /**
     * Gets the current viewport state.
     */
    public getState(): ViewportState {
        return { ...this.state };
    }

    /**
     * Sets the viewport state.
     *
     * @param newState - New viewport state.
     */
    public setState(newState: ViewportState): void {
        this.validateState(newState);
        this.state = { ...newState };
        this.stateChanged$.next(this.state);
    }

    /**
     * Calculates the current X zoom level.
     */
    public getZoomX(): Zoom {
        const range = this.state.xEnd - this.state.xStart;
        assertPositive(range, "X range");
        return this.config.defaultViewportItems / range;
    }

    /**
     * Calculates the current Y zoom level.
     */
    public getZoomY(): Zoom {
        const range = this.state.yEnd - this.state.yStart;
        assertPositive(range, "Y range");
        return 1 / range;
    }

    /**
     * Zooms the X axis.
     *
     * @param factor - Zoom factor (> 1 zooms in, < 1 zooms out).
     * @param anchor - Anchor point as viewport percentage (0-1).
     */
    public zoomX(factor: Zoom, anchor: ViewportPercent = 0.5): void {
        assertPositive(factor, "Zoom factor");
        assertInRange(anchor, 0, 1, "Anchor");

        const currentRange = this.state.xEnd - this.state.xStart;
        const newRange = currentRange / factor;

        // Calculate new bounds around anchor point.
        const anchorX = this.state.xStart + currentRange * anchor;
        const newStart = anchorX - newRange * anchor;
        const newEnd = anchorX + newRange * (1 - anchor);

        // Check zoom limits.
        const candleWidth = this.calculateCandleWidth(newRange);
        const zoomInReached = candleWidth >= this.config.maxCandleWidth;
        const zoomOutReached = candleWidth <= this.config.minCandleWidth;

        // Don't apply if limit reached in that direction.
        if (factor > 1 && zoomInReached) {
            return;
        }
        if (factor < 1 && zoomOutReached) {
            return;
        }

        this.setState({
            ...this.state,
            xStart: newStart,
            xEnd: newEnd,
        });

        // Update zoom limits.
        if (this.zoomLimits.zoomInReached !== zoomInReached ||
            this.zoomLimits.zoomOutReached !== zoomOutReached) {
            this.zoomLimits = { zoomInReached, zoomOutReached };
            this.zoomLimitsChanged$.next(this.zoomLimits);
        }
    }

    /**
     * Pans the X axis.
     *
     * @param delta - Amount to pan in units.
     */
    public panX(delta: Unit): void {
        this.setState({
            ...this.state,
            xStart: this.state.xStart + delta,
            xEnd: this.state.xEnd + delta,
        });
    }

    /**
     * Pans the Y axis.
     *
     * @param delta - Amount to pan in price units.
     */
    public panY(delta: Price): void {
        this.setState({
            ...this.state,
            yStart: this.state.yStart + delta,
            yEnd: this.state.yEnd + delta,
        });
    }

    /**
     * Sets Y axis range for auto-scale.
     *
     * @param low - Low price.
     * @param high - High price.
     * @param padding - Padding as percentage of range.
     */
    public setYRange(low: Price, high: Price, padding: ViewportPercent = 0.1): void {
        assert(high >= low, "High must be >= low", { low, high });
        assertInRange(padding, 0, 0.5, "Padding");

        const range = high - low;
        const paddingAmount = range * padding;

        this.setState({
            ...this.state,
            yStart: low - paddingAmount,
            yEnd: high + paddingAmount,
        });
    }

    /**
     * Calculates candle width for a given X range.
     */
    private calculateCandleWidth(xRange: Unit): number {
        // This is a simplified calculation - actual would depend on canvas width.
        return this.config.defaultViewportItems / xRange;
    }

    /**
     * Converts a unit value to viewport percentage.
     *
     * @param x - X coordinate in units.
     */
    public unitToViewportPercentX(x: Unit): ViewportPercent {
        const range = this.state.xEnd - this.state.xStart;
        return (x - this.state.xStart) / range;
    }

    /**
     * Converts a price value to viewport percentage.
     *
     * @param y - Y coordinate as price.
     */
    public priceToViewportPercentY(y: Price): ViewportPercent {
        const range = this.state.yEnd - this.state.yStart;
        const percent = (y - this.state.yStart) / range;

        // Invert if scale is inverted.
        return this.config.inverse ? 1 - percent : percent;
    }

    /**
     * Checks if auto-scale is enabled.
     */
    public isAutoScaleEnabled(): boolean {
        return this.config.autoScale;
    }

    /**
     * Gets zoom limits state.
     */
    public getZoomLimits(): ZoomLimits {
        return { ...this.zoomLimits };
    }

    /**
     * Cleans up subscriptions.
     */
    public dispose(): void {
        for (const subscription of this.subscriptions) {
            subscription.unsubscribe();
        }
        this.subscriptions.length = 0;

        this.stateChanged$.complete();
        this.zoomLimitsChanged$.complete();
        this.inverseChanged$.complete();
    }
}

/**
 * Factory function for creating scale model.
 */
export function createScaleModel(config?: Partial<ScaleConfig>): ScaleModel {
    return new ScaleModel(config);
}

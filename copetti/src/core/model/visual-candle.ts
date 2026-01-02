/**
 * Visual candle representation for rendering.
 * Following Code Style Guide: Immutability, explicit types, guard clauses.
 *
 * @doc-tags core,model,candle
 */

import type { Pixel, Unit, Price } from "../../types/primitives.ts";
import type { Candle, PriceMovement } from "../../types/candle.ts";
import type { Viewable } from "./viewable.ts";
import { assert } from "../assert.ts";

/**
 * Visual representation of a candlestick.
 * Coordinates are in unit space (not pixels).
 * Use with a Viewable to convert to pixel coordinates.
 */
export interface VisualCandle {
    // Position and size in units.
    readonly centerUnit: Unit;
    readonly startUnit: Unit;
    readonly endUnit: Unit;
    readonly width: Unit;

    // OHLC values (in price space).
    readonly open: Price;
    readonly high: Price;
    readonly low: Price;
    readonly close: Price;

    // Direction and state.
    readonly direction: PriceMovement;
    readonly hasBorder: boolean;
    readonly isActive: boolean;
    readonly isHollow: boolean;

    // Reference to source candle.
    readonly candle: Candle;
}

/**
 * Configuration for creating visual candles.
 */
export interface VisualCandleConfig {
    readonly hasBorder: boolean;
    readonly isActive: boolean;
    readonly isHollow: boolean;
}

/**
 * Default visual candle configuration.
 */
export const DEFAULT_VISUAL_CANDLE_CONFIG: VisualCandleConfig = {
    hasBorder: false,
    isActive: false,
    isHollow: false,
} as const;

/**
 * Creates a visual candle from a candle and position data.
 *
 * @param candle - Source candle data.
 * @param centerUnit - X center position in units.
 * @param width - Candle width in units.
 * @param direction - Price movement direction.
 * @param config - Optional visual configuration.
 * @returns Visual candle.
 */
export function createVisualCandle(
    candle: Candle,
    centerUnit: Unit,
    width: Unit,
    direction: PriceMovement,
    config: Partial<VisualCandleConfig> = {},
): VisualCandle {
    assert(width > 0, "Candle width must be positive", { width });

    const mergedConfig = { ...DEFAULT_VISUAL_CANDLE_CONFIG, ...config };
    const halfWidth = width / 2;

    return {
        centerUnit,
        startUnit: centerUnit - halfWidth,
        endUnit: centerUnit + halfWidth,
        width,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        direction,
        hasBorder: mergedConfig.hasBorder,
        isActive: mergedConfig.isActive,
        isHollow: mergedConfig.isHollow,
        candle,
    };
}

// ============================================================================
// Pixel coordinate calculations
// ============================================================================

/**
 * Gets the X pixel coordinate of the candle center.
 */
export function getCandleXCenter(candle: VisualCandle, viewable: Viewable): Pixel {
    return viewable.toX(candle.centerUnit);
}

/**
 * Gets the X pixel coordinate of the candle start (left edge).
 */
export function getCandleXStart(candle: VisualCandle, viewable: Viewable): Pixel {
    return viewable.toX(candle.startUnit);
}

/**
 * Gets the X pixel coordinate of the candle end (right edge).
 */
export function getCandleXEnd(candle: VisualCandle, viewable: Viewable): Pixel {
    return viewable.toX(candle.endUnit);
}

/**
 * Gets the candle width in pixels.
 */
export function getCandleWidthPixels(candle: VisualCandle, viewable: Viewable): Pixel {
    const start = viewable.toX(candle.startUnit);
    const end = viewable.toX(candle.endUnit);
    return Math.abs(end - start);
}

// ============================================================================
// Y coordinate calculations
// ============================================================================

/**
 * Gets the Y pixel coordinate of the candle high (top of wick).
 */
export function getCandleYHigh(candle: VisualCandle, viewable: Viewable): Pixel {
    return viewable.toY(candle.high);
}

/**
 * Gets the Y pixel coordinate of the candle low (bottom of wick).
 */
export function getCandleYLow(candle: VisualCandle, viewable: Viewable): Pixel {
    return viewable.toY(candle.low);
}

/**
 * Gets the Y pixel coordinate of the candle open.
 */
export function getCandleYOpen(candle: VisualCandle, viewable: Viewable): Pixel {
    return viewable.toY(candle.open);
}

/**
 * Gets the Y pixel coordinate of the candle close.
 */
export function getCandleYClose(candle: VisualCandle, viewable: Viewable): Pixel {
    return viewable.toY(candle.close);
}

/**
 * Gets the Y pixel coordinate of the body top.
 * (Minimum of open and close Y values.)
 */
export function getCandleBodyTop(candle: VisualCandle, viewable: Viewable): Pixel {
    const openY = viewable.toY(candle.open);
    const closeY = viewable.toY(candle.close);
    return Math.min(openY, closeY);
}

/**
 * Gets the Y pixel coordinate of the body bottom.
 * (Maximum of open and close Y values.)
 */
export function getCandleBodyBottom(candle: VisualCandle, viewable: Viewable): Pixel {
    const openY = viewable.toY(candle.open);
    const closeY = viewable.toY(candle.close);
    return Math.max(openY, closeY);
}

/**
 * Gets the body height in pixels.
 * Minimum height is 1 pixel to ensure visibility.
 */
export function getCandleBodyHeight(candle: VisualCandle, viewable: Viewable): Pixel {
    const openY = viewable.toY(candle.open);
    const closeY = viewable.toY(candle.close);
    return Math.max(Math.abs(openY - closeY), 1);
}

/**
 * Gets the wick (high-low) height in pixels.
 */
export function getCandleWickHeight(candle: VisualCandle, viewable: Viewable): Pixel {
    const highY = viewable.toY(candle.high);
    const lowY = viewable.toY(candle.low);
    return Math.abs(highY - lowY);
}

// ============================================================================
// Rectangle calculations for rendering
// ============================================================================

/**
 * Rectangle coordinates [x, y, width, height].
 */
export type Rect = readonly [Pixel, Pixel, Pixel, Pixel];

/**
 * Gets the body rectangle for rendering.
 *
 * @returns [x, y, width, height] in pixels.
 */
export function getCandleBodyRect(candle: VisualCandle, viewable: Viewable): Rect {
    const x = viewable.toX(candle.startUnit);
    const y = getCandleBodyTop(candle, viewable);
    const width = getCandleWidthPixels(candle, viewable);
    const height = getCandleBodyHeight(candle, viewable);

    return [x, y, width, height];
}

/**
 * Gets the wick line coordinates for rendering.
 * Used when candle is too narrow for a body.
 *
 * @returns [x, y, width, height] or null if body should be used.
 */
export function getCandleWickRect(
    candle: VisualCandle,
    viewable: Viewable,
): Rect | null {
    const widthPixels = getCandleWidthPixels(candle, viewable);

    // Only use wick rect for very narrow candles.
    const minWidthForBody = 2;
    if (widthPixels >= minWidthForBody) {
        return null;
    }

    const x = viewable.toX(candle.centerUnit);
    const y = Math.min(viewable.toY(candle.high), viewable.toY(candle.low));
    const height = getCandleWickHeight(candle, viewable);

    return [x, y, widthPixels, height];
}

/**
 * Key Y points of a candle in ascending pixel order.
 * Useful for hit testing and gradient calculations.
 *
 * @returns [wickTop, bodyTop, bodyBottom, wickBottom] in pixels.
 */
export function getCandleYKeyPoints(
    candle: VisualCandle,
    viewable: Viewable,
): readonly [Pixel, Pixel, Pixel, Pixel] {
    const highY = viewable.toY(candle.high);
    const lowY = viewable.toY(candle.low);
    const openY = viewable.toY(candle.open);
    const closeY = viewable.toY(candle.close);

    const [bodyTop, bodyBottom] = openY < closeY ? [openY, closeY] : [closeY, openY];
    const [wickTop, wickBottom] = highY < lowY ? [highY, lowY] : [lowY, highY];

    return [wickTop, bodyTop, bodyBottom, wickBottom];
}

// ============================================================================
// Hit testing
// ============================================================================

/**
 * Checks if a pixel coordinate is within the candle's X bounds.
 */
export function isPixelInCandleX(
    candle: VisualCandle,
    viewable: Viewable,
    pixelX: Pixel,
): boolean {
    const startX = viewable.toX(candle.startUnit);
    const endX = viewable.toX(candle.endUnit);
    return pixelX >= startX && pixelX <= endX;
}

/**
 * Checks if a pixel coordinate is within the candle's body.
 */
export function isPixelInCandleBody(
    candle: VisualCandle,
    viewable: Viewable,
    pixelX: Pixel,
    pixelY: Pixel,
): boolean {
    if (!isPixelInCandleX(candle, viewable, pixelX)) {
        return false;
    }

    const bodyTop = getCandleBodyTop(candle, viewable);
    const bodyBottom = getCandleBodyBottom(candle, viewable);

    return pixelY >= bodyTop && pixelY <= bodyBottom;
}

/**
 * Checks if a pixel coordinate is within the candle's full range (including wicks).
 */
export function isPixelInCandleFull(
    candle: VisualCandle,
    viewable: Viewable,
    pixelX: Pixel,
    pixelY: Pixel,
): boolean {
    if (!isPixelInCandleX(candle, viewable, pixelX)) {
        return false;
    }

    const highY = viewable.toY(candle.high);
    const lowY = viewable.toY(candle.low);
    const top = Math.min(highY, lowY);
    const bottom = Math.max(highY, lowY);

    return pixelY >= top && pixelY <= bottom;
}

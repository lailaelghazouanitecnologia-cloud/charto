/**
 * Viewable interface for coordinate transformations.
 * Following Code Style Guide: Single responsibility, explicit types.
 *
 * @doc-tags core,model,viewport
 */

import type { Pixel, Unit, Price } from "../../types/primitives.ts";

/**
 * Interface for converting between coordinate systems.
 * Implemented by viewport/scale models to provide coordinate transformations.
 */
export interface Viewable {
    /**
     * Converts a unit value to pixel X coordinate.
     *
     * @param unit - X coordinate in units.
     * @returns X coordinate in pixels.
     */
    toX(unit: Unit): Pixel;

    /**
     * Converts a price/unit value to pixel Y coordinate.
     *
     * @param value - Y coordinate in price/units.
     * @returns Y coordinate in pixels.
     */
    toY(value: Price | Unit): Pixel;

    /**
     * Converts a pixel X coordinate to units.
     *
     * @param pixel - X coordinate in pixels.
     * @returns X coordinate in units.
     */
    fromX(pixel: Pixel): Unit;

    /**
     * Converts a pixel Y coordinate to price/units.
     *
     * @param pixel - Y coordinate in pixels.
     * @returns Y coordinate in price/units.
     */
    fromY(pixel: Pixel): Price;
}

/**
 * Visual point in chart space.
 * Base class for all visual elements that have a position.
 */
export interface VisualPoint {
    readonly centerUnit: Unit;
    readonly value: Price;
}

/**
 * Creates a visual point.
 *
 * @param centerUnit - X coordinate in units.
 * @param value - Y value (price/unit).
 * @returns Visual point.
 */
export function createVisualPoint(centerUnit: Unit, value: Price): VisualPoint {
    return { centerUnit, value };
}

/**
 * Converts a visual point to pixel coordinates.
 *
 * @param point - Visual point to convert.
 * @param viewable - Coordinate transformer.
 * @returns Pixel coordinates [x, y].
 */
export function visualPointToPixel(
    point: VisualPoint,
    viewable: Viewable,
): readonly [Pixel, Pixel] {
    return [viewable.toX(point.centerUnit), viewable.toY(point.value)];
}

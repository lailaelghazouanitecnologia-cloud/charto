/**
 * Bounds and geometry types.
 * Following Code Style Guide: Explicit types, immutability.
 *
 * @doc-tags types,geometry
 */

import type { Pixel } from "./primitives.ts";

/**
 * Represents a rectangular bounds in pixel coordinates.
 */
export interface Bounds {
    readonly x: Pixel;
    readonly y: Pixel;
    readonly width: Pixel;
    readonly height: Pixel;
}

/**
 * Bounds with page-relative coordinates.
 */
export interface PageBounds extends Bounds {
    readonly pageX: Pixel;
    readonly pageY: Pixel;
}

/**
 * A point in 2D space.
 */
export interface Point {
    readonly x: Pixel;
    readonly y: Pixel;
}

/**
 * Default empty bounds.
 */
export const DEFAULT_BOUNDS: Bounds = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
} as const;

/**
 * Checks if a point is within bounds.
 *
 * @param point - Point to check.
 * @param bounds - Bounds to check against.
 * @returns True if point is within bounds.
 */
export function isPointInBounds(point: Point, bounds: Bounds): boolean {
    const isInXRange = point.x >= bounds.x && point.x <= bounds.x + bounds.width;
    const isInYRange = point.y >= bounds.y && point.y <= bounds.y + bounds.height;

    return isInXRange && isInYRange;
}

/**
 * Checks if two bounds intersect.
 *
 * @param boundsA - First bounds.
 * @param boundsB - Second bounds.
 * @returns True if bounds intersect.
 */
export function doBoundsIntersect(boundsA: Bounds, boundsB: Bounds): boolean {
    const noHorizontalOverlap =
        boundsA.x + boundsA.width < boundsB.x || boundsB.x + boundsB.width < boundsA.x;

    const noVerticalOverlap =
        boundsA.y + boundsA.height < boundsB.y || boundsB.y + boundsB.height < boundsA.y;

    return !noHorizontalOverlap && !noVerticalOverlap;
}

/**
 * Calculates the intersection of two bounds.
 *
 * @param boundsA - First bounds.
 * @param boundsB - Second bounds.
 * @returns Intersection bounds or null if no intersection.
 */
export function calculateBoundsIntersection(boundsA: Bounds, boundsB: Bounds): Bounds | null {
    if (!doBoundsIntersect(boundsA, boundsB)) {
        return null;
    }

    const x = Math.max(boundsA.x, boundsB.x);
    const y = Math.max(boundsA.y, boundsB.y);
    const right = Math.min(boundsA.x + boundsA.width, boundsB.x + boundsB.width);
    const bottom = Math.min(boundsA.y + boundsA.height, boundsB.y + boundsB.height);

    return {
        x,
        y,
        width: right - x,
        height: bottom - y,
    };
}

/**
 * Checks if bounds have changed.
 *
 * @param boundsA - First bounds.
 * @param boundsB - Second bounds.
 * @returns True if bounds are different.
 */
export function haveBoundsChanged(boundsA: Bounds, boundsB: Bounds): boolean {
    return (
        boundsA.x !== boundsB.x ||
        boundsA.y !== boundsB.y ||
        boundsA.width !== boundsB.width ||
        boundsA.height !== boundsB.height
    );
}

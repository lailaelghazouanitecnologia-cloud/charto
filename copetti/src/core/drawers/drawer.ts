/**
 * Base drawer interface and types.
 * Following Code Style Guide: Single responsibility, explicit interfaces.
 *
 * @doc-tags core,drawer
 */

import type { CanvasModel } from "../canvas/canvas.model.ts";
import type { Bounds } from "../../types/bounds.ts";
import type { DrawerId } from "../../types/primitives.ts";

/**
 * Drawer interface - responsible for drawing a specific element.
 */
export interface Drawer {
    /**
     * Unique identifier for this drawer.
     */
    readonly id: DrawerId;

    /**
     * Drawing order (lower = drawn first, behind others).
     */
    readonly zIndex: number;

    /**
     * Whether this drawer is currently enabled.
     */
    readonly enabled: boolean;

    /**
     * Draws the element to the canvas.
     *
     * @param canvas - Canvas model to draw on.
     * @param bounds - Visible bounds to draw within.
     */
    draw(canvas: CanvasModel, bounds: Bounds): void;
}

/**
 * Drawer configuration.
 */
export interface DrawerConfig {
    readonly id: DrawerId;
    readonly zIndex: number;
    readonly enabled: boolean;
}

/**
 * Default drawer configuration.
 */
export const DEFAULT_DRAWER_CONFIG: DrawerConfig = {
    id: "default",
    zIndex: 0,
    enabled: true,
} as const;

/**
 * Abstract base drawer with common functionality.
 */
export abstract class BaseDrawer implements Drawer {
    public readonly id: DrawerId;
    public readonly zIndex: number;
    public enabled: boolean;

    constructor(config: Partial<DrawerConfig> = {}) {
        const merged = { ...DEFAULT_DRAWER_CONFIG, ...config };
        this.id = merged.id;
        this.zIndex = merged.zIndex;
        this.enabled = merged.enabled;
    }

    /**
     * Enable this drawer.
     */
    public enable(): void {
        this.enabled = true;
    }

    /**
     * Disable this drawer.
     */
    public disable(): void {
        this.enabled = false;
    }

    /**
     * Abstract draw method to be implemented by subclasses.
     */
    public abstract draw(canvas: CanvasModel, bounds: Bounds): void;
}

/**
 * Drawing context passed to drawers.
 */
export interface DrawingContext {
    readonly canvas: CanvasModel;
    readonly bounds: Bounds;
    readonly timestamp: number;
}

/**
 * Creates a drawing context.
 */
export function createDrawingContext(
    canvas: CanvasModel,
    bounds: Bounds,
): DrawingContext {
    return {
        canvas,
        bounds,
        timestamp: performance.now(),
    };
}

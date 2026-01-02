/**
 * Drawing manager - orchestrates all chart drawers.
 * Following Code Style Guide: Bounded operations, explicit control flow.
 *
 * @doc-tags core,drawer,manager
 */

import type { Drawer } from "./drawer.ts";
import type { CanvasModel } from "../canvas/canvas.model.ts";
import type { Bounds } from "../../types/bounds.ts";
import type { DrawerId } from "../../types/primitives.ts";
import { assert } from "../assert.ts";

/**
 * Maximum number of drawers allowed.
 * Following Code Style Guide: "Put a limit on everything."
 */
const MAX_DRAWERS = 50;

/**
 * Drawing manager configuration.
 */
export interface DrawingManagerConfig {
    readonly clearBeforeDraw: boolean;
    readonly clipToBounds: boolean;
}

/**
 * Default drawing manager configuration.
 */
export const DEFAULT_DRAWING_MANAGER_CONFIG: DrawingManagerConfig = {
    clearBeforeDraw: true,
    clipToBounds: true,
} as const;

/**
 * Drawing manager - orchestrates all chart drawers.
 *
 * Responsibilities:
 * - Manages collection of drawers.
 * - Sorts drawers by z-index.
 * - Executes draw cycle.
 */
export class DrawingManager {
    private readonly config: DrawingManagerConfig;
    private readonly drawers: Map<DrawerId, Drawer> = new Map();
    private sortedDrawers: readonly Drawer[] = [];
    private needsSort = true;

    constructor(config: Partial<DrawingManagerConfig> = {}) {
        this.config = { ...DEFAULT_DRAWING_MANAGER_CONFIG, ...config };
    }

    // ========================================================================
    // Drawer management
    // ========================================================================

    /**
     * Adds a drawer.
     *
     * @param drawer - Drawer to add.
     */
    public addDrawer(drawer: Drawer): void {
        assert(
            this.drawers.size < MAX_DRAWERS,
            `Too many drawers: ${this.drawers.size}. Max: ${MAX_DRAWERS}`,
        );
        assert(!this.drawers.has(drawer.id), `Drawer already exists: ${drawer.id}`);

        this.drawers.set(drawer.id, drawer);
        this.needsSort = true;
    }

    /**
     * Removes a drawer by ID.
     *
     * @param id - Drawer ID to remove.
     * @returns True if drawer was removed.
     */
    public removeDrawer(id: DrawerId): boolean {
        const removed = this.drawers.delete(id);
        if (removed) {
            this.needsSort = true;
        }
        return removed;
    }

    /**
     * Gets a drawer by ID.
     *
     * @param id - Drawer ID.
     * @returns Drawer or undefined.
     */
    public getDrawer(id: DrawerId): Drawer | undefined {
        return this.drawers.get(id);
    }

    /**
     * Checks if a drawer exists.
     *
     * @param id - Drawer ID.
     * @returns True if drawer exists.
     */
    public hasDrawer(id: DrawerId): boolean {
        return this.drawers.has(id);
    }

    /**
     * Gets all drawers.
     */
    public getAllDrawers(): readonly Drawer[] {
        this.ensureSorted();
        return this.sortedDrawers;
    }

    /**
     * Gets drawer count.
     */
    public getDrawerCount(): number {
        return this.drawers.size;
    }

    /**
     * Clears all drawers.
     */
    public clearDrawers(): void {
        this.drawers.clear();
        this.sortedDrawers = [];
        this.needsSort = false;
    }

    // ========================================================================
    // Drawing
    // ========================================================================

    /**
     * Draws all enabled drawers to the canvas.
     *
     * @param canvas - Canvas to draw on.
     * @param bounds - Visible bounds.
     */
    public draw(canvas: CanvasModel, bounds: Bounds): void {
        // Clear canvas if configured.
        if (this.config.clearBeforeDraw) {
            canvas.clear();
        }

        // Get sorted drawers.
        this.ensureSorted();

        // Setup clipping if configured.
        if (this.config.clipToBounds) {
            canvas.save();
            canvas.clip(bounds);
        }

        // Draw each enabled drawer.
        for (const drawer of this.sortedDrawers) {
            if (drawer.enabled) {
                drawer.draw(canvas, bounds);
            }
        }

        // Restore clipping.
        if (this.config.clipToBounds) {
            canvas.restore();
        }
    }

    /**
     * Draws specific drawers by ID.
     *
     * @param canvas - Canvas to draw on.
     * @param bounds - Visible bounds.
     * @param drawerIds - IDs of drawers to draw.
     */
    public drawSpecific(
        canvas: CanvasModel,
        bounds: Bounds,
        drawerIds: readonly DrawerId[],
    ): void {
        // Clear canvas if configured.
        if (this.config.clearBeforeDraw) {
            canvas.clear();
        }

        // Setup clipping if configured.
        if (this.config.clipToBounds) {
            canvas.save();
            canvas.clip(bounds);
        }

        // Draw specified drawers in order.
        for (const id of drawerIds) {
            const drawer = this.drawers.get(id);
            if (drawer !== undefined && drawer.enabled) {
                drawer.draw(canvas, bounds);
            }
        }

        // Restore clipping.
        if (this.config.clipToBounds) {
            canvas.restore();
        }
    }

    // ========================================================================
    // Private methods
    // ========================================================================

    /**
     * Ensures drawers are sorted by z-index.
     */
    private ensureSorted(): void {
        if (!this.needsSort) {
            return;
        }

        this.sortedDrawers = Array.from(this.drawers.values()).sort(
            (a, b) => a.zIndex - b.zIndex,
        );
        this.needsSort = false;
    }
}

/**
 * Creates a drawing manager.
 */
export function createDrawingManager(
    config?: Partial<DrawingManagerConfig>,
): DrawingManager {
    return new DrawingManager(config);
}

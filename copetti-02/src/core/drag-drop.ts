/**
 * Drag-n-Drop System - Handles dragging operations for chart elements
 * Supports horizontal, vertical, and free-form dragging with constraints
 */

import type { Pixel, Point, Bounds } from "./types.ts";
import type { InputPosition } from "./input-listener.ts";

// ============================================================================
// Types
// ============================================================================

export type DragDirection = "horizontal" | "vertical" | "both";

export interface DragState {
    isDragging: boolean;
    startPosition: Point;
    currentPosition: Point;
    delta: Point;
    totalDelta: Point;
    target: unknown;
}

export interface DragConstraints {
    minX?: Pixel;
    maxX?: Pixel;
    minY?: Pixel;
    maxY?: Pixel;
    bounds?: Bounds;
    snapToGrid?: number;
}

export interface DragConfig {
    direction: DragDirection;
    threshold: number;
    constraints?: DragConstraints;
    cursor?: string;
    cursorDragging?: string;
}

export interface DragCallbacks<T = unknown> {
    onDragStart?: (state: DragState, target: T) => boolean | void;
    onDrag?: (state: DragState, target: T) => void;
    onDragEnd?: (state: DragState, target: T) => void;
    onDragCancel?: (state: DragState, target: T) => void;
}

export interface DragInfo {
    startX: Pixel;
    startY: Pixel;
    currentX: Pixel;
    currentY: Pixel;
    deltaX: Pixel;
    deltaY: Pixel;
    totalDeltaX: Pixel;
    totalDeltaY: Pixel;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_DRAG_CONFIG: DragConfig = {
    direction: "both",
    threshold: 3,
    cursor: "grab",
    cursorDragging: "grabbing",
};

// ============================================================================
// DragHandler Class
// ============================================================================

export class DragHandler<T = unknown> {
    private config: DragConfig;
    private callbacks: DragCallbacks<T>;
    private state: DragState;
    private element: HTMLElement | null = null;
    private target: T | null = null;
    private hasStarted = false;
    private originalCursor = "";

    constructor(callbacks: DragCallbacks<T> = {}, config: Partial<DragConfig> = {}) {
        this.callbacks = callbacks;
        this.config = { ...DEFAULT_DRAG_CONFIG, ...config };
        this.state = this.createInitialState();
    }

    /**
     * Set the element for cursor management
     */
    setElement(element: HTMLElement): void {
        this.element = element;
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<DragConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Update callbacks
     */
    setCallbacks(callbacks: Partial<DragCallbacks<T>>): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Start a potential drag operation
     */
    startPotentialDrag(x: Pixel, y: Pixel, target: T): void {
        this.target = target;
        this.hasStarted = false;
        this.state = {
            isDragging: false,
            startPosition: { x, y },
            currentPosition: { x, y },
            delta: { x: 0, y: 0 },
            totalDelta: { x: 0, y: 0 },
            target,
        };

        if (this.element && this.config.cursor) {
            this.originalCursor = this.element.style.cursor;
        }
    }

    /**
     * Update drag position
     */
    updateDrag(x: Pixel, y: Pixel): boolean {
        if (!this.target) return false;

        const deltaX = x - this.state.currentPosition.x;
        const deltaY = y - this.state.currentPosition.y;
        const totalDeltaX = x - this.state.startPosition.x;
        const totalDeltaY = y - this.state.startPosition.y;

        // Check if we've passed the threshold to start dragging
        if (!this.hasStarted) {
            const distance = Math.sqrt(totalDeltaX * totalDeltaX + totalDeltaY * totalDeltaY);
            if (distance < this.config.threshold) {
                return false;
            }

            // Check direction threshold
            if (this.config.direction === "horizontal" && Math.abs(totalDeltaY) > Math.abs(totalDeltaX)) {
                return false;
            }
            if (this.config.direction === "vertical" && Math.abs(totalDeltaX) > Math.abs(totalDeltaY)) {
                return false;
            }

            // Start drag
            this.hasStarted = true;
            this.state.isDragging = true;

            // Update cursor
            if (this.element && this.config.cursorDragging) {
                this.element.style.cursor = this.config.cursorDragging;
            }

            // Call start callback - can cancel
            const shouldProceed = this.callbacks.onDragStart?.(this.state, this.target);
            if (shouldProceed === false) {
                this.cancel();
                return false;
            }
        }

        // Apply direction constraints
        let constrainedX = x;
        let constrainedY = y;

        if (this.config.direction === "horizontal") {
            constrainedY = this.state.startPosition.y;
        } else if (this.config.direction === "vertical") {
            constrainedX = this.state.startPosition.x;
        }

        // Apply bounds constraints
        if (this.config.constraints) {
            constrainedX = this.applyConstraint(constrainedX, this.config.constraints.minX, this.config.constraints.maxX);
            constrainedY = this.applyConstraint(constrainedY, this.config.constraints.minY, this.config.constraints.maxY);

            if (this.config.constraints.bounds) {
                const bounds = this.config.constraints.bounds;
                constrainedX = this.applyConstraint(constrainedX, bounds.x, bounds.x + bounds.width);
                constrainedY = this.applyConstraint(constrainedY, bounds.y, bounds.y + bounds.height);
            }

            // Snap to grid
            if (this.config.constraints.snapToGrid) {
                const grid = this.config.constraints.snapToGrid;
                constrainedX = Math.round(constrainedX / grid) * grid;
                constrainedY = Math.round(constrainedY / grid) * grid;
            }
        }

        // Update state
        this.state.delta = {
            x: constrainedX - this.state.currentPosition.x,
            y: constrainedY - this.state.currentPosition.y,
        };
        this.state.currentPosition = { x: constrainedX, y: constrainedY };
        this.state.totalDelta = {
            x: constrainedX - this.state.startPosition.x,
            y: constrainedY - this.state.startPosition.y,
        };

        // Call drag callback
        this.callbacks.onDrag?.(this.state, this.target);

        return true;
    }

    /**
     * End the drag operation
     */
    endDrag(): void {
        if (!this.target) return;

        if (this.hasStarted && this.state.isDragging) {
            this.callbacks.onDragEnd?.(this.state, this.target);
        }

        this.reset();
    }

    /**
     * Cancel the drag operation
     */
    cancel(): void {
        if (!this.target) return;

        if (this.hasStarted && this.state.isDragging) {
            this.callbacks.onDragCancel?.(this.state, this.target);
        }

        this.reset();
    }

    /**
     * Check if currently dragging
     */
    isDragging(): boolean {
        return this.state.isDragging;
    }

    /**
     * Get current state
     */
    getState(): DragState {
        return { ...this.state };
    }

    /**
     * Get drag info in legacy format
     */
    getDragInfo(): DragInfo {
        return {
            startX: this.state.startPosition.x,
            startY: this.state.startPosition.y,
            currentX: this.state.currentPosition.x,
            currentY: this.state.currentPosition.y,
            deltaX: this.state.delta.x,
            deltaY: this.state.delta.y,
            totalDeltaX: this.state.totalDelta.x,
            totalDeltaY: this.state.totalDelta.y,
        };
    }

    // Private methods

    private createInitialState(): DragState {
        return {
            isDragging: false,
            startPosition: { x: 0, y: 0 },
            currentPosition: { x: 0, y: 0 },
            delta: { x: 0, y: 0 },
            totalDelta: { x: 0, y: 0 },
            target: null,
        };
    }

    private reset(): void {
        // Restore cursor
        if (this.element) {
            this.element.style.cursor = this.originalCursor;
        }

        this.target = null;
        this.hasStarted = false;
        this.state = this.createInitialState();
    }

    private applyConstraint(value: number, min?: number, max?: number): number {
        if (min !== undefined && value < min) return min;
        if (max !== undefined && value > max) return max;
        return value;
    }
}

// ============================================================================
// HorizontalDragHandler - Specialized for horizontal dragging
// ============================================================================

export class HorizontalDragHandler<T = unknown> extends DragHandler<T> {
    constructor(callbacks: DragCallbacks<T> = {}, config: Partial<DragConfig> = {}) {
        super(callbacks, { ...config, direction: "horizontal" });
    }
}

// ============================================================================
// VerticalDragHandler - Specialized for vertical dragging
// ============================================================================

export class VerticalDragHandler<T = unknown> extends DragHandler<T> {
    constructor(callbacks: DragCallbacks<T> = {}, config: Partial<DragConfig> = {}) {
        super(callbacks, { ...config, direction: "vertical" });
    }
}

// ============================================================================
// DragManager - Manages multiple drag handlers
// ============================================================================

export interface DragManagerCallbacks {
    onAnyDragStart?: () => void;
    onAnyDragEnd?: () => void;
}

export class DragManager {
    private handlers: Map<string, DragHandler<unknown>> = new Map();
    private activeHandlerId: string | null = null;
    private callbacks: DragManagerCallbacks;

    constructor(callbacks: DragManagerCallbacks = {}) {
        this.callbacks = callbacks;
    }

    /**
     * Register a drag handler
     */
    register<T>(id: string, handler: DragHandler<T>): void {
        this.handlers.set(id, handler as DragHandler<unknown>);
    }

    /**
     * Unregister a drag handler
     */
    unregister(id: string): void {
        this.handlers.delete(id);
    }

    /**
     * Get a handler by ID
     */
    getHandler<T>(id: string): DragHandler<T> | undefined {
        return this.handlers.get(id) as DragHandler<T> | undefined;
    }

    /**
     * Start a drag with a specific handler
     */
    startDrag<T>(handlerId: string, x: Pixel, y: Pixel, target: T): boolean {
        if (this.activeHandlerId) return false;

        const handler = this.handlers.get(handlerId);
        if (!handler) return false;

        this.activeHandlerId = handlerId;
        (handler as DragHandler<T>).startPotentialDrag(x, y, target);
        this.callbacks.onAnyDragStart?.();
        return true;
    }

    /**
     * Update the active drag
     */
    updateDrag(x: Pixel, y: Pixel): boolean {
        if (!this.activeHandlerId) return false;

        const handler = this.handlers.get(this.activeHandlerId);
        if (!handler) return false;

        return handler.updateDrag(x, y);
    }

    /**
     * End the active drag
     */
    endDrag(): void {
        if (!this.activeHandlerId) return;

        const handler = this.handlers.get(this.activeHandlerId);
        handler?.endDrag();

        this.activeHandlerId = null;
        this.callbacks.onAnyDragEnd?.();
    }

    /**
     * Cancel the active drag
     */
    cancelDrag(): void {
        if (!this.activeHandlerId) return;

        const handler = this.handlers.get(this.activeHandlerId);
        handler?.cancel();

        this.activeHandlerId = null;
        this.callbacks.onAnyDragEnd?.();
    }

    /**
     * Check if any handler is actively dragging
     */
    isDragging(): boolean {
        return this.activeHandlerId !== null;
    }

    /**
     * Get active handler ID
     */
    getActiveHandlerId(): string | null {
        return this.activeHandlerId;
    }

    /**
     * Get state of active drag
     */
    getActiveState(): DragState | null {
        if (!this.activeHandlerId) return null;

        const handler = this.handlers.get(this.activeHandlerId);
        return handler?.getState() ?? null;
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate if a drag should trigger based on distance
 */
export function shouldStartDrag(
    startX: Pixel,
    startY: Pixel,
    currentX: Pixel,
    currentY: Pixel,
    threshold: number = 3
): boolean {
    const dx = currentX - startX;
    const dy = currentY - startY;
    return Math.sqrt(dx * dx + dy * dy) >= threshold;
}

/**
 * Constrain a position to bounds
 */
export function constrainToBounds(
    x: Pixel,
    y: Pixel,
    bounds: Bounds
): Point {
    return {
        x: Math.max(bounds.x, Math.min(bounds.x + bounds.width, x)),
        y: Math.max(bounds.y, Math.min(bounds.y + bounds.height, y)),
    };
}

/**
 * Snap a position to a grid
 */
export function snapToGrid(x: Pixel, y: Pixel, gridSize: number): Point {
    return {
        x: Math.round(x / gridSize) * gridSize,
        y: Math.round(y / gridSize) * gridSize,
    };
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createDragHandler<T>(
    callbacks?: DragCallbacks<T>,
    config?: Partial<DragConfig>
): DragHandler<T> {
    return new DragHandler<T>(callbacks, config);
}

export function createHorizontalDragHandler<T>(
    callbacks?: DragCallbacks<T>,
    config?: Partial<DragConfig>
): HorizontalDragHandler<T> {
    return new HorizontalDragHandler<T>(callbacks, config);
}

export function createVerticalDragHandler<T>(
    callbacks?: DragCallbacks<T>,
    config?: Partial<DragConfig>
): VerticalDragHandler<T> {
    return new VerticalDragHandler<T>(callbacks, config);
}

export function createDragManager(callbacks?: DragManagerCallbacks): DragManager {
    return new DragManager(callbacks);
}

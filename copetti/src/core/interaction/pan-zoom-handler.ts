/**
 * Pan and zoom handlers for chart navigation.
 * Following Code Style Guide: Single responsibility, explicit types.
 *
 * @doc-tags core,interaction,pan,zoom
 */

import type { Subscription } from "rxjs";
import type { Pixel, Unit, Zoom, ViewportPercent } from "../../types/primitives.ts";
import type { ScaleModel } from "../model/scale.model.ts";
import type { InputHandler, DragState, WheelEventData } from "./input-handler.ts";

/**
 * Pan handler configuration.
 */
export interface PanHandlerConfig {
    readonly enabled: boolean;
    readonly direction: "horizontal" | "vertical" | "both";
    readonly sensitivity: number;
    readonly invertX: boolean;
    readonly invertY: boolean;
}

/**
 * Default pan handler configuration.
 */
export const DEFAULT_PAN_HANDLER_CONFIG: PanHandlerConfig = {
    enabled: true,
    direction: "horizontal",
    sensitivity: 1,
    invertX: false,
    invertY: false,
} as const;

/**
 * Pan handler - handles drag-to-pan functionality.
 */
export class PanHandler {
    private readonly config: PanHandlerConfig;
    private readonly scaleModel: ScaleModel;
    private readonly inputHandler: InputHandler;
    private readonly subscriptions: Subscription[] = [];

    private lastDragX: Pixel = 0;
    private lastDragY: Pixel = 0;

    constructor(
        scaleModel: ScaleModel,
        inputHandler: InputHandler,
        config: Partial<PanHandlerConfig> = {},
    ) {
        this.scaleModel = scaleModel;
        this.inputHandler = inputHandler;
        this.config = { ...DEFAULT_PAN_HANDLER_CONFIG, ...config };

        this.setupSubscriptions();
    }

    /**
     * Gets the configuration.
     */
    public getConfig(): PanHandlerConfig {
        return { ...this.config };
    }

    /**
     * Enables the pan handler.
     */
    public enable(): void {
        (this.config as { enabled: boolean }).enabled = true;
    }

    /**
     * Disables the pan handler.
     */
    public disable(): void {
        (this.config as { enabled: boolean }).enabled = false;
    }

    /**
     * Disposes of the handler.
     */
    public dispose(): void {
        for (const sub of this.subscriptions) {
            sub.unsubscribe();
        }
        this.subscriptions.length = 0;
    }

    /**
     * Sets up subscriptions to input handler events.
     */
    private setupSubscriptions(): void {
        // Drag start.
        this.subscriptions.push(
            this.inputHandler.dragStart$.subscribe((state) => {
                if (!this.config.enabled) {
                    return;
                }
                this.lastDragX = state.startX;
                this.lastDragY = state.startY;
            }),
        );

        // Drag.
        this.subscriptions.push(
            this.inputHandler.drag$.subscribe((state) => {
                if (!this.config.enabled) {
                    return;
                }
                this.handleDrag(state);
            }),
        );
    }

    /**
     * Handles drag event.
     */
    private handleDrag(state: DragState): void {
        const deltaX = (state.currentX - this.lastDragX) * this.config.sensitivity;
        const deltaY = (state.currentY - this.lastDragY) * this.config.sensitivity;

        // Apply pan based on direction.
        if (this.config.direction === "horizontal" || this.config.direction === "both") {
            const panX = this.config.invertX ? deltaX : -deltaX;
            // Convert pixel delta to unit delta (simplified).
            const unitDelta = this.pixelToUnitDelta(panX);
            this.scaleModel.panX(unitDelta);
        }

        if (this.config.direction === "vertical" || this.config.direction === "both") {
            const panY = this.config.invertY ? -deltaY : deltaY;
            const priceDelta = this.pixelToPriceDelta(panY);
            this.scaleModel.panY(priceDelta);
        }

        this.lastDragX = state.currentX;
        this.lastDragY = state.currentY;
    }

    /**
     * Converts pixel delta to unit delta.
     */
    private pixelToUnitDelta(pixelDelta: Pixel): Unit {
        // This is a simplified conversion - in a real implementation,
        // this would use the actual viewport dimensions.
        const state = this.scaleModel.getState();
        const xRange = state.xEnd - state.xStart;
        // Assume a reasonable viewport width.
        const viewportWidth = 800;
        return (pixelDelta / viewportWidth) * xRange;
    }

    /**
     * Converts pixel delta to price delta.
     */
    private pixelToPriceDelta(pixelDelta: Pixel): number {
        const state = this.scaleModel.getState();
        const yRange = state.yEnd - state.yStart;
        const viewportHeight = 600;
        return (pixelDelta / viewportHeight) * yRange;
    }
}

// ============================================================================
// Zoom Handler
// ============================================================================

/**
 * Zoom handler configuration.
 */
export interface ZoomHandlerConfig {
    readonly enabled: boolean;
    readonly direction: "horizontal" | "vertical" | "both";
    readonly sensitivity: number;
    readonly minZoom: Zoom;
    readonly maxZoom: Zoom;
    readonly anchorToMouse: boolean;
}

/**
 * Default zoom handler configuration.
 */
export const DEFAULT_ZOOM_HANDLER_CONFIG: ZoomHandlerConfig = {
    enabled: true,
    direction: "horizontal",
    sensitivity: 0.001,
    minZoom: 0.1,
    maxZoom: 10,
    anchorToMouse: true,
} as const;

/**
 * Zoom handler - handles scroll-to-zoom functionality.
 */
export class ZoomHandler {
    private readonly config: ZoomHandlerConfig;
    private readonly scaleModel: ScaleModel;
    private readonly inputHandler: InputHandler;
    private readonly subscriptions: Subscription[] = [];
    private viewportWidth: Pixel = 800;

    constructor(
        scaleModel: ScaleModel,
        inputHandler: InputHandler,
        config: Partial<ZoomHandlerConfig> = {},
    ) {
        this.scaleModel = scaleModel;
        this.inputHandler = inputHandler;
        this.config = { ...DEFAULT_ZOOM_HANDLER_CONFIG, ...config };

        this.setupSubscriptions();
    }

    /**
     * Sets the viewport width (for anchor calculations).
     */
    public setViewportWidth(width: Pixel): void {
        this.viewportWidth = width;
    }

    /**
     * Gets the configuration.
     */
    public getConfig(): ZoomHandlerConfig {
        return { ...this.config };
    }

    /**
     * Enables the zoom handler.
     */
    public enable(): void {
        (this.config as { enabled: boolean }).enabled = true;
    }

    /**
     * Disables the zoom handler.
     */
    public disable(): void {
        (this.config as { enabled: boolean }).enabled = false;
    }

    /**
     * Disposes of the handler.
     */
    public dispose(): void {
        for (const sub of this.subscriptions) {
            sub.unsubscribe();
        }
        this.subscriptions.length = 0;
    }

    /**
     * Sets up subscriptions to input handler events.
     */
    private setupSubscriptions(): void {
        this.subscriptions.push(
            this.inputHandler.wheel$.subscribe((event) => {
                if (!this.config.enabled) {
                    return;
                }
                this.handleWheel(event);
            }),
        );
    }

    /**
     * Handles wheel event.
     */
    private handleWheel(event: WheelEventData): void {
        // Calculate zoom factor from wheel delta.
        const delta = event.deltaY;
        const factor = 1 - delta * this.config.sensitivity;

        // Clamp zoom factor.
        const clampedFactor = Math.max(
            1 / this.config.maxZoom,
            Math.min(1 / this.config.minZoom, factor),
        );

        // Calculate anchor point.
        let anchor: ViewportPercent = 0.5;
        if (this.config.anchorToMouse) {
            anchor = event.x / this.viewportWidth;
        }

        // Apply zoom.
        if (this.config.direction === "horizontal" || this.config.direction === "both") {
            this.scaleModel.zoomX(clampedFactor, anchor);
        }
    }
}

// ============================================================================
// Factory functions
// ============================================================================

/**
 * Creates a pan handler.
 */
export function createPanHandler(
    scaleModel: ScaleModel,
    inputHandler: InputHandler,
    config?: Partial<PanHandlerConfig>,
): PanHandler {
    return new PanHandler(scaleModel, inputHandler, config);
}

/**
 * Creates a zoom handler.
 */
export function createZoomHandler(
    scaleModel: ScaleModel,
    inputHandler: InputHandler,
    config?: Partial<ZoomHandlerConfig>,
): ZoomHandler {
    return new ZoomHandler(scaleModel, inputHandler, config);
}

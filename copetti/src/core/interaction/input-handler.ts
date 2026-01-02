/**
 * Input handlers for chart interaction.
 * Following Code Style Guide: Single responsibility, explicit types, cleanup.
 *
 * @doc-tags core,interaction,input
 */

import { Subject } from "rxjs";
import type { Pixel } from "../../types/primitives.ts";
import { assert } from "../assert.ts";

/**
 * Mouse button constants.
 */
export const MouseButton = {
    LEFT: 0,
    MIDDLE: 1,
    RIGHT: 2,
} as const;

/**
 * Pointer event data.
 */
export interface PointerEventData {
    readonly x: Pixel;
    readonly y: Pixel;
    readonly clientX: Pixel;
    readonly clientY: Pixel;
    readonly button: number;
    readonly buttons: number;
    readonly shiftKey: boolean;
    readonly ctrlKey: boolean;
    readonly altKey: boolean;
    readonly metaKey: boolean;
    readonly timestamp: number;
}

/**
 * Wheel event data.
 */
export interface WheelEventData extends PointerEventData {
    readonly deltaX: number;
    readonly deltaY: number;
    readonly deltaZ: number;
    readonly deltaMode: number;
}

/**
 * Drag state.
 */
export interface DragState {
    readonly isDragging: boolean;
    readonly startX: Pixel;
    readonly startY: Pixel;
    readonly currentX: Pixel;
    readonly currentY: Pixel;
    readonly deltaX: Pixel;
    readonly deltaY: Pixel;
}

/**
 * Default drag state.
 */
export const DEFAULT_DRAG_STATE: DragState = {
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
} as const;

/**
 * Input handler configuration.
 */
export interface InputHandlerConfig {
    readonly enableHover: boolean;
    readonly enableClick: boolean;
    readonly enableDrag: boolean;
    readonly enableWheel: boolean;
    readonly enableTouch: boolean;
    readonly dragThreshold: Pixel;
}

/**
 * Default input handler configuration.
 */
export const DEFAULT_INPUT_HANDLER_CONFIG: InputHandlerConfig = {
    enableHover: true,
    enableClick: true,
    enableDrag: true,
    enableWheel: true,
    enableTouch: true,
    dragThreshold: 3,
} as const;

/**
 * Input handler - manages mouse/touch events on a canvas element.
 */
export class InputHandler {
    private readonly config: InputHandlerConfig;
    private readonly element: HTMLElement;
    private dragState: DragState = DEFAULT_DRAG_STATE;
    private isActive = false;

    // Event subjects.
    public readonly mouseMove$ = new Subject<PointerEventData>();
    public readonly mouseDown$ = new Subject<PointerEventData>();
    public readonly mouseUp$ = new Subject<PointerEventData>();
    public readonly mouseEnter$ = new Subject<PointerEventData>();
    public readonly mouseLeave$ = new Subject<PointerEventData>();
    public readonly click$ = new Subject<PointerEventData>();
    public readonly doubleClick$ = new Subject<PointerEventData>();
    public readonly wheel$ = new Subject<WheelEventData>();
    public readonly dragStart$ = new Subject<DragState>();
    public readonly drag$ = new Subject<DragState>();
    public readonly dragEnd$ = new Subject<DragState>();

    // Bound event handlers (for removal).
    private readonly boundHandlers: Record<string, EventListener> = {};

    constructor(element: HTMLElement, config: Partial<InputHandlerConfig> = {}) {
        assert(element !== null, "Element is required");

        this.element = element;
        this.config = { ...DEFAULT_INPUT_HANDLER_CONFIG, ...config };

        this.bindEvents();
    }

    // ========================================================================
    // Public methods
    // ========================================================================

    /**
     * Gets the drag state.
     */
    public getDragState(): DragState {
        return this.dragState;
    }

    /**
     * Checks if currently dragging.
     */
    public isDragging(): boolean {
        return this.dragState.isDragging;
    }

    /**
     * Activates the input handler.
     */
    public activate(): void {
        this.isActive = true;
    }

    /**
     * Deactivates the input handler.
     */
    public deactivate(): void {
        this.isActive = false;
        this.resetDrag();
    }

    /**
     * Disposes of the input handler.
     */
    public dispose(): void {
        this.unbindEvents();

        this.mouseMove$.complete();
        this.mouseDown$.complete();
        this.mouseUp$.complete();
        this.mouseEnter$.complete();
        this.mouseLeave$.complete();
        this.click$.complete();
        this.doubleClick$.complete();
        this.wheel$.complete();
        this.dragStart$.complete();
        this.drag$.complete();
        this.dragEnd$.complete();
    }

    // ========================================================================
    // Private methods
    // ========================================================================

    /**
     * Binds event listeners.
     */
    private bindEvents(): void {
        this.boundHandlers["mousemove"] = this.onMouseMove.bind(this) as EventListener;
        this.boundHandlers["mousedown"] = this.onMouseDown.bind(this) as EventListener;
        this.boundHandlers["mouseup"] = this.onMouseUp.bind(this) as EventListener;
        this.boundHandlers["mouseenter"] = this.onMouseEnter.bind(this) as EventListener;
        this.boundHandlers["mouseleave"] = this.onMouseLeave.bind(this) as EventListener;
        this.boundHandlers["click"] = this.onClick.bind(this) as EventListener;
        this.boundHandlers["dblclick"] = this.onDoubleClick.bind(this) as EventListener;
        this.boundHandlers["wheel"] = this.onWheel.bind(this) as EventListener;

        for (const [event, handler] of Object.entries(this.boundHandlers)) {
            this.element.addEventListener(event, handler);
        }

        // Global mouse up for drag end outside element.
        this.boundHandlers["globalMouseUp"] = this.onGlobalMouseUp.bind(this) as EventListener;
        window.addEventListener("mouseup", this.boundHandlers["globalMouseUp"]);
    }

    /**
     * Unbinds event listeners.
     */
    private unbindEvents(): void {
        for (const [event, handler] of Object.entries(this.boundHandlers)) {
            if (event === "globalMouseUp") {
                window.removeEventListener("mouseup", handler);
            } else {
                this.element.removeEventListener(event, handler);
            }
        }
    }

    /**
     * Creates pointer event data from a mouse event.
     */
    private createPointerData(event: MouseEvent): PointerEventData {
        const rect = this.element.getBoundingClientRect();

        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            clientX: event.clientX,
            clientY: event.clientY,
            button: event.button,
            buttons: event.buttons,
            shiftKey: event.shiftKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            metaKey: event.metaKey,
            timestamp: performance.now(),
        };
    }

    /**
     * Creates wheel event data from a wheel event.
     */
    private createWheelData(event: WheelEvent): WheelEventData {
        const pointerData = this.createPointerData(event);

        return {
            ...pointerData,
            deltaX: event.deltaX,
            deltaY: event.deltaY,
            deltaZ: event.deltaZ,
            deltaMode: event.deltaMode,
        };
    }

    /**
     * Resets drag state.
     */
    private resetDrag(): void {
        if (this.dragState.isDragging) {
            this.dragEnd$.next(this.dragState);
        }
        this.dragState = DEFAULT_DRAG_STATE;
    }

    // ========================================================================
    // Event handlers
    // ========================================================================

    private onMouseMove(event: MouseEvent): void {
        if (!this.isActive && !this.config.enableHover) {
            return;
        }

        const data = this.createPointerData(event);

        // Handle drag.
        if (this.dragState.isDragging) {
            const deltaX = data.x - this.dragState.startX;
            const deltaY = data.y - this.dragState.startY;

            this.dragState = {
                ...this.dragState,
                currentX: data.x,
                currentY: data.y,
                deltaX,
                deltaY,
            };

            this.drag$.next(this.dragState);
        } else if ((event.buttons & 1) !== 0) {
            // Check if we should start dragging.
            const dx = Math.abs(data.x - this.dragState.startX);
            const dy = Math.abs(data.y - this.dragState.startY);

            if (dx > this.config.dragThreshold || dy > this.config.dragThreshold) {
                this.dragState = {
                    ...this.dragState,
                    isDragging: true,
                    currentX: data.x,
                    currentY: data.y,
                };

                this.dragStart$.next(this.dragState);
            }
        }

        this.mouseMove$.next(data);
    }

    private onMouseDown(event: MouseEvent): void {
        const data = this.createPointerData(event);

        if (event.button === MouseButton.LEFT && this.config.enableDrag) {
            this.dragState = {
                isDragging: false,
                startX: data.x,
                startY: data.y,
                currentX: data.x,
                currentY: data.y,
                deltaX: 0,
                deltaY: 0,
            };
        }

        this.mouseDown$.next(data);
    }

    private onMouseUp(event: MouseEvent): void {
        const data = this.createPointerData(event);

        if (this.dragState.isDragging) {
            this.dragEnd$.next(this.dragState);
            this.dragState = DEFAULT_DRAG_STATE;
        }

        this.mouseUp$.next(data);
    }

    private onGlobalMouseUp(event: MouseEvent): void {
        if (this.dragState.isDragging) {
            const data = this.createPointerData(event);
            this.dragState = {
                ...this.dragState,
                currentX: data.x,
                currentY: data.y,
                deltaX: data.x - this.dragState.startX,
                deltaY: data.y - this.dragState.startY,
            };
            this.dragEnd$.next(this.dragState);
            this.dragState = DEFAULT_DRAG_STATE;
        }
    }

    private onMouseEnter(event: MouseEvent): void {
        const data = this.createPointerData(event);
        this.mouseEnter$.next(data);
    }

    private onMouseLeave(event: MouseEvent): void {
        const data = this.createPointerData(event);
        this.mouseLeave$.next(data);
        this.resetDrag();
    }

    private onClick(event: MouseEvent): void {
        if (!this.config.enableClick) {
            return;
        }

        // Don't emit click if we were dragging.
        if (this.dragState.isDragging) {
            return;
        }

        const data = this.createPointerData(event);
        this.click$.next(data);
    }

    private onDoubleClick(event: MouseEvent): void {
        if (!this.config.enableClick) {
            return;
        }

        const data = this.createPointerData(event);
        this.doubleClick$.next(data);
    }

    private onWheel(event: WheelEvent): void {
        if (!this.config.enableWheel) {
            return;
        }

        event.preventDefault();
        const data = this.createWheelData(event);
        this.wheel$.next(data);
    }
}

/**
 * Creates an input handler.
 */
export function createInputHandler(
    element: HTMLElement,
    config?: Partial<InputHandlerConfig>,
): InputHandler {
    return new InputHandler(element, config);
}

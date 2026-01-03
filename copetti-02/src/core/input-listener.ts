/**
 * Input Listener - Centralized input event handling for chart canvas
 * Aggregates and normalizes mouse, touch, and keyboard events
 */

import type { Pixel, Point } from "./types.ts";
import { EventBus, ChartEvents } from "./event-bus.ts";

// ============================================================================
// Types
// ============================================================================

export interface InputPosition {
    x: Pixel;
    y: Pixel;
    clientX: number;
    clientY: number;
    pageX: number;
    pageY: number;
}

export interface MouseInputEvent extends InputPosition {
    type: "mouse";
    button: number;
    buttons: number;
    altKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
    originalEvent: MouseEvent;
}

export interface TouchInputEvent {
    type: "touch";
    touches: InputPosition[];
    changedTouches: InputPosition[];
    altKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
    originalEvent: TouchEvent;
}

export interface WheelInputEvent extends InputPosition {
    type: "wheel";
    deltaX: number;
    deltaY: number;
    deltaZ: number;
    deltaMode: number;
    altKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
    originalEvent: WheelEvent;
}

export interface KeyboardInputEvent {
    type: "keyboard";
    key: string;
    code: string;
    altKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;
    repeat: boolean;
    originalEvent: KeyboardEvent;
}

export type InputEvent = MouseInputEvent | TouchInputEvent | WheelInputEvent | KeyboardInputEvent;

export interface InputListenerCallbacks {
    // Mouse events
    onMouseDown?: (event: MouseInputEvent) => void;
    onMouseUp?: (event: MouseInputEvent) => void;
    onMouseMove?: (event: MouseInputEvent) => void;
    onMouseEnter?: (event: MouseInputEvent) => void;
    onMouseLeave?: (event: MouseInputEvent) => void;
    onClick?: (event: MouseInputEvent) => void;
    onDoubleClick?: (event: MouseInputEvent) => void;
    onContextMenu?: (event: MouseInputEvent) => void;
    onWheel?: (event: WheelInputEvent) => void;

    // Touch events
    onTouchStart?: (event: TouchInputEvent) => void;
    onTouchMove?: (event: TouchInputEvent) => void;
    onTouchEnd?: (event: TouchInputEvent) => void;
    onTouchCancel?: (event: TouchInputEvent) => void;

    // Keyboard events
    onKeyDown?: (event: KeyboardInputEvent) => void;
    onKeyUp?: (event: KeyboardInputEvent) => void;

    // Gesture events
    onPinch?: (scale: number, center: InputPosition) => void;
    onPan?: (delta: Point, event: TouchInputEvent) => void;
    onLongPress?: (position: InputPosition) => void;
}

export interface InputListenerConfig {
    preventDefaultOnWheel: boolean;
    preventDefaultOnTouch: boolean;
    captureKeyboard: boolean;
    longPressDelay: number;
    doubleClickDelay: number;
    pinchThreshold: number;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_INPUT_CONFIG: InputListenerConfig = {
    preventDefaultOnWheel: true,
    preventDefaultOnTouch: true,
    captureKeyboard: false,
    longPressDelay: 500,
    doubleClickDelay: 300,
    pinchThreshold: 10,
};

// ============================================================================
// InputListener Class
// ============================================================================

export class InputListener {
    private element: HTMLElement;
    private config: InputListenerConfig;
    private callbacks: InputListenerCallbacks;
    private eventBus?: EventBus<ChartEvents>;

    // State
    private isMouseDown = false;
    private lastMousePosition: InputPosition | null = null;
    private lastTouchPositions: InputPosition[] = [];
    private lastTouchDistance = 0;
    private longPressTimer: ReturnType<typeof setTimeout> | null = null;
    private lastClickTime = 0;
    private lastClickPosition: InputPosition | null = null;

    // Bound event handlers
    private boundHandlers: Record<string, EventListener> = {};

    constructor(
        element: HTMLElement,
        callbacks: InputListenerCallbacks = {},
        config: Partial<InputListenerConfig> = {}
    ) {
        this.element = element;
        this.callbacks = callbacks;
        this.config = { ...DEFAULT_INPUT_CONFIG, ...config };

        this.bindEventHandlers();
        this.attachEventListeners();
    }

    /**
     * Set event bus for integration
     */
    setEventBus(bus: EventBus<ChartEvents>): void {
        this.eventBus = bus;
    }

    /**
     * Update callbacks
     */
    setCallbacks(callbacks: Partial<InputListenerCallbacks>): void {
        this.callbacks = { ...this.callbacks, ...callbacks };
    }

    /**
     * Update config
     */
    setConfig(config: Partial<InputListenerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current mouse state
     */
    isPressed(): boolean {
        return this.isMouseDown;
    }

    /**
     * Get last mouse position
     */
    getLastPosition(): InputPosition | null {
        return this.lastMousePosition;
    }

    /**
     * Destroy and cleanup
     */
    destroy(): void {
        this.detachEventListeners();
        this.clearLongPressTimer();
    }

    // Private methods - Event binding

    private bindEventHandlers(): void {
        this.boundHandlers = {
            mousedown: this.handleMouseDown.bind(this) as EventListener,
            mouseup: this.handleMouseUp.bind(this) as EventListener,
            mousemove: this.handleMouseMove.bind(this) as EventListener,
            mouseenter: this.handleMouseEnter.bind(this) as EventListener,
            mouseleave: this.handleMouseLeave.bind(this) as EventListener,
            click: this.handleClick.bind(this) as EventListener,
            dblclick: this.handleDoubleClick.bind(this) as EventListener,
            contextmenu: this.handleContextMenu.bind(this) as EventListener,
            wheel: this.handleWheel.bind(this) as EventListener,
            touchstart: this.handleTouchStart.bind(this) as EventListener,
            touchmove: this.handleTouchMove.bind(this) as EventListener,
            touchend: this.handleTouchEnd.bind(this) as EventListener,
            touchcancel: this.handleTouchCancel.bind(this) as EventListener,
            keydown: this.handleKeyDown.bind(this) as EventListener,
            keyup: this.handleKeyUp.bind(this) as EventListener,
        };
    }

    private attachEventListeners(): void {
        // Mouse events
        this.element.addEventListener("mousedown", this.boundHandlers.mousedown);
        this.element.addEventListener("mouseup", this.boundHandlers.mouseup);
        this.element.addEventListener("mousemove", this.boundHandlers.mousemove);
        this.element.addEventListener("mouseenter", this.boundHandlers.mouseenter);
        this.element.addEventListener("mouseleave", this.boundHandlers.mouseleave);
        this.element.addEventListener("click", this.boundHandlers.click);
        this.element.addEventListener("dblclick", this.boundHandlers.dblclick);
        this.element.addEventListener("contextmenu", this.boundHandlers.contextmenu);
        this.element.addEventListener("wheel", this.boundHandlers.wheel, { passive: false });

        // Touch events
        this.element.addEventListener("touchstart", this.boundHandlers.touchstart, { passive: false });
        this.element.addEventListener("touchmove", this.boundHandlers.touchmove, { passive: false });
        this.element.addEventListener("touchend", this.boundHandlers.touchend);
        this.element.addEventListener("touchcancel", this.boundHandlers.touchcancel);

        // Keyboard events (on document if capturing)
        if (this.config.captureKeyboard) {
            document.addEventListener("keydown", this.boundHandlers.keydown);
            document.addEventListener("keyup", this.boundHandlers.keyup);
        }

        // Document-level mouse up for drag release outside element
        document.addEventListener("mouseup", this.boundHandlers.mouseup);
    }

    private detachEventListeners(): void {
        this.element.removeEventListener("mousedown", this.boundHandlers.mousedown);
        this.element.removeEventListener("mouseup", this.boundHandlers.mouseup);
        this.element.removeEventListener("mousemove", this.boundHandlers.mousemove);
        this.element.removeEventListener("mouseenter", this.boundHandlers.mouseenter);
        this.element.removeEventListener("mouseleave", this.boundHandlers.mouseleave);
        this.element.removeEventListener("click", this.boundHandlers.click);
        this.element.removeEventListener("dblclick", this.boundHandlers.dblclick);
        this.element.removeEventListener("contextmenu", this.boundHandlers.contextmenu);
        this.element.removeEventListener("wheel", this.boundHandlers.wheel);
        this.element.removeEventListener("touchstart", this.boundHandlers.touchstart);
        this.element.removeEventListener("touchmove", this.boundHandlers.touchmove);
        this.element.removeEventListener("touchend", this.boundHandlers.touchend);
        this.element.removeEventListener("touchcancel", this.boundHandlers.touchcancel);

        if (this.config.captureKeyboard) {
            document.removeEventListener("keydown", this.boundHandlers.keydown);
            document.removeEventListener("keyup", this.boundHandlers.keyup);
        }

        document.removeEventListener("mouseup", this.boundHandlers.mouseup);
    }

    // Private methods - Event handlers

    private handleMouseDown(e: MouseEvent): void {
        this.isMouseDown = true;
        const event = this.createMouseEvent(e);
        this.lastMousePosition = event;
        this.callbacks.onMouseDown?.(event);
        this.eventBus?.emit("mouse:down", { x: event.x, y: event.y, button: e.button });
    }

    private handleMouseUp(e: MouseEvent): void {
        if (!this.isMouseDown) return;
        this.isMouseDown = false;
        const event = this.createMouseEvent(e);
        this.callbacks.onMouseUp?.(event);
        this.eventBus?.emit("mouse:up", { x: event.x, y: event.y, button: e.button });
    }

    private handleMouseMove(e: MouseEvent): void {
        const event = this.createMouseEvent(e);
        this.lastMousePosition = event;
        this.callbacks.onMouseMove?.(event);
        this.eventBus?.emit("mouse:move", { x: event.x, y: event.y });
    }

    private handleMouseEnter(e: MouseEvent): void {
        const event = this.createMouseEvent(e);
        this.callbacks.onMouseEnter?.(event);
        this.eventBus?.emit("mouse:enter", { x: event.x, y: event.y });
    }

    private handleMouseLeave(e: MouseEvent): void {
        const event = this.createMouseEvent(e);
        this.callbacks.onMouseLeave?.(event);
        this.eventBus?.emit("mouse:leave");
    }

    private handleClick(e: MouseEvent): void {
        const event = this.createMouseEvent(e);
        const now = Date.now();

        // Check for double-click simulation
        if (
            this.lastClickPosition &&
            now - this.lastClickTime < this.config.doubleClickDelay &&
            Math.abs(event.x - this.lastClickPosition.x) < 5 &&
            Math.abs(event.y - this.lastClickPosition.y) < 5
        ) {
            // This is a double click, don't fire click
            this.lastClickTime = 0;
            this.lastClickPosition = null;
            return;
        }

        this.lastClickTime = now;
        this.lastClickPosition = event;
        this.callbacks.onClick?.(event);
        this.eventBus?.emit("click", { x: event.x, y: event.y });
    }

    private handleDoubleClick(e: MouseEvent): void {
        const event = this.createMouseEvent(e);
        this.callbacks.onDoubleClick?.(event);
        this.eventBus?.emit("dblclick", { x: event.x, y: event.y });
    }

    private handleContextMenu(e: MouseEvent): void {
        e.preventDefault();
        const event = this.createMouseEvent(e);
        this.callbacks.onContextMenu?.(event);
        this.eventBus?.emit("contextmenu", { x: event.x, y: event.y });
    }

    private handleWheel(e: WheelEvent): void {
        if (this.config.preventDefaultOnWheel) {
            e.preventDefault();
        }
        const event = this.createWheelEvent(e);
        this.callbacks.onWheel?.(event);
    }

    private handleTouchStart(e: TouchEvent): void {
        if (this.config.preventDefaultOnTouch) {
            e.preventDefault();
        }

        const event = this.createTouchEvent(e);
        this.lastTouchPositions = event.touches;

        if (event.touches.length === 2) {
            this.lastTouchDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
        }

        // Start long press timer
        if (event.touches.length === 1) {
            this.startLongPressTimer(event.touches[0]);
        }

        this.callbacks.onTouchStart?.(event);
        this.eventBus?.emit("touch:start", { touches: event.touches.map(t => ({ x: t.x, y: t.y })) });
    }

    private handleTouchMove(e: TouchEvent): void {
        if (this.config.preventDefaultOnTouch) {
            e.preventDefault();
        }

        this.clearLongPressTimer();

        const event = this.createTouchEvent(e);

        // Detect pinch gesture
        if (event.touches.length === 2 && this.lastTouchPositions.length === 2) {
            const currentDistance = this.getTouchDistance(event.touches[0], event.touches[1]);
            const scale = currentDistance / this.lastTouchDistance;

            if (Math.abs(currentDistance - this.lastTouchDistance) > this.config.pinchThreshold) {
                const center: InputPosition = {
                    x: (event.touches[0].x + event.touches[1].x) / 2,
                    y: (event.touches[0].y + event.touches[1].y) / 2,
                    clientX: (event.touches[0].clientX + event.touches[1].clientX) / 2,
                    clientY: (event.touches[0].clientY + event.touches[1].clientY) / 2,
                    pageX: (event.touches[0].pageX + event.touches[1].pageX) / 2,
                    pageY: (event.touches[0].pageY + event.touches[1].pageY) / 2,
                };
                this.callbacks.onPinch?.(scale, center);
                this.eventBus?.emit("gesture:pinch", { scale, centerX: center.x, centerY: center.y });
            }

            this.lastTouchDistance = currentDistance;
        }

        // Detect pan gesture
        if (event.touches.length === 1 && this.lastTouchPositions.length === 1) {
            const delta: Point = {
                x: event.touches[0].x - this.lastTouchPositions[0].x,
                y: event.touches[0].y - this.lastTouchPositions[0].y,
            };
            this.callbacks.onPan?.(delta, event);
            this.eventBus?.emit("gesture:pan", { deltaX: delta.x, deltaY: delta.y });
        }

        this.lastTouchPositions = event.touches;
        this.callbacks.onTouchMove?.(event);
        this.eventBus?.emit("touch:move", { touches: event.touches.map(t => ({ x: t.x, y: t.y })) });
    }

    private handleTouchEnd(e: TouchEvent): void {
        this.clearLongPressTimer();

        const event = this.createTouchEvent(e);
        this.lastTouchPositions = event.touches;
        this.callbacks.onTouchEnd?.(event);
        this.eventBus?.emit("touch:end", { touches: event.touches.map(t => ({ x: t.x, y: t.y })) });
    }

    private handleTouchCancel(e: TouchEvent): void {
        this.clearLongPressTimer();

        const event = this.createTouchEvent(e);
        this.lastTouchPositions = [];
        this.callbacks.onTouchCancel?.(event);
    }

    private handleKeyDown(e: KeyboardEvent): void {
        const event = this.createKeyboardEvent(e);
        this.callbacks.onKeyDown?.(event);
    }

    private handleKeyUp(e: KeyboardEvent): void {
        const event = this.createKeyboardEvent(e);
        this.callbacks.onKeyUp?.(event);
    }

    // Private methods - Event creation

    private createMouseEvent(e: MouseEvent): MouseInputEvent {
        const rect = this.element.getBoundingClientRect();
        return {
            type: "mouse",
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            clientX: e.clientX,
            clientY: e.clientY,
            pageX: e.pageX,
            pageY: e.pageY,
            button: e.button,
            buttons: e.buttons,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            originalEvent: e,
        };
    }

    private createTouchEvent(e: TouchEvent): TouchInputEvent {
        const rect = this.element.getBoundingClientRect();

        const touchToPosition = (touch: Touch): InputPosition => ({
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
            clientX: touch.clientX,
            clientY: touch.clientY,
            pageX: touch.pageX,
            pageY: touch.pageY,
        });

        return {
            type: "touch",
            touches: Array.from(e.touches).map(touchToPosition),
            changedTouches: Array.from(e.changedTouches).map(touchToPosition),
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            originalEvent: e,
        };
    }

    private createWheelEvent(e: WheelEvent): WheelInputEvent {
        const rect = this.element.getBoundingClientRect();
        return {
            type: "wheel",
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            clientX: e.clientX,
            clientY: e.clientY,
            pageX: e.pageX,
            pageY: e.pageY,
            deltaX: e.deltaX,
            deltaY: e.deltaY,
            deltaZ: e.deltaZ,
            deltaMode: e.deltaMode,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            originalEvent: e,
        };
    }

    private createKeyboardEvent(e: KeyboardEvent): KeyboardInputEvent {
        return {
            type: "keyboard",
            key: e.key,
            code: e.code,
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            repeat: e.repeat,
            originalEvent: e,
        };
    }

    // Private methods - Helpers

    private getTouchDistance(t1: InputPosition, t2: InputPosition): number {
        const dx = t2.x - t1.x;
        const dy = t2.y - t1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    private startLongPressTimer(position: InputPosition): void {
        this.clearLongPressTimer();
        this.longPressTimer = setTimeout(() => {
            this.callbacks.onLongPress?.(position);
        }, this.config.longPressDelay);
    }

    private clearLongPressTimer(): void {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }
}

// ============================================================================
// Factory
// ============================================================================

export function createInputListener(
    element: HTMLElement,
    callbacks?: InputListenerCallbacks,
    config?: Partial<InputListenerConfig>
): InputListener {
    return new InputListener(element, callbacks, config);
}

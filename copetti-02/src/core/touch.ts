/**
 * Touch/gesture support for mobile devices.
 * Handles pinch-to-zoom, pan, and tap gestures.
 */

import type { Point } from "./types.ts";

/** Touch state tracking. */
export interface TouchState {
    /** Is a touch gesture active. */
    active: boolean;
    /** Number of active touch points. */
    touchCount: number;
    /** Current touch points. */
    points: Point[];
    /** Initial touch points (at gesture start). */
    startPoints: Point[];
    /** Initial pinch distance (for zoom). */
    startPinchDistance: number;
    /** Current pinch distance. */
    pinchDistance: number;
    /** Pinch center point. */
    pinchCenter: Point;
    /** Is this a pan gesture. */
    isPanning: boolean;
    /** Is this a pinch gesture. */
    isPinching: boolean;
    /** Last tap time (for double-tap detection). */
    lastTapTime: number;
    /** Last tap position. */
    lastTapPosition: Point;
}

/** Touch event callbacks. */
export interface TouchCallbacks {
    onPanStart?: (point: Point) => void;
    onPanMove?: (point: Point, delta: Point) => void;
    onPanEnd?: (point: Point) => void;
    onPinchStart?: (center: Point, distance: number) => void;
    onPinchMove?: (center: Point, scale: number) => void;
    onPinchEnd?: () => void;
    onTap?: (point: Point) => void;
    onDoubleTap?: (point: Point) => void;
    onLongPress?: (point: Point) => void;
}

/** Touch handler configuration. */
export interface TouchConfig {
    /** Minimum distance to start pan (pixels). */
    panThreshold: number;
    /** Double-tap max interval (ms). */
    doubleTapInterval: number;
    /** Long press duration (ms). */
    longPressDuration: number;
    /** Enable pinch-to-zoom. */
    enablePinch: boolean;
    /** Enable pan gestures. */
    enablePan: boolean;
}

/** Default touch configuration. */
const DEFAULT_TOUCH_CONFIG: TouchConfig = {
    panThreshold: 5,
    doubleTapInterval: 300,
    longPressDuration: 500,
    enablePinch: true,
    enablePan: true,
};

/** Calculate distance between two points. */
function getDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/** Calculate center point between two points. */
function getCenter(p1: Point, p2: Point): Point {
    return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
    };
}

/** Extract point from touch event. */
function getTouchPoint(touch: Touch, rect: DOMRect): Point {
    return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
    };
}

/** Touch handler class. */
export class TouchHandler {
    private element: HTMLElement;
    private config: TouchConfig;
    private callbacks: TouchCallbacks;
    private state: TouchState;
    private longPressTimer: ReturnType<typeof setTimeout> | null = null;
    private boundHandlers: {
        touchStart: (e: TouchEvent) => void;
        touchMove: (e: TouchEvent) => void;
        touchEnd: (e: TouchEvent) => void;
        touchCancel: (e: TouchEvent) => void;
    };

    constructor(
        element: HTMLElement,
        callbacks: TouchCallbacks,
        config: Partial<TouchConfig> = {},
    ) {
        this.element = element;
        this.callbacks = callbacks;
        this.config = { ...DEFAULT_TOUCH_CONFIG, ...config };

        this.state = this.createInitialState();

        // Bind handlers.
        this.boundHandlers = {
            touchStart: this.handleTouchStart.bind(this),
            touchMove: this.handleTouchMove.bind(this),
            touchEnd: this.handleTouchEnd.bind(this),
            touchCancel: this.handleTouchCancel.bind(this),
        };

        this.attach();
    }

    /** Create initial state. */
    private createInitialState(): TouchState {
        return {
            active: false,
            touchCount: 0,
            points: [],
            startPoints: [],
            startPinchDistance: 0,
            pinchDistance: 0,
            pinchCenter: { x: 0, y: 0 },
            isPanning: false,
            isPinching: false,
            lastTapTime: 0,
            lastTapPosition: { x: 0, y: 0 },
        };
    }

    /** Attach event listeners. */
    attach(): void {
        this.element.addEventListener("touchstart", this.boundHandlers.touchStart, { passive: false });
        this.element.addEventListener("touchmove", this.boundHandlers.touchMove, { passive: false });
        this.element.addEventListener("touchend", this.boundHandlers.touchEnd, { passive: false });
        this.element.addEventListener("touchcancel", this.boundHandlers.touchCancel, { passive: false });
    }

    /** Detach event listeners. */
    detach(): void {
        this.element.removeEventListener("touchstart", this.boundHandlers.touchStart);
        this.element.removeEventListener("touchmove", this.boundHandlers.touchMove);
        this.element.removeEventListener("touchend", this.boundHandlers.touchEnd);
        this.element.removeEventListener("touchcancel", this.boundHandlers.touchCancel);
        this.clearLongPressTimer();
    }

    /** Clear long press timer. */
    private clearLongPressTimer(): void {
        if (this.longPressTimer !== null) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    /** Handle touch start. */
    private handleTouchStart(e: TouchEvent): void {
        e.preventDefault();

        const rect = this.element.getBoundingClientRect();
        const touches = e.touches;

        this.state.active = true;
        this.state.touchCount = touches.length;
        this.state.points = [];
        this.state.startPoints = [];

        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            if (touch) {
                const point = getTouchPoint(touch, rect);
                this.state.points.push(point);
                this.state.startPoints.push({ ...point });
            }
        }

        if (touches.length === 1) {
            // Single touch - potential pan or tap.
            this.state.isPanning = false;
            this.state.isPinching = false;

            // Start long press timer.
            this.clearLongPressTimer();
            this.longPressTimer = setTimeout(() => {
                if (this.state.active && !this.state.isPanning && this.state.points[0]) {
                    this.callbacks.onLongPress?.(this.state.points[0]);
                }
            }, this.config.longPressDuration);

        } else if (touches.length === 2 && this.config.enablePinch) {
            // Two touches - pinch gesture.
            this.clearLongPressTimer();
            this.state.isPinching = true;
            this.state.isPanning = false;

            const p1 = this.state.points[0]!;
            const p2 = this.state.points[1]!;
            this.state.startPinchDistance = getDistance(p1, p2);
            this.state.pinchDistance = this.state.startPinchDistance;
            this.state.pinchCenter = getCenter(p1, p2);

            this.callbacks.onPinchStart?.(this.state.pinchCenter, this.state.startPinchDistance);
        }
    }

    /** Handle touch move. */
    private handleTouchMove(e: TouchEvent): void {
        if (!this.state.active) return;
        e.preventDefault();

        const rect = this.element.getBoundingClientRect();
        const touches = e.touches;

        // Update current points.
        this.state.points = [];
        for (let i = 0; i < touches.length; i++) {
            const touch = touches[i];
            if (touch) {
                this.state.points.push(getTouchPoint(touch, rect));
            }
        }

        if (touches.length === 1 && this.config.enablePan) {
            const point = this.state.points[0];
            const startPoint = this.state.startPoints[0];

            if (point && startPoint) {
                const dx = point.x - startPoint.x;
                const dy = point.y - startPoint.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (!this.state.isPanning && distance > this.config.panThreshold) {
                    // Start panning.
                    this.state.isPanning = true;
                    this.clearLongPressTimer();
                    this.callbacks.onPanStart?.(startPoint);
                }

                if (this.state.isPanning) {
                    const delta: Point = { x: dx, y: dy };
                    this.callbacks.onPanMove?.(point, delta);
                }
            }

        } else if (touches.length === 2 && this.state.isPinching) {
            const p1 = this.state.points[0];
            const p2 = this.state.points[1];

            if (p1 && p2) {
                this.state.pinchDistance = getDistance(p1, p2);
                this.state.pinchCenter = getCenter(p1, p2);

                const scale = this.state.pinchDistance / this.state.startPinchDistance;
                this.callbacks.onPinchMove?.(this.state.pinchCenter, scale);
            }
        }
    }

    /** Handle touch end. */
    private handleTouchEnd(e: TouchEvent): void {
        e.preventDefault();

        const wasActive = this.state.active;
        const wasPanning = this.state.isPanning;
        const wasPinching = this.state.isPinching;
        const remainingTouches = e.touches.length;

        this.clearLongPressTimer();

        if (remainingTouches === 0) {
            // All touches ended.
            this.state.active = false;

            if (wasPanning && this.state.points[0]) {
                this.callbacks.onPanEnd?.(this.state.points[0]);
            } else if (wasPinching) {
                this.callbacks.onPinchEnd?.();
            } else if (wasActive && !wasPanning && !wasPinching) {
                // This was a tap.
                const point = this.state.startPoints[0];
                if (point) {
                    const now = Date.now();
                    const timeSinceLastTap = now - this.state.lastTapTime;
                    const distanceFromLastTap = getDistance(point, this.state.lastTapPosition);

                    if (timeSinceLastTap < this.config.doubleTapInterval && distanceFromLastTap < 30) {
                        // Double tap.
                        this.callbacks.onDoubleTap?.(point);
                        this.state.lastTapTime = 0;
                    } else {
                        // Single tap.
                        this.callbacks.onTap?.(point);
                        this.state.lastTapTime = now;
                        this.state.lastTapPosition = { ...point };
                    }
                }
            }

            // Reset state.
            this.state = this.createInitialState();

        } else if (remainingTouches === 1 && wasPinching) {
            // Transition from pinch to pan.
            this.callbacks.onPinchEnd?.();
            this.state.isPinching = false;

            const rect = this.element.getBoundingClientRect();
            const touch = e.touches[0];
            if (touch) {
                const point = getTouchPoint(touch, rect);
                this.state.points = [point];
                this.state.startPoints = [{ ...point }];
                this.state.isPanning = false;
            }
        }

        this.state.touchCount = remainingTouches;
    }

    /** Handle touch cancel. */
    private handleTouchCancel(e: TouchEvent): void {
        this.clearLongPressTimer();

        if (this.state.isPanning && this.state.points[0]) {
            this.callbacks.onPanEnd?.(this.state.points[0]);
        }
        if (this.state.isPinching) {
            this.callbacks.onPinchEnd?.();
        }

        this.state = this.createInitialState();
    }

    /** Get current touch state. */
    getState(): Readonly<TouchState> {
        return this.state;
    }

    /** Update configuration. */
    setConfig(config: Partial<TouchConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /** Update callbacks. */
    setCallbacks(callbacks: TouchCallbacks): void {
        this.callbacks = callbacks;
    }
}

/** Check if device supports touch. */
export function isTouchDevice(): boolean {
    return (
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore - msMaxTouchPoints is IE-specific
        (navigator.msMaxTouchPoints ?? 0) > 0
    );
}

/** Create touch handler for a chart element. */
export function createTouchHandler(
    element: HTMLElement,
    callbacks: TouchCallbacks,
    config?: Partial<TouchConfig>,
): TouchHandler {
    return new TouchHandler(element, callbacks, config);
}

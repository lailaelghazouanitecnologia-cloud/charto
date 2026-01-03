/**
 * EventBus - Pub/Sub system for chart events
 * Provides decoupled communication between chart components
 */

// ============================================================================
// Types
// ============================================================================

export type EventCallback<T = unknown> = (data: T) => void;
export type UnsubscribeFn = () => void;

export interface EventSubscription {
    id: string;
    event: string;
    callback: EventCallback;
    once: boolean;
}

export interface ChartEvents {
    // Rendering events
    "draw": void;
    "redraw": void;
    "render:start": void;
    "render:end": { duration: number };

    // Data events
    "data:set": { count: number };
    "data:update": { count: number };
    "data:append": { candle: unknown };
    "data:clear": void;

    // Viewport events
    "viewport:change": { startIndex: number; endIndex: number; priceMin: number; priceMax: number };
    "viewport:pan": { deltaX: number; deltaY: number };
    "viewport:zoom": { factor: number; centerX: number };
    "viewport:reset": void;

    // Scale events
    "scale:x:change": { min: number; max: number };
    "scale:y:change": { min: number; max: number };
    "scale:auto": { enabled: boolean };
    "scale:lock": { enabled: boolean };

    // Crosshair events
    "crosshair:move": { x: number; y: number; price: number; time: number };
    "crosshair:show": void;
    "crosshair:hide": void;

    // Interaction events
    "mouse:enter": { x: number; y: number };
    "mouse:leave": void;
    "mouse:move": { x: number; y: number };
    "mouse:down": { x: number; y: number; button: number };
    "mouse:up": { x: number; y: number; button: number };
    "click": { x: number; y: number };
    "dblclick": { x: number; y: number };
    "contextmenu": { x: number; y: number };

    // Touch events
    "touch:start": { touches: Array<{ x: number; y: number }> };
    "touch:move": { touches: Array<{ x: number; y: number }> };
    "touch:end": { touches: Array<{ x: number; y: number }> };
    "gesture:pinch": { scale: number; centerX: number; centerY: number };
    "gesture:pan": { deltaX: number; deltaY: number };

    // Drawing events
    "drawing:add": { id: string; type: string };
    "drawing:remove": { id: string };
    "drawing:update": { id: string };
    "drawing:select": { id: string | null };
    "drawing:hover": { id: string | null };

    // Pane events
    "pane:add": { id: string; type: string };
    "pane:remove": { id: string };
    "pane:resize": { id: string; height: number };
    "pane:reorder": { order: string[] };

    // Indicator events
    "indicator:add": { id: string; type: string };
    "indicator:remove": { id: string };
    "indicator:update": { id: string };

    // Theme events
    "theme:change": { theme: string };

    // Lifecycle events
    "init": void;
    "ready": void;
    "destroy": void;
    "resize": { width: number; height: number };

    // Navigation map events
    "navmap:drag": { startRatio: number; endRatio: number };
    "navmap:resize": { edge: "left" | "right"; ratio: number };

    // Streaming events
    "stream:connect": void;
    "stream:disconnect": void;
    "stream:tick": { price: number; volume: number; timestamp: number };
    "stream:error": { error: Error };
}

// ============================================================================
// EventBus Implementation
// ============================================================================

export class EventBus<TEvents extends Record<string, unknown> = ChartEvents> {
    private listeners: Map<keyof TEvents, Set<EventSubscription>> = new Map();
    private subscriptionCounter = 0;
    private muted = false;
    private eventQueue: Array<{ event: keyof TEvents; data: unknown }> = [];
    private batchMode = false;

    /**
     * Subscribe to an event
     */
    on<K extends keyof TEvents>(
        event: K,
        callback: EventCallback<TEvents[K]>
    ): UnsubscribeFn {
        return this.subscribe(event, callback, false);
    }

    /**
     * Subscribe to an event (fires only once)
     */
    once<K extends keyof TEvents>(
        event: K,
        callback: EventCallback<TEvents[K]>
    ): UnsubscribeFn {
        return this.subscribe(event, callback, true);
    }

    /**
     * Unsubscribe from an event
     */
    off<K extends keyof TEvents>(
        event: K,
        callback: EventCallback<TEvents[K]>
    ): void {
        const listeners = this.listeners.get(event);
        if (!listeners) return;

        for (const sub of listeners) {
            if (sub.callback === callback) {
                listeners.delete(sub);
                break;
            }
        }
    }

    /**
     * Emit an event to all subscribers
     */
    emit<K extends keyof TEvents>(
        event: K,
        data?: TEvents[K]
    ): void {
        if (this.muted) return;

        if (this.batchMode) {
            this.eventQueue.push({ event, data });
            return;
        }

        this.dispatchEvent(event, data);
    }

    /**
     * Emit a draw event (common operation)
     */
    fireDraw(): void {
        this.emit("draw" as keyof TEvents);
    }

    /**
     * Emit a redraw event (full refresh)
     */
    fireRedraw(): void {
        this.emit("redraw" as keyof TEvents);
    }

    /**
     * Mute all events
     */
    setMuted(muted: boolean): void {
        this.muted = muted;
    }

    /**
     * Check if events are muted
     */
    isMuted(): boolean {
        return this.muted;
    }

    /**
     * Start batching events
     */
    startBatch(): void {
        this.batchMode = true;
    }

    /**
     * Flush all batched events
     */
    flushBatch(): void {
        this.batchMode = false;
        const queue = [...this.eventQueue];
        this.eventQueue = [];

        for (const { event, data } of queue) {
            this.dispatchEvent(event, data);
        }
    }

    /**
     * Clear batch without emitting
     */
    clearBatch(): void {
        this.batchMode = false;
        this.eventQueue = [];
    }

    /**
     * Remove all listeners for an event
     */
    removeAllListeners<K extends keyof TEvents>(event?: K): void {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }

    /**
     * Get listener count for an event
     */
    listenerCount<K extends keyof TEvents>(event: K): number {
        return this.listeners.get(event)?.size ?? 0;
    }

    /**
     * Get all registered events
     */
    eventNames(): Array<keyof TEvents> {
        return Array.from(this.listeners.keys());
    }

    /**
     * Create a child bus that forwards events to parent
     */
    createChild(): EventBus<TEvents> {
        const child = new EventBus<TEvents>();
        const originalEmit = child.emit.bind(child);

        child.emit = <K extends keyof TEvents>(event: K, data?: TEvents[K]) => {
            originalEmit(event, data);
            this.emit(event, data);
        };

        return child;
    }

    /**
     * Wait for an event (Promise-based)
     */
    waitFor<K extends keyof TEvents>(
        event: K,
        timeout?: number
    ): Promise<TEvents[K]> {
        return new Promise((resolve, reject) => {
            let timeoutId: ReturnType<typeof setTimeout> | undefined;

            const unsub = this.once(event, (data) => {
                if (timeoutId) clearTimeout(timeoutId);
                resolve(data);
            });

            if (timeout) {
                timeoutId = setTimeout(() => {
                    unsub();
                    reject(new Error(`Timeout waiting for event: ${String(event)}`));
                }, timeout);
            }
        });
    }

    /**
     * Create a filtered event stream
     */
    filter<K extends keyof TEvents>(
        event: K,
        predicate: (data: TEvents[K]) => boolean
    ): { on: (callback: EventCallback<TEvents[K]>) => UnsubscribeFn } {
        return {
            on: (callback) => {
                return this.on(event, (data) => {
                    if (predicate(data)) {
                        callback(data);
                    }
                });
            },
        };
    }

    /**
     * Map event data to a new format
     */
    map<K extends keyof TEvents, R>(
        event: K,
        mapper: (data: TEvents[K]) => R
    ): { on: (callback: EventCallback<R>) => UnsubscribeFn } {
        return {
            on: (callback) => {
                return this.on(event, (data) => {
                    callback(mapper(data));
                });
            },
        };
    }

    /**
     * Debounce event emissions
     */
    debounce<K extends keyof TEvents>(
        event: K,
        delay: number
    ): { on: (callback: EventCallback<TEvents[K]>) => UnsubscribeFn } {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        let lastData: TEvents[K];

        return {
            on: (callback) => {
                return this.on(event, (data) => {
                    lastData = data;
                    if (timeoutId) clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => {
                        callback(lastData);
                    }, delay);
                });
            },
        };
    }

    /**
     * Throttle event emissions
     */
    throttle<K extends keyof TEvents>(
        event: K,
        interval: number
    ): { on: (callback: EventCallback<TEvents[K]>) => UnsubscribeFn } {
        let lastTime = 0;

        return {
            on: (callback) => {
                return this.on(event, (data) => {
                    const now = Date.now();
                    if (now - lastTime >= interval) {
                        lastTime = now;
                        callback(data);
                    }
                });
            },
        };
    }

    // Private methods

    private subscribe<K extends keyof TEvents>(
        event: K,
        callback: EventCallback<TEvents[K]>,
        once: boolean
    ): UnsubscribeFn {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }

        const subscription: EventSubscription = {
            id: `sub_${++this.subscriptionCounter}`,
            event: String(event),
            callback: callback as EventCallback,
            once,
        };

        this.listeners.get(event)!.add(subscription);

        return () => {
            this.listeners.get(event)?.delete(subscription);
        };
    }

    private dispatchEvent<K extends keyof TEvents>(
        event: K,
        data: unknown
    ): void {
        const listeners = this.listeners.get(event);
        if (!listeners) return;

        for (const sub of listeners) {
            try {
                sub.callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${String(event)}:`, error);
            }

            if (sub.once) {
                listeners.delete(sub);
            }
        }
    }
}

// ============================================================================
// Singleton instance for global chart events
// ============================================================================

let globalBus: EventBus | null = null;

export function getGlobalEventBus(): EventBus {
    if (!globalBus) {
        globalBus = new EventBus();
    }
    return globalBus;
}

export function createEventBus<TEvents extends Record<string, unknown> = ChartEvents>(): EventBus<TEvents> {
    return new EventBus<TEvents>();
}

// ============================================================================
// Event utilities
// ============================================================================

/**
 * Combine multiple event buses into one
 */
export function mergeEventBuses<TEvents extends Record<string, unknown>>(
    ...buses: EventBus<TEvents>[]
): EventBus<TEvents> {
    const merged = new EventBus<TEvents>();

    for (const bus of buses) {
        for (const event of bus.eventNames()) {
            bus.on(event, (data) => {
                merged.emit(event, data as TEvents[typeof event]);
            });
        }
    }

    return merged;
}

/**
 * Create an event emitter from a DOM element
 */
export function fromDOMEvents(
    element: HTMLElement
): EventBus<{
    click: MouseEvent;
    dblclick: MouseEvent;
    mousedown: MouseEvent;
    mouseup: MouseEvent;
    mousemove: MouseEvent;
    mouseenter: MouseEvent;
    mouseleave: MouseEvent;
    wheel: WheelEvent;
    touchstart: TouchEvent;
    touchmove: TouchEvent;
    touchend: TouchEvent;
    keydown: KeyboardEvent;
    keyup: KeyboardEvent;
    resize: UIEvent;
}> {
    const bus = new EventBus<{
        click: MouseEvent;
        dblclick: MouseEvent;
        mousedown: MouseEvent;
        mouseup: MouseEvent;
        mousemove: MouseEvent;
        mouseenter: MouseEvent;
        mouseleave: MouseEvent;
        wheel: WheelEvent;
        touchstart: TouchEvent;
        touchmove: TouchEvent;
        touchend: TouchEvent;
        keydown: KeyboardEvent;
        keyup: KeyboardEvent;
        resize: UIEvent;
    }>();

    const events = [
        "click", "dblclick", "mousedown", "mouseup", "mousemove",
        "mouseenter", "mouseleave", "wheel", "touchstart", "touchmove",
        "touchend", "keydown", "keyup"
    ] as const;

    for (const event of events) {
        element.addEventListener(event, (e) => {
            bus.emit(event, e as never);
        });
    }

    return bus;
}

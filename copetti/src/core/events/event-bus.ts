/**
 * Event bus for chart internal communication.
 * Following Code Style Guide: Explicit control flow, bounded operations.
 *
 * @doc-tags core,events
 */

import { assert, assertDefined } from "../assert.ts";

/**
 * Event types used internally by the chart.
 */
export const ChartEvents = {
    DRAW: "chart:draw",
    RESIZE: "chart:resize",
    DATA_UPDATED: "chart:data:updated",
    SCALE_CHANGED: "chart:scale:changed",
    CROSSHAIR_MOVED: "chart:crosshair:moved",
    PANE_ADDED: "chart:pane:added",
    PANE_REMOVED: "chart:pane:removed",
} as const;

export type ChartEventType = (typeof ChartEvents)[keyof typeof ChartEvents];

/**
 * Event handler function type.
 */
type EventHandler<T = unknown> = (payload: T) => void;

/**
 * Subscription cleanup function.
 */
type Unsubscribe = () => void;

/**
 * Maximum number of handlers per event type.
 * Following Code Style Guide: "Put a limit on everything."
 */
const MAX_HANDLERS_PER_EVENT = 100;

/**
 * Event bus for pub/sub communication within the chart.
 *
 * Design decisions:
 * - Synchronous event handling for predictable control flow.
 * - Bounded handler count to prevent memory leaks.
 * - Mute capability for batch operations.
 */
export class EventBus {
    private readonly handlers: Map<string, Set<EventHandler>> = new Map();
    private muted = false;

    constructor() {
        // Initialize event bus.
        assert(this.handlers.size === 0, "Handler map should be empty on init");
    }

    /**
     * Subscribes to an event type.
     *
     * @param eventType - Type of event to subscribe to.
     * @param handler - Handler function to call when event fires.
     * @returns Unsubscribe function.
     */
    public on<T = unknown>(eventType: string, handler: EventHandler<T>): Unsubscribe {
        assert(typeof eventType === "string", "Event type must be a string");
        assert(eventType.length > 0, "Event type cannot be empty");
        assert(typeof handler === "function", "Handler must be a function");

        let handlersSet = this.handlers.get(eventType);

        if (handlersSet === undefined) {
            handlersSet = new Set();
            this.handlers.set(eventType, handlersSet);
        }

        // Enforce handler limit.
        assert(
            handlersSet.size < MAX_HANDLERS_PER_EVENT,
            `Too many handlers for event "${eventType}". Max: ${MAX_HANDLERS_PER_EVENT}`,
        );

        handlersSet.add(handler as EventHandler);

        // Return unsubscribe function.
        return (): void => {
            this.off(eventType, handler);
        };
    }

    /**
     * Unsubscribes from an event type.
     *
     * @param eventType - Type of event to unsubscribe from.
     * @param handler - Handler function to remove.
     */
    public off<T = unknown>(eventType: string, handler: EventHandler<T>): void {
        const handlersSet = this.handlers.get(eventType);

        if (handlersSet !== undefined) {
            handlersSet.delete(handler as EventHandler);

            // Clean up empty sets.
            if (handlersSet.size === 0) {
                this.handlers.delete(eventType);
            }
        }
    }

    /**
     * Fires an event, calling all registered handlers.
     *
     * @param eventType - Type of event to fire.
     * @param payload - Data to pass to handlers.
     */
    public fire<T = unknown>(eventType: string, payload?: T): void {
        if (this.muted) {
            return;
        }

        const handlersSet = this.handlers.get(eventType);

        if (handlersSet === undefined) {
            return;
        }

        // Create array copy to avoid mutation during iteration.
        const handlersCopy = Array.from(handlersSet);

        for (const handler of handlersCopy) {
            handler(payload);
        }
    }

    /**
     * Convenience method to fire a draw event.
     *
     * @param canvasIds - Optional array of canvas IDs to redraw.
     */
    public fireDraw(canvasIds?: readonly string[]): void {
        this.fire(ChartEvents.DRAW, canvasIds);
    }

    /**
     * Sets the muted state of the event bus.
     * When muted, no events will be fired.
     *
     * @param muted - Whether to mute the event bus.
     */
    public setMuted(muted: boolean): void {
        this.muted = muted;
    }

    /**
     * Returns whether the event bus is currently muted.
     */
    public isMuted(): boolean {
        return this.muted;
    }

    /**
     * Clears all event handlers.
     */
    public clear(): void {
        this.handlers.clear();
    }

    /**
     * Returns the number of handlers for an event type.
     *
     * @param eventType - Type of event to count handlers for.
     */
    public handlerCount(eventType: string): number {
        const handlersSet = this.handlers.get(eventType);
        return handlersSet?.size ?? 0;
    }
}

/**
 * Creates a new EventBus instance.
 */
export function createEventBus(): EventBus {
    const eventBus = new EventBus();
    assertDefined(eventBus, "Failed to create EventBus");
    return eventBus;
}

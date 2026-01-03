/**
 * Events - Financial event markers (earnings, dividends, splits, etc.)
 * Displays and manages chart events like earnings announcements, dividends, and stock splits
 */

import type { Bounds, ChartTheme, Pixel } from "./types.ts";
import type { HitTestElement, HitTestSubscriber } from "./hit-test.ts";
import { EventBus, ChartEvents } from "./event-bus.ts";

// ============================================================================
// Types
// ============================================================================

export type EventType =
    | "earnings"
    | "dividends"
    | "splits"
    | "conference-call"
    | "ipo"
    | "merger"
    | "announcement"
    | "custom";

export type EventMarkerShape =
    | "rhombus"
    | "rhombus-small"
    | "rhombus-large"
    | "circle"
    | "square"
    | "triangle"
    | "star"
    | "custom";

export interface ChartEvent {
    id: string;
    type: EventType;
    timestamp: number;
    title: string;
    description?: string;
    value?: string | number;
    icon?: string;
    color?: string;
    url?: string;
    data?: unknown;
}

export interface EventWithPosition extends ChartEvent {
    x: Pixel;
    y: Pixel;
    visible: boolean;
}

export interface EventMarkerConfig {
    shape: EventMarkerShape;
    size: number;
    color: string;
    hoverColor: string;
    borderColor: string;
    borderWidth: number;
    icon?: string;
    iconColor?: string;
}

export interface EventsConfig {
    enabled: boolean;
    position: "top" | "bottom";
    offsetY: number;
    showLabels: boolean;
    showTooltip: boolean;
    filterTypes: EventType[];
    markerConfigs: Partial<Record<EventType, Partial<EventMarkerConfig>>>;
    defaultMarkerConfig: EventMarkerConfig;
    tooltipConfig: EventTooltipConfig;
}

export interface EventTooltipConfig {
    backgroundColor: string;
    textColor: string;
    borderColor: string;
    borderRadius: number;
    padding: number;
    maxWidth: number;
    font: string;
    titleFont: string;
    offsetY: number;
}

export interface EventsState {
    events: ChartEvent[];
    visibleEvents: EventWithPosition[];
    hoveredEventId: string | null;
    selectedEventId: string | null;
}

export interface EventsCallbacks {
    onEventClick?: (event: ChartEvent) => void;
    onEventHover?: (event: ChartEvent | null) => void;
    onEventSelect?: (event: ChartEvent | null) => void;
}

// ============================================================================
// Constants
// ============================================================================

export const EVENT_COLORS: Record<EventType, string> = {
    earnings: "#4caf50",
    dividends: "#2196f3",
    splits: "#ff9800",
    "conference-call": "#9c27b0",
    ipo: "#e91e63",
    merger: "#00bcd4",
    announcement: "#ffeb3b",
    custom: "#888888",
};

export const DEFAULT_MARKER_CONFIG: EventMarkerConfig = {
    shape: "rhombus",
    size: 16,
    color: "#888888",
    hoverColor: "#ffffff",
    borderColor: "#ffffff",
    borderWidth: 1,
};

export const DEFAULT_TOOLTIP_CONFIG: EventTooltipConfig = {
    backgroundColor: "#1a1a1a",
    textColor: "#ffffff",
    borderColor: "#333333",
    borderRadius: 4,
    padding: 10,
    maxWidth: 250,
    font: "12px Arial, sans-serif",
    titleFont: "bold 13px Arial, sans-serif",
    offsetY: 15,
};

export const DEFAULT_EVENTS_CONFIG: EventsConfig = {
    enabled: true,
    position: "bottom",
    offsetY: 20,
    showLabels: false,
    showTooltip: true,
    filterTypes: [],
    markerConfigs: {
        earnings: { shape: "rhombus", color: EVENT_COLORS.earnings },
        dividends: { shape: "circle", color: EVENT_COLORS.dividends },
        splits: { shape: "triangle", color: EVENT_COLORS.splits },
        "conference-call": { shape: "square", color: EVENT_COLORS["conference-call"] },
        ipo: { shape: "star", color: EVENT_COLORS.ipo },
        merger: { shape: "rhombus-large", color: EVENT_COLORS.merger },
        announcement: { shape: "rhombus-small", color: EVENT_COLORS.announcement },
    },
    defaultMarkerConfig: DEFAULT_MARKER_CONFIG,
    tooltipConfig: DEFAULT_TOOLTIP_CONFIG,
};

// ============================================================================
// Events Class
// ============================================================================

export class Events implements HitTestSubscriber {
    readonly id = "events";
    readonly type = "event" as const;

    private config: EventsConfig;
    private state: EventsState;
    private callbacks: EventsCallbacks;
    private eventBus?: EventBus<ChartEvents>;
    private bounds: Bounds = { x: 0, y: 0, width: 0, height: 0 };
    private timestampToX: ((timestamp: number) => Pixel) | null = null;

    constructor(config: Partial<EventsConfig> = {}, callbacks: EventsCallbacks = {}) {
        this.config = { ...DEFAULT_EVENTS_CONFIG, ...config };
        this.callbacks = callbacks;
        this.state = {
            events: [],
            visibleEvents: [],
            hoveredEventId: null,
            selectedEventId: null,
        };
    }

    /**
     * Set event bus
     */
    setEventBus(bus: EventBus<ChartEvents>): void {
        this.eventBus = bus;
    }

    /**
     * Set chart bounds
     */
    setBounds(bounds: Bounds): void {
        this.bounds = bounds;
    }

    /**
     * Set timestamp to X converter function
     */
    setTimestampToX(fn: (timestamp: number) => Pixel): void {
        this.timestampToX = fn;
    }

    /**
     * Set events data
     */
    setEvents(events: ChartEvent[]): void {
        this.state.events = events;
        this.updateVisibleEvents();
    }

    /**
     * Add an event
     */
    addEvent(event: ChartEvent): void {
        this.state.events.push(event);
        this.updateVisibleEvents();
    }

    /**
     * Remove an event by ID
     */
    removeEvent(id: string): void {
        this.state.events = this.state.events.filter(e => e.id !== id);
        this.updateVisibleEvents();
    }

    /**
     * Clear all events
     */
    clearEvents(): void {
        this.state.events = [];
        this.state.visibleEvents = [];
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<EventsConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Set event type filter
     */
    setFilter(types: EventType[]): void {
        this.config.filterTypes = types;
        this.updateVisibleEvents();
    }

    /**
     * Apply theme
     */
    applyTheme(theme: ChartTheme): void {
        this.config.tooltipConfig.backgroundColor = theme.background;
        this.config.tooltipConfig.textColor = theme.text;
        this.config.tooltipConfig.borderColor = theme.grid;
    }

    /**
     * Get hit-test elements for interaction detection
     */
    getHitTestElements(): HitTestElement[] {
        if (!this.config.enabled) return [];

        return this.state.visibleEvents.map(event => ({
            id: `events:${event.id}`,
            type: "event" as const,
            bounds: {
                x: event.x - this.getMarkerConfig(event.type).size / 2,
                y: event.y - this.getMarkerConfig(event.type).size / 2,
                width: this.getMarkerConfig(event.type).size,
                height: this.getMarkerConfig(event.type).size,
            },
            data: event,
            cursor: "pointer",
            priority: 20,
        }));
    }

    /**
     * Handle hover
     */
    onHover(element: HitTestElement): void {
        const event = element.data as EventWithPosition;
        this.state.hoveredEventId = event.id;
        this.callbacks.onEventHover?.(event);
    }

    /**
     * Handle leave
     */
    onLeave(): void {
        this.state.hoveredEventId = null;
        this.callbacks.onEventHover?.(null);
    }

    /**
     * Handle click
     */
    onClick(element: HitTestElement): void {
        const event = element.data as EventWithPosition;
        this.state.selectedEventId = event.id;
        this.callbacks.onEventClick?.(event);
        this.callbacks.onEventSelect?.(event);
    }

    /**
     * Render events on canvas
     */
    render(ctx: CanvasRenderingContext2D): void {
        if (!this.config.enabled) return;

        for (const event of this.state.visibleEvents) {
            if (!event.visible) continue;
            this.renderMarker(ctx, event);
        }

        // Render tooltip for hovered event
        if (this.config.showTooltip && this.state.hoveredEventId) {
            const hoveredEvent = this.state.visibleEvents.find(e => e.id === this.state.hoveredEventId);
            if (hoveredEvent) {
                this.renderTooltip(ctx, hoveredEvent);
            }
        }
    }

    /**
     * Get state
     */
    getState(): EventsState {
        return { ...this.state };
    }

    /**
     * Get visible events
     */
    getVisibleEvents(): EventWithPosition[] {
        return [...this.state.visibleEvents];
    }

    // Private methods

    private updateVisibleEvents(): void {
        if (!this.timestampToX) return;

        const { filterTypes } = this.config;

        this.state.visibleEvents = this.state.events
            .filter(event => {
                // Apply type filter
                if (filterTypes.length > 0 && !filterTypes.includes(event.type)) {
                    return false;
                }
                return true;
            })
            .map(event => {
                const x = this.timestampToX!(event.timestamp);
                const y = this.config.position === "top"
                    ? this.bounds.y + this.config.offsetY
                    : this.bounds.y + this.bounds.height - this.config.offsetY;

                const visible = x >= this.bounds.x && x <= this.bounds.x + this.bounds.width;

                return { ...event, x, y, visible };
            });
    }

    private getMarkerConfig(type: EventType): EventMarkerConfig {
        return {
            ...this.config.defaultMarkerConfig,
            ...this.config.markerConfigs[type],
        };
    }

    private renderMarker(ctx: CanvasRenderingContext2D, event: EventWithPosition): void {
        const config = this.getMarkerConfig(event.type);
        const isHovered = this.state.hoveredEventId === event.id;
        const isSelected = this.state.selectedEventId === event.id;

        const color = event.color ?? config.color;
        const fillColor = isHovered ? config.hoverColor : color;
        const size = isSelected ? config.size * 1.2 : config.size;

        ctx.save();

        // Draw shape
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = config.borderColor;
        ctx.lineWidth = config.borderWidth;

        switch (config.shape) {
            case "rhombus":
            case "rhombus-small":
            case "rhombus-large":
                this.drawRhombus(ctx, event.x, event.y, size);
                break;
            case "circle":
                this.drawCircle(ctx, event.x, event.y, size / 2);
                break;
            case "square":
                this.drawSquare(ctx, event.x, event.y, size);
                break;
            case "triangle":
                this.drawTriangle(ctx, event.x, event.y, size);
                break;
            case "star":
                this.drawStar(ctx, event.x, event.y, size / 2, 5);
                break;
        }

        // Draw icon if present
        if (config.icon) {
            ctx.fillStyle = config.iconColor ?? "#ffffff";
            ctx.font = `${size * 0.6}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(config.icon, event.x, event.y);
        }

        ctx.restore();
    }

    private drawRhombus(ctx: CanvasRenderingContext2D, x: Pixel, y: Pixel, size: number): void {
        const half = size / 2;
        ctx.beginPath();
        ctx.moveTo(x, y - half);
        ctx.lineTo(x + half, y);
        ctx.lineTo(x, y + half);
        ctx.lineTo(x - half, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    private drawCircle(ctx: CanvasRenderingContext2D, x: Pixel, y: Pixel, radius: number): void {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    private drawSquare(ctx: CanvasRenderingContext2D, x: Pixel, y: Pixel, size: number): void {
        const half = size / 2;
        ctx.fillRect(x - half, y - half, size, size);
        ctx.strokeRect(x - half, y - half, size, size);
    }

    private drawTriangle(ctx: CanvasRenderingContext2D, x: Pixel, y: Pixel, size: number): void {
        const half = size / 2;
        ctx.beginPath();
        ctx.moveTo(x, y - half);
        ctx.lineTo(x + half, y + half);
        ctx.lineTo(x - half, y + half);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    private drawStar(ctx: CanvasRenderingContext2D, x: Pixel, y: Pixel, radius: number, points: number): void {
        const innerRadius = radius * 0.4;
        ctx.beginPath();

        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? radius : innerRadius;
            const angle = (i * Math.PI) / points - Math.PI / 2;
            const px = x + r * Math.cos(angle);
            const py = y + r * Math.sin(angle);

            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }

        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    private renderTooltip(ctx: CanvasRenderingContext2D, event: EventWithPosition): void {
        const { tooltipConfig } = this.config;
        const markerConfig = this.getMarkerConfig(event.type);

        // Prepare text
        const title = event.title;
        const description = event.description ?? "";
        const value = event.value ? String(event.value) : "";

        ctx.font = tooltipConfig.titleFont;
        const titleWidth = ctx.measureText(title).width;

        ctx.font = tooltipConfig.font;
        const descWidth = description ? ctx.measureText(description).width : 0;
        const valueWidth = value ? ctx.measureText(value).width : 0;

        const contentWidth = Math.min(
            tooltipConfig.maxWidth,
            Math.max(titleWidth, descWidth, valueWidth) + tooltipConfig.padding * 2
        );

        const lineHeight = 16;
        let contentHeight = tooltipConfig.padding * 2 + lineHeight; // Title
        if (description) contentHeight += lineHeight;
        if (value) contentHeight += lineHeight;

        // Position tooltip
        let tooltipX = event.x - contentWidth / 2;
        let tooltipY = event.y - markerConfig.size / 2 - tooltipConfig.offsetY - contentHeight;

        // Keep within bounds
        if (tooltipX < this.bounds.x) tooltipX = this.bounds.x;
        if (tooltipX + contentWidth > this.bounds.x + this.bounds.width) {
            tooltipX = this.bounds.x + this.bounds.width - contentWidth;
        }
        if (tooltipY < this.bounds.y) {
            tooltipY = event.y + markerConfig.size / 2 + tooltipConfig.offsetY;
        }

        ctx.save();

        // Draw background
        ctx.fillStyle = tooltipConfig.backgroundColor;
        ctx.strokeStyle = tooltipConfig.borderColor;
        ctx.lineWidth = 1;

        this.roundRect(ctx, tooltipX, tooltipY, contentWidth, contentHeight, tooltipConfig.borderRadius);
        ctx.fill();
        ctx.stroke();

        // Draw text
        let textY = tooltipY + tooltipConfig.padding + lineHeight * 0.8;

        ctx.fillStyle = event.color ?? markerConfig.color;
        ctx.font = tooltipConfig.titleFont;
        ctx.textAlign = "left";
        ctx.fillText(title, tooltipX + tooltipConfig.padding, textY);
        textY += lineHeight;

        ctx.fillStyle = tooltipConfig.textColor;
        ctx.font = tooltipConfig.font;

        if (description) {
            ctx.fillText(description, tooltipX + tooltipConfig.padding, textY);
            textY += lineHeight;
        }

        if (value) {
            ctx.fillStyle = "#888888";
            ctx.fillText(value, tooltipX + tooltipConfig.padding, textY);
        }

        ctx.restore();
    }

    private roundRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
    ): void {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create an earnings event
 */
export function createEarningsEvent(
    id: string,
    timestamp: number,
    eps?: string,
    revenue?: string
): ChartEvent {
    return {
        id,
        type: "earnings",
        timestamp,
        title: "Earnings Report",
        description: eps ? `EPS: ${eps}` : undefined,
        value: revenue ? `Revenue: ${revenue}` : undefined,
    };
}

/**
 * Create a dividend event
 */
export function createDividendEvent(
    id: string,
    timestamp: number,
    amount: number,
    exDate?: string
): ChartEvent {
    return {
        id,
        type: "dividends",
        timestamp,
        title: "Dividend",
        description: `$${amount.toFixed(2)} per share`,
        value: exDate ? `Ex-Date: ${exDate}` : undefined,
    };
}

/**
 * Create a stock split event
 */
export function createSplitEvent(
    id: string,
    timestamp: number,
    ratio: string
): ChartEvent {
    return {
        id,
        type: "splits",
        timestamp,
        title: "Stock Split",
        description: ratio,
    };
}

/**
 * Create a conference call event
 */
export function createConferenceCallEvent(
    id: string,
    timestamp: number,
    title: string = "Earnings Call"
): ChartEvent {
    return {
        id,
        type: "conference-call",
        timestamp,
        title,
        description: "Conference Call",
    };
}

/**
 * Create a custom event
 */
export function createCustomEvent(
    id: string,
    timestamp: number,
    title: string,
    options: Partial<ChartEvent> = {}
): ChartEvent {
    return {
        id,
        type: "custom",
        timestamp,
        title,
        ...options,
    };
}

// ============================================================================
// Factory
// ============================================================================

export function createEvents(
    config?: Partial<EventsConfig>,
    callbacks?: EventsCallbacks
): Events {
    return new Events(config, callbacks);
}

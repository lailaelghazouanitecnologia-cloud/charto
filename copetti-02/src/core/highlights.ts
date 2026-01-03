/**
 * Highlights - Market session and time period highlighting
 * Displays colored zones for trading sessions (pre-market, regular, after-hours, etc.)
 */

import type { Bounds, ChartTheme, Pixel } from "./types.ts";

// ============================================================================
// Types
// ============================================================================

export interface MarketSession {
    id: string;
    name: string;
    startHour: number; // 0-23
    startMinute: number; // 0-59
    endHour: number;
    endMinute: number;
    color: string;
    opacity: number;
    timezone?: string;
    days?: number[]; // 0-6 (Sunday-Saturday), empty = all weekdays
}

export interface TimeRange {
    start: number; // Unix timestamp
    end: number;
    color: string;
    opacity: number;
    label?: string;
}

export interface HighlightZone {
    type: "session" | "range" | "event";
    startX: Pixel;
    endX: Pixel;
    color: string;
    opacity: number;
    label?: string;
    data?: unknown;
}

export interface HighlightsConfig {
    enabled: boolean;
    sessions: MarketSession[];
    ranges: TimeRange[];
    showLabels: boolean;
    labelFont: string;
    labelColor: string;
    labelPosition: "top" | "bottom";
    labelPadding: number;
}

export interface HighlightsState {
    zones: HighlightZone[];
    visible: boolean;
}

// ============================================================================
// Preset Sessions
// ============================================================================

export const US_MARKET_SESSIONS: MarketSession[] = [
    {
        id: "pre-market",
        name: "Pre-Market",
        startHour: 4,
        startMinute: 0,
        endHour: 9,
        endMinute: 30,
        color: "#ffeb3b",
        opacity: 0.1,
        timezone: "America/New_York",
        days: [1, 2, 3, 4, 5], // Mon-Fri
    },
    {
        id: "regular",
        name: "Regular Hours",
        startHour: 9,
        startMinute: 30,
        endHour: 16,
        endMinute: 0,
        color: "#4caf50",
        opacity: 0.05,
        timezone: "America/New_York",
        days: [1, 2, 3, 4, 5],
    },
    {
        id: "after-hours",
        name: "After Hours",
        startHour: 16,
        startMinute: 0,
        endHour: 20,
        endMinute: 0,
        color: "#2196f3",
        opacity: 0.1,
        timezone: "America/New_York",
        days: [1, 2, 3, 4, 5],
    },
];

export const FOREX_SESSIONS: MarketSession[] = [
    {
        id: "sydney",
        name: "Sydney",
        startHour: 22,
        startMinute: 0,
        endHour: 7,
        endMinute: 0,
        color: "#9c27b0",
        opacity: 0.1,
        timezone: "UTC",
    },
    {
        id: "tokyo",
        name: "Tokyo",
        startHour: 0,
        startMinute: 0,
        endHour: 9,
        endMinute: 0,
        color: "#ff5722",
        opacity: 0.1,
        timezone: "UTC",
    },
    {
        id: "london",
        name: "London",
        startHour: 8,
        startMinute: 0,
        endHour: 17,
        endMinute: 0,
        color: "#2196f3",
        opacity: 0.1,
        timezone: "UTC",
    },
    {
        id: "new-york",
        name: "New York",
        startHour: 13,
        startMinute: 0,
        endHour: 22,
        endMinute: 0,
        color: "#4caf50",
        opacity: 0.1,
        timezone: "UTC",
    },
];

export const CRYPTO_SESSIONS: MarketSession[] = [
    {
        id: "asia",
        name: "Asia Session",
        startHour: 0,
        startMinute: 0,
        endHour: 8,
        endMinute: 0,
        color: "#ff9800",
        opacity: 0.1,
        timezone: "UTC",
    },
    {
        id: "europe",
        name: "Europe Session",
        startHour: 8,
        startMinute: 0,
        endHour: 16,
        endMinute: 0,
        color: "#2196f3",
        opacity: 0.1,
        timezone: "UTC",
    },
    {
        id: "america",
        name: "America Session",
        startHour: 16,
        startMinute: 0,
        endHour: 24,
        endMinute: 0,
        color: "#4caf50",
        opacity: 0.1,
        timezone: "UTC",
    },
];

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_HIGHLIGHTS_CONFIG: HighlightsConfig = {
    enabled: true,
    sessions: [],
    ranges: [],
    showLabels: true,
    labelFont: "10px Arial, sans-serif",
    labelColor: "#888888",
    labelPosition: "top",
    labelPadding: 4,
};

// ============================================================================
// Highlights Class
// ============================================================================

export class Highlights {
    private config: HighlightsConfig;
    private state: HighlightsState;

    constructor(config: Partial<HighlightsConfig> = {}) {
        this.config = { ...DEFAULT_HIGHLIGHTS_CONFIG, ...config };
        this.state = {
            zones: [],
            visible: true,
        };
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<HighlightsConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Set market sessions
     */
    setSessions(sessions: MarketSession[]): void {
        this.config.sessions = sessions;
    }

    /**
     * Add a session
     */
    addSession(session: MarketSession): void {
        this.config.sessions.push(session);
    }

    /**
     * Remove a session by ID
     */
    removeSession(id: string): void {
        this.config.sessions = this.config.sessions.filter(s => s.id !== id);
    }

    /**
     * Set custom time ranges
     */
    setRanges(ranges: TimeRange[]): void {
        this.config.ranges = ranges;
    }

    /**
     * Add a custom range
     */
    addRange(range: TimeRange): void {
        this.config.ranges.push(range);
    }

    /**
     * Clear all ranges
     */
    clearRanges(): void {
        this.config.ranges = [];
    }

    /**
     * Set visibility
     */
    setVisible(visible: boolean): void {
        this.state.visible = visible;
    }

    /**
     * Apply theme
     */
    applyTheme(theme: ChartTheme): void {
        this.config.labelColor = theme.textSecondary;
    }

    /**
     * Calculate highlight zones for visible time range
     */
    calculate(
        timestamps: number[],
        startIndex: number,
        endIndex: number,
        timestampToX: (timestamp: number) => Pixel
    ): void {
        this.state.zones = [];

        if (timestamps.length === 0) return;

        const visibleStart = timestamps[Math.max(0, Math.floor(startIndex))];
        const visibleEnd = timestamps[Math.min(timestamps.length - 1, Math.floor(endIndex))];

        // Calculate session zones
        for (const session of this.config.sessions) {
            const zones = this.calculateSessionZones(
                session,
                visibleStart,
                visibleEnd,
                timestampToX
            );
            this.state.zones.push(...zones);
        }

        // Calculate custom range zones
        for (const range of this.config.ranges) {
            if (range.end >= visibleStart && range.start <= visibleEnd) {
                this.state.zones.push({
                    type: "range",
                    startX: timestampToX(Math.max(range.start, visibleStart)),
                    endX: timestampToX(Math.min(range.end, visibleEnd)),
                    color: range.color,
                    opacity: range.opacity,
                    label: range.label,
                });
            }
        }
    }

    /**
     * Get current zones
     */
    getZones(): HighlightZone[] {
        return [...this.state.zones];
    }

    /**
     * Render highlights
     */
    render(ctx: CanvasRenderingContext2D, chartArea: Bounds): void {
        const { config, state } = this;

        if (!config.enabled || !state.visible) return;

        ctx.save();

        // Render each zone
        for (const zone of state.zones) {
            this.renderZone(ctx, chartArea, zone);
        }

        ctx.restore();
    }

    // Private methods

    private calculateSessionZones(
        session: MarketSession,
        visibleStart: number,
        visibleEnd: number,
        timestampToX: (timestamp: number) => Pixel
    ): HighlightZone[] {
        const zones: HighlightZone[] = [];

        // Iterate through each day in the visible range
        const startDate = new Date(visibleStart);
        const endDate = new Date(visibleEnd);

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay();

            // Check if session applies to this day
            if (!session.days || session.days.length === 0 || session.days.includes(dayOfWeek)) {
                // Calculate session times for this day
                const sessionStart = new Date(currentDate);
                sessionStart.setHours(session.startHour, session.startMinute, 0, 0);

                const sessionEnd = new Date(currentDate);
                sessionEnd.setHours(session.endHour, session.endMinute, 0, 0);

                // Handle overnight sessions
                if (session.endHour < session.startHour) {
                    sessionEnd.setDate(sessionEnd.getDate() + 1);
                }

                const startTime = sessionStart.getTime();
                const endTime = sessionEnd.getTime();

                // Check if session overlaps with visible range
                if (endTime >= visibleStart && startTime <= visibleEnd) {
                    zones.push({
                        type: "session",
                        startX: timestampToX(Math.max(startTime, visibleStart)),
                        endX: timestampToX(Math.min(endTime, visibleEnd)),
                        color: session.color,
                        opacity: session.opacity,
                        label: session.name,
                        data: session,
                    });
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return zones;
    }

    private renderZone(
        ctx: CanvasRenderingContext2D,
        chartArea: Bounds,
        zone: HighlightZone
    ): void {
        const { config } = this;
        const width = zone.endX - zone.startX;

        if (width <= 0) return;

        // Draw zone background
        ctx.fillStyle = zone.color;
        ctx.globalAlpha = zone.opacity;
        ctx.fillRect(zone.startX, chartArea.y, width, chartArea.height);
        ctx.globalAlpha = 1;

        // Draw label if enabled
        if (config.showLabels && zone.label && width > 50) {
            ctx.font = config.labelFont;
            ctx.fillStyle = config.labelColor;
            ctx.textAlign = "center";
            ctx.textBaseline = config.labelPosition === "top" ? "top" : "bottom";

            const labelY = config.labelPosition === "top"
                ? chartArea.y + config.labelPadding
                : chartArea.y + chartArea.height - config.labelPadding;

            const labelX = zone.startX + width / 2;

            // Truncate label if too long
            let displayLabel = zone.label;
            const maxWidth = width - 10;
            while (ctx.measureText(displayLabel).width > maxWidth && displayLabel.length > 3) {
                displayLabel = displayLabel.slice(0, -1);
            }
            if (displayLabel !== zone.label) {
                displayLabel += "…";
            }

            ctx.fillText(displayLabel, labelX, labelY);
        }
    }
}

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Create a highlight for a specific event
 */
export function createEventHighlight(
    timestamp: number,
    duration: number,
    color: string,
    label?: string
): TimeRange {
    return {
        start: timestamp,
        end: timestamp + duration,
        color,
        opacity: 0.15,
        label,
    };
}

/**
 * Check if a timestamp is within a market session
 */
export function isInSession(timestamp: number, session: MarketSession): boolean {
    const date = new Date(timestamp);
    const dayOfWeek = date.getDay();

    // Check day
    if (session.days && session.days.length > 0 && !session.days.includes(dayOfWeek)) {
        return false;
    }

    // Check time
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    const startInMinutes = session.startHour * 60 + session.startMinute;
    const endInMinutes = session.endHour * 60 + session.endMinute;

    // Handle overnight sessions
    if (endInMinutes < startInMinutes) {
        return timeInMinutes >= startInMinutes || timeInMinutes < endInMinutes;
    }

    return timeInMinutes >= startInMinutes && timeInMinutes < endInMinutes;
}

/**
 * Get active sessions for a timestamp
 */
export function getActiveSessions(timestamp: number, sessions: MarketSession[]): MarketSession[] {
    return sessions.filter(session => isInSession(timestamp, session));
}

/**
 * Draw session highlights on a chart
 */
export function drawSessionHighlights(
    ctx: CanvasRenderingContext2D,
    chartArea: Bounds,
    timestamps: number[],
    startIndex: number,
    endIndex: number,
    timestampToX: (timestamp: number) => Pixel,
    sessions: MarketSession[] = US_MARKET_SESSIONS,
    config: Partial<HighlightsConfig> = {}
): void {
    const highlights = new Highlights({ ...config, sessions });
    highlights.calculate(timestamps, startIndex, endIndex, timestampToX);
    highlights.render(ctx, chartArea);
}

// ============================================================================
// Factory
// ============================================================================

export function createHighlights(config?: Partial<HighlightsConfig>): Highlights {
    return new Highlights(config);
}

/**
 * NavigationMap - Mini-chart navigation component
 * Shows the full data range with a draggable viewport window
 */

import type { Candle, ChartTheme, Bounds } from "./types.ts";
import { EventBus, ChartEvents } from "./event-bus.ts";

// ============================================================================
// Types
// ============================================================================

export interface NavigationMapConfig {
    height: number;
    backgroundColor: string;
    lineColor: string;
    lineWidth: number;
    windowBackgroundColor: string;
    windowBorderColor: string;
    windowBorderWidth: number;
    handleColor: string;
    handleWidth: number;
    handleHeight: number;
    minWindowWidth: number;
    padding: { top: number; right: number; bottom: number; left: number };
    showVolume: boolean;
    volumeColor: string;
    volumeOpacity: number;
}

export interface NavigationMapState {
    startRatio: number;
    endRatio: number;
    isDragging: boolean;
    isResizingLeft: boolean;
    isResizingRight: boolean;
    dragStartX: number;
    initialStartRatio: number;
    initialEndRatio: number;
}

export interface NavigationMapCallbacks {
    onViewportChange?: (startRatio: number, endRatio: number) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_NAVIGATION_MAP_CONFIG: NavigationMapConfig = {
    height: 60,
    backgroundColor: "#1a1a1a",
    lineColor: "#4a9eff",
    lineWidth: 1,
    windowBackgroundColor: "rgba(74, 158, 255, 0.1)",
    windowBorderColor: "#4a9eff",
    windowBorderWidth: 1,
    handleColor: "#4a9eff",
    handleWidth: 8,
    handleHeight: 24,
    minWindowWidth: 20,
    padding: { top: 8, right: 4, bottom: 8, left: 4 },
    showVolume: true,
    volumeColor: "#666666",
    volumeOpacity: 0.3,
};

// ============================================================================
// NavigationMap Class
// ============================================================================

export class NavigationMap {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private config: NavigationMapConfig;
    private state: NavigationMapState;
    private data: Candle[] = [];
    private callbacks: NavigationMapCallbacks;
    private eventBus?: EventBus<ChartEvents>;
    private bounds: Bounds;

    constructor(
        container: HTMLElement,
        config: Partial<NavigationMapConfig> = {},
        callbacks: NavigationMapCallbacks = {}
    ) {
        this.config = { ...DEFAULT_NAVIGATION_MAP_CONFIG, ...config };
        this.callbacks = callbacks;

        // Create canvas
        this.canvas = document.createElement("canvas");
        this.canvas.style.display = "block";
        this.canvas.style.width = "100%";
        this.canvas.style.height = `${this.config.height}px`;
        this.canvas.style.cursor = "crosshair";
        container.appendChild(this.canvas);

        const ctx = this.canvas.getContext("2d");
        if (!ctx) throw new Error("Could not get 2D context");
        this.ctx = ctx;

        // Initialize state
        this.state = {
            startRatio: 0.7,
            endRatio: 1.0,
            isDragging: false,
            isResizingLeft: false,
            isResizingRight: false,
            dragStartX: 0,
            initialStartRatio: 0,
            initialEndRatio: 0,
        };

        this.bounds = { x: 0, y: 0, width: 0, height: 0 };

        // Setup
        this.setupCanvas();
        this.setupEventListeners();
    }

    /**
     * Set event bus for integration
     */
    setEventBus(bus: EventBus<ChartEvents>): void {
        this.eventBus = bus;
    }

    /**
     * Set candle data
     */
    setData(data: Candle[]): void {
        this.data = data;
        this.render();
    }

    /**
     * Set viewport position
     */
    setViewport(startRatio: number, endRatio: number): void {
        this.state.startRatio = Math.max(0, Math.min(1, startRatio));
        this.state.endRatio = Math.max(0, Math.min(1, endRatio));
        this.render();
    }

    /**
     * Get current viewport
     */
    getViewport(): { startRatio: number; endRatio: number } {
        return {
            startRatio: this.state.startRatio,
            endRatio: this.state.endRatio,
        };
    }

    /**
     * Apply theme
     */
    applyTheme(theme: ChartTheme): void {
        this.config.backgroundColor = theme.background;
        this.config.lineColor = theme.upColor;
        this.config.windowBorderColor = theme.upColor;
        this.config.handleColor = theme.upColor;
        this.config.windowBackgroundColor = `${theme.upColor}1a`;
        this.render();
    }

    /**
     * Resize handler
     */
    resize(): void {
        this.setupCanvas();
        this.render();
    }

    /**
     * Main render method
     */
    render(): void {
        const { ctx, config, bounds, data, state } = this;

        // Clear
        ctx.fillStyle = config.backgroundColor;
        ctx.fillRect(0, 0, bounds.width, bounds.height);

        if (data.length === 0) return;

        const chartArea = this.getChartArea();

        // Draw volume if enabled
        if (config.showVolume) {
            this.drawVolume(chartArea);
        }

        // Draw price line
        this.drawPriceLine(chartArea);

        // Draw viewport window
        this.drawViewportWindow(chartArea);
    }

    /**
     * Destroy and cleanup
     */
    destroy(): void {
        this.canvas.remove();
    }

    // Private methods

    private setupCanvas(): void {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = this.config.height * dpr;

        this.ctx.scale(dpr, dpr);

        this.bounds = {
            x: 0,
            y: 0,
            width: rect.width,
            height: this.config.height,
        };
    }

    private getChartArea(): Bounds {
        const { padding } = this.config;
        return {
            x: padding.left,
            y: padding.top,
            width: this.bounds.width - padding.left - padding.right,
            height: this.bounds.height - padding.top - padding.bottom,
        };
    }

    private drawVolume(area: Bounds): void {
        const { ctx, config, data } = this;

        if (data.length === 0) return;

        const maxVolume = Math.max(...data.map(c => c.volume));
        if (maxVolume === 0) return;

        const barWidth = area.width / data.length;

        ctx.fillStyle = config.volumeColor;
        ctx.globalAlpha = config.volumeOpacity;

        for (let i = 0; i < data.length; i++) {
            const candle = data[i];
            const x = area.x + i * barWidth;
            const height = (candle.volume / maxVolume) * area.height * 0.5;
            const y = area.y + area.height - height;

            ctx.fillRect(x, y, Math.max(1, barWidth - 1), height);
        }

        ctx.globalAlpha = 1;
    }

    private drawPriceLine(area: Bounds): void {
        const { ctx, config, data } = this;

        if (data.length < 2) return;

        const prices = data.map(c => c.close);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const priceRange = maxPrice - minPrice || 1;

        ctx.beginPath();
        ctx.strokeStyle = config.lineColor;
        ctx.lineWidth = config.lineWidth;

        for (let i = 0; i < data.length; i++) {
            const x = area.x + (i / (data.length - 1)) * area.width;
            const y = area.y + area.height - ((data[i].close - minPrice) / priceRange) * area.height;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
    }

    private drawViewportWindow(area: Bounds): void {
        const { ctx, config, state } = this;

        const windowX = area.x + state.startRatio * area.width;
        const windowWidth = (state.endRatio - state.startRatio) * area.width;

        // Dimmed areas outside viewport
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(area.x, area.y, windowX - area.x, area.height);
        ctx.fillRect(
            windowX + windowWidth,
            area.y,
            area.x + area.width - (windowX + windowWidth),
            area.height
        );

        // Window background
        ctx.fillStyle = config.windowBackgroundColor;
        ctx.fillRect(windowX, area.y, windowWidth, area.height);

        // Window border
        ctx.strokeStyle = config.windowBorderColor;
        ctx.lineWidth = config.windowBorderWidth;
        ctx.strokeRect(windowX, area.y, windowWidth, area.height);

        // Left handle
        this.drawHandle(windowX, area.y + area.height / 2 - config.handleHeight / 2);

        // Right handle
        this.drawHandle(
            windowX + windowWidth - config.handleWidth,
            area.y + area.height / 2 - config.handleHeight / 2
        );
    }

    private drawHandle(x: number, y: number): void {
        const { ctx, config } = this;

        ctx.fillStyle = config.handleColor;
        ctx.fillRect(x, y, config.handleWidth, config.handleHeight);

        // Handle grip lines
        ctx.strokeStyle = config.backgroundColor;
        ctx.lineWidth = 1;
        const centerX = x + config.handleWidth / 2;
        ctx.beginPath();
        ctx.moveTo(centerX - 1, y + 6);
        ctx.lineTo(centerX - 1, y + config.handleHeight - 6);
        ctx.moveTo(centerX + 1, y + 6);
        ctx.lineTo(centerX + 1, y + config.handleHeight - 6);
        ctx.stroke();
    }

    private setupEventListeners(): void {
        this.canvas.addEventListener("mousedown", this.handleMouseDown);
        this.canvas.addEventListener("mousemove", this.handleMouseMove);
        this.canvas.addEventListener("mouseup", this.handleMouseUp);
        this.canvas.addEventListener("mouseleave", this.handleMouseLeave);

        // Touch events
        this.canvas.addEventListener("touchstart", this.handleTouchStart, { passive: false });
        this.canvas.addEventListener("touchmove", this.handleTouchMove, { passive: false });
        this.canvas.addEventListener("touchend", this.handleTouchEnd);
    }

    private handleMouseDown = (e: MouseEvent): void => {
        const { state, config } = this;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const area = this.getChartArea();

        const windowX = area.x + state.startRatio * area.width;
        const windowWidth = (state.endRatio - state.startRatio) * area.width;

        // Check if clicking on left handle
        if (Math.abs(x - windowX) < config.handleWidth * 1.5) {
            state.isResizingLeft = true;
            state.dragStartX = x;
            state.initialStartRatio = state.startRatio;
            state.initialEndRatio = state.endRatio;
            this.callbacks.onDragStart?.();
            return;
        }

        // Check if clicking on right handle
        if (Math.abs(x - (windowX + windowWidth)) < config.handleWidth * 1.5) {
            state.isResizingRight = true;
            state.dragStartX = x;
            state.initialStartRatio = state.startRatio;
            state.initialEndRatio = state.endRatio;
            this.callbacks.onDragStart?.();
            return;
        }

        // Check if clicking inside window (drag)
        if (x >= windowX && x <= windowX + windowWidth) {
            state.isDragging = true;
            state.dragStartX = x;
            state.initialStartRatio = state.startRatio;
            state.initialEndRatio = state.endRatio;
            this.callbacks.onDragStart?.();
            return;
        }

        // Click outside - jump to position
        const clickRatio = (x - area.x) / area.width;
        const windowRatio = state.endRatio - state.startRatio;
        const newStartRatio = Math.max(0, Math.min(1 - windowRatio, clickRatio - windowRatio / 2));

        state.startRatio = newStartRatio;
        state.endRatio = newStartRatio + windowRatio;

        this.emitViewportChange();
        this.render();
    };

    private handleMouseMove = (e: MouseEvent): void => {
        const { state, config } = this;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const area = this.getChartArea();

        // Update cursor
        const windowX = area.x + state.startRatio * area.width;
        const windowWidth = (state.endRatio - state.startRatio) * area.width;

        if (!state.isDragging && !state.isResizingLeft && !state.isResizingRight) {
            if (Math.abs(x - windowX) < config.handleWidth * 1.5 ||
                Math.abs(x - (windowX + windowWidth)) < config.handleWidth * 1.5) {
                this.canvas.style.cursor = "ew-resize";
            } else if (x >= windowX && x <= windowX + windowWidth) {
                this.canvas.style.cursor = "grab";
            } else {
                this.canvas.style.cursor = "crosshair";
            }
        }

        if (!state.isDragging && !state.isResizingLeft && !state.isResizingRight) return;

        const deltaRatio = (x - state.dragStartX) / area.width;

        if (state.isDragging) {
            this.canvas.style.cursor = "grabbing";
            const windowWidth = state.initialEndRatio - state.initialStartRatio;
            let newStart = state.initialStartRatio + deltaRatio;
            newStart = Math.max(0, Math.min(1 - windowWidth, newStart));

            state.startRatio = newStart;
            state.endRatio = newStart + windowWidth;
        } else if (state.isResizingLeft) {
            const minWidth = config.minWindowWidth / area.width;
            let newStart = state.initialStartRatio + deltaRatio;
            newStart = Math.max(0, Math.min(state.endRatio - minWidth, newStart));
            state.startRatio = newStart;
        } else if (state.isResizingRight) {
            const minWidth = config.minWindowWidth / area.width;
            let newEnd = state.initialEndRatio + deltaRatio;
            newEnd = Math.max(state.startRatio + minWidth, Math.min(1, newEnd));
            state.endRatio = newEnd;
        }

        this.emitViewportChange();
        this.render();
    };

    private handleMouseUp = (): void => {
        const { state } = this;
        if (state.isDragging || state.isResizingLeft || state.isResizingRight) {
            this.callbacks.onDragEnd?.();
        }
        state.isDragging = false;
        state.isResizingLeft = false;
        state.isResizingRight = false;
        this.canvas.style.cursor = "crosshair";
    };

    private handleMouseLeave = (): void => {
        this.handleMouseUp();
    };

    private handleTouchStart = (e: TouchEvent): void => {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent("mousedown", {
                clientX: touch.clientX,
                clientY: touch.clientY,
            });
            this.handleMouseDown(mouseEvent);
        }
    };

    private handleTouchMove = (e: TouchEvent): void => {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent("mousemove", {
                clientX: touch.clientX,
                clientY: touch.clientY,
            });
            this.handleMouseMove(mouseEvent);
        }
    };

    private handleTouchEnd = (): void => {
        this.handleMouseUp();
    };

    private emitViewportChange(): void {
        this.callbacks.onViewportChange?.(this.state.startRatio, this.state.endRatio);
        this.eventBus?.emit("navmap:drag", {
            startRatio: this.state.startRatio,
            endRatio: this.state.endRatio,
        });
    }
}

// ============================================================================
// Factory function
// ============================================================================

export function createNavigationMap(
    container: HTMLElement,
    config?: Partial<NavigationMapConfig>,
    callbacks?: NavigationMapCallbacks
): NavigationMap {
    return new NavigationMap(container, config, callbacks);
}

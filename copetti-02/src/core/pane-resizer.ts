/**
 * Pane Resizer - Interactive pane resizing component
 * Allows users to resize chart panes by dragging separators
 */

import type { Bounds, Pixel, ChartTheme } from "./types.ts";
import type { HitTestElement, HitTestSubscriber } from "./hit-test.ts";
import { VerticalDragHandler, DragState } from "./drag-drop.ts";
import { EventBus, ChartEvents } from "./event-bus.ts";

// ============================================================================
// Types
// ============================================================================

export interface PaneInfo {
    id: string;
    height: number;
    minHeight: number;
    maxHeight: number;
    y: Pixel;
}

export interface ResizerConfig {
    height: number;
    color: string;
    hoverColor: string;
    activeColor: string;
    gripColor: string;
    gripWidth: number;
    gripCount: number;
    cursor: string;
    hitAreaHeight: number;
}

export interface ResizerState {
    resizers: ResizerInstance[];
    activeResizerId: string | null;
    hoveredResizerId: string | null;
}

export interface ResizerInstance {
    id: string;
    topPaneId: string;
    bottomPaneId: string;
    y: Pixel;
    width: Pixel;
}

export interface ResizerCallbacks {
    onResizeStart?: (resizerId: string, topPaneId: string, bottomPaneId: string) => void;
    onResize?: (resizerId: string, deltaY: Pixel) => void;
    onResizeEnd?: (resizerId: string, topPaneId: string, bottomPaneId: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_RESIZER_CONFIG: ResizerConfig = {
    height: 6,
    color: "#2a2a2a",
    hoverColor: "#3a3a3a",
    activeColor: "#4a9eff",
    gripColor: "#666666",
    gripWidth: 30,
    gripCount: 3,
    cursor: "ns-resize",
    hitAreaHeight: 12,
};

// ============================================================================
// PaneResizer Class
// ============================================================================

export class PaneResizer implements HitTestSubscriber {
    readonly id = "pane-resizer";
    readonly type = "pane-resizer" as const;

    private config: ResizerConfig;
    private state: ResizerState;
    private callbacks: ResizerCallbacks;
    private eventBus?: EventBus<ChartEvents>;
    private bounds: Bounds = { x: 0, y: 0, width: 0, height: 0 };
    private panes: PaneInfo[] = [];
    private dragHandler: VerticalDragHandler<ResizerInstance>;

    constructor(config: Partial<ResizerConfig> = {}, callbacks: ResizerCallbacks = {}) {
        this.config = { ...DEFAULT_RESIZER_CONFIG, ...config };
        this.callbacks = callbacks;
        this.state = {
            resizers: [],
            activeResizerId: null,
            hoveredResizerId: null,
        };

        // Initialize drag handler
        this.dragHandler = new VerticalDragHandler<ResizerInstance>({
            onDragStart: (state, target) => {
                this.state.activeResizerId = target.id;
                this.callbacks.onResizeStart?.(target.id, target.topPaneId, target.bottomPaneId);
            },
            onDrag: (state, target) => {
                this.callbacks.onResize?.(target.id, state.delta.y);
                this.eventBus?.emit("pane:resize", { id: target.topPaneId, height: state.delta.y });
            },
            onDragEnd: (state, target) => {
                this.state.activeResizerId = null;
                this.callbacks.onResizeEnd?.(target.id, target.topPaneId, target.bottomPaneId);
            },
        });
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
     * Update panes and calculate resizer positions
     */
    setPanes(panes: PaneInfo[]): void {
        this.panes = panes;
        this.updateResizers();
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<ResizerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Apply theme
     */
    applyTheme(theme: ChartTheme): void {
        this.config.color = theme.paneDivider;
        this.config.hoverColor = theme.text;
        this.config.activeColor = theme.upColor;
    }

    /**
     * Get hit-test elements
     */
    getHitTestElements(): HitTestElement[] {
        return this.state.resizers.map(resizer => ({
            id: `pane-resizer:${resizer.id}`,
            type: "pane-resizer" as const,
            bounds: {
                x: this.bounds.x,
                y: resizer.y - this.config.hitAreaHeight / 2,
                width: resizer.width,
                height: this.config.hitAreaHeight,
            },
            data: resizer,
            cursor: this.config.cursor,
            priority: 50,
        }));
    }

    /**
     * Handle hover
     */
    onHover(element: HitTestElement): void {
        const resizer = element.data as ResizerInstance;
        this.state.hoveredResizerId = resizer.id;
    }

    /**
     * Handle leave
     */
    onLeave(): void {
        if (!this.state.activeResizerId) {
            this.state.hoveredResizerId = null;
        }
    }

    /**
     * Start resize operation
     */
    startResize(x: Pixel, y: Pixel, resizerId: string): boolean {
        const resizer = this.state.resizers.find(r => r.id === resizerId);
        if (!resizer) return false;

        // Calculate constraints based on pane min/max heights
        const topPane = this.panes.find(p => p.id === resizer.topPaneId);
        const bottomPane = this.panes.find(p => p.id === resizer.bottomPaneId);

        if (!topPane || !bottomPane) return false;

        const minY = topPane.y + topPane.minHeight;
        const maxY = bottomPane.y + bottomPane.height - bottomPane.minHeight;

        this.dragHandler.setConfig({
            constraints: {
                minY,
                maxY,
            },
        });

        this.dragHandler.startPotentialDrag(x, y, resizer);
        return true;
    }

    /**
     * Update resize operation
     */
    updateResize(x: Pixel, y: Pixel): boolean {
        return this.dragHandler.updateDrag(x, y);
    }

    /**
     * End resize operation
     */
    endResize(): void {
        this.dragHandler.endDrag();
    }

    /**
     * Cancel resize operation
     */
    cancelResize(): void {
        this.dragHandler.cancel();
        this.state.activeResizerId = null;
    }

    /**
     * Check if currently resizing
     */
    isResizing(): boolean {
        return this.dragHandler.isDragging();
    }

    /**
     * Get state
     */
    getState(): ResizerState {
        return { ...this.state };
    }

    /**
     * Render resizers
     */
    render(ctx: CanvasRenderingContext2D): void {
        for (const resizer of this.state.resizers) {
            this.renderResizer(ctx, resizer);
        }
    }

    // Private methods

    private updateResizers(): void {
        this.state.resizers = [];

        for (let i = 0; i < this.panes.length - 1; i++) {
            const topPane = this.panes[i];
            const bottomPane = this.panes[i + 1];

            this.state.resizers.push({
                id: `resizer-${topPane.id}-${bottomPane.id}`,
                topPaneId: topPane.id,
                bottomPaneId: bottomPane.id,
                y: bottomPane.y,
                width: this.bounds.width,
            });
        }
    }

    private renderResizer(ctx: CanvasRenderingContext2D, resizer: ResizerInstance): void {
        const { config, state, bounds } = this;
        const isHovered = state.hoveredResizerId === resizer.id;
        const isActive = state.activeResizerId === resizer.id;

        const y = resizer.y - config.height / 2;
        const height = config.height;

        // Background
        ctx.fillStyle = isActive
            ? config.activeColor
            : isHovered
                ? config.hoverColor
                : config.color;

        ctx.fillRect(bounds.x, y, resizer.width, height);

        // Grip lines
        const centerX = bounds.x + resizer.width / 2;
        const centerY = y + height / 2;
        const gripSpacing = 4;
        const halfGripCount = Math.floor(config.gripCount / 2);

        ctx.strokeStyle = config.gripColor;
        ctx.lineWidth = 1;

        for (let i = -halfGripCount; i <= halfGripCount; i++) {
            const lineY = centerY + i * gripSpacing;
            ctx.beginPath();
            ctx.moveTo(centerX - config.gripWidth / 2, lineY);
            ctx.lineTo(centerX + config.gripWidth / 2, lineY);
            ctx.stroke();
        }
    }
}

// ============================================================================
// PaneLayoutManager - Manages pane heights and resizing logic
// ============================================================================

export interface PaneLayoutConfig {
    totalHeight: number;
    minPaneHeight: number;
    defaultMainPaneRatio: number;
    defaultIndicatorPaneHeight: number;
}

export const DEFAULT_PANE_LAYOUT_CONFIG: PaneLayoutConfig = {
    totalHeight: 600,
    minPaneHeight: 50,
    defaultMainPaneRatio: 0.7,
    defaultIndicatorPaneHeight: 100,
};

export class PaneLayoutManager {
    private config: PaneLayoutConfig;
    private panes: PaneInfo[] = [];
    private callbacks: {
        onLayoutChange?: (panes: PaneInfo[]) => void;
    } = {};

    constructor(config: Partial<PaneLayoutConfig> = {}) {
        this.config = { ...DEFAULT_PANE_LAYOUT_CONFIG, ...config };
    }

    /**
     * Set callbacks
     */
    setCallbacks(callbacks: { onLayoutChange?: (panes: PaneInfo[]) => void }): void {
        this.callbacks = callbacks;
    }

    /**
     * Set total available height
     */
    setTotalHeight(height: number): void {
        this.config.totalHeight = height;
        this.recalculateLayout();
    }

    /**
     * Add a main pane
     */
    addMainPane(id: string): void {
        const mainHeight = this.panes.length === 0
            ? this.config.totalHeight
            : this.config.totalHeight * this.config.defaultMainPaneRatio;

        this.panes.unshift({
            id,
            height: mainHeight,
            minHeight: this.config.minPaneHeight,
            maxHeight: this.config.totalHeight - this.config.minPaneHeight * (this.panes.length),
            y: 0,
        });

        this.recalculateLayout();
    }

    /**
     * Add an indicator pane
     */
    addIndicatorPane(id: string, height?: number): void {
        const paneHeight = height ?? this.config.defaultIndicatorPaneHeight;

        this.panes.push({
            id,
            height: paneHeight,
            minHeight: this.config.minPaneHeight,
            maxHeight: this.config.totalHeight - this.config.minPaneHeight * (this.panes.length),
            y: 0,
        });

        this.recalculateLayout();
    }

    /**
     * Remove a pane
     */
    removePane(id: string): void {
        const index = this.panes.findIndex(p => p.id === id);
        if (index === -1) return;

        const removedPane = this.panes[index];
        this.panes.splice(index, 1);

        // Distribute removed height to remaining panes
        if (this.panes.length > 0) {
            const heightPerPane = removedPane.height / this.panes.length;
            for (const pane of this.panes) {
                pane.height += heightPerPane;
            }
        }

        this.recalculateLayout();
    }

    /**
     * Resize a pane by delta
     */
    resizePane(paneId: string, deltaY: Pixel): void {
        const index = this.panes.findIndex(p => p.id === paneId);
        if (index === -1 || index === this.panes.length - 1) return;

        const topPane = this.panes[index];
        const bottomPane = this.panes[index + 1];

        // Calculate new heights
        let newTopHeight = topPane.height + deltaY;
        let newBottomHeight = bottomPane.height - deltaY;

        // Apply constraints
        if (newTopHeight < topPane.minHeight) {
            newBottomHeight += (topPane.minHeight - newTopHeight);
            newTopHeight = topPane.minHeight;
        }

        if (newBottomHeight < bottomPane.minHeight) {
            newTopHeight += (bottomPane.minHeight - newBottomHeight);
            newBottomHeight = bottomPane.minHeight;
        }

        if (newTopHeight > topPane.maxHeight) {
            newBottomHeight -= (newTopHeight - topPane.maxHeight);
            newTopHeight = topPane.maxHeight;
        }

        if (newBottomHeight > bottomPane.maxHeight) {
            newTopHeight -= (newBottomHeight - bottomPane.maxHeight);
            newBottomHeight = bottomPane.maxHeight;
        }

        // Update heights
        topPane.height = newTopHeight;
        bottomPane.height = newBottomHeight;

        this.recalculatePositions();
        this.callbacks.onLayoutChange?.(this.panes);
    }

    /**
     * Get all panes
     */
    getPanes(): PaneInfo[] {
        return [...this.panes];
    }

    /**
     * Get pane by ID
     */
    getPane(id: string): PaneInfo | undefined {
        return this.panes.find(p => p.id === id);
    }

    /**
     * Get pane at Y position
     */
    getPaneAtY(y: Pixel): PaneInfo | undefined {
        for (const pane of this.panes) {
            if (y >= pane.y && y < pane.y + pane.height) {
                return pane;
            }
        }
        return undefined;
    }

    /**
     * Reorder panes
     */
    reorderPanes(order: string[]): void {
        const orderedPanes: PaneInfo[] = [];
        for (const id of order) {
            const pane = this.panes.find(p => p.id === id);
            if (pane) {
                orderedPanes.push(pane);
            }
        }
        this.panes = orderedPanes;
        this.recalculatePositions();
        this.callbacks.onLayoutChange?.(this.panes);
    }

    // Private methods

    private recalculateLayout(): void {
        // Normalize heights to fit total height
        const totalHeight = this.panes.reduce((sum, p) => sum + p.height, 0);
        const scale = this.config.totalHeight / totalHeight;

        for (const pane of this.panes) {
            pane.height = Math.max(pane.minHeight, pane.height * scale);
        }

        this.recalculatePositions();
        this.callbacks.onLayoutChange?.(this.panes);
    }

    private recalculatePositions(): void {
        let y = 0;
        for (const pane of this.panes) {
            pane.y = y;
            y += pane.height;
        }
    }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createPaneResizer(
    config?: Partial<ResizerConfig>,
    callbacks?: ResizerCallbacks
): PaneResizer {
    return new PaneResizer(config, callbacks);
}

export function createPaneLayoutManager(
    config?: Partial<PaneLayoutConfig>
): PaneLayoutManager {
    return new PaneLayoutManager(config);
}

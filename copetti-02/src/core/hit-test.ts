/**
 * Hit-Test System - Pixel-perfect interaction detection
 * Provides hit detection for chart elements using a hidden canvas
 */

import type { Bounds, Pixel, Point } from "./types.ts";

// ============================================================================
// Types
// ============================================================================

export type HitTestElementType =
    | "candle"
    | "drawing"
    | "event"
    | "indicator"
    | "pane-resizer"
    | "nav-handle"
    | "axis-label"
    | "legend"
    | "custom";

export interface HitTestElement {
    id: string;
    type: HitTestElementType;
    bounds: Bounds;
    data?: unknown;
    priority?: number;
    cursor?: string;
}

export interface HitTestResult {
    element: HitTestElement | null;
    x: Pixel;
    y: Pixel;
}

export interface HitTestSubscriber {
    id: string;
    type: HitTestElementType;
    getHitTestElements(): HitTestElement[];
    onHover?(element: HitTestElement): void;
    onLeave?(element: HitTestElement): void;
    onClick?(element: HitTestElement): void;
}

export interface HitTestConfig {
    enabled: boolean;
    useColorPicking: boolean;
    hitRadius: number;
    debounceMs: number;
}

// ID ranges for different element types
export const HIT_TEST_ID_RANGES: Record<HitTestElementType, { start: number; end: number }> = {
    candle: { start: 0x000001, end: 0x0FFFFF },
    drawing: { start: 0x100000, end: 0x1FFFFF },
    event: { start: 0x200000, end: 0x2FFFFF },
    indicator: { start: 0x300000, end: 0x3FFFFF },
    "pane-resizer": { start: 0x400000, end: 0x4FFFFF },
    "nav-handle": { start: 0x500000, end: 0x5FFFFF },
    "axis-label": { start: 0x600000, end: 0x6FFFFF },
    legend: { start: 0x700000, end: 0x7FFFFF },
    custom: { start: 0x800000, end: 0xFFFFFF },
};

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_HIT_TEST_CONFIG: HitTestConfig = {
    enabled: true,
    useColorPicking: true,
    hitRadius: 5,
    debounceMs: 16,
};

// ============================================================================
// HitTestCanvas Class - Color-picking based hit detection
// ============================================================================

export class HitTestCanvas {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private colorToElement: Map<number, HitTestElement> = new Map();
    private nextColorId = 1;
    private config: HitTestConfig;

    constructor(width: number, height: number, config: Partial<HitTestConfig> = {}) {
        this.config = { ...DEFAULT_HIT_TEST_CONFIG, ...config };

        this.canvas = document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;

        const ctx = this.canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("Could not get 2D context for hit-test canvas");
        this.ctx = ctx;
    }

    /**
     * Resize the hit-test canvas
     */
    resize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    /**
     * Clear the hit-test canvas and element map
     */
    clear(): void {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.colorToElement.clear();
        this.nextColorId = 1;
    }

    /**
     * Register an element and get its unique color
     */
    registerElement(element: HitTestElement): string {
        const colorId = this.nextColorId++;
        const color = this.idToColor(colorId);
        this.colorToElement.set(colorId, element);
        return color;
    }

    /**
     * Get the rendering context for drawing hit-test shapes
     */
    getContext(): CanvasRenderingContext2D {
        return this.ctx;
    }

    /**
     * Draw a rectangle for hit-testing
     */
    drawRect(element: HitTestElement): void {
        const color = this.registerElement(element);
        this.ctx.fillStyle = color;
        this.ctx.fillRect(element.bounds.x, element.bounds.y, element.bounds.width, element.bounds.height);
    }

    /**
     * Draw a circle for hit-testing
     */
    drawCircle(element: HitTestElement, centerX: Pixel, centerY: Pixel, radius: number): void {
        const color = this.registerElement(element);
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Draw a line for hit-testing (with thickness)
     */
    drawLine(
        element: HitTestElement,
        x1: Pixel,
        y1: Pixel,
        x2: Pixel,
        y2: Pixel,
        thickness: number = 8
    ): void {
        const color = this.registerElement(element);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = thickness;
        this.ctx.lineCap = "round";
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    /**
     * Draw a custom path for hit-testing
     */
    drawPath(element: HitTestElement, path: Path2D): void {
        const color = this.registerElement(element);
        this.ctx.fillStyle = color;
        this.ctx.fill(path);
    }

    /**
     * Test a point and return the element at that position
     */
    hitTest(x: Pixel, y: Pixel): HitTestResult {
        if (!this.config.enabled) {
            return { element: null, x, y };
        }

        // Check main point
        const element = this.getElementAtPoint(x, y);
        if (element) {
            return { element, x, y };
        }

        // Check surrounding points based on hit radius
        if (this.config.hitRadius > 0) {
            const radius = this.config.hitRadius;
            const offsets = [
                [-radius, 0], [radius, 0], [0, -radius], [0, radius],
                [-radius, -radius], [radius, -radius], [-radius, radius], [radius, radius],
            ];

            for (const [dx, dy] of offsets) {
                const el = this.getElementAtPoint(x + dx, y + dy);
                if (el) {
                    return { element: el, x, y };
                }
            }
        }

        return { element: null, x, y };
    }

    /**
     * Get element at exact point
     */
    private getElementAtPoint(x: Pixel, y: Pixel): HitTestElement | null {
        if (x < 0 || y < 0 || x >= this.canvas.width || y >= this.canvas.height) {
            return null;
        }

        const imageData = this.ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1);
        const [r, g, b, a] = imageData.data;

        if (a === 0) return null;

        const colorId = (r << 16) | (g << 8) | b;
        return this.colorToElement.get(colorId) ?? null;
    }

    /**
     * Convert a numeric ID to a CSS color string
     */
    private idToColor(id: number): string {
        const r = (id >> 16) & 0xFF;
        const g = (id >> 8) & 0xFF;
        const b = id & 0xFF;
        return `rgb(${r},${g},${b})`;
    }
}

// ============================================================================
// HitTestManager - Manages hit-test subscribers and events
// ============================================================================

export class HitTestManager {
    private hitTestCanvas: HitTestCanvas;
    private subscribers: Map<string, HitTestSubscriber> = new Map();
    private elements: HitTestElement[] = [];
    private hoveredElement: HitTestElement | null = null;
    private config: HitTestConfig;
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(width: number, height: number, config: Partial<HitTestConfig> = {}) {
        this.config = { ...DEFAULT_HIT_TEST_CONFIG, ...config };
        this.hitTestCanvas = new HitTestCanvas(width, height, config);
    }

    /**
     * Set enabled state
     */
    setEnabled(enabled: boolean): void {
        this.config.enabled = enabled;
    }

    /**
     * Resize the hit-test system
     */
    resize(width: number, height: number): void {
        this.hitTestCanvas.resize(width, height);
    }

    /**
     * Register a subscriber
     */
    subscribe(subscriber: HitTestSubscriber): void {
        this.subscribers.set(subscriber.id, subscriber);
    }

    /**
     * Unregister a subscriber
     */
    unsubscribe(id: string): void {
        this.subscribers.delete(id);
    }

    /**
     * Update hit-test canvas with current elements
     */
    update(): void {
        this.hitTestCanvas.clear();
        this.elements = [];

        // Collect elements from all subscribers
        for (const subscriber of this.subscribers.values()) {
            const subscriberElements = subscriber.getHitTestElements();
            this.elements.push(...subscriberElements);
        }

        // Sort by priority (higher priority = drawn later = on top)
        this.elements.sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));

        // Draw all elements to hit-test canvas
        for (const element of this.elements) {
            this.hitTestCanvas.drawRect(element);
        }
    }

    /**
     * Test a point and handle hover/leave events
     */
    testPoint(x: Pixel, y: Pixel): HitTestResult {
        const result = this.hitTestCanvas.hitTest(x, y);

        // Handle hover/leave events
        if (result.element !== this.hoveredElement) {
            // Leave old element
            if (this.hoveredElement) {
                const subscriber = this.subscribers.get(this.hoveredElement.id.split(":")[0]);
                subscriber?.onLeave?.(this.hoveredElement);
            }

            // Hover new element
            if (result.element) {
                const subscriber = this.subscribers.get(result.element.id.split(":")[0]);
                subscriber?.onHover?.(result.element);
            }

            this.hoveredElement = result.element;
        }

        return result;
    }

    /**
     * Test point with debouncing for performance
     */
    testPointDebounced(x: Pixel, y: Pixel, callback?: (result: HitTestResult) => void): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            const result = this.testPoint(x, y);
            callback?.(result);
        }, this.config.debounceMs);
    }

    /**
     * Handle click event
     */
    handleClick(x: Pixel, y: Pixel): HitTestResult {
        const result = this.hitTestCanvas.hitTest(x, y);

        if (result.element) {
            const subscriber = this.subscribers.get(result.element.id.split(":")[0]);
            subscriber?.onClick?.(result.element);
        }

        return result;
    }

    /**
     * Get cursor for current position
     */
    getCursor(x: Pixel, y: Pixel): string {
        const result = this.hitTestCanvas.hitTest(x, y);
        return result.element?.cursor ?? "default";
    }

    /**
     * Get currently hovered element
     */
    getHoveredElement(): HitTestElement | null {
        return this.hoveredElement;
    }

    /**
     * Get all registered elements
     */
    getElements(): HitTestElement[] {
        return [...this.elements];
    }

    /**
     * Get elements by type
     */
    getElementsByType(type: HitTestElementType): HitTestElement[] {
        return this.elements.filter(e => e.type === type);
    }

    /**
     * Get the hit-test canvas for direct drawing
     */
    getHitTestCanvas(): HitTestCanvas {
        return this.hitTestCanvas;
    }
}

// ============================================================================
// Bounds-based Hit Testing (fallback/simple mode)
// ============================================================================

export class BoundsHitTest {
    private elements: HitTestElement[] = [];

    /**
     * Clear all elements
     */
    clear(): void {
        this.elements = [];
    }

    /**
     * Add an element
     */
    addElement(element: HitTestElement): void {
        this.elements.push(element);
    }

    /**
     * Add multiple elements
     */
    addElements(elements: HitTestElement[]): void {
        this.elements.push(...elements);
    }

    /**
     * Test a point against all bounds
     */
    hitTest(x: Pixel, y: Pixel): HitTestResult {
        // Test in reverse order (last added = on top)
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const element = this.elements[i];
            if (this.pointInBounds(x, y, element.bounds)) {
                return { element, x, y };
            }
        }
        return { element: null, x, y };
    }

    /**
     * Test if point is within bounds
     */
    private pointInBounds(x: Pixel, y: Pixel, bounds: Bounds): boolean {
        return (
            x >= bounds.x &&
            x <= bounds.x + bounds.width &&
            y >= bounds.y &&
            y <= bounds.y + bounds.height
        );
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a point is near a line segment
 */
export function isPointNearLineSegment(
    px: Pixel,
    py: Pixel,
    x1: Pixel,
    y1: Pixel,
    x2: Pixel,
    y2: Pixel,
    threshold: number = 5
): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
        // Point-to-point distance
        const dist = Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        return dist <= threshold;
    }

    // Project point onto line segment
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const nearestX = x1 + t * dx;
    const nearestY = y1 + t * dy;

    const dist = Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
    return dist <= threshold;
}

/**
 * Check if a point is near a horizontal line
 */
export function isPointNearHorizontalLine(
    px: Pixel,
    py: Pixel,
    y: Pixel,
    x1: Pixel,
    x2: Pixel,
    threshold: number = 5
): boolean {
    return Math.abs(py - y) <= threshold && px >= x1 && px <= x2;
}

/**
 * Check if a point is inside a circle
 */
export function isPointInCircle(
    px: Pixel,
    py: Pixel,
    cx: Pixel,
    cy: Pixel,
    radius: number
): boolean {
    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy <= radius * radius;
}

/**
 * Create hit-test element from drawing
 */
export function createDrawingHitTestElement(
    drawingId: string,
    bounds: Bounds,
    drawingData?: unknown
): HitTestElement {
    return {
        id: `drawing:${drawingId}`,
        type: "drawing",
        bounds,
        data: drawingData,
        cursor: "pointer",
        priority: 10,
    };
}

/**
 * Create hit-test element for event marker
 */
export function createEventHitTestElement(
    eventId: string,
    x: Pixel,
    y: Pixel,
    size: number,
    eventData?: unknown
): HitTestElement {
    return {
        id: `event:${eventId}`,
        type: "event",
        bounds: {
            x: x - size / 2,
            y: y - size / 2,
            width: size,
            height: size,
        },
        data: eventData,
        cursor: "pointer",
        priority: 20,
    };
}

/**
 * Create hit-test element for candle
 */
export function createCandleHitTestElement(
    index: number,
    bounds: Bounds,
    candleData?: unknown
): HitTestElement {
    return {
        id: `candle:${index}`,
        type: "candle",
        bounds,
        data: candleData,
        cursor: "crosshair",
        priority: 1,
    };
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createHitTestCanvas(
    width: number,
    height: number,
    config?: Partial<HitTestConfig>
): HitTestCanvas {
    return new HitTestCanvas(width, height, config);
}

export function createHitTestManager(
    width: number,
    height: number,
    config?: Partial<HitTestConfig>
): HitTestManager {
    return new HitTestManager(width, height, config);
}

export function createBoundsHitTest(): BoundsHitTest {
    return new BoundsHitTest();
}

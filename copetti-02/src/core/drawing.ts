/**
 * Drawing tools module for chart annotations.
 * Supports trend lines, horizontal lines, rays, and rectangles.
 */

import type { Pixel, ColorHex, Point } from "./types.ts";

/** Drawing tool types. */
export type DrawingToolType = "trendline" | "horizontal" | "ray" | "rectangle" | "fibonacci";

/** Drawing state. */
export type DrawingState = "idle" | "drawing" | "complete";

/** Base drawing interface. */
export interface Drawing {
    readonly id: string;
    readonly type: DrawingToolType;
    readonly color: ColorHex;
    readonly lineWidth: number;
    state: DrawingState;
    selected: boolean;
}

/** Trend line connecting two price points. */
export interface TrendLine extends Drawing {
    type: "trendline";
    startIndex: number;
    startPrice: number;
    endIndex: number;
    endPrice: number;
}

/** Horizontal price level line. */
export interface HorizontalLine extends Drawing {
    type: "horizontal";
    price: number;
    label?: string;
}

/** Ray extending from a point in one direction. */
export interface RayLine extends Drawing {
    type: "ray";
    startIndex: number;
    startPrice: number;
    endIndex: number;
    endPrice: number;
    extendRight: boolean;
}

/** Rectangle area. */
export interface RectangleDrawing extends Drawing {
    type: "rectangle";
    startIndex: number;
    startPrice: number;
    endIndex: number;
    endPrice: number;
    fillColor: ColorHex;
    fillOpacity: number;
}

/** Fibonacci retracement levels. */
export interface FibonacciDrawing extends Drawing {
    type: "fibonacci";
    startIndex: number;
    startPrice: number;
    endIndex: number;
    endPrice: number;
    levels: number[];
    showLabels: boolean;
}

/** Union type for all drawings. */
export type AnyDrawing = TrendLine | HorizontalLine | RayLine | RectangleDrawing | FibonacciDrawing;

/** Default drawing colors. */
export const DRAWING_COLORS: Record<string, ColorHex> = {
    trendline: "#60a5fa",
    horizontal: "#fbbf24",
    ray: "#a78bfa",
    rectangle: "#34d399",
    fibonacci: "#f472b6",
    selected: "#ffffff",
} as const;

/** Default Fibonacci levels. */
export const DEFAULT_FIBONACCI_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1] as const;

/** Generate unique ID for drawings. */
export function generateDrawingId(): string {
    return `drawing-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Create a new trend line. */
export function createTrendLine(
    startIndex: number,
    startPrice: number,
    endIndex?: number,
    endPrice?: number,
    color: ColorHex = DRAWING_COLORS.trendline,
): TrendLine {
    return {
        id: generateDrawingId(),
        type: "trendline",
        color,
        lineWidth: 2,
        state: endIndex !== undefined ? "complete" : "drawing",
        selected: false,
        startIndex,
        startPrice,
        endIndex: endIndex ?? startIndex,
        endPrice: endPrice ?? startPrice,
    };
}

/** Create a new horizontal line. */
export function createHorizontalLine(
    price: number,
    color: ColorHex = DRAWING_COLORS.horizontal,
    label?: string,
): HorizontalLine {
    return {
        id: generateDrawingId(),
        type: "horizontal",
        color,
        lineWidth: 1,
        state: "complete",
        selected: false,
        price,
        label,
    };
}

/** Create a new ray line. */
export function createRayLine(
    startIndex: number,
    startPrice: number,
    endIndex?: number,
    endPrice?: number,
    extendRight: boolean = true,
    color: ColorHex = DRAWING_COLORS.ray,
): RayLine {
    return {
        id: generateDrawingId(),
        type: "ray",
        color,
        lineWidth: 2,
        state: endIndex !== undefined ? "complete" : "drawing",
        selected: false,
        startIndex,
        startPrice,
        endIndex: endIndex ?? startIndex,
        endPrice: endPrice ?? startPrice,
        extendRight,
    };
}

/** Create a new rectangle. */
export function createRectangle(
    startIndex: number,
    startPrice: number,
    endIndex?: number,
    endPrice?: number,
    color: ColorHex = DRAWING_COLORS.rectangle,
): RectangleDrawing {
    return {
        id: generateDrawingId(),
        type: "rectangle",
        color,
        lineWidth: 1,
        state: endIndex !== undefined ? "complete" : "drawing",
        selected: false,
        startIndex,
        startPrice,
        endIndex: endIndex ?? startIndex,
        endPrice: endPrice ?? startPrice,
        fillColor: color,
        fillOpacity: 0.1,
    };
}

/** Create Fibonacci retracement. */
export function createFibonacci(
    startIndex: number,
    startPrice: number,
    endIndex?: number,
    endPrice?: number,
    color: ColorHex = DRAWING_COLORS.fibonacci,
): FibonacciDrawing {
    return {
        id: generateDrawingId(),
        type: "fibonacci",
        color,
        lineWidth: 1,
        state: endIndex !== undefined ? "complete" : "drawing",
        selected: false,
        startIndex,
        startPrice,
        endIndex: endIndex ?? startIndex,
        endPrice: endPrice ?? startPrice,
        levels: [...DEFAULT_FIBONACCI_LEVELS],
        showLabels: true,
    };
}

/** Check if a point is near a line segment. */
export function isPointNearLine(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    threshold: number = 5,
): boolean {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    let param = -1;
    if (lenSq !== 0) {
        param = dot / lenSq;
    }

    let xx: number;
    let yy: number;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= threshold;
}

/** Check if a point is near a horizontal line. */
export function isPointNearHorizontal(
    py: number,
    lineY: number,
    threshold: number = 5,
): boolean {
    return Math.abs(py - lineY) <= threshold;
}

/** Drawing manager class. */
export class DrawingManager {
    private drawings: AnyDrawing[] = [];
    private activeDrawing: AnyDrawing | null = null;
    private activeTool: DrawingToolType | null = null;
    private selectedDrawingId: string | null = null;

    /** Get all drawings. */
    getDrawings(): readonly AnyDrawing[] {
        return this.drawings;
    }

    /** Get active drawing being created. */
    getActiveDrawing(): AnyDrawing | null {
        return this.activeDrawing;
    }

    /** Get selected drawing. */
    getSelectedDrawing(): AnyDrawing | null {
        if (this.selectedDrawingId === null) return null;
        return this.drawings.find(d => d.id === this.selectedDrawingId) ?? null;
    }

    /** Set active tool. */
    setActiveTool(tool: DrawingToolType | null): void {
        this.activeTool = tool;
        if (this.activeDrawing !== null) {
            this.cancelDrawing();
        }
    }

    /** Get active tool. */
    getActiveTool(): DrawingToolType | null {
        return this.activeTool;
    }

    /** Start a new drawing. */
    startDrawing(index: number, price: number): AnyDrawing | null {
        if (this.activeTool === null) return null;

        switch (this.activeTool) {
            case "trendline":
                this.activeDrawing = createTrendLine(index, price);
                break;
            case "horizontal":
                this.activeDrawing = createHorizontalLine(price);
                this.finishDrawing();
                return this.drawings[this.drawings.length - 1] ?? null;
            case "ray":
                this.activeDrawing = createRayLine(index, price);
                break;
            case "rectangle":
                this.activeDrawing = createRectangle(index, price);
                break;
            case "fibonacci":
                this.activeDrawing = createFibonacci(index, price);
                break;
        }

        return this.activeDrawing;
    }

    /** Update the active drawing as mouse moves. */
    updateDrawing(index: number, price: number): void {
        if (this.activeDrawing === null) return;

        switch (this.activeDrawing.type) {
            case "trendline":
                this.activeDrawing.endIndex = index;
                this.activeDrawing.endPrice = price;
                break;
            case "ray":
                this.activeDrawing.endIndex = index;
                this.activeDrawing.endPrice = price;
                break;
            case "rectangle":
                this.activeDrawing.endIndex = index;
                this.activeDrawing.endPrice = price;
                break;
            case "fibonacci":
                this.activeDrawing.endIndex = index;
                this.activeDrawing.endPrice = price;
                break;
        }
    }

    /** Finish the current drawing. */
    finishDrawing(): void {
        if (this.activeDrawing === null) return;

        this.activeDrawing.state = "complete";
        this.drawings.push(this.activeDrawing);
        this.activeDrawing = null;
    }

    /** Cancel the current drawing. */
    cancelDrawing(): void {
        this.activeDrawing = null;
    }

    /** Select a drawing by ID. */
    selectDrawing(id: string | null): void {
        // Deselect previous.
        for (const drawing of this.drawings) {
            drawing.selected = false;
        }

        this.selectedDrawingId = id;

        if (id !== null) {
            const drawing = this.drawings.find(d => d.id === id);
            if (drawing !== undefined) {
                drawing.selected = true;
            }
        }
    }

    /** Delete the selected drawing. */
    deleteSelected(): boolean {
        if (this.selectedDrawingId === null) return false;

        const index = this.drawings.findIndex(d => d.id === this.selectedDrawingId);
        if (index !== -1) {
            this.drawings.splice(index, 1);
            this.selectedDrawingId = null;
            return true;
        }

        return false;
    }

    /** Delete a drawing by ID. */
    deleteDrawing(id: string): boolean {
        const index = this.drawings.findIndex(d => d.id === id);
        if (index !== -1) {
            this.drawings.splice(index, 1);
            if (this.selectedDrawingId === id) {
                this.selectedDrawingId = null;
            }
            return true;
        }
        return false;
    }

    /** Clear all drawings. */
    clearAll(): void {
        this.drawings = [];
        this.activeDrawing = null;
        this.selectedDrawingId = null;
    }

    /** Add a drawing directly. */
    addDrawing(drawing: AnyDrawing): void {
        this.drawings.push(drawing);
    }

    /** Find drawing at position. */
    findDrawingAt(
        mouseX: Pixel,
        mouseY: Pixel,
        toPixelX: (index: number) => Pixel,
        toPixelY: (price: number) => Pixel,
        chartBounds: { x: number; y: number; width: number; height: number },
    ): AnyDrawing | null {
        // Check in reverse order (top drawings first).
        for (let i = this.drawings.length - 1; i >= 0; i--) {
            const drawing = this.drawings[i];
            if (drawing === undefined) continue;

            if (this.isPointOnDrawing(drawing, mouseX, mouseY, toPixelX, toPixelY, chartBounds)) {
                return drawing;
            }
        }

        return null;
    }

    /** Check if point is on drawing. */
    private isPointOnDrawing(
        drawing: AnyDrawing,
        px: Pixel,
        py: Pixel,
        toPixelX: (index: number) => Pixel,
        toPixelY: (price: number) => Pixel,
        chartBounds: { x: number; y: number; width: number; height: number },
    ): boolean {
        switch (drawing.type) {
            case "trendline": {
                const x1 = toPixelX(drawing.startIndex);
                const y1 = toPixelY(drawing.startPrice);
                const x2 = toPixelX(drawing.endIndex);
                const y2 = toPixelY(drawing.endPrice);
                return isPointNearLine(px, py, x1, y1, x2, y2, 8);
            }
            case "horizontal": {
                const y = toPixelY(drawing.price);
                return isPointNearHorizontal(py, y, 5) && px >= chartBounds.x && px <= chartBounds.x + chartBounds.width;
            }
            case "ray": {
                const x1 = toPixelX(drawing.startIndex);
                const y1 = toPixelY(drawing.startPrice);
                const x2 = toPixelX(drawing.endIndex);
                const y2 = toPixelY(drawing.endPrice);
                return isPointNearLine(px, py, x1, y1, x2, y2, 8);
            }
            case "rectangle": {
                const x1 = Math.min(toPixelX(drawing.startIndex), toPixelX(drawing.endIndex));
                const x2 = Math.max(toPixelX(drawing.startIndex), toPixelX(drawing.endIndex));
                const y1 = Math.min(toPixelY(drawing.startPrice), toPixelY(drawing.endPrice));
                const y2 = Math.max(toPixelY(drawing.startPrice), toPixelY(drawing.endPrice));
                return px >= x1 - 5 && px <= x2 + 5 && py >= y1 - 5 && py <= y2 + 5;
            }
            case "fibonacci": {
                const x1 = toPixelX(drawing.startIndex);
                const x2 = toPixelX(drawing.endIndex);
                const minX = Math.min(x1, x2) - 5;
                const maxX = Math.max(x1, x2) + 5;

                if (px < minX || px > maxX) return false;

                const priceRange = drawing.endPrice - drawing.startPrice;
                for (const level of drawing.levels) {
                    const levelPrice = drawing.startPrice + priceRange * level;
                    const levelY = toPixelY(levelPrice);
                    if (isPointNearHorizontal(py, levelY, 5)) {
                        return true;
                    }
                }
                return false;
            }
        }
    }
}

/** Drawing renderer. */
export function renderDrawings(
    ctx: CanvasRenderingContext2D,
    drawings: readonly AnyDrawing[],
    activeDrawing: AnyDrawing | null,
    toPixelX: (index: number) => Pixel,
    toPixelY: (price: number) => Pixel,
    chartBounds: { x: number; y: number; width: number; height: number },
): void {
    // Save context.
    ctx.save();

    // Clip to chart area.
    ctx.beginPath();
    ctx.rect(chartBounds.x, chartBounds.y, chartBounds.width, chartBounds.height);
    ctx.clip();

    // Draw completed drawings.
    for (const drawing of drawings) {
        renderSingleDrawing(ctx, drawing, toPixelX, toPixelY, chartBounds);
    }

    // Draw active drawing.
    if (activeDrawing !== null) {
        renderSingleDrawing(ctx, activeDrawing, toPixelX, toPixelY, chartBounds, true);
    }

    ctx.restore();
}

/** Render a single drawing. */
function renderSingleDrawing(
    ctx: CanvasRenderingContext2D,
    drawing: AnyDrawing,
    toPixelX: (index: number) => Pixel,
    toPixelY: (price: number) => Pixel,
    chartBounds: { x: number; y: number; width: number; height: number },
    isActive: boolean = false,
): void {
    const color = drawing.selected ? DRAWING_COLORS.selected : drawing.color;
    const lineWidth = drawing.selected ? drawing.lineWidth + 1 : drawing.lineWidth;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (isActive) {
        ctx.setLineDash([5, 5]);
    }

    switch (drawing.type) {
        case "trendline":
            renderTrendLine(ctx, drawing, toPixelX, toPixelY);
            break;
        case "horizontal":
            renderHorizontalLine(ctx, drawing, toPixelX, toPixelY, chartBounds);
            break;
        case "ray":
            renderRayLine(ctx, drawing, toPixelX, toPixelY, chartBounds);
            break;
        case "rectangle":
            renderRectangle(ctx, drawing, toPixelX, toPixelY);
            break;
        case "fibonacci":
            renderFibonacci(ctx, drawing, toPixelX, toPixelY, chartBounds);
            break;
    }

    ctx.setLineDash([]);

    // Draw handles for selected drawings.
    if (drawing.selected && !isActive) {
        drawSelectionHandles(ctx, drawing, toPixelX, toPixelY);
    }
}

/** Render trend line. */
function renderTrendLine(
    ctx: CanvasRenderingContext2D,
    line: TrendLine,
    toPixelX: (index: number) => Pixel,
    toPixelY: (price: number) => Pixel,
): void {
    const x1 = toPixelX(line.startIndex);
    const y1 = toPixelY(line.startPrice);
    const x2 = toPixelX(line.endIndex);
    const y2 = toPixelY(line.endPrice);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

/** Render horizontal line. */
function renderHorizontalLine(
    ctx: CanvasRenderingContext2D,
    line: HorizontalLine,
    toPixelX: (index: number) => Pixel,
    toPixelY: (price: number) => Pixel,
    chartBounds: { x: number; y: number; width: number; height: number },
): void {
    const y = toPixelY(line.price);

    ctx.beginPath();
    ctx.moveTo(chartBounds.x, y);
    ctx.lineTo(chartBounds.x + chartBounds.width, y);
    ctx.stroke();

    // Draw label if present.
    if (line.label !== undefined) {
        ctx.fillStyle = line.color;
        ctx.font = "11px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.fillText(line.label, chartBounds.x + 5, y - 3);
    }

    // Draw price label.
    ctx.fillStyle = line.color;
    ctx.font = "10px monospace";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(line.price.toFixed(2), chartBounds.x + chartBounds.width - 5, y);
}

/** Render ray line. */
function renderRayLine(
    ctx: CanvasRenderingContext2D,
    line: RayLine,
    toPixelX: (index: number) => Pixel,
    toPixelY: (price: number) => Pixel,
    chartBounds: { x: number; y: number; width: number; height: number },
): void {
    const x1 = toPixelX(line.startIndex);
    const y1 = toPixelY(line.startPrice);
    const x2 = toPixelX(line.endIndex);
    const y2 = toPixelY(line.endPrice);

    // Calculate direction.
    const dx = x2 - x1;
    const dy = y2 - y1;

    // Extend to chart boundaries.
    let extendedX: number;
    let extendedY: number;

    if (line.extendRight) {
        extendedX = chartBounds.x + chartBounds.width;
        const t = dx !== 0 ? (extendedX - x1) / dx : 0;
        extendedY = y1 + t * dy;
    } else {
        extendedX = chartBounds.x;
        const t = dx !== 0 ? (extendedX - x1) / dx : 0;
        extendedY = y1 + t * dy;
    }

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(extendedX, extendedY);
    ctx.stroke();
}

/** Render rectangle. */
function renderRectangle(
    ctx: CanvasRenderingContext2D,
    rect: RectangleDrawing,
    toPixelX: (index: number) => Pixel,
    toPixelY: (price: number) => Pixel,
): void {
    const x1 = toPixelX(rect.startIndex);
    const y1 = toPixelY(rect.startPrice);
    const x2 = toPixelX(rect.endIndex);
    const y2 = toPixelY(rect.endPrice);

    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    const width = maxX - minX;
    const height = maxY - minY;

    // Fill.
    ctx.globalAlpha = rect.fillOpacity;
    ctx.fillStyle = rect.fillColor;
    ctx.fillRect(minX, minY, width, height);
    ctx.globalAlpha = 1;

    // Stroke.
    ctx.strokeRect(minX, minY, width, height);
}

/** Render Fibonacci retracement. */
function renderFibonacci(
    ctx: CanvasRenderingContext2D,
    fib: FibonacciDrawing,
    toPixelX: (index: number) => Pixel,
    toPixelY: (price: number) => Pixel,
    chartBounds: { x: number; y: number; width: number; height: number },
): void {
    const x1 = toPixelX(fib.startIndex);
    const x2 = toPixelX(fib.endIndex);
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const priceRange = fib.endPrice - fib.startPrice;

    // Draw each level.
    for (const level of fib.levels) {
        const levelPrice = fib.startPrice + priceRange * level;
        const y = toPixelY(levelPrice);

        // Different opacity for different levels.
        const alpha = level === 0 || level === 1 ? 0.8 : level === 0.5 ? 0.6 : 0.4;
        ctx.globalAlpha = alpha;

        ctx.beginPath();
        ctx.moveTo(minX, y);
        ctx.lineTo(maxX, y);
        ctx.stroke();

        // Draw label.
        if (fib.showLabels) {
            ctx.fillStyle = fib.color;
            ctx.font = "10px monospace";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(`${(level * 100).toFixed(1)}%`, maxX + 5, y);

            ctx.textAlign = "right";
            ctx.fillText(levelPrice.toFixed(2), minX - 5, y);
        }
    }

    ctx.globalAlpha = 1;

    // Draw vertical lines.
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x1, toPixelY(fib.startPrice));
    ctx.lineTo(x1, toPixelY(fib.endPrice));
    ctx.moveTo(x2, toPixelY(fib.startPrice));
    ctx.lineTo(x2, toPixelY(fib.endPrice));
    ctx.stroke();
    ctx.setLineDash([]);
}

/** Draw selection handles. */
function drawSelectionHandles(
    ctx: CanvasRenderingContext2D,
    drawing: AnyDrawing,
    toPixelX: (index: number) => Pixel,
    toPixelY: (price: number) => Pixel,
): void {
    const handleSize = 6;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;

    const drawHandle = (x: Pixel, y: Pixel) => {
        ctx.beginPath();
        ctx.rect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
        ctx.fill();
        ctx.stroke();
    };

    switch (drawing.type) {
        case "trendline":
        case "ray":
            drawHandle(toPixelX(drawing.startIndex), toPixelY(drawing.startPrice));
            drawHandle(toPixelX(drawing.endIndex), toPixelY(drawing.endPrice));
            break;
        case "rectangle":
        case "fibonacci":
            drawHandle(toPixelX(drawing.startIndex), toPixelY(drawing.startPrice));
            drawHandle(toPixelX(drawing.endIndex), toPixelY(drawing.endPrice));
            drawHandle(toPixelX(drawing.startIndex), toPixelY(drawing.endPrice));
            drawHandle(toPixelX(drawing.endIndex), toPixelY(drawing.startPrice));
            break;
    }
}

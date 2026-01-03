/**
 * Advanced chart engine with full interactivity.
 */

import { Canvas, createCanvas } from "./canvas.ts";
import { createScale, type LinearScale } from "./scale.ts";
import type { Candle, ChartConfig, Pixel, Point, ColorHex } from "./types.ts";
import { DEFAULT_CONFIG } from "./types.ts";

// Re-export types for convenience.
export type { Candle };
import {
    sma,
    ema,
    bollingerBands,
    type IndicatorPoint,
    type BollingerBands,
    INDICATOR_COLORS,
} from "./indicators.ts";
import {
    DrawingManager,
    renderDrawings,
    type DrawingToolType,
    type AnyDrawing,
} from "./drawing.ts";

/** Indicator configuration. */
export interface IndicatorConfig {
    type: "sma" | "ema" | "bollinger";
    period: number;
    color: ColorHex;
    enabled: boolean;
}

/** Chart display type. */
export type ChartType = "candlestick" | "line" | "area";

/** Viewport state for zoom/pan. */
export interface Viewport {
    startIndex: number;
    endIndex: number;
    minPrice: number;
    maxPrice: number;
}

/** Crosshair state. */
export interface CrosshairState {
    visible: boolean;
    x: Pixel;
    y: Pixel;
    candleIndex: number;
    price: number;
}

/** Chart event callbacks. */
export interface ChartCallbacks {
    onCrosshairMove?: (state: CrosshairState) => void;
    onCandleHover?: (candle: Candle | null, index: number) => void;
    onViewportChange?: (viewport: Viewport) => void;
    onDrawingChange?: (drawings: readonly AnyDrawing[]) => void;
    onDrawingSelect?: (drawing: AnyDrawing | null) => void;
}

/** Layout dimensions. */
interface Layout {
    chart: { x: number; y: number; width: number; height: number };
    volume: { x: number; y: number; width: number; height: number };
    xAxis: { x: number; y: number; width: number; height: number };
    yAxis: { x: number; y: number; width: number; height: number };
}

/** Advanced chart class. */
export class ChartEngine {
    private readonly canvas: Canvas;
    private readonly ctx: CanvasRenderingContext2D;
    private config: ChartConfig;
    private candles: Candle[] = [];
    private chartType: ChartType = "candlestick";

    // Scales.
    private xScale!: LinearScale;
    private yScale!: LinearScale;
    private volumeScale!: LinearScale;

    // Viewport for zoom/pan.
    private viewport: Viewport = {
        startIndex: 0,
        endIndex: 50,
        minPrice: 0,
        maxPrice: 100,
    };

    // Interaction state.
    private crosshair: CrosshairState = {
        visible: false,
        x: 0,
        y: 0,
        candleIndex: -1,
        price: 0,
    };
    private isDragging = false;
    private dragStart: Point = { x: 0, y: 0 };
    private dragViewportStart: Viewport = { ...this.viewport };

    // Layout.
    private layout!: Layout;

    // Callbacks.
    private callbacks: ChartCallbacks = {};

    // Animation.
    private animationFrame: number | null = null;

    // Indicators.
    private indicators: IndicatorConfig[] = [];
    private indicatorCache: Map<string, IndicatorPoint[] | BollingerBands> = new Map();

    // Drawing tools.
    private drawingManager: DrawingManager = new DrawingManager();
    private isDrawing = false;

    constructor(element: HTMLCanvasElement, config: Partial<ChartConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.canvas = createCanvas(element, this.config.width, this.config.height);
        this.ctx = this.canvas.getContext();

        this.calculateLayout();
        this.initScales();
        this.bindEvents(element);
    }

    /** Calculate layout regions. */
    private calculateLayout(): void {
        const w = this.config.width;
        const h = this.config.height;
        const yAxisWidth = 70;
        const xAxisHeight = 30;
        const volumeHeight = 60;
        const padding = 10;

        this.layout = {
            chart: {
                x: padding,
                y: padding,
                width: w - yAxisWidth - padding * 2,
                height: h - xAxisHeight - volumeHeight - padding * 2,
            },
            volume: {
                x: padding,
                y: h - xAxisHeight - volumeHeight,
                width: w - yAxisWidth - padding * 2,
                height: volumeHeight,
            },
            xAxis: {
                x: padding,
                y: h - xAxisHeight,
                width: w - yAxisWidth - padding * 2,
                height: xAxisHeight,
            },
            yAxis: {
                x: w - yAxisWidth,
                y: padding,
                width: yAxisWidth,
                height: h - xAxisHeight - padding,
            },
        };
    }

    /** Initialize scales. */
    private initScales(): void {
        this.xScale = createScale({
            domainMin: this.viewport.startIndex,
            domainMax: this.viewport.endIndex,
            rangeMin: this.layout.chart.x,
            rangeMax: this.layout.chart.x + this.layout.chart.width,
        });

        this.yScale = createScale({
            domainMin: this.viewport.minPrice,
            domainMax: this.viewport.maxPrice,
            rangeMin: this.layout.chart.y + this.layout.chart.height,
            rangeMax: this.layout.chart.y,
        });

        this.volumeScale = createScale({
            domainMin: 0,
            domainMax: 1,
            rangeMin: this.layout.volume.y + this.layout.volume.height,
            rangeMax: this.layout.volume.y,
        });
    }

    /** Bind mouse events. */
    private bindEvents(element: HTMLCanvasElement): void {
        element.addEventListener("mousemove", this.handleMouseMove.bind(this));
        element.addEventListener("mouseleave", this.handleMouseLeave.bind(this));
        element.addEventListener("mousedown", this.handleMouseDown.bind(this));
        element.addEventListener("mouseup", this.handleMouseUp.bind(this));
        element.addEventListener("wheel", this.handleWheel.bind(this), { passive: false });
    }

    /** Handle mouse move. */
    private handleMouseMove(e: MouseEvent): void {
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if in chart area.
        const inChart =
            x >= this.layout.chart.x &&
            x <= this.layout.chart.x + this.layout.chart.width &&
            y >= this.layout.chart.y &&
            y <= this.layout.chart.y + this.layout.chart.height;

        // Handle drawing in progress.
        if (this.isDrawing && inChart) {
            const index = this.xScale.toValue(x);
            const price = this.yScale.toValue(y);
            this.drawingManager.updateDrawing(index, price);
            this.scheduleRender();
            return;
        }

        if (this.isDragging) {
            this.handleDrag(x, y);
            return;
        }

        // Update crosshair.
        if (inChart) {
            const dataX = this.xScale.toValue(x);
            const candleIndex = Math.round(dataX);
            const price = this.yScale.toValue(y);

            this.crosshair = {
                visible: true,
                x,
                y,
                candleIndex: Math.max(0, Math.min(candleIndex, this.candles.length - 1)),
                price,
            };

            this.callbacks.onCrosshairMove?.(this.crosshair);

            const candle = this.candles[this.crosshair.candleIndex];
            this.callbacks.onCandleHover?.(candle ?? null, this.crosshair.candleIndex);
        } else {
            this.crosshair.visible = false;
        }

        this.scheduleRender();
    }

    /** Handle mouse leave. */
    private handleMouseLeave(): void {
        this.crosshair.visible = false;
        this.isDragging = false;
        this.scheduleRender();
    }

    /** Handle mouse down. */
    private handleMouseDown(e: MouseEvent): void {
        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if in chart area.
        const inChart =
            x >= this.layout.chart.x &&
            x <= this.layout.chart.x + this.layout.chart.width &&
            y >= this.layout.chart.y &&
            y <= this.layout.chart.y + this.layout.chart.height;

        // Handle drawing tool click.
        if (inChart && this.drawingManager.getActiveTool() !== null) {
            const index = this.xScale.toValue(x);
            const price = this.yScale.toValue(y);

            if (!this.isDrawing) {
                // Start new drawing.
                this.drawingManager.startDrawing(index, price);
                this.isDrawing = true;
                this.callbacks.onDrawingChange?.(this.drawingManager.getDrawings());
            } else {
                // Complete drawing.
                this.drawingManager.finishDrawing();
                this.isDrawing = false;
                this.callbacks.onDrawingChange?.(this.drawingManager.getDrawings());
            }
            this.scheduleRender();
            return;
        }

        // Check for drawing selection (when no tool is active).
        if (inChart && this.drawingManager.getActiveTool() === null) {
            const drawing = this.drawingManager.findDrawingAt(
                x,
                y,
                (idx) => this.xScale.toPixel(idx),
                (price) => this.yScale.toPixel(price),
                this.layout.chart,
            );

            if (drawing !== null) {
                this.drawingManager.selectDrawing(drawing.id);
                this.callbacks.onDrawingSelect?.(drawing);
                this.scheduleRender();
                return;
            } else {
                // Deselect if clicked on empty space.
                const wasSelected = this.drawingManager.getSelectedDrawing() !== null;
                this.drawingManager.selectDrawing(null);
                if (wasSelected) {
                    this.callbacks.onDrawingSelect?.(null);
                    this.scheduleRender();
                }
            }
        }

        // Normal pan behavior.
        this.isDragging = true;
        this.dragStart = { x, y };
        this.dragViewportStart = { ...this.viewport };
    }

    /** Handle mouse up. */
    private handleMouseUp(): void {
        this.isDragging = false;
    }

    /** Handle drag for panning. */
    private handleDrag(x: number, _y: number): void {
        const dx = x - this.dragStart.x;
        const pixelsPerCandle =
            this.layout.chart.width / (this.viewport.endIndex - this.viewport.startIndex);
        const candleOffset = -dx / pixelsPerCandle;

        const newStart = Math.max(0, this.dragViewportStart.startIndex + candleOffset);
        const range = this.dragViewportStart.endIndex - this.dragViewportStart.startIndex;
        const newEnd = Math.min(this.candles.length - 1, newStart + range);

        if (newEnd - newStart >= 5) {
            this.viewport.startIndex = Math.max(0, newEnd - range);
            this.viewport.endIndex = newEnd;
            this.updatePriceRange();
            this.updateScales();
            this.callbacks.onViewportChange?.(this.viewport);
            this.scheduleRender();
        }
    }

    /** Handle wheel for zoom. */
    private handleWheel(e: WheelEvent): void {
        e.preventDefault();

        const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const x = e.clientX - rect.left;

        // Only zoom if mouse is in chart area.
        if (x < this.layout.chart.x || x > this.layout.chart.x + this.layout.chart.width) {
            return;
        }

        const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
        const mouseIndex = this.xScale.toValue(x);

        const leftRange = mouseIndex - this.viewport.startIndex;
        const rightRange = this.viewport.endIndex - mouseIndex;

        let newStart = mouseIndex - leftRange * zoomFactor;
        let newEnd = mouseIndex + rightRange * zoomFactor;

        // Clamp.
        newStart = Math.max(0, newStart);
        newEnd = Math.min(this.candles.length - 1, newEnd);

        // Minimum range.
        if (newEnd - newStart >= 5 && newEnd - newStart <= this.candles.length) {
            this.viewport.startIndex = newStart;
            this.viewport.endIndex = newEnd;
            this.updatePriceRange();
            this.updateScales();
            this.callbacks.onViewportChange?.(this.viewport);
            this.scheduleRender();
        }
    }

    /** Update price range based on visible candles. */
    private updatePriceRange(): void {
        const start = Math.floor(this.viewport.startIndex);
        const end = Math.ceil(this.viewport.endIndex);
        const visible = this.candles.slice(start, end + 1);

        if (visible.length === 0) return;

        let min = Infinity;
        let max = -Infinity;
        let maxVolume = 0;

        for (const c of visible) {
            if (c.low < min) min = c.low;
            if (c.high > max) max = c.high;
            if (c.volume !== undefined && c.volume > maxVolume) maxVolume = c.volume;
        }

        const padding = (max - min) * 0.1;
        this.viewport.minPrice = min - padding;
        this.viewport.maxPrice = max + padding;

        this.volumeScale.update({ domainMax: maxVolume * 1.2 });
    }

    /** Update scales from viewport. */
    private updateScales(): void {
        this.xScale.update({
            domainMin: this.viewport.startIndex,
            domainMax: this.viewport.endIndex,
        });

        this.yScale.update({
            domainMin: this.viewport.minPrice,
            domainMax: this.viewport.maxPrice,
        });
    }

    /** Schedule a render on next animation frame. */
    private scheduleRender(): void {
        if (this.animationFrame !== null) return;
        this.animationFrame = requestAnimationFrame(() => {
            this.animationFrame = null;
            this.render();
        });
    }

    /** Set data and update viewport. */
    setData(candles: Candle[]): void {
        this.candles = candles;

        // Reset viewport to show last 50 candles or all if less.
        const count = candles.length;
        this.viewport.startIndex = Math.max(0, count - 50);
        this.viewport.endIndex = count - 1;

        this.updatePriceRange();
        this.updateScales();
        this.recalculateIndicators();
        this.scheduleRender();
    }

    /** Set chart type. */
    setChartType(type: ChartType): void {
        this.chartType = type;
        this.scheduleRender();
    }

    /** Set zoom level (1 = 50 candles visible). */
    setZoom(level: number): void {
        const targetCandles = Math.round(50 / level);
        const center = (this.viewport.startIndex + this.viewport.endIndex) / 2;
        const halfRange = targetCandles / 2;

        this.viewport.startIndex = Math.max(0, center - halfRange);
        this.viewport.endIndex = Math.min(this.candles.length - 1, center + halfRange);

        this.updatePriceRange();
        this.updateScales();
        this.scheduleRender();
    }

    /** Set callbacks. */
    setCallbacks(callbacks: ChartCallbacks): void {
        this.callbacks = callbacks;
    }

    /** Set indicators. */
    setIndicators(indicators: IndicatorConfig[]): void {
        this.indicators = indicators;
        this.recalculateIndicators();
        this.scheduleRender();
    }

    /** Set active drawing tool. */
    setDrawingTool(tool: DrawingToolType | null): void {
        this.drawingManager.setActiveTool(tool);
        this.isDrawing = false;
        this.scheduleRender();
    }

    /** Get active drawing tool. */
    getDrawingTool(): DrawingToolType | null {
        return this.drawingManager.getActiveTool();
    }

    /** Get all drawings. */
    getDrawings(): readonly AnyDrawing[] {
        return this.drawingManager.getDrawings();
    }

    /** Delete selected drawing. */
    deleteSelectedDrawing(): boolean {
        const deleted = this.drawingManager.deleteSelected();
        if (deleted) {
            this.callbacks.onDrawingChange?.(this.drawingManager.getDrawings());
            this.callbacks.onDrawingSelect?.(null);
            this.scheduleRender();
        }
        return deleted;
    }

    /** Clear all drawings. */
    clearAllDrawings(): void {
        this.drawingManager.clearAll();
        this.callbacks.onDrawingChange?.(this.drawingManager.getDrawings());
        this.scheduleRender();
    }

    /** Cancel current drawing operation. */
    cancelDrawing(): void {
        this.drawingManager.cancelDrawing();
        this.isDrawing = false;
        this.scheduleRender();
    }

    /** Set visible range by candle indices. */
    setVisibleRange(startIndex: number, endIndex: number): void {
        this.viewport.startIndex = Math.max(0, startIndex);
        this.viewport.endIndex = Math.min(this.candles.length - 1, endIndex);
        this.updatePriceRange();
        this.updateScales();
        this.callbacks.onViewportChange?.(this.viewport);
        this.scheduleRender();
    }

    /** Get current viewport. */
    getViewport(): Viewport {
        return { ...this.viewport };
    }

    /** Resize the chart without destroying state. */
    resize(width: number, height: number): void {
        if (this.config.width === width && this.config.height === height) {
            return;
        }

        this.config.width = width;
        this.config.height = height;
        this.canvas.resize(width, height);
        this.calculateLayout();
        this.updateScales();
        this.scheduleRender();
    }

    /** Get current dimensions. */
    getDimensions(): { width: number; height: number } {
        return { width: this.config.width, height: this.config.height };
    }

    /** Export chart as PNG data URL. */
    exportToPNG(): string {
        // Force a render to ensure the latest state.
        this.render();
        return this.canvas.getElement().toDataURL("image/png");
    }

    /** Export chart as PNG and download. */
    downloadPNG(filename: string = "chart.png"): void {
        const dataUrl = this.exportToPNG();
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /** Recalculate all indicators. */
    private recalculateIndicators(): void {
        this.indicatorCache.clear();

        for (const indicator of this.indicators) {
            if (!indicator.enabled) continue;

            const key = `${indicator.type}-${indicator.period}`;

            switch (indicator.type) {
                case "sma":
                    this.indicatorCache.set(key, sma(this.candles, indicator.period));
                    break;
                case "ema":
                    this.indicatorCache.set(key, ema(this.candles, indicator.period));
                    break;
                case "bollinger":
                    this.indicatorCache.set(key, bollingerBands(this.candles, indicator.period));
                    break;
            }
        }
    }

    /** Draw all enabled indicators. */
    private drawIndicators(): void {
        const { ctx } = this;

        for (const indicator of this.indicators) {
            if (!indicator.enabled) continue;

            const key = `${indicator.type}-${indicator.period}`;
            const data = this.indicatorCache.get(key);

            if (data === undefined) continue;

            if (indicator.type === "bollinger") {
                const bb = data as BollingerBands;
                this.drawIndicatorLine(bb.upper, INDICATOR_COLORS.bollingerUpper, 1, true);
                this.drawIndicatorLine(bb.middle, INDICATOR_COLORS.bollingerMiddle, 1);
                this.drawIndicatorLine(bb.lower, INDICATOR_COLORS.bollingerLower, 1, true);

                // Fill between bands.
                this.drawBollingerFill(bb);
            } else {
                const points = data as IndicatorPoint[];
                this.drawIndicatorLine(points, indicator.color, 1.5);
            }
        }
    }

    /** Draw a single indicator line. */
    private drawIndicatorLine(
        points: IndicatorPoint[],
        color: ColorHex,
        lineWidth: number,
        dashed: boolean = false,
    ): void {
        if (points.length < 2) return;

        const { ctx } = this;
        const start = Math.floor(this.viewport.startIndex);
        const end = Math.ceil(this.viewport.endIndex);

        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        if (dashed) {
            ctx.setLineDash([4, 4]);
        }

        ctx.beginPath();
        let first = true;

        for (const point of points) {
            if (point.index < start || point.index > end) continue;

            const x = this.xScale.toPixel(point.index);
            const y = this.yScale.toPixel(point.value);

            if (first) {
                ctx.moveTo(x, y);
                first = false;
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
        ctx.setLineDash([]);
    }

    /** Draw Bollinger Bands fill. */
    private drawBollingerFill(bb: BollingerBands): void {
        if (bb.upper.length < 2) return;

        const { ctx } = this;
        const { chart } = this.layout;
        const start = Math.floor(this.viewport.startIndex);
        const end = Math.ceil(this.viewport.endIndex);

        ctx.beginPath();

        // Draw upper line forward.
        let first = true;
        for (const point of bb.upper) {
            if (point.index < start || point.index > end) continue;

            const x = this.xScale.toPixel(point.index);
            const y = this.yScale.toPixel(point.value);

            if (first) {
                ctx.moveTo(x, y);
                first = false;
            } else {
                ctx.lineTo(x, y);
            }
        }

        // Draw lower line backward.
        for (let i = bb.lower.length - 1; i >= 0; i--) {
            const point = bb.lower[i];
            if (point === undefined || point.index < start || point.index > end) continue;

            const x = this.xScale.toPixel(point.index);
            const y = this.yScale.toPixel(point.value);
            ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.fillStyle = "rgba(34, 197, 94, 0.08)";
        ctx.fill();
    }

    /** Main render function. */
    render(): void {
        const { ctx } = this;

        // Clear canvas first (required for transparent backgrounds).
        ctx.clearRect(0, 0, this.config.width, this.config.height);
        if (this.config.backgroundColor !== "transparent") {
            ctx.fillStyle = this.config.backgroundColor;
            ctx.fillRect(0, 0, this.config.width, this.config.height);
        }

        // Draw grid.
        this.drawGrid();

        // Draw chart based on type.
        if (this.candles.length > 0) {
            switch (this.chartType) {
                case "candlestick":
                    this.drawCandlesticks();
                    break;
                case "line":
                    this.drawLineChart();
                    break;
                case "area":
                    this.drawAreaChart();
                    break;
            }

            // Draw indicators.
            this.drawIndicators();

            // Draw volume.
            this.drawVolume();

            // Draw drawings (annotations).
            this.drawDrawings();
        }

        // Draw axes.
        this.drawYAxis();
        this.drawXAxis();

        // Draw crosshair.
        if (this.crosshair.visible) {
            this.drawCrosshair();
        }
    }

    /** Draw all chart drawings/annotations. */
    private drawDrawings(): void {
        renderDrawings(
            this.ctx,
            this.drawingManager.getDrawings(),
            this.drawingManager.getActiveDrawing(),
            (index) => this.xScale.toPixel(index),
            (price) => this.yScale.toPixel(price),
            this.layout.chart,
        );
    }

    /** Draw grid lines. */
    private drawGrid(): void {
        const { ctx } = this;
        const { chart } = this.layout;

        ctx.strokeStyle = this.config.gridColor;
        ctx.lineWidth = 1;

        // Horizontal lines.
        const priceStep = (this.viewport.maxPrice - this.viewport.minPrice) / 5;
        for (let i = 0; i <= 5; i++) {
            const price = this.viewport.minPrice + i * priceStep;
            const y = Math.round(this.yScale.toPixel(price)) + 0.5;

            ctx.beginPath();
            ctx.moveTo(chart.x, y);
            ctx.lineTo(chart.x + chart.width, y);
            ctx.stroke();
        }

        // Vertical lines.
        const candleRange = this.viewport.endIndex - this.viewport.startIndex;
        const step = Math.ceil(candleRange / 8);
        for (let i = Math.ceil(this.viewport.startIndex); i <= this.viewport.endIndex; i += step) {
            const x = Math.round(this.xScale.toPixel(i)) + 0.5;

            ctx.beginPath();
            ctx.moveTo(x, chart.y);
            ctx.lineTo(x, chart.y + chart.height);
            ctx.stroke();
        }
    }

    /** Draw candlesticks. */
    private drawCandlesticks(): void {
        const { ctx } = this;
        const candleRange = this.viewport.endIndex - this.viewport.startIndex;
        const candleWidth = Math.max(1, (this.layout.chart.width / candleRange) * 0.8);
        const wickWidth = Math.max(1, candleWidth * 0.15);

        const start = Math.floor(this.viewport.startIndex);
        const end = Math.ceil(this.viewport.endIndex);

        for (let i = start; i <= end && i < this.candles.length; i++) {
            const candle = this.candles[i];
            if (candle === undefined) continue;

            const x = this.xScale.toPixel(i);
            const isUp = candle.close >= candle.open;
            const color = isUp ? this.config.upColor : this.config.downColor;

            const highY = this.yScale.toPixel(candle.high);
            const lowY = this.yScale.toPixel(candle.low);
            const openY = this.yScale.toPixel(candle.open);
            const closeY = this.yScale.toPixel(candle.close);

            // Wick.
            ctx.fillStyle = color;
            ctx.fillRect(x - wickWidth / 2, highY, wickWidth, lowY - highY);

            // Body.
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
            ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
        }
    }

    /** Draw line chart. */
    private drawLineChart(): void {
        const { ctx } = this;
        const start = Math.floor(this.viewport.startIndex);
        const end = Math.ceil(this.viewport.endIndex);

        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 1.5;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        ctx.beginPath();
        let first = true;

        for (let i = start; i <= end && i < this.candles.length; i++) {
            const candle = this.candles[i];
            if (candle === undefined) continue;

            const x = this.xScale.toPixel(i);
            const y = this.yScale.toPixel(candle.close);

            if (first) {
                ctx.moveTo(x, y);
                first = false;
            } else {
                ctx.lineTo(x, y);
            }
        }

        ctx.stroke();
    }

    /** Draw area chart. */
    private drawAreaChart(): void {
        const { ctx } = this;
        const { chart } = this.layout;
        const start = Math.floor(this.viewport.startIndex);
        const end = Math.ceil(this.viewport.endIndex);

        // Draw filled area.
        ctx.beginPath();

        let firstX = 0;
        let first = true;

        for (let i = start; i <= end && i < this.candles.length; i++) {
            const candle = this.candles[i];
            if (candle === undefined) continue;

            const x = this.xScale.toPixel(i);
            const y = this.yScale.toPixel(candle.close);

            if (first) {
                firstX = x;
                ctx.moveTo(x, chart.y + chart.height);
                ctx.lineTo(x, y);
                first = false;
            } else {
                ctx.lineTo(x, y);
            }
        }

        const lastCandle = this.candles[Math.min(end, this.candles.length - 1)];
        if (lastCandle !== undefined) {
            const lastX = this.xScale.toPixel(Math.min(end, this.candles.length - 1));
            ctx.lineTo(lastX, chart.y + chart.height);
        }
        ctx.closePath();

        // Gradient fill.
        const gradient = ctx.createLinearGradient(0, chart.y, 0, chart.y + chart.height);
        gradient.addColorStop(0, "rgba(34, 197, 94, 0.25)");
        gradient.addColorStop(1, "rgba(34, 197, 94, 0.02)");
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw line on top.
        this.drawLineChart();
    }

    /** Draw volume bars. */
    private drawVolume(): void {
        const { ctx } = this;
        const { volume } = this.layout;
        const candleRange = this.viewport.endIndex - this.viewport.startIndex;
        const barWidth = Math.max(1, (volume.width / candleRange) * 0.8);

        const start = Math.floor(this.viewport.startIndex);
        const end = Math.ceil(this.viewport.endIndex);

        for (let i = start; i <= end && i < this.candles.length; i++) {
            const candle = this.candles[i];
            if (candle === undefined || candle.volume === undefined) continue;

            const x = this.xScale.toPixel(i);
            const isUp = candle.close >= candle.open;
            const color = isUp ? this.config.upColor : this.config.downColor;

            const barHeight = this.volumeScale.toPixel(0) - this.volumeScale.toPixel(candle.volume);
            const y = volume.y + volume.height - barHeight;

            ctx.fillStyle = color;
            ctx.globalAlpha = 0.5;
            ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);
            ctx.globalAlpha = 1;
        }
    }

    /** Draw Y axis. */
    private drawYAxis(): void {
        const { ctx } = this;
        const { yAxis, chart } = this.layout;

        ctx.clearRect(yAxis.x, yAxis.y, yAxis.width, yAxis.height);
        if (this.config.backgroundColor !== "transparent") {
            ctx.fillStyle = this.config.backgroundColor;
            ctx.fillRect(yAxis.x, yAxis.y, yAxis.width, yAxis.height);
        }

        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "10px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        const priceStep = (this.viewport.maxPrice - this.viewport.minPrice) / 5;
        for (let i = 0; i <= 5; i++) {
            const price = this.viewport.minPrice + i * priceStep;
            const y = this.yScale.toPixel(price);

            if (y >= chart.y && y <= chart.y + chart.height) {
                ctx.fillText(price.toFixed(2), yAxis.x + 8, y);
            }
        }
    }

    /** Draw X axis. */
    private drawXAxis(): void {
        const { ctx } = this;
        const { xAxis } = this.layout;

        ctx.clearRect(xAxis.x, xAxis.y, xAxis.width, xAxis.height);
        if (this.config.backgroundColor !== "transparent") {
            ctx.fillStyle = this.config.backgroundColor;
            ctx.fillRect(xAxis.x, xAxis.y, xAxis.width, xAxis.height);
        }

        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const candleRange = this.viewport.endIndex - this.viewport.startIndex;
        const step = Math.ceil(candleRange / 6);

        for (let i = Math.ceil(this.viewport.startIndex); i <= this.viewport.endIndex; i += step) {
            const candle = this.candles[Math.round(i)];
            if (candle === undefined) continue;

            const x = this.xScale.toPixel(i);
            const date = new Date(candle.timestamp);
            const label = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

            ctx.fillText(label, x, xAxis.y + 8);
        }
    }

    /** Draw crosshair. */
    private drawCrosshair(): void {
        const { ctx } = this;
        const { chart, yAxis, xAxis } = this.layout;

        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;

        // Vertical line.
        ctx.beginPath();
        ctx.moveTo(this.crosshair.x, chart.y);
        ctx.lineTo(this.crosshair.x, chart.y + chart.height + this.layout.volume.height);
        ctx.stroke();

        // Horizontal line.
        ctx.beginPath();
        ctx.moveTo(chart.x, this.crosshair.y);
        ctx.lineTo(chart.x + chart.width, this.crosshair.y);
        ctx.stroke();

        ctx.setLineDash([]);

        // Price label.
        const priceLabel = this.crosshair.price.toFixed(2);
        ctx.fillStyle = "#111111";
        ctx.fillRect(yAxis.x, this.crosshair.y - 10, yAxis.width - 4, 20);
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.font = "10px monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(priceLabel, yAxis.x + 8, this.crosshair.y);

        // Time label.
        const candle = this.candles[this.crosshair.candleIndex];
        if (candle !== undefined) {
            const date = new Date(candle.timestamp);
            const timeLabel = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

            const labelWidth = 50;
            ctx.fillStyle = "#111111";
            ctx.fillRect(this.crosshair.x - labelWidth / 2, xAxis.y + 2, labelWidth, 18);
            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(timeLabel, this.crosshair.x, xAxis.y + 6);
        }
    }

    /** Get current hovered candle. */
    getHoveredCandle(): Candle | null {
        if (!this.crosshair.visible) return null;
        return this.candles[this.crosshair.candleIndex] ?? null;
    }

    /** Destroy and cleanup. */
    destroy(): void {
        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}

/** Creates a new chart engine. */
export function createChart(
    element: HTMLCanvasElement,
    config?: Partial<ChartConfig>,
): ChartEngine {
    return new ChartEngine(element, config);
}

// Keep old Chart class for backwards compatibility.
export { ChartEngine as Chart };

/**
 * Advanced chart engine with full interactivity.
 */

import { Canvas, createCanvas } from "./canvas.ts";
import { createScale, type LinearScale } from "./scale.ts";
import type { Candle, ChartConfig, Pixel, Point, ColorHex } from "./types.ts";
import { DEFAULT_CONFIG } from "./types.ts";
import { DARK_THEME, type ChartTheme, type ThemeType, getTheme } from "./theme.ts";

// Re-export types for convenience.
export type { Candle, ChartTheme, ThemeType };
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
import {
    PaneManager,
    calculateRSI,
    calculateMACD,
    drawRSIPane,
    drawMACDPane,
    type PaneIndicatorType,
} from "./pane.ts";
import { ViewportAnimation, Easing, type EasingFunction } from "./animation.ts";

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
    private theme: ChartTheme;
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

    // Multi-pane system for indicators.
    private paneManager: PaneManager = new PaneManager();
    private rsiData: number[] = [];
    private macdData: { macd: number[]; signal: number[]; histogram: number[] } = { macd: [], signal: [], histogram: [] };
    private showRSI = false;
    private showMACD = false;

    // Animation.
    private viewportAnimation: ViewportAnimation | null = null;
    private animationsEnabled = true;

    constructor(element: HTMLCanvasElement, config: Partial<ChartConfig> = {}, theme: ChartTheme = DARK_THEME) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.theme = theme;
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

        // Calculate indicator pane heights.
        const rsiHeight = this.showRSI ? 80 : 0;
        const macdHeight = this.showMACD ? 80 : 0;
        const indicatorHeight = rsiHeight + macdHeight;

        this.layout = {
            chart: {
                x: padding,
                y: padding,
                width: w - yAxisWidth - padding * 2,
                height: h - xAxisHeight - volumeHeight - indicatorHeight - padding * 2,
            },
            volume: {
                x: padding,
                y: h - xAxisHeight - volumeHeight - indicatorHeight,
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

        // Update pane manager dimensions.
        this.paneManager.setDimensions(w, h);
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
        this.recalculatePaneIndicators();
        this.scheduleRender();
    }

    /** Update the last candle (for real-time streaming). */
    updateLastCandle(candle: Candle): void {
        if (this.candles.length === 0) {
            this.candles.push(candle);
        } else {
            const last = this.candles[this.candles.length - 1]!;
            if (last.timestamp === candle.timestamp) {
                // Update existing candle.
                this.candles[this.candles.length - 1] = candle;
            } else {
                // New candle - append it.
                this.candles.push(candle);
                // Auto-scroll to show new candle.
                if (this.viewport.endIndex === this.candles.length - 2) {
                    this.viewport.startIndex++;
                    this.viewport.endIndex++;
                }
            }
        }
        this.updatePriceRange();
        this.updateScales();
        this.scheduleRender();
    }

    /** Append a completed candle. */
    appendCandle(candle: Candle): void {
        this.candles.push(candle);

        // Auto-scroll if viewing latest candles.
        const wasAtEnd = this.viewport.endIndex >= this.candles.length - 2;
        if (wasAtEnd) {
            this.viewport.startIndex++;
            this.viewport.endIndex++;
        }

        this.updatePriceRange();
        this.updateScales();
        this.recalculateIndicators();
        this.recalculatePaneIndicators();
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

    /** Animate to a specific viewport. */
    animateToViewport(
        target: Viewport,
        duration: number = 300,
        easing: EasingFunction = Easing.easeOutCubic,
    ): void {
        // Stop any existing animation.
        if (this.viewportAnimation) {
            this.viewportAnimation.stop();
        }

        if (!this.animationsEnabled) {
            // Skip animation, apply directly.
            this.viewport = { ...target };
            this.updateScales();
            this.scheduleRender();
            return;
        }

        this.viewportAnimation = new ViewportAnimation({
            from: { ...this.viewport },
            to: target,
            duration,
            easing,
            onUpdate: (value) => {
                this.viewport = value;
                this.updateScales();
                this.scheduleRender();
            },
            onComplete: () => {
                this.viewportAnimation = null;
            },
        });

        this.viewportAnimation.start();
    }

    /** Scroll to show the latest candles with animation. */
    scrollToEnd(animated: boolean = true): void {
        const count = this.candles.length;
        const visibleCandles = this.viewport.endIndex - this.viewport.startIndex;
        const target: Viewport = {
            startIndex: Math.max(0, count - visibleCandles - 1),
            endIndex: count - 1,
            minPrice: this.viewport.minPrice,
            maxPrice: this.viewport.maxPrice,
        };

        if (animated && this.animationsEnabled) {
            this.animateToViewport(target);
        } else {
            this.viewport = target;
            this.updatePriceRange();
            this.updateScales();
            this.scheduleRender();
        }
    }

    /** Enable or disable animations. */
    setAnimationsEnabled(enabled: boolean): void {
        this.animationsEnabled = enabled;
    }

    /** Set callbacks. */
    setCallbacks(callbacks: ChartCallbacks): void {
        this.callbacks = callbacks;
    }

    /** Get current theme. */
    getTheme(): ChartTheme {
        return this.theme;
    }

    /** Set theme. */
    setTheme(theme: ChartTheme | ThemeType): void {
        this.theme = typeof theme === "string" ? getTheme(theme) : theme;
        this.scheduleRender();
    }

    /** Set indicators. */
    setIndicators(indicators: IndicatorConfig[]): void {
        this.indicators = indicators;
        this.recalculateIndicators();
        this.scheduleRender();
    }

    /** Toggle RSI pane. */
    toggleRSI(show?: boolean): void {
        this.showRSI = show ?? !this.showRSI;
        if (this.showRSI) {
            this.paneManager.addPane({
                id: "rsi",
                type: "indicator",
                indicatorType: "rsi",
                height: 15,
                minHeight: 10,
                maxHeight: 30,
                visible: true,
                title: "RSI(14)",
            });
            this.paneManager.setPaneYRange("rsi", 0, 100);
            this.recalculatePaneIndicators();
        } else {
            this.paneManager.removePane("rsi");
        }
        this.updatePaneLayout();
        this.scheduleRender();
    }

    /** Toggle MACD pane. */
    toggleMACD(show?: boolean): void {
        this.showMACD = show ?? !this.showMACD;
        if (this.showMACD) {
            this.paneManager.addPane({
                id: "macd",
                type: "indicator",
                indicatorType: "macd",
                height: 15,
                minHeight: 10,
                maxHeight: 30,
                visible: true,
                title: "MACD(12,26,9)",
            });
            this.recalculatePaneIndicators();
        } else {
            this.paneManager.removePane("macd");
        }
        this.updatePaneLayout();
        this.scheduleRender();
    }

    /** Get RSI visibility. */
    isRSIVisible(): boolean {
        return this.showRSI;
    }

    /** Get MACD visibility. */
    isMACDVisible(): boolean {
        return this.showMACD;
    }

    /** Update pane layout dimensions. */
    private updatePaneLayout(): void {
        this.paneManager.setDimensions(this.config.width, this.config.height);
        this.calculateLayout();
    }

    /** Recalculate pane indicators (RSI/MACD). */
    private recalculatePaneIndicators(): void {
        if (this.candles.length === 0) return;

        if (this.showRSI) {
            this.rsiData = calculateRSI(this.candles, 14);
        }

        if (this.showMACD) {
            this.macdData = calculateMACD(this.candles, 12, 26, 9);
        }
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
                // Use gradient for SMA lines.
                const useGradient = indicator.type === "sma";
                this.drawIndicatorLine(points, indicator.color, 1.5, false, useGradient);
            }
        }
    }

    /** Draw a single indicator line. */
    private drawIndicatorLine(
        points: IndicatorPoint[],
        color: ColorHex,
        lineWidth: number,
        dashed: boolean = false,
        useGradient: boolean = false,
    ): void {
        if (points.length < 2) return;

        const { ctx } = this;
        const { chart } = this.layout;
        const start = Math.floor(this.viewport.startIndex);
        const end = Math.ceil(this.viewport.endIndex);

        // Create gradient if requested.
        if (useGradient) {
            const gradient = ctx.createLinearGradient(chart.x, 0, chart.x + chart.width, 0);
            gradient.addColorStop(0, color + "40"); // 25% opacity start
            gradient.addColorStop(0.3, color);
            gradient.addColorStop(0.7, color);
            gradient.addColorStop(1, color + "40"); // 25% opacity end
            ctx.strokeStyle = gradient;
        } else {
            ctx.strokeStyle = color;
        }

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
        ctx.fillStyle = this.theme.upColorTransparent.replace("0.25", "0.08");
        ctx.fill();
    }

    /** Main render function. */
    render(): void {
        const { ctx } = this;

        // Clear canvas first (required for transparent backgrounds).
        ctx.clearRect(0, 0, this.config.width, this.config.height);
        if (this.theme.background !== "transparent") {
            ctx.fillStyle = this.theme.background;
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

            // Draw indicator panes (RSI/MACD).
            this.drawIndicatorPanes();
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

    /** Draw RSI/MACD indicator panes. */
    private drawIndicatorPanes(): void {
        const { ctx } = this;
        const { volume, xAxis } = this.layout;
        const start = Math.floor(this.viewport.startIndex);
        const end = Math.ceil(this.viewport.endIndex);
        const toPixelX = (index: number) => this.xScale.toPixel(index);

        let currentY = volume.y + volume.height;
        const paneHeight = 80;
        const chartWidth = this.layout.chart.width;

        // Draw RSI pane.
        if (this.showRSI && this.rsiData.length > 0) {
            const rsiState = this.paneManager.getPaneState("rsi");
            if (rsiState) {
                // Update bounds.
                rsiState.bounds = {
                    x: this.layout.chart.x,
                    y: currentY,
                    width: chartWidth,
                    height: paneHeight,
                };
                rsiState.yScale.update({
                    rangeMin: currentY + paneHeight,
                    rangeMax: currentY,
                });

                drawRSIPane(ctx, this.rsiData, start, end, toPixelX, rsiState);
                currentY += paneHeight;
            }
        }

        // Draw MACD pane.
        if (this.showMACD && this.macdData.macd.length > 0) {
            const macdState = this.paneManager.getPaneState("macd");
            if (macdState) {
                // Update bounds.
                macdState.bounds = {
                    x: this.layout.chart.x,
                    y: currentY,
                    width: chartWidth,
                    height: paneHeight,
                };

                // Auto-scale MACD.
                let min = 0, max = 0;
                for (let i = start; i <= end && i < this.macdData.macd.length; i++) {
                    const m = this.macdData.macd[i];
                    const s = this.macdData.signal[i];
                    const h = this.macdData.histogram[i];
                    if (m !== undefined && !isNaN(m)) { min = Math.min(min, m); max = Math.max(max, m); }
                    if (s !== undefined && !isNaN(s)) { min = Math.min(min, s); max = Math.max(max, s); }
                    if (h !== undefined && !isNaN(h)) { min = Math.min(min, h); max = Math.max(max, h); }
                }
                const padding = (max - min) * 0.1 || 1;

                macdState.yScale.update({
                    domainMin: min - padding,
                    domainMax: max + padding,
                    rangeMin: currentY + paneHeight,
                    rangeMax: currentY,
                });

                const candleRange = this.viewport.endIndex - this.viewport.startIndex;
                const barWidth = Math.max(1, (chartWidth / candleRange) * 0.6);

                drawMACDPane(ctx, this.macdData, start, end, toPixelX, macdState, undefined, barWidth);
            }
        }
    }

    /** Draw grid lines. */
    private drawGrid(): void {
        const { ctx } = this;
        const { chart } = this.layout;

        ctx.strokeStyle = this.theme.grid;
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
            const color = isUp ? this.theme.upColor : this.theme.downColor;

            const highY = this.yScale.toPixel(candle.high);
            const lowY = this.yScale.toPixel(candle.low);
            const openY = this.yScale.toPixel(candle.open);
            const closeY = this.yScale.toPixel(candle.close);

            // Wick.
            ctx.fillStyle = color;
            ctx.fillRect(x - wickWidth / 2, highY, wickWidth, lowY - highY);

            // Body with rounded corners.
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
            const bodyX = x - candleWidth / 2;
            const radius = Math.min(3, candleWidth / 2, bodyHeight / 2);

            ctx.beginPath();
            ctx.roundRect(bodyX, bodyTop, candleWidth, bodyHeight, radius);
            ctx.fill();
        }
    }

    /** Draw line chart. */
    private drawLineChart(): void {
        const { ctx } = this;
        const start = Math.floor(this.viewport.startIndex);
        const end = Math.ceil(this.viewport.endIndex);

        ctx.strokeStyle = this.theme.upColor;
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
        gradient.addColorStop(0, this.theme.upColorTransparent);
        gradient.addColorStop(1, this.theme.upColorTransparent.replace(/[\d.]+\)$/, "0.02)"));
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

            const barHeight = this.volumeScale.toPixel(0) - this.volumeScale.toPixel(candle.volume);
            const y = volume.y + volume.height - barHeight;

            ctx.fillStyle = isUp ? this.theme.volumeUp : this.theme.volumeDown;
            ctx.fillRect(x - barWidth / 2, y, barWidth, barHeight);
        }
    }

    /** Draw Y axis. */
    private drawYAxis(): void {
        const { ctx } = this;
        const { yAxis, chart } = this.layout;

        ctx.clearRect(yAxis.x, yAxis.y, yAxis.width, yAxis.height);
        if (this.theme.background !== "transparent") {
            ctx.fillStyle = this.theme.background;
            ctx.fillRect(yAxis.x, yAxis.y, yAxis.width, yAxis.height);
        }

        ctx.fillStyle = this.theme.textMuted;
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
        if (this.theme.background !== "transparent") {
            ctx.fillStyle = this.theme.background;
            ctx.fillRect(xAxis.x, xAxis.y, xAxis.width, xAxis.height);
        }

        ctx.fillStyle = this.theme.textMuted;
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
        ctx.strokeStyle = this.theme.crosshair;
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
        ctx.fillStyle = this.theme.crosshairLabel;
        ctx.fillRect(yAxis.x, this.crosshair.y - 10, yAxis.width - 4, 20);
        ctx.fillStyle = this.theme.crosshairLabelText;
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
            ctx.fillStyle = this.theme.crosshairLabel;
            ctx.fillRect(this.crosshair.x - labelWidth / 2, xAxis.y + 2, labelWidth, 18);
            ctx.fillStyle = this.theme.crosshairLabelText;
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
    theme?: ChartTheme,
): ChartEngine {
    return new ChartEngine(element, config, theme);
}

// Keep old Chart class for backwards compatibility.
export { ChartEngine as Chart };

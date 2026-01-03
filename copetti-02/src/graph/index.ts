/**
 * Graph Module
 * Complete charting library with all rendering, streaming, and interaction utilities.
 *
 * This module provides:
 * - Chart engine with full interactivity (pan, zoom, crosshair)
 * - Multiple chart types (candlestick, line, area, bar, baseline, heikin-ashi)
 * - Technical indicators (SMA, EMA, Bollinger, RSI, MACD)
 * - Drawing tools (trendlines, horizontals, rays, rectangles, fibonacci)
 * - Real-time streaming support
 * - Touch/gesture support for mobile
 * - Animation utilities
 * - React hooks for easy integration
 */

// ============================================================================
// Core Chart Engine
// ============================================================================

export {
    ChartEngine,
    Chart,
    createChart,
    type ChartType,
    type ChartCallbacks,
    type CrosshairState,
    type IndicatorConfig,
    type Viewport,
} from "../core/chart.ts";

// ============================================================================
// Core Types
// ============================================================================

export type {
    Candle,
    ChartConfig,
    ColorHex,
    Pixel,
    Point,
    Unit,
    Bounds,
} from "../core/types.ts";

export { DEFAULT_CONFIG } from "../core/types.ts";

// ============================================================================
// Theme System
// ============================================================================

export {
    DARK_THEME,
    LIGHT_THEME,
    getTheme,
    ThemeManager,
    themeToCssVariables,
    applyThemeToElement,
    type ChartTheme,
    type ThemeType,
} from "../core/theme.ts";

// ============================================================================
// Extended Chart Types
// ============================================================================

export {
    drawBarChart,
    drawHollowCandlesticks,
    drawBaselineChart,
    drawHeikinAshiCandlesticks,
    calculateHeikinAshi,
    chartTypeRenderers,
    DEFAULT_BASELINE_CONFIG,
    type ExtendedChartType,
    type BaselineConfig,
    type ChartTypeRenderer,
} from "../core/chart-types.ts";

// ============================================================================
// Candlestick Rendering
// ============================================================================

export {
    drawCandles,
    getPriceRange,
    DEFAULT_CANDLE_CONFIG,
    type CandleConfig,
} from "../core/candlestick.ts";

// ============================================================================
// Line Chart Rendering
// ============================================================================

export {
    drawLine,
    drawArea,
    DEFAULT_LINE_CONFIG,
    type LinePoint,
    type LineConfig,
} from "../core/line.ts";

// ============================================================================
// Grid Rendering
// ============================================================================

export {
    drawGrid,
    DEFAULT_GRID_CONFIG,
    type GridConfig,
} from "../core/grid.ts";

// ============================================================================
// Axis Rendering
// ============================================================================

export {
    drawXAxis,
    drawYAxis,
    niceTickValues,
    priceFormatter,
    timeFormatter,
    DEFAULT_AXIS_CONFIG,
    type AxisConfig,
    type AxisFormatter,
} from "../core/axis.ts";

// ============================================================================
// Crosshair
// ============================================================================

export {
    drawCrosshair,
    drawCrosshairLabels,
    createCrosshairState,
    DEFAULT_CROSSHAIR_CONFIG,
    type CrosshairConfig,
    type CrosshairState as CrosshairData,
} from "../core/crosshair.ts";

// ============================================================================
// Technical Indicators
// ============================================================================

export {
    sma,
    ema,
    bollingerBands,
    rsi,
    macd,
    INDICATOR_COLORS,
    type IndicatorPoint,
    type IndicatorSeries,
    type BollingerBands,
    type IndicatorConfig as IndicatorSettings,
} from "../core/indicators.ts";

// ============================================================================
// Pane System (RSI, MACD, etc.)
// ============================================================================

export {
    PaneManager,
    calculateRSI,
    calculateMACD,
    drawRSIPane,
    drawMACDPane,
    drawPaneSeparator,
    DEFAULT_RSI_CONFIG,
    DEFAULT_MACD_CONFIG,
    type PaneType,
    type PaneIndicatorType,
    type PaneConfig,
    type PaneState,
    type RSIConfig,
    type MACDConfig,
} from "../core/pane.ts";

// ============================================================================
// Drawing Tools
// ============================================================================

export {
    DrawingManager,
    renderDrawings,
    createTrendLine,
    createHorizontalLine,
    createRayLine,
    createRectangle,
    createFibonacci,
    generateDrawingId,
    isPointNearLine,
    isPointNearHorizontal,
    DRAWING_COLORS,
    DEFAULT_FIBONACCI_LEVELS,
    type DrawingToolType,
    type DrawingState,
    type Drawing,
    type TrendLine,
    type HorizontalLine,
    type RayLine,
    type RectangleDrawing,
    type FibonacciDrawing,
    type AnyDrawing,
} from "../core/drawing.ts";

// ============================================================================
// Measure Tool
// ============================================================================

export {
    MeasureTool,
    formatTimeDiff,
    DEFAULT_MEASURE_CONFIG,
    type MeasureState,
    type Measurement,
    type MeasureConfig,
} from "../core/measure.ts";

// ============================================================================
// Streaming & Real-time Data
// ============================================================================

export {
    CandleAggregator,
    DataStreamManager,
    SimulatedDataStream,
    createChartDataManager,
    type StreamingState,
    type StreamingEvent,
    type StreamingCallback,
    type AggregatorConfig,
} from "../core/streaming.ts";

// ============================================================================
// Animation
// ============================================================================

export {
    ViewportAnimation,
    NumberAnimation,
    ColorAnimation,
    SpringAnimation,
    AnimationManager,
    Easing,
    animate,
    type EasingFunction,
    type AnimationState,
    type AnimationConfig,
    type ViewportValues,
} from "../core/animation.ts";

// ============================================================================
// Scale Utilities
// ============================================================================

export {
    LinearScale,
    createScale,
    createYScale,
    createXScale,
    type ScaleConfig,
} from "../core/scale.ts";

// ============================================================================
// Canvas Utilities
// ============================================================================

export {
    createCanvas,
    Canvas,
} from "../core/canvas.ts";

// ============================================================================
// Touch & Gesture Support
// ============================================================================

export {
    TouchHandler,
    createTouchHandler,
    isTouchDevice,
    type TouchState,
    type TouchCallbacks,
    type TouchConfig,
} from "../core/touch.ts";

// ============================================================================
// React Hooks
// ============================================================================

export {
    useChartData,
    useSimulatedStream,
    useCandleAggregator,
    useIndicators,
    useViewport,
    usePriceFormatter,
    useVolumeFormatter,
    useTimeFormatter,
    useTouchGestures,
    useMeasureTool,
    useTheme,
    useDrawingTool,
    useChartEngine,
} from "./hooks.ts";

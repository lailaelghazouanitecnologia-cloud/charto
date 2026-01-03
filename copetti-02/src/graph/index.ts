/**
 * Graph Module
 * Provides complete chart functionality with streaming, chart types, and utilities.
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
// Types
// ============================================================================

export type {
    Candle,
    ChartConfig,
    ColorHex,
    Pixel,
    Point,
} from "../core/types.ts";

export { DEFAULT_CONFIG } from "../core/types.ts";

// ============================================================================
// Theme
// ============================================================================

export {
    DARK_THEME,
    LIGHT_THEME,
    getTheme,
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
// Indicators
// ============================================================================

export {
    sma,
    ema,
    bollingerBands,
    INDICATOR_COLORS,
    type IndicatorPoint,
    type BollingerBands,
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
    type PaneIndicatorType,
} from "../core/pane.ts";

// ============================================================================
// Drawing Tools
// ============================================================================

export {
    DrawingManager,
    renderDrawings,
    type DrawingToolType,
    type AnyDrawing,
} from "../core/drawing.ts";

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
    Easing,
    type EasingFunction,
} from "../core/animation.ts";

// ============================================================================
// Scale
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
} from "./hooks.ts";

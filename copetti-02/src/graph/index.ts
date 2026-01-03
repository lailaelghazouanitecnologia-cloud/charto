/**
 * Graph Module
 * Re-exports core chart functionality.
 */

// Core chart engine
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

// Types
export type { Candle, ChartConfig, ColorHex } from "../core/types.ts";

// Theme
export {
    DARK_THEME,
    LIGHT_THEME,
    getTheme,
    type ChartTheme,
    type ThemeType,
} from "../core/theme.ts";

// Indicators
export {
    sma,
    ema,
    bollingerBands,
    INDICATOR_COLORS,
    type IndicatorPoint,
    type BollingerBands,
} from "../core/indicators.ts";

// Drawing tools
export {
    DrawingManager,
    renderDrawings,
    type DrawingToolType,
    type AnyDrawing,
} from "../core/drawing.ts";

// Pane system
export {
    PaneManager,
    calculateRSI,
    calculateMACD,
    drawRSIPane,
    drawMACDPane,
    type PaneIndicatorType,
} from "../core/pane.ts";

// Animation
export {
    ViewportAnimation,
    Easing,
    type EasingFunction,
} from "../core/animation.ts";

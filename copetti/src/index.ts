/**
 * @copetti/charts - Modern TypeScript charting library.
 *
 * Entry point exporting all public APIs.
 *
 * @doc-tags entry-point
 */

// Components.
export { Chart, type ChartProps, type ChartConfig, type ChartAPI } from "./components/Chart.tsx";

// Core - Events.
export { EventBus, ChartEvents, createEventBus } from "./core/events/event-bus.ts";

// Core - Models.
export {
    ScaleModel,
    createScaleModel,
    type ScaleConfig,
    type ViewportState,
    type ZoomLimits,
} from "./core/model/scale.model.ts";

// Core - Canvas.
export {
    CanvasModel,
    createCanvasModel,
    createCanvasElement,
    type CanvasConfig,
} from "./core/canvas/canvas.model.ts";

// Core - Animation.
export {
    AnimationController,
    AnimationFrameThrottle,
    Easing,
    lerp,
    lerpColor,
    type AnimationConfig,
    type AnimationState,
    type EasingFunction,
} from "./core/animation/animation.ts";

// Core - Assertions.
export {
    assert,
    assertDefined,
    assertInRange,
    assertPositive,
    assertNonNegative,
    assertNonEmptyArray,
    assertValidIndex,
    assertNever,
    AssertionError,
} from "./core/assert.ts";

// Types - Primitives.
export type {
    Pixel,
    Unit,
    Price,
    Volume,
    Timestamp,
    Percentage,
    Index,
    ViewportPercent,
    Zoom,
    ColorHex,
    ColorRGBA,
    CanvasId,
    PaneId,
    DrawerId,
    Result,
    Maybe,
    NonEmptyArray,
    DeepReadonly,
    AtLeastOne,
    RequireFields,
} from "./types/primitives.ts";

// Types - Candle.
export {
    type Candle,
    type PartialCandle,
    type PriceMovement,
    determinePriceMovement,
    createCandleFromPartial,
    validateCandle,
    sortCandlesByTimestamp,
} from "./types/candle.ts";

// Types - Bounds.
export {
    type Bounds,
    type PageBounds,
    type Point,
    DEFAULT_BOUNDS,
    isPointInBounds,
    doBoundsIntersect,
    calculateBoundsIntersection,
    haveBoundsChanged,
} from "./types/bounds.ts";

// Core - Viewable.
export {
    type Viewable,
    type VisualPoint,
    createVisualPoint,
    visualPointToPixel,
} from "./core/model/viewable.ts";

// Core - Visual Candle.
export {
    type VisualCandle,
    type VisualCandleConfig,
    type Rect,
    createVisualCandle,
    getCandleXCenter,
    getCandleXStart,
    getCandleXEnd,
    getCandleWidthPixels,
    getCandleYHigh,
    getCandleYLow,
    getCandleYOpen,
    getCandleYClose,
    getCandleBodyTop,
    getCandleBodyBottom,
    getCandleBodyHeight,
    getCandleWickHeight,
    getCandleBodyRect,
    getCandleWickRect,
    getCandleYKeyPoints,
    isPixelInCandleX,
    isPixelInCandleBody,
    isPixelInCandleFull,
} from "./core/model/visual-candle.ts";

// Core - Candle Series.
export {
    CandleSeriesModel,
    createCandleSeriesModel,
    calculateHighLow,
    type HighLow,
    type ViewportRange,
    type CandleSeriesConfig,
    DEFAULT_HIGH_LOW,
} from "./core/model/candle-series.ts";

// Core - Drawers.
export {
    type Drawer,
    type DrawerConfig,
    type DrawingContext,
    BaseDrawer,
    createDrawingContext,
} from "./core/drawers/drawer.ts";

export {
    DrawingManager,
    createDrawingManager,
    type DrawingManagerConfig,
} from "./core/drawers/drawing-manager.ts";

export {
    CandleDrawer,
    createCandleDrawer,
    type CandleDrawerConfig,
    type CandleDrawerData,
    type CandleTheme,
    DEFAULT_CANDLE_THEME,
} from "./core/drawers/candle.drawer.ts";

export {
    GridDrawer,
    createGridDrawer,
    type GridDrawerConfig,
    type GridLines,
} from "./core/drawers/grid.drawer.ts";

export {
    XAxisDrawer,
    YAxisDrawer,
    createXAxisDrawer,
    createYAxisDrawer,
    generateAxisLabels,
    type AxisLabel,
    type AxisDrawerConfig,
    type XAxisDrawerConfig,
    type YAxisDrawerConfig,
    type XAxisData,
    type YAxisData,
} from "./core/drawers/axis.drawer.ts";

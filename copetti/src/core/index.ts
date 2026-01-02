/**
 * Core module exports.
 * Following Code Style Guide: Single barrel export file.
 *
 * @doc-tags core,exports
 */

// Utilities
export {
    assert,
    assertDefined,
    assertNever,
    assertPositive,
    assertInRange,
    assertNonNegative,
    assertNonEmptyArray,
    assertValidIndex,
    assertPrePost,
    AssertionError,
} from "./assert.ts";

// Events
export {
    EventBus,
    createEventBus,
    ChartEvents,
    type ChartEventType,
} from "./events/event-bus.ts";

// Animation
export {
    AnimationController,
    AnimationFrameThrottle,
    lerp,
    lerpColor,
    Easing,
    type AnimationConfig,
    type EasingFunction,
    type AnimationState,
    type AnimationTickCallback,
    DEFAULT_ANIMATION_DURATION_MS,
} from "./animation/animation.ts";

// Canvas
export {
    CanvasModel,
    createCanvasModel,
    createCanvasElement,
    type CanvasConfig,
    DEFAULT_CANVAS_CONFIG,
    MIN_CANVAS_SIZE,
} from "./canvas/canvas.model.ts";

// Models
export {
    ScaleModel,
    createScaleModel,
    type ViewportState,
    type ScaleConfig,
    type ZoomLimits,
    DEFAULT_SCALE_CONFIG,
} from "./model/scale.model.ts";

export {
    type Viewable,
    type VisualPoint,
    createVisualPoint,
    visualPointToPixel,
} from "./model/viewable.ts";

export {
    type VisualCandle,
    type VisualCandleConfig,
    type Rect,
    createVisualCandle,
    getCandleXStart,
    getCandleXEnd,
    getCandleXCenter,
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
    DEFAULT_VISUAL_CANDLE_CONFIG,
} from "./model/visual-candle.ts";

export {
    CandleSeriesModel,
    createCandleSeriesModel,
    calculateHighLow,
    type CandleSeriesConfig,
    type HighLow,
    type ViewportRange,
    DEFAULT_CANDLE_SERIES_CONFIG,
    DEFAULT_HIGH_LOW,
} from "./model/candle-series.ts";

// Drawers
export {
    type Drawer,
    type DrawerConfig,
    BaseDrawer,
} from "./drawers/drawer.ts";

export {
    DrawingManager,
    createDrawingManager,
    type DrawingManagerConfig,
} from "./drawers/drawing-manager.ts";

export {
    CandleDrawer,
    createCandleDrawer,
    type CandleDrawerConfig,
    type CandleDrawerData,
    DEFAULT_CANDLE_DRAWER_CONFIG,
} from "./drawers/candle.drawer.ts";

export {
    GridDrawer,
    createGridDrawer,
    type GridDrawerConfig,
    type GridLines,
    DEFAULT_GRID_DRAWER_CONFIG,
} from "./drawers/grid.drawer.ts";

export {
    XAxisDrawer,
    YAxisDrawer,
    createXAxisDrawer,
    createYAxisDrawer,
    generateAxisLabels,
    type AxisDrawerConfig,
    type XAxisDrawerConfig,
    type YAxisDrawerConfig,
    type XAxisData,
    type YAxisData,
    type AxisLabel,
    DEFAULT_AXIS_DRAWER_CONFIG,
    DEFAULT_X_AXIS_CONFIG,
    DEFAULT_Y_AXIS_CONFIG,
} from "./drawers/axis.drawer.ts";

export {
    LineDrawer,
    createLineDrawer,
    type LineDrawerConfig,
    type LineDrawerData,
    type LinePoint,
    DEFAULT_LINE_DRAWER_CONFIG,
} from "./drawers/line.drawer.ts";

export {
    AreaDrawer,
    createAreaDrawer,
    type AreaDrawerConfig,
    type AreaDrawerData,
    DEFAULT_AREA_DRAWER_CONFIG,
} from "./drawers/area.drawer.ts";

export {
    VolumeDrawer,
    createVolumeDrawer,
    calculateMaxVolume,
    type VolumeDrawerConfig,
    type VolumeDrawerData,
    type VolumeBar,
    DEFAULT_VOLUME_DRAWER_CONFIG,
} from "./drawers/volume.drawer.ts";

export {
    HighlightDrawer,
    createHighlightDrawer,
    createVerticalHighlight,
    createHorizontalHighlight,
    type HighlightDrawerConfig,
    type HighlightDrawerData,
    type HighlightZone,
    type HighlightType,
    type VerticalHighlight,
    type HorizontalHighlight,
    type RectangleHighlight,
    DEFAULT_HIGHLIGHT_DRAWER_CONFIG,
} from "./drawers/highlight.drawer.ts";

export {
    BarDrawer,
    createBarDrawer,
    type BarDrawerConfig,
    type BarDrawerData,
    DEFAULT_BAR_DRAWER_CONFIG,
} from "./drawers/bar.drawer.ts";

export {
    HistogramDrawer,
    createHistogramDrawer,
    createHistogramPoints,
    type HistogramDrawerConfig,
    type HistogramDrawerData,
    type HistogramPoint,
    DEFAULT_HISTOGRAM_DRAWER_CONFIG,
} from "./drawers/histogram.drawer.ts";

// Interaction
export {
    CrossToolModel,
    CrossToolDrawer,
    createCrossToolModel,
    createCrossToolDrawer,
    type CrossToolConfig,
    type CrossToolDrawerConfig,
    type CrossToolHover,
    type CrossToolType,
    type MagnetTarget,
    DEFAULT_CROSS_TOOL_CONFIG,
    DEFAULT_CROSS_TOOL_DRAWER_CONFIG,
    DEFAULT_CROSS_TOOL_HOVER,
} from "./interaction/cross-tool.ts";

export {
    InputHandler,
    createInputHandler,
    type InputHandlerConfig,
    type PointerEventData,
    type WheelEventData,
    type DragState,
    MouseButton,
    DEFAULT_INPUT_HANDLER_CONFIG,
    DEFAULT_DRAG_STATE,
} from "./interaction/input-handler.ts";

export {
    PanHandler,
    ZoomHandler,
    createPanHandler,
    createZoomHandler,
    type PanHandlerConfig,
    type ZoomHandlerConfig,
    DEFAULT_PAN_HANDLER_CONFIG,
    DEFAULT_ZOOM_HANDLER_CONFIG,
} from "./interaction/pan-zoom-handler.ts";

// Formatters
export {
    DateTimeFormatter,
    createDateTimeFormatter,
    formatDateTime,
    createAxisLabelFormatter,
    type DateTimeFormatterConfig,
    type TimePeriod,
    type DateTimePattern,
    DEFAULT_DATETIME_FORMATTER_CONFIG,
} from "./formatters/datetime.formatter.ts";

export {
    PriceFormatter,
    createPriceFormatter,
    formatPrice,
    createPriceAxisFormatter,
    createCurrencyFormatter,
    createPercentFormatter,
    type PriceFormatterConfig,
    type PriceFormatType,
    DEFAULT_PRICE_FORMATTER_CONFIG,
} from "./formatters/price.formatter.ts";

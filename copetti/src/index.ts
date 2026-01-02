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

/**
 * Main Chart component.
 * Following Code Style Guide: Explicit control flow, proper cleanup.
 *
 * @doc-tags components,chart
 */

import { useRef, useEffect, forwardRef, useImperativeHandle, type RefObject } from "react";
import { CanvasModel } from "../core/canvas/canvas.model.ts";
import { createEventBus, type EventBus } from "../core/events/event-bus.ts";
import { createScaleModel, type ScaleModel } from "../core/model/scale.model.ts";
import type { Candle } from "../types/candle.ts";

/**
 * Chart configuration props.
 */
export interface ChartConfig {
    readonly autoScale?: boolean;
    readonly showGrid?: boolean;
    readonly showCrosshair?: boolean;
    readonly showVolumes?: boolean;
    readonly theme?: "light" | "dark";
}

/**
 * Chart component props.
 */
export interface ChartProps {
    /** Chart data as array of candles. */
    readonly data?: readonly Candle[];
    /** Chart configuration. */
    readonly config?: ChartConfig;
    /** Width in pixels (defaults to container width). */
    readonly width?: number;
    /** Height in pixels. */
    readonly height?: number;
    /** CSS class name. */
    readonly className?: string;
    /** Callback when chart is ready. */
    readonly onReady?: (api: ChartAPI) => void;
    /** Callback when data changes. */
    readonly onDataChange?: (data: readonly Candle[]) => void;
}

/**
 * Chart API exposed via ref.
 */
export interface ChartAPI {
    /** Sets the chart data. */
    setData: (data: readonly Candle[]) => void;
    /** Zooms the chart. */
    zoom: (factor: number) => void;
    /** Pans the chart. */
    pan: (deltaX: number, deltaY: number) => void;
    /** Resets the view to default. */
    resetView: () => void;
    /** Gets the current scale model. */
    getScaleModel: () => ScaleModel;
    /** Exports chart as image. */
    exportImage: (type?: string) => string;
}

/**
 * Default chart configuration.
 */
const DEFAULT_CONFIG: Required<ChartConfig> = {
    autoScale: true,
    showGrid: true,
    showCrosshair: true,
    showVolumes: true,
    theme: "dark",
} as const;

/**
 * Default chart dimensions.
 */
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 400;

/**
 * Chart component for rendering financial data.
 *
 * Features:
 * - Canvas-based rendering for performance.
 * - Zoom and pan support.
 * - Auto-scaling.
 * - Multiple chart types.
 */
export const Chart = forwardRef<ChartAPI, ChartProps>(function Chart(props, ref) {
    const {
        data = [],
        config: userConfig = {},
        width = DEFAULT_WIDTH,
        height = DEFAULT_HEIGHT,
        className = "",
        onReady,
        onDataChange,
    } = props;

    // Merge config with defaults.
    const config: Required<ChartConfig> = { ...DEFAULT_CONFIG, ...userConfig };

    // Refs.
    const containerRef = useRef<HTMLDivElement>(null);
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

    // Internal state refs (avoid re-renders).
    const canvasModelRef = useRef<CanvasModel | null>(null);
    const scaleModelRef = useRef<ScaleModel | null>(null);
    const eventBusRef = useRef<EventBus | null>(null);
    const dataRef = useRef<readonly Candle[]>(data);

    // Update data ref when data changes.
    useEffect(() => {
        dataRef.current = data;
        onDataChange?.(data);

        // Trigger redraw.
        eventBusRef.current?.fireDraw();
    }, [data, onDataChange]);

    // Initialize chart.
    useEffect(() => {
        const container = containerRef.current;
        const mainCanvas = mainCanvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;

        // Guard clause - early exit if refs not ready.
        if (container === null || mainCanvas === null || overlayCanvas === null) {
            return;
        }

        // Create core components.
        const eventBus = createEventBus();
        const scaleModel = createScaleModel({ autoScale: config.autoScale });
        const canvasModel = new CanvasModel(mainCanvas, {
            id: "main",
            width,
            height,
        });

        // Store refs.
        eventBusRef.current = eventBus;
        scaleModelRef.current = scaleModel;
        canvasModelRef.current = canvasModel;

        // Initial render.
        eventBus.fireDraw();

        // Notify ready.
        const api = createChartAPI(canvasModel, scaleModel, dataRef);
        onReady?.(api);

        // Cleanup.
        return (): void => {
            scaleModel.dispose();
            eventBus.clear();
        };
    }, [config.autoScale, width, height, onReady]);

    // Handle resize.
    useEffect(() => {
        const canvasModel = canvasModelRef.current;
        if (canvasModel !== null) {
            canvasModel.resize(width, height);
            eventBusRef.current?.fireDraw();
        }
    }, [width, height]);

    // Expose API via ref.
    useImperativeHandle(
        ref,
        () => {
            const canvasModel = canvasModelRef.current;
            const scaleModel = scaleModelRef.current;

            // Return stub API if not initialized yet.
            if (canvasModel === null || scaleModel === null) {
                return createStubChartAPI();
            }

            return createChartAPI(canvasModel, scaleModel, dataRef);
        },
        [],
    );

    // Container styles.
    const containerClassName = `chart-container relative ${className}`.trim();
    const containerStyle = {
        width: `${width}px`,
        height: `${height}px`,
    };

    return (
        <div ref={containerRef} className={containerClassName} style={containerStyle}>
            <canvas
                ref={mainCanvasRef}
                className="chart-canvas absolute inset-0"
                data-testid="chart-main-canvas"
            />
            <canvas
                ref={overlayCanvasRef}
                className="chart-canvas absolute inset-0 pointer-events-none"
                data-testid="chart-overlay-canvas"
            />
        </div>
    );
});

/**
 * Creates a stub API for when chart is not yet initialized.
 */
function createStubChartAPI(): ChartAPI {
    const stubScaleModel = createScaleModel();

    return {
        setData: (): void => {},
        zoom: (): void => {},
        pan: (): void => {},
        resetView: (): void => {},
        getScaleModel: (): ScaleModel => stubScaleModel,
        exportImage: (): string => "",
    };
}

/**
 * Creates the chart API object.
 */
function createChartAPI(
    canvasModel: CanvasModel,
    scaleModel: ScaleModel,
    dataRef: RefObject<readonly Candle[]>,
): ChartAPI {
    return {
        setData: (_data: readonly Candle[]): void => {
            // Data is managed via props, this is for imperative updates.
            // Would update internal data store here.
        },

        zoom: (factor: number): void => {
            scaleModel.zoomX(factor);
        },

        pan: (deltaX: number, _deltaY: number): void => {
            scaleModel.panX(deltaX);
        },

        resetView: (): void => {
            const data = dataRef.current;
            if (data !== null && data.length > 0) {
                scaleModel.setState({
                    xStart: 0,
                    xEnd: data.length,
                    yStart: 0,
                    yEnd: 100,
                });
            }
        },

        getScaleModel: (): ScaleModel => scaleModel,

        exportImage: (type = "image/png"): string => {
            return canvasModel.toDataURL(type);
        },
    };
}

// Export component and types.
export default Chart;

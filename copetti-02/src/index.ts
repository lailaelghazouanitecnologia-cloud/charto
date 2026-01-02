/**
 * Copetti Charts - TypeScript charting library with React.
 */

// Utilities.
export { cn } from "./lib/utils.ts";

// Core modules.
export * from "./core/types.ts";
export * from "./core/canvas.ts";
export * from "./core/scale.ts";
export * from "./core/candlestick.ts";
export * from "./core/grid.ts";
export * from "./core/line.ts";
export * from "./core/axis.ts";
export * from "./core/crosshair.ts";
export * from "./core/indicators.ts";
export * from "./core/chart.ts";

// UI components (shadcn-style).
export * from "./components/ui/index.ts";

// Chart components.
export { Chart } from "./components/Chart.tsx";
export { ChartControls } from "./components/ChartControls.tsx";
export { DataPanel } from "./components/DataPanel.tsx";

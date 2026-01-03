/**
 * Gadget Registry
 * Exports all available gadgets.
 */

// Import to register gadgets
import "./SymbolGadget.tsx";
import "./PerformanceGadget.tsx";
import "./TechnicalsGadget.tsx";
import "./WatchlistGadget.tsx";
import "./ScreenerGadget.tsx";

// Re-export components for direct use if needed
export { SymbolGadget } from "./SymbolGadget.tsx";
export { PerformanceGadget } from "./PerformanceGadget.tsx";
export { TechnicalsGadget } from "./TechnicalsGadget.tsx";
export { WatchlistGadget } from "./WatchlistGadget.tsx";
export { ScreenerGadget } from "./ScreenerGadget.tsx";

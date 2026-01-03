/**
 * Gadget Module
 * Provides a gadget system for modular UI components.
 */

// Types
export type {
    GadgetId,
    GadgetZone,
    GadgetConfig,
    GadgetDefinition,
    GadgetProps,
    LayoutState,
    LayoutActions,
} from "./types.ts";

// Manager
export {
    registerGadget,
    getGadgetDefinition,
    getRegisteredGadgets,
    LayoutProvider,
    useLayout,
    useZoneGadgets,
} from "./GadgetManager.tsx";

// Components
export { GadgetWrapper, MinimalGadget } from "./Gadget.tsx";

// Register all gadgets
import "./gadgets/index.ts";

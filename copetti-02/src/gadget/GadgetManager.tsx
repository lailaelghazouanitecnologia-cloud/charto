/**
 * Gadget Manager
 * Provides state management for the gadget system.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type {
    GadgetId,
    GadgetZone,
    GadgetConfig,
    GadgetDefinition,
    LayoutState,
    LayoutActions,
} from "./types.ts";

/** Registry of available gadgets. */
const gadgetRegistry = new Map<string, GadgetDefinition>();

/** Register a gadget type. */
export function registerGadget(definition: GadgetDefinition): void {
    gadgetRegistry.set(definition.type, definition);
}

/** Get a gadget definition. */
export function getGadgetDefinition(type: string): GadgetDefinition | undefined {
    return gadgetRegistry.get(type);
}

/** Get all registered gadgets. */
export function getRegisteredGadgets(): GadgetDefinition[] {
    return Array.from(gadgetRegistry.values());
}

/** Generate unique gadget ID. */
let gadgetIdCounter = 0;
function generateGadgetId(type: string): GadgetId {
    return `${type}-${++gadgetIdCounter}`;
}

/** Layout context. */
interface LayoutContextValue extends LayoutState, LayoutActions {}

const LayoutContext = createContext<LayoutContextValue | null>(null);

/** Use layout context. */
export function useLayout(): LayoutContextValue {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error("useLayout must be used within LayoutProvider");
    }
    return context;
}

/** Default layout state. */
const DEFAULT_LAYOUT: LayoutState = {
    gadgets: [],
    sidebarWidth: 240,
    bottomHeight: 160,
    sidebarVisible: true,
    bottomVisible: true,
};

/** Layout provider props. */
interface LayoutProviderProps {
    children: ReactNode;
    initialGadgets?: Array<{ type: string; zone?: GadgetZone; collapsed?: boolean }>;
}

/** Layout provider component. */
export function LayoutProvider({ children, initialGadgets = [] }: LayoutProviderProps) {
    const [state, setState] = useState<LayoutState>(() => {
        const gadgets: GadgetConfig[] = initialGadgets.map((g, index) => {
            const def = getGadgetDefinition(g.type);
            return {
                id: generateGadgetId(g.type),
                type: g.type,
                title: def?.title ?? g.type,
                zone: g.zone ?? def?.defaultZone ?? "sidebar",
                order: index,
                visible: true,
                collapsed: g.collapsed ?? def?.defaultCollapsed ?? false,
            };
        });
        return { ...DEFAULT_LAYOUT, gadgets };
    });

    const addGadget = useCallback((type: string, zone?: GadgetZone) => {
        const def = getGadgetDefinition(type);
        if (!def) return;

        setState(prev => {
            const sameZoneGadgets = prev.gadgets.filter(g => g.zone === (zone ?? def.defaultZone));
            const maxOrder = sameZoneGadgets.reduce((max, g) => Math.max(max, g.order), -1);

            const newGadget: GadgetConfig = {
                id: generateGadgetId(type),
                type,
                title: def.title,
                zone: zone ?? def.defaultZone,
                order: maxOrder + 1,
                visible: true,
                collapsed: def.defaultCollapsed ?? false,
            };

            return { ...prev, gadgets: [...prev.gadgets, newGadget] };
        });
    }, []);

    const removeGadget = useCallback((id: GadgetId) => {
        setState(prev => ({
            ...prev,
            gadgets: prev.gadgets.filter(g => g.id !== id),
        }));
    }, []);

    const toggleGadget = useCallback((id: GadgetId) => {
        setState(prev => ({
            ...prev,
            gadgets: prev.gadgets.map(g =>
                g.id === id ? { ...g, visible: !g.visible } : g
            ),
        }));
    }, []);

    const moveGadget = useCallback((id: GadgetId, zone: GadgetZone, order: number) => {
        setState(prev => ({
            ...prev,
            gadgets: prev.gadgets.map(g =>
                g.id === id ? { ...g, zone, order } : g
            ),
        }));
    }, []);

    const toggleCollapse = useCallback((id: GadgetId) => {
        setState(prev => ({
            ...prev,
            gadgets: prev.gadgets.map(g =>
                g.id === id ? { ...g, collapsed: !g.collapsed } : g
            ),
        }));
    }, []);

    const toggleSidebar = useCallback(() => {
        setState(prev => ({ ...prev, sidebarVisible: !prev.sidebarVisible }));
    }, []);

    const toggleBottom = useCallback(() => {
        setState(prev => ({ ...prev, bottomVisible: !prev.bottomVisible }));
    }, []);

    const setSidebarWidth = useCallback((width: number) => {
        setState(prev => ({ ...prev, sidebarWidth: width }));
    }, []);

    const setBottomHeight = useCallback((height: number) => {
        setState(prev => ({ ...prev, bottomHeight: height }));
    }, []);

    const value: LayoutContextValue = {
        ...state,
        addGadget,
        removeGadget,
        toggleGadget,
        moveGadget,
        toggleCollapse,
        toggleSidebar,
        toggleBottom,
        setSidebarWidth,
        setBottomHeight,
    };

    return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

/** Get gadgets for a specific zone. */
export function useZoneGadgets(zone: GadgetZone): GadgetConfig[] {
    const { gadgets } = useLayout();
    return gadgets
        .filter(g => g.zone === zone && g.visible)
        .sort((a, b) => a.order - b.order);
}

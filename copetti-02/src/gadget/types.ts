/**
 * Gadget System Types
 */

import type { ReactNode } from "react";

/** Gadget unique identifier. */
export type GadgetId = string;

/** Gadget placement zone. */
export type GadgetZone = "sidebar" | "bottom" | "overlay";

/** Gadget configuration. */
export interface GadgetConfig {
    id: GadgetId;
    type: string;
    title: string;
    zone: GadgetZone;
    order: number;
    visible: boolean;
    collapsed: boolean;
    props?: Record<string, unknown>;
}

/** Gadget registry entry. */
export interface GadgetDefinition {
    type: string;
    title: string;
    icon?: ReactNode;
    defaultZone: GadgetZone;
    defaultCollapsed?: boolean;
    component: React.ComponentType<GadgetProps>;
    noBackground?: boolean;
}

/** Props passed to gadget components. */
export interface GadgetProps {
    id: GadgetId;
    collapsed: boolean;
    onToggleCollapse: () => void;
    onRemove: () => void;
    data?: Record<string, unknown>;
}

/** Layout state. */
export interface LayoutState {
    gadgets: GadgetConfig[];
    sidebarWidth: number;
    bottomHeight: number;
    sidebarVisible: boolean;
    bottomVisible: boolean;
}

/** Layout actions. */
export interface LayoutActions {
    addGadget: (type: string, zone?: GadgetZone) => void;
    removeGadget: (id: GadgetId) => void;
    toggleGadget: (id: GadgetId) => void;
    moveGadget: (id: GadgetId, zone: GadgetZone, order: number) => void;
    toggleCollapse: (id: GadgetId) => void;
    toggleSidebar: () => void;
    toggleBottom: () => void;
    setSidebarWidth: (width: number) => void;
    setBottomHeight: (height: number) => void;
}

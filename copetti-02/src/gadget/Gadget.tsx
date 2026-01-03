/**
 * Gadget Component
 * Collapsible card wrapper for gadgets.
 */

import { ChevronDown, ChevronRight, X, MoreHorizontal } from "lucide-react";
import { cn } from "../lib/utils.ts";
import { getGadgetDefinition, useLayout } from "./GadgetManager.tsx";
import type { GadgetConfig } from "./types.ts";

interface GadgetWrapperProps {
    config: GadgetConfig;
    data?: Record<string, unknown>;
    className?: string;
}

export function GadgetWrapper({ config, data, className }: GadgetWrapperProps) {
    const { toggleCollapse, removeGadget } = useLayout();
    const definition = getGadgetDefinition(config.type);

    if (!definition) return null;

    const Component = definition.component;
    const noBackground = definition.noBackground ?? false;

    return (
        <div
            className={cn(
                "overflow-hidden rounded-xl transition-all",
                noBackground ? "" : "bg-[#111111]",
                className
            )}
        >
            {/* Header */}
            <div
                className="flex cursor-pointer items-center justify-between px-3 py-2.5"
                onClick={() => toggleCollapse(config.id)}
            >
                <div className="flex items-center gap-2">
                    <button className="flex h-4 w-4 items-center justify-center text-[#555]">
                        {config.collapsed ? (
                            <ChevronRight size={12} />
                        ) : (
                            <ChevronDown size={12} />
                        )}
                    </button>
                    <span className="text-[11px] font-semibold text-white">{config.title}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                        className="flex h-[18px] w-[18px] items-center justify-center rounded text-[#444] hover:text-[#888]"
                    >
                        <MoreHorizontal size={10} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            removeGadget(config.id);
                        }}
                        className="flex h-[18px] w-[18px] items-center justify-center rounded text-[#444] hover:text-[#888]"
                    >
                        <X size={10} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {!config.collapsed && (
                <div className="px-3 pb-3">
                    <Component
                        id={config.id}
                        collapsed={config.collapsed}
                        onToggleCollapse={() => toggleCollapse(config.id)}
                        onRemove={() => removeGadget(config.id)}
                        data={data}
                    />
                </div>
            )}
        </div>
    );
}

/** Minimal gadget for inline/compact display. */
interface MinimalGadgetProps {
    config: GadgetConfig;
    data?: Record<string, unknown>;
}

export function MinimalGadget({ config, data }: MinimalGadgetProps) {
    const definition = getGadgetDefinition(config.type);
    if (!definition) return null;

    const Component = definition.component;
    const { toggleCollapse, removeGadget } = useLayout();

    return (
        <Component
            id={config.id}
            collapsed={config.collapsed}
            onToggleCollapse={() => toggleCollapse(config.id)}
            onRemove={() => removeGadget(config.id)}
            data={data}
        />
    );
}

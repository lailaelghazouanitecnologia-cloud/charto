import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

interface TooltipProps {
    children: ReactNode;
    content: ReactNode;
    side?: "top" | "right" | "bottom" | "left";
    sideOffset?: number;
}

export function Tooltip({
    children,
    content,
    side = "top",
    sideOffset = 4,
}: TooltipProps) {
    return (
        <TooltipPrimitive.Provider delayDuration={200}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                    {children}
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        side={side}
                        sideOffset={sideOffset}
                        className="z-50 rounded-md bg-[#222] px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-0 zoom-in-95"
                    >
                        {content}
                        <TooltipPrimitive.Arrow className="fill-[#222]" />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}

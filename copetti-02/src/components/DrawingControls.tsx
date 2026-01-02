import { useState } from "react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
    Button,
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "./ui/index.ts";
import { cn } from "../lib/utils.ts";
import type { DrawingToolType } from "../core/drawing.ts";

interface DrawingControlsProps {
    activeTool: DrawingToolType | null;
    onToolChange: (tool: DrawingToolType | null) => void;
    onClearAll: () => void;
    onDeleteSelected: () => void;
    hasSelection: boolean;
    drawingCount: number;
}

interface DrawingToolOption {
    type: DrawingToolType;
    label: string;
    icon: JSX.Element;
    description: string;
}

const DRAWING_TOOLS: DrawingToolOption[] = [
    {
        type: "trendline",
        label: "Trend Line",
        description: "Draw a line between two points",
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="20" x2="20" y2="4" />
            </svg>
        ),
    },
    {
        type: "horizontal",
        label: "Horizontal Line",
        description: "Draw a horizontal price level",
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="12" x2="20" y2="12" />
            </svg>
        ),
    },
    {
        type: "ray",
        label: "Ray",
        description: "Draw a ray extending in one direction",
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="16" x2="20" y2="8" />
                <polyline points="15 7 20 8 19 13" />
            </svg>
        ),
    },
    {
        type: "rectangle",
        label: "Rectangle",
        description: "Draw a rectangular zone",
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="6" width="16" height="12" rx="1" />
            </svg>
        ),
    },
    {
        type: "fibonacci",
        label: "Fibonacci",
        description: "Draw Fibonacci retracement levels",
        icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="4" y1="4" x2="20" y2="4" />
                <line x1="4" y1="9" x2="20" y2="9" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="16" x2="20" y2="16" />
                <line x1="4" y1="20" x2="20" y2="20" />
            </svg>
        ),
    },
];

export function DrawingControls({
    activeTool,
    onToolChange,
    onClearAll,
    onDeleteSelected,
    hasSelection,
    drawingCount,
}: DrawingControlsProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleToolSelect = (tool: DrawingToolType) => {
        if (activeTool === tool) {
            onToolChange(null);
        } else {
            onToolChange(tool);
        }
    };

    const activeToolOption = DRAWING_TOOLS.find(t => t.type === activeTool);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                                "gap-2",
                                activeTool !== null && "border-primary bg-primary/10",
                            )}
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 19l7-7 3 3-7 7-3-3z" />
                                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
                                <path d="M2 2l7.586 7.586" />
                            </svg>
                            {activeToolOption ? activeToolOption.label : "Draw"}
                            {drawingCount > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px]">
                                    {drawingCount}
                                </span>
                            )}
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Drawing tools</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-72" align="start">
                <div className="space-y-3">
                    <h4 className="font-medium text-sm">Drawing Tools</h4>

                    <div className="space-y-1">
                        {DRAWING_TOOLS.map((tool) => (
                            <button
                                key={tool.type}
                                onClick={() => handleToolSelect(tool.type)}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                                    activeTool === tool.type
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-muted",
                                )}
                            >
                                <span className={cn(
                                    activeTool === tool.type ? "text-primary-foreground" : "text-muted-foreground"
                                )}>
                                    {tool.icon}
                                </span>
                                <div className="flex-1 text-left">
                                    <div className="font-medium">{tool.label}</div>
                                    <div className={cn(
                                        "text-xs",
                                        activeTool === tool.type
                                            ? "text-primary-foreground/70"
                                            : "text-muted-foreground",
                                    )}>
                                        {tool.description}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {(hasSelection || drawingCount > 0) && (
                        <div className="border-t pt-3 space-y-2">
                            {hasSelection && (
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                        onDeleteSelected();
                                    }}
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="mr-2"
                                    >
                                        <path d="M3 6h18" />
                                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                    </svg>
                                    Delete Selected
                                </Button>
                            )}
                            {drawingCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                        onClearAll();
                                        setIsOpen(false);
                                    }}
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="mr-2"
                                    >
                                        <path d="M18 6 6 18" />
                                        <path d="m6 6 12 12" />
                                    </svg>
                                    Clear All ({drawingCount})
                                </Button>
                            )}
                        </div>
                    )}

                    <div className="border-t pt-2">
                        <p className="text-xs text-muted-foreground">
                            {activeTool !== null ? (
                                <>
                                    Click on chart to start drawing.
                                    <br />
                                    Click again to complete.
                                    <br />
                                    Press <kbd className="px-1 py-0.5 rounded bg-muted">Esc</kbd> to cancel.
                                </>
                            ) : (
                                <>
                                    Select a tool to start drawing.
                                    <br />
                                    Click on drawings to select them.
                                    <br />
                                    Press <kbd className="px-1 py-0.5 rounded bg-muted">Delete</kbd> to remove.
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

/**
 * Scripting Panel Component
 * A proper code editor with syntax highlighting and scrolling.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Play, Terminal, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "../lib/utils.ts";
import { tokenize, TOKEN_COLORS, DEFAULT_SCRIPT } from "../scripting/index.ts";

interface ScriptingPanelProps {
    visible: boolean;
    onClose: () => void;
}

export function ScriptingPanel({ visible, onClose }: ScriptingPanelProps) {
    const [code, setCode] = useState(DEFAULT_SCRIPT);
    const [output, setOutput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLPreElement>(null);

    // Sync scroll between textarea and highlight overlay
    const handleScroll = useCallback(() => {
        if (textareaRef.current && highlightRef.current) {
            highlightRef.current.scrollTop = textareaRef.current.scrollTop;
            highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    }, []);

    const runScript = useCallback(() => {
        setOutput("Running...\n> Bullish trend detected\n> Price: $5,670.98\n> SMA(20): $5,420.25");
    }, []);

    // Keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "Enter" && visible) {
                e.preventDefault();
                runScript();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [visible, runScript]);

    if (!visible) return null;

    return (
        <div className="relative z-40 flex h-[200px] flex-shrink-0 flex-col border-t border-white/5 bg-[#0d0d0d]">
            {/* Header */}
            <div className="flex h-8 flex-shrink-0 items-center justify-between border-b border-white/5 px-3">
                <div className="flex items-center gap-2">
                    <Terminal size={12} className="text-[#555]" />
                    <span className="text-[11px] font-medium text-[#888]">Scripting Console</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={runScript}
                        className="flex items-center gap-1.5 rounded bg-[#22c55e]/20 px-2.5 py-1 text-[10px] font-medium text-[#22c55e] transition-colors hover:bg-[#22c55e]/30"
                    >
                        <Play size={10} />
                        Run (Ctrl+Enter)
                    </button>
                    <button
                        onClick={onClose}
                        className="flex h-5 w-5 items-center justify-center rounded text-[#555] hover:bg-white/5 hover:text-white"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>

            {/* Editor Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Code Editor */}
                <div className="relative flex-1 overflow-hidden">
                    {/* Line numbers */}
                    <div className="absolute left-0 top-0 bottom-0 w-10 flex-shrink-0 overflow-hidden border-r border-white/5 bg-[#0a0a0a]">
                        <div className="p-2 font-mono text-[11px] leading-[1.6] text-[#333]">
                            {code.split("\n").map((_, i) => (
                                <div key={i} className="text-right pr-2">{i + 1}</div>
                            ))}
                        </div>
                    </div>

                    {/* Syntax highlighted overlay */}
                    <pre
                        ref={highlightRef}
                        className="pointer-events-none absolute inset-0 left-10 overflow-auto whitespace-pre-wrap break-words p-2 font-mono text-[11px] leading-[1.6]"
                        aria-hidden="true"
                    >
                        {tokenize(code).map((token, i) => (
                            <span key={i} style={{ color: TOKEN_COLORS[token.type] }}>
                                {token.value}
                            </span>
                        ))}
                        {"\n"}
                    </pre>

                    {/* Actual textarea for editing */}
                    <textarea
                        ref={textareaRef}
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        onScroll={handleScroll}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                        className="absolute inset-0 left-10 h-full w-[calc(100%-40px)] resize-none overflow-auto whitespace-pre-wrap break-words bg-transparent p-2 font-mono text-[11px] leading-[1.6] text-transparent caret-white outline-none"
                        placeholder="// Write your script here..."
                    />
                </div>

                {/* Output Panel */}
                <div className="w-[300px] flex-shrink-0 overflow-hidden border-l border-white/5 bg-[#080808]">
                    <div className="flex h-full flex-col">
                        <div className="flex-shrink-0 border-b border-white/5 px-3 py-1.5">
                            <span className="text-[9px] font-medium uppercase tracking-wider text-[#444]">Output</span>
                        </div>
                        <div className="flex-1 overflow-auto p-3">
                            <pre className="font-mono text-[10px] leading-relaxed text-[#22c55e]">
                                {output || "// Run script to see output"}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Open Positions Panel
 */
interface Position {
    symbol: string;
    side: "long" | "short";
    size: number;
    entryPrice: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
}

const MOCK_POSITIONS: Position[] = [
    { symbol: "BTC/USD", side: "long", size: 0.5, entryPrice: 42150.00, currentPrice: 43250.50, pnl: 550.25, pnlPercent: 2.61 },
    { symbol: "ETH/USD", side: "short", size: 5.0, entryPrice: 2350.00, currentPrice: 2280.75, pnl: 346.25, pnlPercent: 2.95 },
    { symbol: "SOL/USD", side: "long", size: 50.0, entryPrice: 95.20, currentPrice: 98.42, pnl: 161.00, pnlPercent: 3.38 },
];

interface OpenPositionsPanelProps {
    visible: boolean;
    onClose: () => void;
}

export function OpenPositionsPanel({ visible, onClose }: OpenPositionsPanelProps) {
    const [positions] = useState<Position[]>(MOCK_POSITIONS);

    if (!visible) return null;

    const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
    const isPositive = totalPnl >= 0;

    return (
        <div className="relative z-40 flex h-[200px] flex-shrink-0 flex-col border-t border-white/5 bg-[#0d0d0d]">
            {/* Header */}
            <div className="flex h-8 flex-shrink-0 items-center justify-between border-b border-white/5 px-3">
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-medium text-[#888]">Open Positions</span>
                    <span className="rounded bg-[#222] px-1.5 py-0.5 text-[9px] font-medium text-[#888]">
                        {positions.length}
                    </span>
                    <span className={cn(
                        "text-[11px] font-semibold",
                        isPositive ? "text-[#22c55e]" : "text-[#ef4444]"
                    )}>
                        {isPositive ? "+" : ""}${totalPnl.toFixed(2)} PnL
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="flex h-5 w-5 items-center justify-center rounded text-[#555] hover:bg-white/5 hover:text-white"
                >
                    <X size={12} />
                </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                {/* Header */}
                <div className="sticky top-0 grid grid-cols-7 gap-2 border-b border-white/5 bg-[#0d0d0d] px-3 py-2 text-[9px] font-medium uppercase tracking-wider text-[#444]">
                    <div>Symbol</div>
                    <div>Side</div>
                    <div className="text-right">Size</div>
                    <div className="text-right">Entry</div>
                    <div className="text-right">Current</div>
                    <div className="text-right">PnL</div>
                    <div className="text-right">PnL %</div>
                </div>

                {/* Rows */}
                {positions.map((pos) => {
                    const isPnlPositive = pos.pnl >= 0;
                    return (
                        <div
                            key={pos.symbol}
                            className="grid grid-cols-7 gap-2 border-b border-white/5 px-3 py-2 text-[11px] hover:bg-white/[0.02]"
                        >
                            <div className="font-medium text-white">{pos.symbol}</div>
                            <div className={pos.side === "long" ? "text-[#22c55e]" : "text-[#ef4444]"}>
                                {pos.side.toUpperCase()}
                            </div>
                            <div className="text-right font-mono text-[#888]">{pos.size}</div>
                            <div className="text-right font-mono text-[#888]">${pos.entryPrice.toFixed(2)}</div>
                            <div className="text-right font-mono text-white">${pos.currentPrice.toFixed(2)}</div>
                            <div className={cn(
                                "text-right font-mono font-medium",
                                isPnlPositive ? "text-[#22c55e]" : "text-[#ef4444]"
                            )}>
                                {isPnlPositive ? "+" : ""}${pos.pnl.toFixed(2)}
                            </div>
                            <div className={cn(
                                "text-right font-mono font-medium",
                                isPnlPositive ? "text-[#22c55e]" : "text-[#ef4444]"
                            )}>
                                {isPnlPositive ? "+" : ""}{pos.pnlPercent.toFixed(2)}%
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Bottom Tabs Component
 * Manages Scripting and Open Positions tabs.
 */
type BottomTab = "scripting" | "positions" | null;

interface BottomTabsProps {
    activeTab: BottomTab;
    onTabChange: (tab: BottomTab) => void;
}

export function BottomTabs({ activeTab, onTabChange }: BottomTabsProps) {
    return (
        <div className="fixed bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-[#111] p-1">
            <button
                onClick={() => onTabChange(activeTab === "scripting" ? null : "scripting")}
                className={cn(
                    "flex items-center gap-1.5 rounded px-3 py-1.5 text-[10px] font-medium transition-colors",
                    activeTab === "scripting"
                        ? "bg-[#1a1a1a] text-white"
                        : "text-[#888] hover:text-white"
                )}
            >
                <Terminal size={11} />
                Scripting
            </button>
            <button
                onClick={() => onTabChange(activeTab === "positions" ? null : "positions")}
                className={cn(
                    "flex items-center gap-1.5 rounded px-3 py-1.5 text-[10px] font-medium transition-colors",
                    activeTab === "positions"
                        ? "bg-[#1a1a1a] text-white"
                        : "text-[#888] hover:text-white"
                )}
            >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M2 12h20"/>
                </svg>
                Positions
            </button>
        </div>
    );
}

export type { BottomTab };

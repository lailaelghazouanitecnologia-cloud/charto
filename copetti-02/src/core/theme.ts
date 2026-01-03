/**
 * Theme module for chart styling.
 * Provides light and dark theme configurations.
 */

import type { ColorHex } from "./types.ts";

/** Theme type. */
export type ThemeType = "light" | "dark";

/** Complete theme configuration. */
export interface ChartTheme {
    name: ThemeType;

    // Background colors.
    background: ColorHex;
    backgroundAlt: ColorHex;

    // Grid and borders.
    grid: ColorHex;
    border: ColorHex;

    // Text colors.
    text: ColorHex;
    textMuted: ColorHex;
    textInverted: ColorHex;

    // Candlestick colors.
    upColor: ColorHex;
    downColor: ColorHex;
    upColorTransparent: string;
    downColorTransparent: string;

    // Crosshair.
    crosshair: ColorHex;
    crosshairLabel: ColorHex;
    crosshairLabelText: ColorHex;

    // Drawing tools.
    drawingDefault: ColorHex;
    drawingSelected: ColorHex;

    // Indicators.
    indicatorSma: ColorHex;
    indicatorEma: ColorHex;
    indicatorBollinger: ColorHex;

    // Volume.
    volumeUp: string;
    volumeDown: string;

    // Overlay colors.
    overlay: string;
    overlayStrong: string;
}

/** Dark theme (default) - MoonBucks style. */
export const DARK_THEME: ChartTheme = {
    name: "dark",

    background: "transparent",
    backgroundAlt: "#111111",

    grid: "rgba(255, 255, 255, 0.04)",
    border: "rgba(255, 255, 255, 0.08)",

    text: "rgba(255, 255, 255, 0.8)",
    textMuted: "rgba(255, 255, 255, 0.4)",
    textInverted: "#111111",

    upColor: "#22c55e",
    downColor: "#ef4444",
    upColorTransparent: "rgba(34, 197, 94, 0.25)",
    downColorTransparent: "rgba(239, 68, 68, 0.25)",

    crosshair: "rgba(255, 255, 255, 0.2)",
    crosshairLabel: "#111111",
    crosshairLabelText: "rgba(255, 255, 255, 0.8)",

    drawingDefault: "#22c55e",
    drawingSelected: "#ffffff",

    indicatorSma: "#60a5fa",
    indicatorEma: "#f59e0b",
    indicatorBollinger: "#8b5cf6",

    volumeUp: "rgba(34, 197, 94, 0.4)",
    volumeDown: "rgba(239, 68, 68, 0.4)",

    overlay: "rgba(0, 0, 0, 0.5)",
    overlayStrong: "rgba(0, 0, 0, 0.8)",
};

/** Light theme. */
export const LIGHT_THEME: ChartTheme = {
    name: "light",

    background: "#ffffff",
    backgroundAlt: "#f4f4f5",

    grid: "#e4e4e7",
    border: "#d4d4d8",

    text: "#18181b",
    textMuted: "#71717a",
    textInverted: "#fafafa",

    upColor: "#16a34a",
    downColor: "#dc2626",
    upColorTransparent: "rgba(22, 163, 74, 0.2)",
    downColorTransparent: "rgba(220, 38, 38, 0.2)",

    crosshair: "#a1a1aa",
    crosshairLabel: "#e4e4e7",
    crosshairLabelText: "#18181b",

    drawingDefault: "#3b82f6",
    drawingSelected: "#1d4ed8",

    indicatorSma: "#3b82f6",
    indicatorEma: "#d97706",
    indicatorBollinger: "#7c3aed",

    volumeUp: "rgba(22, 163, 74, 0.4)",
    volumeDown: "rgba(220, 38, 38, 0.4)",

    overlay: "rgba(255, 255, 255, 0.5)",
    overlayStrong: "rgba(255, 255, 255, 0.8)",
};

/** Get theme by name. */
export function getTheme(name: ThemeType): ChartTheme {
    return name === "light" ? LIGHT_THEME : DARK_THEME;
}

/** Theme manager for dynamic theme switching. */
export class ThemeManager {
    private currentTheme: ChartTheme;
    private listeners: Array<(theme: ChartTheme) => void> = [];

    constructor(theme: ThemeType = "dark") {
        this.currentTheme = getTheme(theme);
    }

    /** Get current theme. */
    getTheme(): ChartTheme {
        return this.currentTheme;
    }

    /** Set theme by name. */
    setTheme(name: ThemeType): void {
        this.currentTheme = getTheme(name);
        this.notify();
    }

    /** Set custom theme. */
    setCustomTheme(theme: ChartTheme): void {
        this.currentTheme = theme;
        this.notify();
    }

    /** Toggle between light and dark. */
    toggle(): ThemeType {
        const newTheme = this.currentTheme.name === "dark" ? "light" : "dark";
        this.setTheme(newTheme);
        return newTheme;
    }

    /** Subscribe to theme changes. */
    subscribe(callback: (theme: ChartTheme) => void): () => void {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter((l) => l !== callback);
        };
    }

    /** Notify listeners of theme change. */
    private notify(): void {
        for (const listener of this.listeners) {
            listener(this.currentTheme);
        }
    }
}

/** Create CSS variables from theme. */
export function themeToCssVariables(theme: ChartTheme): Record<string, string> {
    return {
        "--chart-background": theme.background,
        "--chart-background-alt": theme.backgroundAlt,
        "--chart-grid": theme.grid,
        "--chart-border": theme.border,
        "--chart-text": theme.text,
        "--chart-text-muted": theme.textMuted,
        "--chart-up": theme.upColor,
        "--chart-down": theme.downColor,
        "--chart-crosshair": theme.crosshair,
    };
}

/** Apply theme CSS variables to an element. */
export function applyThemeToElement(element: HTMLElement, theme: ChartTheme): void {
    const variables = themeToCssVariables(theme);
    for (const [key, value] of Object.entries(variables)) {
        element.style.setProperty(key, value);
    }
}

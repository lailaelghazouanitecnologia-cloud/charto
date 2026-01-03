/**
 * Snapshot - Chart image export functionality
 * Supports PNG, JPEG, SVG, and PDF export with customization options
 */

import type { Bounds, ChartTheme } from "./types.ts";

// ============================================================================
// Types
// ============================================================================

export type SnapshotFormat = "png" | "jpeg" | "webp" | "svg" | "blob";

export interface SnapshotConfig {
    format: SnapshotFormat;
    quality: number; // 0-1 for JPEG/WebP
    scale: number; // Device pixel ratio multiplier
    backgroundColor: string;
    transparent: boolean;
    includeWatermark: boolean;
    watermarkText?: string;
    watermarkPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    watermarkFont: string;
    watermarkColor: string;
    watermarkOpacity: number;
    padding: { top: number; right: number; bottom: number; left: number };
    width?: number; // Custom width (auto if not set)
    height?: number; // Custom height (auto if not set)
    filename?: string;
}

export interface SnapshotResult {
    dataUrl?: string;
    blob?: Blob;
    width: number;
    height: number;
    format: SnapshotFormat;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_SNAPSHOT_CONFIG: SnapshotConfig = {
    format: "png",
    quality: 0.92,
    scale: 2,
    backgroundColor: "#1a1a1a",
    transparent: false,
    includeWatermark: false,
    watermarkText: "Chart",
    watermarkPosition: "bottom-right",
    watermarkFont: "12px Arial, sans-serif",
    watermarkColor: "#ffffff",
    watermarkOpacity: 0.5,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
};

// ============================================================================
// Snapshot Class
// ============================================================================

export class Snapshot {
    private config: SnapshotConfig;

    constructor(config: Partial<SnapshotConfig> = {}) {
        this.config = { ...DEFAULT_SNAPSHOT_CONFIG, ...config };
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<SnapshotConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Apply theme to snapshot config
     */
    applyTheme(theme: ChartTheme): void {
        this.config.backgroundColor = theme.background;
        this.config.watermarkColor = theme.text;
    }

    /**
     * Take a snapshot of a canvas element
     */
    async capture(
        canvas: HTMLCanvasElement,
        config: Partial<SnapshotConfig> = {}
    ): Promise<SnapshotResult> {
        const mergedConfig = { ...this.config, ...config };
        const { format, scale, padding, width, height } = mergedConfig;

        // Calculate output dimensions
        const sourceWidth = canvas.width;
        const sourceHeight = canvas.height;
        const outputWidth = (width ?? sourceWidth / window.devicePixelRatio) + padding.left + padding.right;
        const outputHeight = (height ?? sourceHeight / window.devicePixelRatio) + padding.top + padding.bottom;

        // Create output canvas
        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = outputWidth * scale;
        outputCanvas.height = outputHeight * scale;

        const ctx = outputCanvas.getContext("2d");
        if (!ctx) throw new Error("Could not get 2D context");

        ctx.scale(scale, scale);

        // Fill background
        if (!mergedConfig.transparent) {
            ctx.fillStyle = mergedConfig.backgroundColor;
            ctx.fillRect(0, 0, outputWidth, outputHeight);
        }

        // Draw source canvas
        ctx.drawImage(
            canvas,
            0, 0, sourceWidth, sourceHeight,
            padding.left, padding.top,
            outputWidth - padding.left - padding.right,
            outputHeight - padding.top - padding.bottom
        );

        // Add watermark
        if (mergedConfig.includeWatermark && mergedConfig.watermarkText) {
            this.drawWatermark(ctx, outputWidth, outputHeight, mergedConfig);
        }

        // Generate output
        if (format === "blob") {
            const blob = await this.canvasToBlob(outputCanvas, mergedConfig);
            return {
                blob,
                width: outputWidth * scale,
                height: outputHeight * scale,
                format,
            };
        }

        const dataUrl = this.canvasToDataUrl(outputCanvas, mergedConfig);
        return {
            dataUrl,
            width: outputWidth * scale,
            height: outputHeight * scale,
            format,
        };
    }

    /**
     * Take a snapshot of multiple canvases (layered)
     */
    async captureMultiple(
        canvases: HTMLCanvasElement[],
        config: Partial<SnapshotConfig> = {}
    ): Promise<SnapshotResult> {
        if (canvases.length === 0) {
            throw new Error("No canvases provided");
        }

        const mergedConfig = { ...this.config, ...config };
        const { format, scale, padding } = mergedConfig;

        // Use first canvas for dimensions
        const firstCanvas = canvases[0];
        const sourceWidth = firstCanvas.width;
        const sourceHeight = firstCanvas.height;
        const outputWidth = (mergedConfig.width ?? sourceWidth / window.devicePixelRatio) + padding.left + padding.right;
        const outputHeight = (mergedConfig.height ?? sourceHeight / window.devicePixelRatio) + padding.top + padding.bottom;

        // Create output canvas
        const outputCanvas = document.createElement("canvas");
        outputCanvas.width = outputWidth * scale;
        outputCanvas.height = outputHeight * scale;

        const ctx = outputCanvas.getContext("2d");
        if (!ctx) throw new Error("Could not get 2D context");

        ctx.scale(scale, scale);

        // Fill background
        if (!mergedConfig.transparent) {
            ctx.fillStyle = mergedConfig.backgroundColor;
            ctx.fillRect(0, 0, outputWidth, outputHeight);
        }

        // Draw each canvas in order
        for (const canvas of canvases) {
            ctx.drawImage(
                canvas,
                0, 0, canvas.width, canvas.height,
                padding.left, padding.top,
                outputWidth - padding.left - padding.right,
                outputHeight - padding.top - padding.bottom
            );
        }

        // Add watermark
        if (mergedConfig.includeWatermark && mergedConfig.watermarkText) {
            this.drawWatermark(ctx, outputWidth, outputHeight, mergedConfig);
        }

        // Generate output
        if (format === "blob") {
            const blob = await this.canvasToBlob(outputCanvas, mergedConfig);
            return {
                blob,
                width: outputWidth * scale,
                height: outputHeight * scale,
                format,
            };
        }

        const dataUrl = this.canvasToDataUrl(outputCanvas, mergedConfig);
        return {
            dataUrl,
            width: outputWidth * scale,
            height: outputHeight * scale,
            format,
        };
    }

    /**
     * Download snapshot as file
     */
    async download(
        canvas: HTMLCanvasElement | HTMLCanvasElement[],
        filename?: string,
        config: Partial<SnapshotConfig> = {}
    ): Promise<void> {
        const mergedConfig = { ...this.config, ...config };
        const result = Array.isArray(canvas)
            ? await this.captureMultiple(canvas, mergedConfig)
            : await this.capture(canvas, mergedConfig);

        const name = filename ?? mergedConfig.filename ?? `chart-${Date.now()}`;
        const extension = mergedConfig.format === "blob" ? "png" : mergedConfig.format;
        const fullFilename = `${name}.${extension}`;

        if (result.blob) {
            this.downloadBlob(result.blob, fullFilename);
        } else if (result.dataUrl) {
            this.downloadDataUrl(result.dataUrl, fullFilename);
        }
    }

    /**
     * Copy snapshot to clipboard
     */
    async copyToClipboard(
        canvas: HTMLCanvasElement | HTMLCanvasElement[],
        config: Partial<SnapshotConfig> = {}
    ): Promise<void> {
        const mergedConfig = { ...this.config, ...config, format: "blob" as SnapshotFormat };
        const result = Array.isArray(canvas)
            ? await this.captureMultiple(canvas, mergedConfig)
            : await this.capture(canvas, mergedConfig);

        if (!result.blob) {
            throw new Error("Failed to create blob for clipboard");
        }

        try {
            await navigator.clipboard.write([
                new ClipboardItem({
                    "image/png": result.blob,
                }),
            ]);
        } catch (error) {
            throw new Error(`Failed to copy to clipboard: ${error}`);
        }
    }

    // Private methods

    private drawWatermark(
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        config: SnapshotConfig
    ): void {
        ctx.save();
        ctx.font = config.watermarkFont;
        ctx.fillStyle = config.watermarkColor;
        ctx.globalAlpha = config.watermarkOpacity;

        const text = config.watermarkText ?? "";
        const metrics = ctx.measureText(text);
        const padding = 10;

        let x = 0;
        let y = 0;

        switch (config.watermarkPosition) {
            case "top-left":
                ctx.textAlign = "left";
                ctx.textBaseline = "top";
                x = padding;
                y = padding;
                break;
            case "top-right":
                ctx.textAlign = "right";
                ctx.textBaseline = "top";
                x = width - padding;
                y = padding;
                break;
            case "bottom-left":
                ctx.textAlign = "left";
                ctx.textBaseline = "bottom";
                x = padding;
                y = height - padding;
                break;
            case "bottom-right":
            default:
                ctx.textAlign = "right";
                ctx.textBaseline = "bottom";
                x = width - padding;
                y = height - padding;
                break;
        }

        ctx.fillText(text, x, y);
        ctx.restore();
    }

    private canvasToDataUrl(canvas: HTMLCanvasElement, config: SnapshotConfig): string {
        let mimeType: string;
        switch (config.format) {
            case "jpeg":
                mimeType = "image/jpeg";
                break;
            case "webp":
                mimeType = "image/webp";
                break;
            case "png":
            default:
                mimeType = "image/png";
                break;
        }

        return canvas.toDataURL(mimeType, config.quality);
    }

    private canvasToBlob(canvas: HTMLCanvasElement, config: SnapshotConfig): Promise<Blob> {
        return new Promise((resolve, reject) => {
            let mimeType: string;
            switch (config.format) {
                case "jpeg":
                    mimeType = "image/jpeg";
                    break;
                case "webp":
                    mimeType = "image/webp";
                    break;
                case "png":
                case "blob":
                default:
                    mimeType = "image/png";
                    break;
            }

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Failed to create blob"));
                    }
                },
                mimeType,
                config.quality
            );
        });
    }

    private downloadDataUrl(dataUrl: string, filename: string): void {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    private downloadBlob(blob: Blob, filename: string): void {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Quick capture of a canvas to data URL
 */
export function captureCanvas(
    canvas: HTMLCanvasElement,
    format: SnapshotFormat = "png",
    quality: number = 0.92
): string {
    let mimeType: string;
    switch (format) {
        case "jpeg":
            mimeType = "image/jpeg";
            break;
        case "webp":
            mimeType = "image/webp";
            break;
        default:
            mimeType = "image/png";
            break;
    }

    return canvas.toDataURL(mimeType, quality);
}

/**
 * Download canvas as image file
 */
export async function downloadCanvas(
    canvas: HTMLCanvasElement,
    filename: string = "chart",
    config: Partial<SnapshotConfig> = {}
): Promise<void> {
    const snapshot = new Snapshot(config);
    await snapshot.download(canvas, filename);
}

/**
 * Copy canvas to clipboard
 */
export async function copyCanvasToClipboard(
    canvas: HTMLCanvasElement
): Promise<void> {
    const snapshot = new Snapshot();
    await snapshot.copyToClipboard(canvas);
}

/**
 * Create a high-resolution snapshot for printing
 */
export async function createPrintSnapshot(
    canvas: HTMLCanvasElement,
    dpi: number = 300
): Promise<SnapshotResult> {
    const snapshot = new Snapshot({
        format: "png",
        scale: dpi / 96, // 96 is standard screen DPI
        quality: 1,
    });

    return snapshot.capture(canvas);
}

/**
 * Create a thumbnail of the chart
 */
export async function createThumbnail(
    canvas: HTMLCanvasElement,
    maxSize: number = 200
): Promise<SnapshotResult> {
    const aspectRatio = canvas.width / canvas.height;
    let width: number;
    let height: number;

    if (aspectRatio > 1) {
        width = maxSize;
        height = maxSize / aspectRatio;
    } else {
        height = maxSize;
        width = maxSize * aspectRatio;
    }

    const snapshot = new Snapshot({
        format: "png",
        scale: 1,
        width,
        height,
    });

    return snapshot.capture(canvas);
}

// ============================================================================
// Factory
// ============================================================================

export function createSnapshot(config?: Partial<SnapshotConfig>): Snapshot {
    return new Snapshot(config);
}

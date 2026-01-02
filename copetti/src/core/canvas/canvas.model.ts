/**
 * Canvas model for managing canvas rendering context.
 * Following Code Style Guide: Resource management, explicit cleanup.
 *
 * @doc-tags core,canvas
 */

import { assert, assertDefined, assertPositive } from "../assert.ts";
import type { Pixel } from "../../types/primitives.ts";
import type { Bounds } from "../../types/bounds.ts";

/**
 * Minimum supported canvas size.
 */
export const MIN_CANVAS_SIZE: Bounds = {
    x: 0,
    y: 0,
    width: 10,
    height: 10,
} as const;

/**
 * Canvas configuration.
 */
export interface CanvasConfig {
    readonly id: string;
    readonly width: Pixel;
    readonly height: Pixel;
    readonly devicePixelRatio: number;
}

/**
 * Default canvas configuration.
 */
export const DEFAULT_CANVAS_CONFIG: CanvasConfig = {
    id: "main",
    width: 800,
    height: 600,
    devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
} as const;

/**
 * Canvas model manages a canvas element and its rendering context.
 *
 * Responsibilities:
 * - Canvas element lifecycle.
 * - Device pixel ratio handling.
 * - Context state management.
 */
export class CanvasModel {
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly config: CanvasConfig;
    private width: Pixel = 0;
    private height: Pixel = 0;

    constructor(canvas: HTMLCanvasElement, config: Partial<CanvasConfig> = {}) {
        assertDefined(canvas, "Canvas element is required");

        this.canvas = canvas;
        this.config = { ...DEFAULT_CANVAS_CONFIG, ...config };

        // Get 2D context.
        const ctx = canvas.getContext("2d", {
            alpha: true,
            desynchronized: true,
        });

        if (ctx === null) {
            throw new Error("Failed to get 2D context");
        }

        this.ctx = ctx;

        // Initialize canvas size.
        this.resize(this.config.width, this.config.height);
    }

    /**
     * Gets the canvas element.
     */
    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    /**
     * Gets the rendering context.
     */
    public getContext(): CanvasRenderingContext2D {
        return this.ctx;
    }

    /**
     * Gets the canvas configuration.
     */
    public getConfig(): CanvasConfig {
        return { ...this.config };
    }

    /**
     * Gets the current width.
     */
    public getWidth(): Pixel {
        return this.width;
    }

    /**
     * Gets the current height.
     */
    public getHeight(): Pixel {
        return this.height;
    }

    /**
     * Gets the device pixel ratio.
     */
    public getDevicePixelRatio(): number {
        return this.config.devicePixelRatio;
    }

    /**
     * Gets the bounds of the canvas.
     */
    public getBounds(): Bounds {
        return {
            x: 0,
            y: 0,
            width: this.width,
            height: this.height,
        };
    }

    /**
     * Resizes the canvas.
     *
     * @param width - New width in CSS pixels.
     * @param height - New height in CSS pixels.
     */
    public resize(width: Pixel, height: Pixel): void {
        assertPositive(width, "Width");
        assertPositive(height, "Height");

        const dpr = this.config.devicePixelRatio;

        // Update internal state.
        this.width = width;
        this.height = height;

        // Set canvas display size (CSS).
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        // Set canvas buffer size (actual pixels).
        this.canvas.width = Math.floor(width * dpr);
        this.canvas.height = Math.floor(height * dpr);

        // Scale context for device pixel ratio.
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /**
     * Clears the entire canvas.
     */
    public clear(): void {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    /**
     * Clears a specific region of the canvas.
     *
     * @param bounds - Region to clear.
     */
    public clearRegion(bounds: Bounds): void {
        this.ctx.clearRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }

    /**
     * Saves the current context state.
     */
    public save(): void {
        this.ctx.save();
    }

    /**
     * Restores the last saved context state.
     */
    public restore(): void {
        this.ctx.restore();
    }

    /**
     * Sets the clip region.
     *
     * @param bounds - Clipping bounds.
     */
    public clip(bounds: Bounds): void {
        this.ctx.beginPath();
        this.ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height);
        this.ctx.clip();
    }

    /**
     * Sets the global alpha.
     *
     * @param alpha - Alpha value (0-1).
     */
    public setAlpha(alpha: number): void {
        assert(alpha >= 0 && alpha <= 1, "Alpha must be between 0 and 1");
        this.ctx.globalAlpha = alpha;
    }

    /**
     * Creates an image data URL from the canvas.
     *
     * @param type - Image type (e.g., "image/png").
     * @param quality - Quality for lossy formats (0-1).
     * @returns Data URL string.
     */
    public toDataURL(type = "image/png", quality?: number): string {
        return this.canvas.toDataURL(type, quality);
    }

    /**
     * Checks if the canvas is drawable (has valid dimensions).
     */
    public isDrawable(): boolean {
        return this.width >= MIN_CANVAS_SIZE.width && this.height >= MIN_CANVAS_SIZE.height;
    }
}

/**
 * Creates a new canvas element.
 *
 * @param config - Canvas configuration.
 * @returns New canvas element.
 */
export function createCanvasElement(config: Partial<CanvasConfig> = {}): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.id = config.id ?? DEFAULT_CANVAS_CONFIG.id;

    return canvas;
}

/**
 * Creates a canvas model from a container element.
 *
 * @param container - Container element for the canvas.
 * @param config - Canvas configuration.
 * @returns Canvas model instance.
 */
export function createCanvasModel(
    container: HTMLElement,
    config: Partial<CanvasConfig> = {},
): CanvasModel {
    const canvas = createCanvasElement(config);
    container.appendChild(canvas);

    return new CanvasModel(canvas, config);
}

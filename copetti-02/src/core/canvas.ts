/**
 * Canvas wrapper for 2D rendering.
 */

import type { Pixel, ColorHex, Bounds } from "./types.ts";

/** Canvas wrapper with helper methods. */
export class Canvas {
    private readonly ctx: CanvasRenderingContext2D;
    private readonly dpr: number;

    constructor(
        private readonly element: HTMLCanvasElement,
        width: Pixel,
        height: Pixel,
    ) {
        const ctx = element.getContext("2d");
        if (ctx === null) {
            throw new Error("Failed to get 2D context");
        }
        this.ctx = ctx;
        this.dpr = window.devicePixelRatio || 1;

        this.resize(width, height);
    }

    /** Resizes the canvas. */
    resize(width: Pixel, height: Pixel): void {
        this.element.width = width * this.dpr;
        this.element.height = height * this.dpr;
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
        this.ctx.scale(this.dpr, this.dpr);
    }

    /** Clears the entire canvas. */
    clear(color?: ColorHex): void {
        const w = this.element.width / this.dpr;
        const h = this.element.height / this.dpr;

        if (color !== undefined) {
            this.ctx.fillStyle = color;
            this.ctx.fillRect(0, 0, w, h);
        } else {
            this.ctx.clearRect(0, 0, w, h);
        }
    }

    /** Draws a filled rectangle. */
    fillRect(x: Pixel, y: Pixel, w: Pixel, h: Pixel, color: ColorHex): void {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, w, h);
    }

    /** Draws a line. */
    line(
        x1: Pixel,
        y1: Pixel,
        x2: Pixel,
        y2: Pixel,
        color: ColorHex,
        width = 1,
    ): void {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
    }

    /** Draws text. */
    text(
        str: string,
        x: Pixel,
        y: Pixel,
        color: ColorHex,
        font = "12px monospace",
    ): void {
        this.ctx.fillStyle = color;
        this.ctx.font = font;
        this.ctx.fillText(str, x, y);
    }

    /** Gets the 2D context. */
    getContext(): CanvasRenderingContext2D {
        return this.ctx;
    }

    /** Gets the canvas bounds. */
    getBounds(): Bounds {
        return {
            x: 0,
            y: 0,
            width: this.element.width / this.dpr,
            height: this.element.height / this.dpr,
        };
    }
}

/** Creates a canvas wrapper from an existing element. */
export function createCanvas(
    element: HTMLCanvasElement,
    width: Pixel,
    height: Pixel,
): Canvas {
    return new Canvas(element, width, height);
}

/**
 * Test setup file.
 * Configures testing environment for Vitest.
 */

import "@testing-library/jest-dom";

// Mock canvas context for tests.
class MockCanvasRenderingContext2D implements Partial<CanvasRenderingContext2D> {
    canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
    }

    // Drawing methods.
    clearRect(): void {}
    fillRect(): void {}
    strokeRect(): void {}
    fillText(): void {}
    strokeText(): void {}
    measureText(): TextMetrics {
        return { width: 0 } as TextMetrics;
    }

    // Path methods.
    beginPath(): void {}
    closePath(): void {}
    moveTo(): void {}
    lineTo(): void {}
    arc(): void {}
    rect(): void {}
    fill(): void {}
    stroke(): void {}
    clip(): void {}

    // Transform methods.
    save(): void {}
    restore(): void {}
    scale(): void {}
    rotate(): void {}
    translate(): void {}
    transform(): void {}
    setTransform(): void {}

    // Style properties.
    fillStyle: string | CanvasGradient | CanvasPattern = "#000";
    strokeStyle: string | CanvasGradient | CanvasPattern = "#000";
    lineWidth = 1;
    lineCap: CanvasLineCap = "butt";
    lineJoin: CanvasLineJoin = "miter";
    globalAlpha = 1;
    globalCompositeOperation: GlobalCompositeOperation = "source-over";
    font = "10px sans-serif";
    textAlign: CanvasTextAlign = "start";
    textBaseline: CanvasTextBaseline = "alphabetic";
}

// Override getContext to return mock context.
const originalGetContext = HTMLCanvasElement.prototype.getContext;

HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    contextId: string,
    options?: unknown,
): RenderingContext | null {
    if (contextId === "2d") {
        return new MockCanvasRenderingContext2D(this) as unknown as CanvasRenderingContext2D;
    }
    return originalGetContext.call(this, contextId, options as CanvasRenderingContext2DSettings);
} as typeof HTMLCanvasElement.prototype.getContext;

// Mock ResizeObserver.
class MockResizeObserver implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
}

global.ResizeObserver = MockResizeObserver;

// Mock requestAnimationFrame.
let frameId = 0;
global.requestAnimationFrame = (callback: FrameRequestCallback): number => {
    frameId += 1;
    const timeoutId = setTimeout(() => {
        callback(performance.now());
    }, 16);
    return timeoutId as unknown as number;
};

global.cancelAnimationFrame = (id: number): void => {
    clearTimeout(id);
};

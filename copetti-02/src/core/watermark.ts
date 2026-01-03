/**
 * Watermark - Background branding/info display for charts
 * Displays logos, symbols, or text as background watermarks
 */

import type { Bounds, ChartTheme } from "./types.ts";

// ============================================================================
// Types
// ============================================================================

export type WatermarkPosition =
    | "top-left"
    | "top-center"
    | "top-right"
    | "center-left"
    | "center"
    | "center-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";

export interface WatermarkTextConfig {
    type: "text";
    text: string;
    font?: string;
    fontSize?: number;
    fontWeight?: string;
    color?: string;
    opacity?: number;
}

export interface WatermarkImageConfig {
    type: "image";
    src: string;
    width?: number;
    height?: number;
    opacity?: number;
}

export interface WatermarkSymbolConfig {
    type: "symbol";
    symbol: string;
    description?: string;
    font?: string;
    fontSize?: number;
    descriptionFontSize?: number;
    color?: string;
    opacity?: number;
}

export type WatermarkContent = WatermarkTextConfig | WatermarkImageConfig | WatermarkSymbolConfig;

export interface WatermarkConfig {
    position: WatermarkPosition;
    content: WatermarkContent;
    padding: { x: number; y: number };
    visible: boolean;
}

export interface WatermarkState {
    config: WatermarkConfig;
    image?: HTMLImageElement;
    imageLoaded: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_WATERMARK_CONFIG: WatermarkConfig = {
    position: "center",
    content: {
        type: "text",
        text: "",
        font: "Arial, sans-serif",
        fontSize: 48,
        fontWeight: "bold",
        color: "#ffffff",
        opacity: 0.05,
    },
    padding: { x: 20, y: 20 },
    visible: true,
};

// ============================================================================
// Watermark Class
// ============================================================================

export class Watermark {
    private state: WatermarkState;
    private onImageLoad?: () => void;

    constructor(config: Partial<WatermarkConfig> = {}) {
        this.state = {
            config: { ...DEFAULT_WATERMARK_CONFIG, ...config },
            imageLoaded: false,
        };

        if (this.state.config.content.type === "image") {
            this.loadImage(this.state.config.content.src);
        }
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<WatermarkConfig>): void {
        const oldContent = this.state.config.content;
        this.state.config = { ...this.state.config, ...config };

        // Reload image if src changed
        if (
            config.content?.type === "image" &&
            oldContent.type === "image" &&
            config.content.src !== oldContent.src
        ) {
            this.loadImage(config.content.src);
        }
    }

    /**
     * Set text content
     */
    setText(text: string, options?: Partial<Omit<WatermarkTextConfig, "type" | "text">>): void {
        this.state.config.content = {
            type: "text",
            text,
            font: options?.font ?? "Arial, sans-serif",
            fontSize: options?.fontSize ?? 48,
            fontWeight: options?.fontWeight ?? "bold",
            color: options?.color ?? "#ffffff",
            opacity: options?.opacity ?? 0.05,
        };
    }

    /**
     * Set symbol content (e.g., stock ticker)
     */
    setSymbol(
        symbol: string,
        description?: string,
        options?: Partial<Omit<WatermarkSymbolConfig, "type" | "symbol" | "description">>
    ): void {
        this.state.config.content = {
            type: "symbol",
            symbol,
            description,
            font: options?.font ?? "Arial, sans-serif",
            fontSize: options?.fontSize ?? 72,
            descriptionFontSize: options?.descriptionFontSize ?? 24,
            color: options?.color ?? "#ffffff",
            opacity: options?.opacity ?? 0.05,
        };
    }

    /**
     * Set image content
     */
    setImage(src: string, options?: Partial<Omit<WatermarkImageConfig, "type" | "src">>): void {
        this.state.config.content = {
            type: "image",
            src,
            width: options?.width,
            height: options?.height,
            opacity: options?.opacity ?? 0.1,
        };
        this.loadImage(src);
    }

    /**
     * Set visibility
     */
    setVisible(visible: boolean): void {
        this.state.config.visible = visible;
    }

    /**
     * Set position
     */
    setPosition(position: WatermarkPosition): void {
        this.state.config.position = position;
    }

    /**
     * Apply theme
     */
    applyTheme(theme: ChartTheme): void {
        const content = this.state.config.content;
        if (content.type === "text" || content.type === "symbol") {
            content.color = theme.text;
        }
    }

    /**
     * Set callback for image load
     */
    onLoad(callback: () => void): void {
        this.onImageLoad = callback;
    }

    /**
     * Render watermark to canvas
     */
    render(ctx: CanvasRenderingContext2D, bounds: Bounds): void {
        const { config, image, imageLoaded } = this.state;

        if (!config.visible) return;

        const position = this.calculatePosition(ctx, bounds);

        ctx.save();

        switch (config.content.type) {
            case "text":
                this.renderText(ctx, position, config.content);
                break;
            case "symbol":
                this.renderSymbol(ctx, position, config.content);
                break;
            case "image":
                if (image && imageLoaded) {
                    this.renderImage(ctx, position, config.content, image);
                }
                break;
        }

        ctx.restore();
    }

    // Private methods

    private loadImage(src: string): void {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            this.state.image = img;
            this.state.imageLoaded = true;
            this.onImageLoad?.();
        };

        img.onerror = () => {
            console.warn(`Failed to load watermark image: ${src}`);
            this.state.imageLoaded = false;
        };

        img.src = src;
    }

    private calculatePosition(
        ctx: CanvasRenderingContext2D,
        bounds: Bounds
    ): { x: number; y: number } {
        const { config } = this.state;
        const { position, padding, content } = config;

        // Calculate content size
        let contentWidth = 0;
        let contentHeight = 0;

        if (content.type === "text") {
            ctx.font = `${content.fontWeight} ${content.fontSize}px ${content.font}`;
            const metrics = ctx.measureText(content.text);
            contentWidth = metrics.width;
            contentHeight = content.fontSize ?? 48;
        } else if (content.type === "symbol") {
            ctx.font = `bold ${content.fontSize}px ${content.font}`;
            const metrics = ctx.measureText(content.symbol);
            contentWidth = metrics.width;
            contentHeight = (content.fontSize ?? 72) + (content.description ? (content.descriptionFontSize ?? 24) + 10 : 0);
        } else if (content.type === "image" && this.state.image) {
            contentWidth = content.width ?? this.state.image.width;
            contentHeight = content.height ?? this.state.image.height;
        }

        let x = 0;
        let y = 0;

        // Horizontal position
        if (position.includes("left")) {
            x = bounds.x + padding.x;
        } else if (position.includes("right")) {
            x = bounds.x + bounds.width - contentWidth - padding.x;
        } else {
            x = bounds.x + (bounds.width - contentWidth) / 2;
        }

        // Vertical position
        if (position.startsWith("top")) {
            y = bounds.y + padding.y + contentHeight;
        } else if (position.startsWith("bottom")) {
            y = bounds.y + bounds.height - padding.y;
        } else {
            y = bounds.y + (bounds.height + contentHeight) / 2;
        }

        return { x, y };
    }

    private renderText(
        ctx: CanvasRenderingContext2D,
        position: { x: number; y: number },
        content: WatermarkTextConfig
    ): void {
        ctx.font = `${content.fontWeight ?? "bold"} ${content.fontSize ?? 48}px ${content.font ?? "Arial"}`;
        ctx.fillStyle = content.color ?? "#ffffff";
        ctx.globalAlpha = content.opacity ?? 0.05;
        ctx.textBaseline = "bottom";
        ctx.fillText(content.text, position.x, position.y);
    }

    private renderSymbol(
        ctx: CanvasRenderingContext2D,
        position: { x: number; y: number },
        content: WatermarkSymbolConfig
    ): void {
        const fontSize = content.fontSize ?? 72;
        const descFontSize = content.descriptionFontSize ?? 24;

        ctx.fillStyle = content.color ?? "#ffffff";
        ctx.globalAlpha = content.opacity ?? 0.05;
        ctx.textBaseline = "bottom";

        // Draw symbol
        ctx.font = `bold ${fontSize}px ${content.font ?? "Arial"}`;

        if (content.description) {
            // Adjust position for description
            const symbolY = position.y - descFontSize - 10;
            ctx.fillText(content.symbol, position.x, symbolY);

            // Draw description below symbol
            ctx.font = `${descFontSize}px ${content.font ?? "Arial"}`;
            ctx.fillText(content.description, position.x, position.y);
        } else {
            ctx.fillText(content.symbol, position.x, position.y);
        }
    }

    private renderImage(
        ctx: CanvasRenderingContext2D,
        position: { x: number; y: number },
        content: WatermarkImageConfig,
        image: HTMLImageElement
    ): void {
        const width = content.width ?? image.width;
        const height = content.height ?? image.height;

        ctx.globalAlpha = content.opacity ?? 0.1;
        ctx.drawImage(image, position.x, position.y - height, width, height);
    }
}

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Draw a simple text watermark
 */
export function drawWatermark(
    ctx: CanvasRenderingContext2D,
    bounds: Bounds,
    text: string,
    options: {
        position?: WatermarkPosition;
        font?: string;
        fontSize?: number;
        color?: string;
        opacity?: number;
    } = {}
): void {
    const watermark = new Watermark({
        position: options.position ?? "center",
        content: {
            type: "text",
            text,
            font: options.font,
            fontSize: options.fontSize,
            color: options.color,
            opacity: options.opacity,
        },
    });

    watermark.render(ctx, bounds);
}

/**
 * Draw a symbol watermark with optional description
 */
export function drawSymbolWatermark(
    ctx: CanvasRenderingContext2D,
    bounds: Bounds,
    symbol: string,
    description?: string,
    options: {
        position?: WatermarkPosition;
        font?: string;
        fontSize?: number;
        color?: string;
        opacity?: number;
    } = {}
): void {
    const watermark = new Watermark({
        position: options.position ?? "center",
        content: {
            type: "symbol",
            symbol,
            description,
            font: options.font,
            fontSize: options.fontSize,
            color: options.color,
            opacity: options.opacity,
        },
    });

    watermark.render(ctx, bounds);
}

// ============================================================================
// Factory
// ============================================================================

export function createWatermark(config?: Partial<WatermarkConfig>): Watermark {
    return new Watermark(config);
}

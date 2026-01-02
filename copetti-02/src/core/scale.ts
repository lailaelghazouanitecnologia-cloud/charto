/**
 * Scale functions for mapping data to pixels.
 */

import type { Pixel, Unit } from "./types.ts";

/** Linear scale configuration. */
export interface ScaleConfig {
    readonly domainMin: Unit;
    readonly domainMax: Unit;
    readonly rangeMin: Pixel;
    readonly rangeMax: Pixel;
}

/** Linear scale for mapping values. */
export class LinearScale {
    constructor(private config: ScaleConfig) {}

    /** Maps a value from domain to range. */
    toPixel(value: Unit): Pixel {
        const { domainMin, domainMax, rangeMin, rangeMax } = this.config;
        const domainSpan = domainMax - domainMin;
        if (domainSpan === 0) return rangeMin;

        const ratio = (value - domainMin) / domainSpan;
        return rangeMin + ratio * (rangeMax - rangeMin);
    }

    /** Maps a pixel from range to domain. */
    toValue(pixel: Pixel): Unit {
        const { domainMin, domainMax, rangeMin, rangeMax } = this.config;
        const rangeSpan = rangeMax - rangeMin;
        if (rangeSpan === 0) return domainMin;

        const ratio = (pixel - rangeMin) / rangeSpan;
        return domainMin + ratio * (domainMax - domainMin);
    }

    /** Updates the scale configuration. */
    update(config: Partial<ScaleConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /** Gets the current configuration. */
    getConfig(): ScaleConfig {
        return this.config;
    }
}

/** Creates a linear scale. */
export function createScale(config: ScaleConfig): LinearScale {
    return new LinearScale(config);
}

/** Creates a Y scale (inverted for canvas coordinates). */
export function createYScale(
    min: Unit,
    max: Unit,
    height: Pixel,
    padding = 10,
): LinearScale {
    return new LinearScale({
        domainMin: min,
        domainMax: max,
        rangeMin: height - padding,
        rangeMax: padding,
    });
}

/** Creates an X scale. */
export function createXScale(
    min: Unit,
    max: Unit,
    width: Pixel,
    padding = 60,
): LinearScale {
    return new LinearScale({
        domainMin: min,
        domainMax: max,
        rangeMin: padding,
        rangeMax: width - padding,
    });
}

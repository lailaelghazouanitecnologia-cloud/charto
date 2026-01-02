/**
 * Price formatter for chart axis labels and tooltips.
 * Following Code Style Guide: Single responsibility, explicit types.
 *
 * @doc-tags core,formatter,price
 */

import type { Price } from "../../types/primitives.ts";
import { assert } from "../assert.ts";

/**
 * Price format type.
 */
export type PriceFormatType =
    | "decimal"
    | "currency"
    | "percent"
    | "scientific"
    | "compact";

/**
 * Price formatter configuration.
 */
export interface PriceFormatterConfig {
    readonly type: PriceFormatType;
    readonly locale: string;
    readonly currency: string;
    readonly minDecimals: number;
    readonly maxDecimals: number;
    readonly autoDecimals: boolean;
    readonly showPositiveSign: boolean;
    readonly showThousandsSeparator: boolean;
    readonly compactThreshold: number;
}

/**
 * Default price formatter configuration.
 */
export const DEFAULT_PRICE_FORMATTER_CONFIG: PriceFormatterConfig = {
    type: "decimal",
    locale: "en-US",
    currency: "USD",
    minDecimals: 2,
    maxDecimals: 8,
    autoDecimals: true,
    showPositiveSign: false,
    showThousandsSeparator: true,
    compactThreshold: 1_000_000,
} as const;

/**
 * Price formatter - formats prices for chart display.
 */
export class PriceFormatter {
    private readonly config: PriceFormatterConfig;

    constructor(config: Partial<PriceFormatterConfig> = {}) {
        this.config = { ...DEFAULT_PRICE_FORMATTER_CONFIG, ...config };
    }

    /**
     * Formats a price value.
     */
    public format(price: Price): string {
        assert(typeof price === "number", "Price must be a number");
        assert(Number.isFinite(price), "Price must be finite");

        switch (this.config.type) {
            case "decimal":
                return this.formatDecimal(price);
            case "currency":
                return this.formatCurrency(price);
            case "percent":
                return this.formatPercent(price);
            case "scientific":
                return this.formatScientific(price);
            case "compact":
                return this.formatCompact(price);
        }
    }

    /**
     * Formats as decimal number.
     */
    private formatDecimal(price: Price): string {
        const decimals = this.config.autoDecimals
            ? this.calculateDecimals(price)
            : this.config.minDecimals;

        const formatted = price.toFixed(decimals);
        const withSeparator = this.config.showThousandsSeparator
            ? this.addThousandsSeparator(formatted)
            : formatted;

        return this.addSign(price, withSeparator);
    }

    /**
     * Formats as currency.
     */
    private formatCurrency(price: Price): string {
        try {
            const formatter = new Intl.NumberFormat(this.config.locale, {
                style: "currency",
                currency: this.config.currency,
                minimumFractionDigits: this.config.minDecimals,
                maximumFractionDigits: this.config.maxDecimals,
            });
            return formatter.format(price);
        } catch {
            // Fallback if Intl not available.
            return `${this.config.currency} ${this.formatDecimal(price)}`;
        }
    }

    /**
     * Formats as percentage.
     */
    private formatPercent(price: Price): string {
        const percentValue = price * 100;
        const decimals = this.config.autoDecimals
            ? Math.min(this.calculateDecimals(percentValue), 2)
            : this.config.minDecimals;

        const formatted = percentValue.toFixed(decimals);
        return this.addSign(price, `${formatted}%`);
    }

    /**
     * Formats in scientific notation.
     */
    private formatScientific(price: Price): string {
        return price.toExponential(this.config.minDecimals);
    }

    /**
     * Formats in compact notation (K, M, B, T).
     */
    private formatCompact(price: Price): string {
        const absPrice = Math.abs(price);

        if (absPrice >= 1_000_000_000_000) {
            return this.addSign(price, `${(price / 1_000_000_000_000).toFixed(2)}T`);
        }
        if (absPrice >= 1_000_000_000) {
            return this.addSign(price, `${(price / 1_000_000_000).toFixed(2)}B`);
        }
        if (absPrice >= 1_000_000) {
            return this.addSign(price, `${(price / 1_000_000).toFixed(2)}M`);
        }
        if (absPrice >= 1_000) {
            return this.addSign(price, `${(price / 1_000).toFixed(2)}K`);
        }

        return this.formatDecimal(price);
    }

    /**
     * Calculates appropriate decimal places based on price magnitude.
     */
    private calculateDecimals(price: Price): number {
        const absPrice = Math.abs(price);

        if (absPrice === 0) {
            return this.config.minDecimals;
        }
        if (absPrice >= 1000) {
            return Math.max(0, this.config.minDecimals);
        }
        if (absPrice >= 1) {
            return Math.max(2, this.config.minDecimals);
        }
        if (absPrice >= 0.01) {
            return Math.max(4, this.config.minDecimals);
        }

        // For very small numbers, show more decimals.
        const logValue = Math.floor(Math.log10(absPrice));
        const decimals = Math.min(-logValue + 2, this.config.maxDecimals);
        return Math.max(decimals, this.config.minDecimals);
    }

    /**
     * Adds thousands separator to a number string.
     */
    private addThousandsSeparator(numStr: string): string {
        const parts = numStr.split(".");
        const integerPart = parts[0] ?? "0";
        const decimalPart = parts[1];

        const withSeparator = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        return decimalPart !== undefined
            ? `${withSeparator}.${decimalPart}`
            : withSeparator;
    }

    /**
     * Adds positive/negative sign if configured.
     */
    private addSign(price: Price, formatted: string): string {
        if (this.config.showPositiveSign && price > 0) {
            return `+${formatted}`;
        }
        return formatted;
    }

    /**
     * Formats price change (with sign and color hint).
     */
    public formatChange(price: Price): { text: string; isPositive: boolean; isNegative: boolean } {
        assert(typeof price === "number", "Price must be a number");

        const text = this.format(Math.abs(price));
        const signedText = price >= 0 ? `+${text}` : `-${text}`;

        return {
            text: signedText,
            isPositive: price > 0,
            isNegative: price < 0,
        };
    }
}

/**
 * Creates a price formatter.
 */
export function createPriceFormatter(
    config?: Partial<PriceFormatterConfig>,
): PriceFormatter {
    return new PriceFormatter(config);
}

/**
 * Formats a price using default settings.
 */
export function formatPrice(price: Price): string {
    const formatter = new PriceFormatter();
    return formatter.format(price);
}

/**
 * Creates a label formatter function for axis.
 */
export function createPriceAxisFormatter(
    config?: Partial<PriceFormatterConfig>,
): (price: Price) => string {
    const formatter = new PriceFormatter(config);
    return (price: Price) => formatter.format(price);
}

/**
 * Creates a currency formatter.
 */
export function createCurrencyFormatter(
    currency: string,
    locale = "en-US",
): PriceFormatter {
    return new PriceFormatter({
        type: "currency",
        currency,
        locale,
    });
}

/**
 * Creates a percent formatter.
 */
export function createPercentFormatter(
    showSign = true,
): PriceFormatter {
    return new PriceFormatter({
        type: "percent",
        showPositiveSign: showSign,
    });
}

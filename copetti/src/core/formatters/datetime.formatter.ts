/**
 * DateTime formatter for chart axis labels.
 * Following Code Style Guide: Single responsibility, explicit types.
 *
 * @doc-tags core,formatter,datetime
 */

import type { Timestamp } from "../../types/primitives.ts";
import { assert } from "../assert.ts";

/**
 * Time period for formatting decisions.
 */
export type TimePeriod =
    | "seconds"
    | "minutes"
    | "hours"
    | "days"
    | "weeks"
    | "months"
    | "years";

/**
 * DateTime format pattern.
 */
export type DateTimePattern =
    | "HH:mm:ss"
    | "HH:mm"
    | "MMM dd"
    | "MMM dd HH:mm"
    | "dd"
    | "MMM"
    | "MMM yyyy"
    | "yyyy"
    | "custom";

/**
 * DateTime formatter configuration.
 */
export interface DateTimeFormatterConfig {
    readonly locale: string;
    readonly timezone: string;
    readonly use24Hour: boolean;
    readonly showSeconds: boolean;
    readonly shortMonths: boolean;
}

/**
 * Default DateTime formatter configuration.
 */
export const DEFAULT_DATETIME_FORMATTER_CONFIG: DateTimeFormatterConfig = {
    locale: "en-US",
    timezone: "UTC",
    use24Hour: true,
    showSeconds: false,
    shortMonths: true,
} as const;

/**
 * DateTime formatter - formats timestamps for chart display.
 */
export class DateTimeFormatter {
    private readonly config: DateTimeFormatterConfig;

    constructor(config: Partial<DateTimeFormatterConfig> = {}) {
        this.config = { ...DEFAULT_DATETIME_FORMATTER_CONFIG, ...config };
    }

    /**
     * Formats a timestamp with automatic pattern selection.
     */
    public format(timestamp: Timestamp, period: TimePeriod): string {
        assert(typeof timestamp === "number", "Timestamp must be a number");
        assert(timestamp >= 0, "Timestamp must be non-negative");

        const date = new Date(timestamp);
        const pattern = this.getPatternForPeriod(period);
        return this.formatWithPattern(date, pattern);
    }

    /**
     * Formats a timestamp with a specific pattern.
     */
    public formatWithPattern(date: Date, pattern: DateTimePattern): string {
        assert(date instanceof Date, "Date must be a Date object");

        switch (pattern) {
            case "HH:mm:ss":
                return this.formatTime(date, true);
            case "HH:mm":
                return this.formatTime(date, false);
            case "MMM dd":
                return this.formatMonthDay(date);
            case "MMM dd HH:mm":
                return `${this.formatMonthDay(date)} ${this.formatTime(date, false)}`;
            case "dd":
                return this.formatDay(date);
            case "MMM":
                return this.formatMonth(date);
            case "MMM yyyy":
                return this.formatMonthYear(date);
            case "yyyy":
                return this.formatYear(date);
            case "custom":
                return date.toISOString();
        }
    }

    /**
     * Gets the recommended pattern for a time period.
     */
    public getPatternForPeriod(period: TimePeriod): DateTimePattern {
        switch (period) {
            case "seconds":
                return "HH:mm:ss";
            case "minutes":
                return "HH:mm";
            case "hours":
                return "MMM dd HH:mm";
            case "days":
                return "MMM dd";
            case "weeks":
                return "MMM dd";
            case "months":
                return "MMM yyyy";
            case "years":
                return "yyyy";
        }
    }

    /**
     * Formats time (HH:mm or HH:mm:ss).
     */
    private formatTime(date: Date, includeSeconds: boolean): string {
        const hours = date.getUTCHours().toString().padStart(2, "0");
        const minutes = date.getUTCMinutes().toString().padStart(2, "0");

        if (includeSeconds) {
            const seconds = date.getUTCSeconds().toString().padStart(2, "0");
            return `${hours}:${minutes}:${seconds}`;
        }

        return `${hours}:${minutes}`;
    }

    /**
     * Formats month and day (MMM dd).
     */
    private formatMonthDay(date: Date): string {
        const month = this.getMonthName(date.getUTCMonth());
        const day = date.getUTCDate().toString().padStart(2, "0");
        return `${month} ${day}`;
    }

    /**
     * Formats just the day.
     */
    private formatDay(date: Date): string {
        return date.getUTCDate().toString().padStart(2, "0");
    }

    /**
     * Formats just the month.
     */
    private formatMonth(date: Date): string {
        return this.getMonthName(date.getUTCMonth());
    }

    /**
     * Formats month and year.
     */
    private formatMonthYear(date: Date): string {
        const month = this.getMonthName(date.getUTCMonth());
        const year = date.getUTCFullYear();
        return `${month} ${year}`;
    }

    /**
     * Formats just the year.
     */
    private formatYear(date: Date): string {
        return date.getUTCFullYear().toString();
    }

    /**
     * Gets month name by index.
     */
    private getMonthName(month: number): string {
        const months = this.config.shortMonths
            ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        return months[month] ?? "???";
    }

    /**
     * Detects the appropriate time period based on visible range.
     */
    public detectPeriod(rangeMs: number): TimePeriod {
        assert(rangeMs >= 0, "Range must be non-negative");

        const SECOND = 1000;
        const MINUTE = 60 * SECOND;
        const HOUR = 60 * MINUTE;
        const DAY = 24 * HOUR;
        const WEEK = 7 * DAY;
        const MONTH = 30 * DAY;
        const YEAR = 365 * DAY;

        if (rangeMs < 2 * MINUTE) {
            return "seconds";
        }
        if (rangeMs < 2 * HOUR) {
            return "minutes";
        }
        if (rangeMs < 3 * DAY) {
            return "hours";
        }
        if (rangeMs < 3 * WEEK) {
            return "days";
        }
        if (rangeMs < 3 * MONTH) {
            return "weeks";
        }
        if (rangeMs < 2 * YEAR) {
            return "months";
        }
        return "years";
    }
}

/**
 * Creates a DateTime formatter.
 */
export function createDateTimeFormatter(
    config?: Partial<DateTimeFormatterConfig>,
): DateTimeFormatter {
    return new DateTimeFormatter(config);
}

/**
 * Formats a timestamp using default settings.
 */
export function formatDateTime(
    timestamp: Timestamp,
    period: TimePeriod,
): string {
    const formatter = new DateTimeFormatter();
    return formatter.format(timestamp, period);
}

/**
 * Creates a label formatter function for axis.
 */
export function createAxisLabelFormatter(
    period: TimePeriod,
    config?: Partial<DateTimeFormatterConfig>,
): (timestamp: Timestamp) => string {
    const formatter = new DateTimeFormatter(config);
    return (timestamp: Timestamp) => formatter.format(timestamp, period);
}

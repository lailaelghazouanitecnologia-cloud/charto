/**
 * Primitive types with explicit sizing.
 * Following Code Style Guide: "Always use explicitly-sized types."
 *
 * @doc-tags types,primitives
 */

// Numeric primitives with semantic meaning.
export type Pixel = number;
export type Unit = number;
export type Price = number;
export type Volume = number;
export type Timestamp = number;
export type Percentage = number;
export type Index = number;

// Viewport percentages (0..1 ratio of full viewport).
export type ViewportPercent = number;

// Zoom level representation.
export type Zoom = number;

// Color representation.
export type ColorHex = string;
export type ColorRGBA = readonly [number, number, number, number];

// Canvas specific.
export type CanvasId = string;
export type PaneId = string;
export type DrawerId = string;

// Bounded numeric types (for documentation and runtime validation).
export interface BoundedNumber {
    readonly value: number;
    readonly min: number;
    readonly max: number;
}

// Result type for operations that can fail.
export type Result<T, E = Error> =
    | { readonly success: true; readonly value: T }
    | { readonly success: false; readonly error: E };

// Optional with explicit presence.
export type Maybe<T> = T | null;

// Non-empty array type.
export type NonEmptyArray<T> = readonly [T, ...T[]];

// Readonly deep type.
export type DeepReadonly<T> = T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

// Partial with at least one property required.
export type AtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
    {
        [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
    }[Keys];

// Make specific properties required.
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

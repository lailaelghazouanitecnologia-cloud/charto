/**
 * Animation utilities following the Code Style Guide.
 * "Let the CPU be a sprinter doing the 100m."
 *
 * @doc-tags core,animation
 */

import { assert, assertPositive, assertDefined } from "../assert.ts";

/**
 * Animation configuration.
 */
export interface AnimationConfig {
    readonly duration: number;
    readonly easing: EasingFunction;
}

/**
 * Easing function type.
 */
export type EasingFunction = (t: number) => number;

/**
 * Common easing functions.
 */
export const Easing = {
    linear: (t: number): number => t,

    easeInQuad: (t: number): number => t * t,

    easeOutQuad: (t: number): number => t * (2 - t),

    easeInOutQuad: (t: number): number => {
        const threshold = 0.5;
        const multiplier = 2;
        if (t < threshold) {
            return multiplier * t * t;
        }
        return -1 + (4 - multiplier * t) * t;
    },

    easeInCubic: (t: number): number => t * t * t,

    easeOutCubic: (t: number): number => {
        const adjusted = t - 1;
        return adjusted * adjusted * adjusted + 1;
    },

    easeInOutCubic: (t: number): number => {
        const threshold = 0.5;
        const multiplier = 4;
        if (t < threshold) {
            return multiplier * t * t * t;
        }
        const adjusted = t - 1;
        return multiplier * adjusted * adjusted * adjusted + 1;
    },
} as const;

/**
 * Default animation duration in milliseconds.
 */
export const DEFAULT_ANIMATION_DURATION_MS = 300;

/**
 * Animation state.
 */
export interface AnimationState {
    readonly progress: number;
    readonly isComplete: boolean;
    readonly startTime: number;
    readonly currentTime: number;
}

/**
 * Animation tick callback.
 */
export type AnimationTickCallback = (state: AnimationState) => void;

/**
 * Animation controller for managing animation lifecycle.
 */
export class AnimationController {
    private readonly config: AnimationConfig;
    private readonly onTick: AnimationTickCallback;
    private readonly onComplete: (() => void) | undefined;

    private startTime = 0;
    private animationFrameId: number | null = null;
    private isRunning = false;

    constructor(
        config: Partial<AnimationConfig>,
        onTick: AnimationTickCallback,
        onComplete?: () => void,
    ) {
        this.config = {
            duration: config.duration ?? DEFAULT_ANIMATION_DURATION_MS,
            easing: config.easing ?? Easing.easeOutQuad,
        };

        assertPositive(this.config.duration, "Animation duration");

        this.onTick = onTick;
        this.onComplete = onComplete ?? undefined;
    }

    /**
     * Starts the animation.
     */
    public start(): void {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;
        this.startTime = performance.now();
        this.tick(this.startTime);
    }

    /**
     * Stops the animation.
     */
    public stop(): void {
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.isRunning = false;
    }

    /**
     * Animation tick handler.
     */
    private tick(currentTime: number): void {
        if (!this.isRunning) {
            return;
        }

        const elapsed = currentTime - this.startTime;
        const rawProgress = Math.min(elapsed / this.config.duration, 1);
        const progress = this.config.easing(rawProgress);
        const isComplete = rawProgress >= 1;

        const state: AnimationState = {
            progress,
            isComplete,
            startTime: this.startTime,
            currentTime,
        };

        this.onTick(state);

        if (isComplete) {
            this.isRunning = false;
            this.onComplete?.();
        } else {
            this.animationFrameId = requestAnimationFrame((time) => {
                this.tick(time);
            });
        }
    }

    /**
     * Returns whether the animation is currently running.
     */
    public getIsRunning(): boolean {
        return this.isRunning;
    }
}

/**
 * Throttles function calls to animation frame rate.
 */
export class AnimationFrameThrottle {
    private frameId: number | null = null;
    private readonly callback: () => void;

    constructor(callback: () => void) {
        assertDefined(callback, "Callback is required");
        this.callback = callback;
    }

    /**
     * Schedules the callback to run on the next animation frame.
     * Multiple calls before the next frame will only result in one callback.
     */
    public schedule(): void {
        if (this.frameId !== null) {
            return;
        }

        this.frameId = requestAnimationFrame(() => {
            this.frameId = null;
            this.callback();
        });
    }

    /**
     * Cancels any pending scheduled callback.
     */
    public cancel(): void {
        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }
}

/**
 * Interpolates between two numbers.
 *
 * @param start - Start value.
 * @param end - End value.
 * @param t - Progress (0-1).
 * @returns Interpolated value.
 */
export function lerp(start: number, end: number, t: number): number {
    assert(t >= 0 && t <= 1, "Progress must be between 0 and 1");
    return start + (end - start) * t;
}

/**
 * Interpolates between two colors.
 *
 * @param colorA - Start color (RGB array).
 * @param colorB - End color (RGB array).
 * @param t - Progress (0-1).
 * @returns Interpolated color.
 */
export function lerpColor(
    colorA: readonly [number, number, number],
    colorB: readonly [number, number, number],
    t: number,
): [number, number, number] {
    return [
        Math.round(lerp(colorA[0], colorB[0], t)),
        Math.round(lerp(colorA[1], colorB[1], t)),
        Math.round(lerp(colorA[2], colorB[2], t)),
    ];
}

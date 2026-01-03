/**
 * Animation utilities for smooth transitions.
 * Provides easing functions and animation orchestration.
 */

/** Easing function type. */
export type EasingFunction = (t: number) => number;

/** Common easing functions. */
export const Easing = {
    /** Linear - no easing. */
    linear: (t: number): number => t,

    /** Quadratic ease in. */
    easeInQuad: (t: number): number => t * t,

    /** Quadratic ease out. */
    easeOutQuad: (t: number): number => t * (2 - t),

    /** Quadratic ease in-out. */
    easeInOutQuad: (t: number): number =>
        t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

    /** Cubic ease in. */
    easeInCubic: (t: number): number => t * t * t,

    /** Cubic ease out. */
    easeOutCubic: (t: number): number => (--t) * t * t + 1,

    /** Cubic ease in-out. */
    easeInOutCubic: (t: number): number =>
        t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

    /** Exponential ease out. */
    easeOutExpo: (t: number): number =>
        t === 1 ? 1 : 1 - Math.pow(2, -10 * t),

    /** Exponential ease in-out. */
    easeInOutExpo: (t: number): number => {
        if (t === 0) return 0;
        if (t === 1) return 1;
        if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
        return (2 - Math.pow(2, -20 * t + 10)) / 2;
    },

    /** Elastic ease out (bounce). */
    easeOutElastic: (t: number): number => {
        const p = 0.3;
        if (t === 0) return 0;
        if (t === 1) return 1;
        return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
    },

    /** Back ease out (overshoot). */
    easeOutBack: (t: number): number => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
} as const;

/** Animation state. */
export type AnimationState = "idle" | "running" | "paused" | "completed";

/** Animation configuration. */
export interface AnimationConfig<T> {
    from: T;
    to: T;
    duration: number;
    easing?: EasingFunction;
    onUpdate: (value: T) => void;
    onComplete?: () => void;
}

/** Interpolate between two numbers. */
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/** Animation class for numeric values. */
export class NumberAnimation {
    private from: number;
    private to: number;
    private duration: number;
    private easing: EasingFunction;
    private onUpdate: (value: number) => void;
    private onComplete?: () => void;

    private state: AnimationState = "idle";
    private startTime: number = 0;
    private pauseTime: number = 0;
    private rafId: number | null = null;

    constructor(config: AnimationConfig<number>) {
        this.from = config.from;
        this.to = config.to;
        this.duration = config.duration;
        this.easing = config.easing ?? Easing.easeOutCubic;
        this.onUpdate = config.onUpdate;
        this.onComplete = config.onComplete;
    }

    /** Start the animation. */
    start(): void {
        if (this.state === "running") return;

        this.state = "running";
        this.startTime = performance.now();
        this.tick();
    }

    /** Pause the animation. */
    pause(): void {
        if (this.state !== "running") return;

        this.state = "paused";
        this.pauseTime = performance.now();

        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /** Resume a paused animation. */
    resume(): void {
        if (this.state !== "paused") return;

        const pauseDuration = performance.now() - this.pauseTime;
        this.startTime += pauseDuration;
        this.state = "running";
        this.tick();
    }

    /** Stop and reset the animation. */
    stop(): void {
        this.state = "idle";

        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /** Animation tick. */
    private tick = (): void => {
        if (this.state !== "running") return;

        const now = performance.now();
        const elapsed = now - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);
        const easedProgress = this.easing(progress);

        const value = lerp(this.from, this.to, easedProgress);
        this.onUpdate(value);

        if (progress < 1) {
            this.rafId = requestAnimationFrame(this.tick);
        } else {
            this.state = "completed";
            this.rafId = null;
            this.onComplete?.();
        }
    };

    /** Get current state. */
    getState(): AnimationState {
        return this.state;
    }
}

/** Viewport animation for smooth pan/zoom. */
export interface ViewportValues {
    startIndex: number;
    endIndex: number;
    minPrice: number;
    maxPrice: number;
}

/** Animate viewport transition. */
export class ViewportAnimation {
    private from: ViewportValues;
    private to: ViewportValues;
    private duration: number;
    private easing: EasingFunction;
    private onUpdate: (value: ViewportValues) => void;
    private onComplete?: () => void;

    private state: AnimationState = "idle";
    private startTime: number = 0;
    private rafId: number | null = null;

    constructor(config: AnimationConfig<ViewportValues>) {
        this.from = config.from;
        this.to = config.to;
        this.duration = config.duration;
        this.easing = config.easing ?? Easing.easeOutCubic;
        this.onUpdate = config.onUpdate;
        this.onComplete = config.onComplete;
    }

    /** Start the animation. */
    start(): void {
        if (this.state === "running") return;

        this.state = "running";
        this.startTime = performance.now();
        this.tick();
    }

    /** Stop the animation. */
    stop(): void {
        this.state = "idle";

        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /** Animation tick. */
    private tick = (): void => {
        if (this.state !== "running") return;

        const now = performance.now();
        const elapsed = now - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);
        const t = this.easing(progress);

        const value: ViewportValues = {
            startIndex: lerp(this.from.startIndex, this.to.startIndex, t),
            endIndex: lerp(this.from.endIndex, this.to.endIndex, t),
            minPrice: lerp(this.from.minPrice, this.to.minPrice, t),
            maxPrice: lerp(this.from.maxPrice, this.to.maxPrice, t),
        };

        this.onUpdate(value);

        if (progress < 1) {
            this.rafId = requestAnimationFrame(this.tick);
        } else {
            this.state = "completed";
            this.rafId = null;
            this.onComplete?.();
        }
    };

    /** Get current state. */
    getState(): AnimationState {
        return this.state;
    }
}

/** Color animation (hex colors). */
export class ColorAnimation {
    private fromRgb: [number, number, number];
    private toRgb: [number, number, number];
    private duration: number;
    private easing: EasingFunction;
    private onUpdate: (value: string) => void;
    private onComplete?: () => void;

    private state: AnimationState = "idle";
    private startTime: number = 0;
    private rafId: number | null = null;

    constructor(config: AnimationConfig<string>) {
        this.fromRgb = hexToRgb(config.from);
        this.toRgb = hexToRgb(config.to);
        this.duration = config.duration;
        this.easing = config.easing ?? Easing.easeOutCubic;
        this.onUpdate = config.onUpdate;
        this.onComplete = config.onComplete;
    }

    /** Start the animation. */
    start(): void {
        if (this.state === "running") return;

        this.state = "running";
        this.startTime = performance.now();
        this.tick();
    }

    /** Stop the animation. */
    stop(): void {
        this.state = "idle";

        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /** Animation tick. */
    private tick = (): void => {
        if (this.state !== "running") return;

        const now = performance.now();
        const elapsed = now - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);
        const t = this.easing(progress);

        const r = Math.round(lerp(this.fromRgb[0], this.toRgb[0], t));
        const g = Math.round(lerp(this.fromRgb[1], this.toRgb[1], t));
        const b = Math.round(lerp(this.fromRgb[2], this.toRgb[2], t));

        const hex = rgbToHex(r, g, b);
        this.onUpdate(hex);

        if (progress < 1) {
            this.rafId = requestAnimationFrame(this.tick);
        } else {
            this.state = "completed";
            this.rafId = null;
            this.onComplete?.();
        }
    };
}

/** Convert hex color to RGB tuple. */
function hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result && result[1] && result[2] && result[3]) {
        return [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16),
        ];
    }
    return [0, 0, 0];
}

/** Convert RGB to hex color. */
function rgbToHex(r: number, g: number, b: number): string {
    return "#" + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join("");
}

/** Spring animation for natural physics-based motion. */
export class SpringAnimation {
    private target: number;
    private current: number;
    private velocity: number = 0;

    private stiffness: number;
    private damping: number;
    private mass: number;
    private precision: number;

    private onUpdate: (value: number) => void;
    private onComplete?: () => void;

    private state: AnimationState = "idle";
    private rafId: number | null = null;
    private lastTime: number = 0;

    constructor(config: {
        from: number;
        to: number;
        stiffness?: number;
        damping?: number;
        mass?: number;
        precision?: number;
        onUpdate: (value: number) => void;
        onComplete?: () => void;
    }) {
        this.current = config.from;
        this.target = config.to;
        this.stiffness = config.stiffness ?? 170;
        this.damping = config.damping ?? 26;
        this.mass = config.mass ?? 1;
        this.precision = config.precision ?? 0.01;
        this.onUpdate = config.onUpdate;
        this.onComplete = config.onComplete;
    }

    /** Update target value. */
    setTarget(target: number): void {
        this.target = target;
        if (this.state !== "running") {
            this.start();
        }
    }

    /** Start the animation. */
    start(): void {
        if (this.state === "running") return;

        this.state = "running";
        this.lastTime = performance.now();
        this.tick();
    }

    /** Stop the animation. */
    stop(): void {
        this.state = "idle";

        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    /** Animation tick using spring physics. */
    private tick = (): void => {
        if (this.state !== "running") return;

        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.064); // Cap at 64ms
        this.lastTime = now;

        // Spring force: F = -k * x - d * v
        const displacement = this.current - this.target;
        const springForce = -this.stiffness * displacement;
        const dampingForce = -this.damping * this.velocity;
        const acceleration = (springForce + dampingForce) / this.mass;

        this.velocity += acceleration * dt;
        this.current += this.velocity * dt;

        this.onUpdate(this.current);

        // Check if settled.
        const isSettled =
            Math.abs(this.velocity) < this.precision &&
            Math.abs(displacement) < this.precision;

        if (isSettled) {
            this.current = this.target;
            this.velocity = 0;
            this.state = "completed";
            this.rafId = null;
            this.onUpdate(this.current);
            this.onComplete?.();
        } else {
            this.rafId = requestAnimationFrame(this.tick);
        }
    };

    /** Get current value. */
    getValue(): number {
        return this.current;
    }

    /** Get current state. */
    getState(): AnimationState {
        return this.state;
    }
}

/** Animation manager for coordinating multiple animations. */
export class AnimationManager {
    private animations: Map<string, { stop: () => void }> = new Map();

    /** Register an animation. */
    register(id: string, animation: { stop: () => void }): void {
        // Stop existing animation with same id.
        this.stop(id);
        this.animations.set(id, animation);
    }

    /** Stop an animation by id. */
    stop(id: string): void {
        const animation = this.animations.get(id);
        if (animation) {
            animation.stop();
            this.animations.delete(id);
        }
    }

    /** Stop all animations. */
    stopAll(): void {
        for (const animation of this.animations.values()) {
            animation.stop();
        }
        this.animations.clear();
    }

    /** Check if animation is running. */
    isRunning(id: string): boolean {
        return this.animations.has(id);
    }
}

/** Create a simple animation helper. */
export function animate(
    from: number,
    to: number,
    duration: number,
    onUpdate: (value: number) => void,
    onComplete?: () => void,
    easing: EasingFunction = Easing.easeOutCubic,
): NumberAnimation {
    const animation = new NumberAnimation({
        from,
        to,
        duration,
        easing,
        onUpdate,
        onComplete,
    });
    animation.start();
    return animation;
}

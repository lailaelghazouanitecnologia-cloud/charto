/**
 * Assertion utilities following the Code Style Guide.
 *
 * "Assertions detect programmer errors. The assertion density of the code
 * must average a minimum of two assertions per function."
 *
 * @doc-tags core,safety
 */

/**
 * Assertion error with additional context.
 */
export class AssertionError extends Error {
    public readonly context: unknown;

    constructor(message: string, context?: unknown) {
        super(message);
        this.name = "AssertionError";
        this.context = context;
    }
}

/**
 * Asserts that a condition is true.
 * Use for programmer error detection, not for expected runtime errors.
 *
 * @param condition - Condition to check.
 * @param message - Error message if assertion fails.
 * @param context - Additional context for debugging.
 * @throws AssertionError if condition is false.
 */
export function assert(condition: boolean, message: string, context?: unknown): asserts condition {
    if (!condition) {
        throw new AssertionError(message, context);
    }
}

/**
 * Asserts that a value is not null or undefined.
 *
 * @param value - Value to check.
 * @param message - Error message if assertion fails.
 * @returns The value, guaranteed to be defined.
 */
export function assertDefined<T>(
    value: T | null | undefined,
    message = "Expected value to be defined",
): T {
    assert(value !== null && value !== undefined, message, { value });
    return value;
}

/**
 * Asserts that a number is within a range (inclusive).
 *
 * @param value - Value to check.
 * @param min - Minimum value.
 * @param max - Maximum value.
 * @param name - Name of the value for error messages.
 */
export function assertInRange(value: number, min: number, max: number, name = "value"): void {
    assert(value >= min, `${name} must be >= ${min}, got ${value}`, { value, min });
    assert(value <= max, `${name} must be <= ${max}, got ${value}`, { value, max });
}

/**
 * Asserts that a number is positive (> 0).
 *
 * @param value - Value to check.
 * @param name - Name of the value for error messages.
 */
export function assertPositive(value: number, name = "value"): void {
    assert(value > 0, `${name} must be positive, got ${value}`, { value });
}

/**
 * Asserts that a number is non-negative (>= 0).
 *
 * @param value - Value to check.
 * @param name - Name of the value for error messages.
 */
export function assertNonNegative(value: number, name = "value"): void {
    assert(value >= 0, `${name} must be non-negative, got ${value}`, { value });
}

/**
 * Asserts that an array is not empty.
 *
 * @param array - Array to check.
 * @param message - Error message if assertion fails.
 */
export function assertNonEmptyArray<T>(
    array: readonly T[],
    message = "Expected non-empty array",
): void {
    assert(array.length > 0, message, { length: array.length });
}

/**
 * Asserts that an index is valid for an array.
 *
 * @param index - Index to check.
 * @param arrayLength - Length of the array.
 * @param name - Name of the index for error messages.
 */
export function assertValidIndex(index: number, arrayLength: number, name = "index"): void {
    assert(Number.isInteger(index), `${name} must be an integer`, { index });
    assertInRange(index, 0, arrayLength - 1, name);
}

/**
 * Asserts that we've reached an unreachable code path.
 * Use for exhaustive switch statements.
 *
 * @param value - The value that should be of type `never`.
 * @param message - Error message.
 */
export function assertNever(value: never, message = "Unexpected value"): never {
    throw new AssertionError(message, { value });
}

/**
 * Asserts a condition with a pre and post pair.
 * Use when you want to verify state before and after an operation.
 *
 * @param preCondition - Condition that must be true before operation.
 * @param postCondition - Condition that must be true after operation.
 * @param preMessage - Message if precondition fails.
 * @param postMessage - Message if postcondition fails.
 */
export function assertPrePost(
    preCondition: boolean,
    postCondition: boolean,
    preMessage = "Precondition failed",
    postMessage = "Postcondition failed",
): void {
    assert(preCondition, preMessage);
    assert(postCondition, postMessage);
}

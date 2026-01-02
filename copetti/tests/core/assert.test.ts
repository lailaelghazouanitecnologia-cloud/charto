/**
 * Tests for assertion utilities.
 */

import { describe, it, expect } from "vitest";
import {
    assert,
    assertDefined,
    assertInRange,
    assertPositive,
    assertNonNegative,
    assertNonEmptyArray,
    assertValidIndex,
    AssertionError,
} from "../../src/core/assert.ts";

describe("assert", () => {
    it("should not throw when condition is true", () => {
        expect(() => assert(true, "Should not throw")).not.toThrow();
    });

    it("should throw AssertionError when condition is false", () => {
        expect(() => assert(false, "Should throw")).toThrow(AssertionError);
    });

    it("should include message in error", () => {
        const message = "Custom error message";
        expect(() => assert(false, message)).toThrow(message);
    });

    it("should include context in error", () => {
        const context = { value: 42 };
        try {
            assert(false, "Error", context);
        } catch (error) {
            expect((error as AssertionError).context).toEqual(context);
        }
    });
});

describe("assertDefined", () => {
    it("should return value when defined", () => {
        const value = "test";
        expect(assertDefined(value)).toBe(value);
    });

    it("should return zero when value is zero", () => {
        expect(assertDefined(0)).toBe(0);
    });

    it("should return empty string when value is empty string", () => {
        expect(assertDefined("")).toBe("");
    });

    it("should throw when value is null", () => {
        expect(() => assertDefined(null)).toThrow(AssertionError);
    });

    it("should throw when value is undefined", () => {
        expect(() => assertDefined(undefined)).toThrow(AssertionError);
    });
});

describe("assertInRange", () => {
    it("should not throw when value is in range", () => {
        expect(() => assertInRange(5, 0, 10)).not.toThrow();
    });

    it("should not throw when value equals min", () => {
        expect(() => assertInRange(0, 0, 10)).not.toThrow();
    });

    it("should not throw when value equals max", () => {
        expect(() => assertInRange(10, 0, 10)).not.toThrow();
    });

    it("should throw when value is below min", () => {
        expect(() => assertInRange(-1, 0, 10)).toThrow(AssertionError);
    });

    it("should throw when value is above max", () => {
        expect(() => assertInRange(11, 0, 10)).toThrow(AssertionError);
    });
});

describe("assertPositive", () => {
    it("should not throw when value is positive", () => {
        expect(() => assertPositive(1)).not.toThrow();
    });

    it("should throw when value is zero", () => {
        expect(() => assertPositive(0)).toThrow(AssertionError);
    });

    it("should throw when value is negative", () => {
        expect(() => assertPositive(-1)).toThrow(AssertionError);
    });
});

describe("assertNonNegative", () => {
    it("should not throw when value is positive", () => {
        expect(() => assertNonNegative(1)).not.toThrow();
    });

    it("should not throw when value is zero", () => {
        expect(() => assertNonNegative(0)).not.toThrow();
    });

    it("should throw when value is negative", () => {
        expect(() => assertNonNegative(-1)).toThrow(AssertionError);
    });
});

describe("assertNonEmptyArray", () => {
    it("should not throw when array has elements", () => {
        expect(() => assertNonEmptyArray([1, 2, 3])).not.toThrow();
    });

    it("should not throw when array has one element", () => {
        expect(() => assertNonEmptyArray([1])).not.toThrow();
    });

    it("should throw when array is empty", () => {
        expect(() => assertNonEmptyArray([])).toThrow(AssertionError);
    });
});

describe("assertValidIndex", () => {
    const arrayLength = 5;

    it("should not throw for valid index", () => {
        expect(() => assertValidIndex(0, arrayLength)).not.toThrow();
        expect(() => assertValidIndex(2, arrayLength)).not.toThrow();
        expect(() => assertValidIndex(4, arrayLength)).not.toThrow();
    });

    it("should throw for negative index", () => {
        expect(() => assertValidIndex(-1, arrayLength)).toThrow(AssertionError);
    });

    it("should throw for index equal to length", () => {
        expect(() => assertValidIndex(5, arrayLength)).toThrow(AssertionError);
    });

    it("should throw for index greater than length", () => {
        expect(() => assertValidIndex(10, arrayLength)).toThrow(AssertionError);
    });

    it("should throw for non-integer index", () => {
        expect(() => assertValidIndex(1.5, arrayLength)).toThrow(AssertionError);
    });
});

/**
 * Property-based tests for acceleratorUtils using fast-check.
 *
 * These tests use property-based testing to fuzz the accelerator parsing
 * and validation functions with thousands of random inputs to find edge cases.
 *
 * @module acceleratorUtils.property.test
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
    parseAccelerator,
    isValidAccelerator,
    normalizeAccelerator,
    VALID_MODIFIERS,
    VALID_KEYS,
} from '../../../src/shared/utils/acceleratorUtils';

describe('acceleratorUtils property tests', () => {
    // ==========================================================================
    // Arbitrary generators for accelerators
    // ==========================================================================

    // Generate a valid modifier from the allowed list
    const validModifier = fc.constantFrom(...VALID_MODIFIERS);

    // Generate a valid key from the allowed list
    const validKey = fc.constantFrom(...VALID_KEYS);

    // Generate a valid accelerator string
    const validAccelerator = fc
        .tuple(fc.array(validModifier, { minLength: 1, maxLength: 3 }), validKey)
        .map(([mods, key]) => [...new Set(mods), key].join('+'));

    // ==========================================================================
    // Property: Roundtrip normalization is idempotent
    // ==========================================================================

    describe('normalization idempotence', () => {
        it('normalizing a normalized accelerator should return the same result', () => {
            fc.assert(
                fc.property(validAccelerator, (accel) => {
                    if (!isValidAccelerator(accel)) return true; // Skip if generated invalid combo
                    const normalized = normalizeAccelerator(accel);
                    const doubleNormalized = normalizeAccelerator(normalized);
                    expect(doubleNormalized).toBe(normalized);
                }),
                { numRuns: 500 }
            );
        });
    });

    // ==========================================================================
    // Property: Parse/validate consistency
    // ==========================================================================

    describe('parse/validate consistency', () => {
        it('valid accelerators always parse to non-empty modifiers and valid key', () => {
            fc.assert(
                fc.property(validAccelerator, (accel) => {
                    if (!isValidAccelerator(accel)) return true;
                    const parsed = parseAccelerator(accel);
                    expect(parsed.modifiers.length).toBeGreaterThan(0);
                    expect(parsed.key.length).toBeGreaterThan(0);
                }),
                { numRuns: 500 }
            );
        });

        it('accelerators without modifiers are always invalid', () => {
            fc.assert(
                fc.property(validKey, (key) => {
                    expect(isValidAccelerator(key)).toBe(false);
                }),
                { numRuns: 100 }
            );
        });

        it('accelerators with only modifiers are always invalid', () => {
            fc.assert(
                fc.property(fc.array(validModifier, { minLength: 1, maxLength: 3 }), (mods) => {
                    const accel = [...new Set(mods)].join('+');
                    expect(isValidAccelerator(accel)).toBe(false);
                }),
                { numRuns: 100 }
            );
        });
    });

    // ==========================================================================
    // Property: Robustness - random strings never throw
    // ==========================================================================

    describe('robustness against random input', () => {
        it('parseAccelerator never throws on arbitrary strings', () => {
            fc.assert(
                fc.property(fc.string(), (s) => {
                    expect(() => parseAccelerator(s)).not.toThrow();
                }),
                { numRuns: 1000 }
            );
        });

        it('isValidAccelerator never throws on arbitrary strings', () => {
            fc.assert(
                fc.property(fc.string(), (s) => {
                    expect(() => isValidAccelerator(s)).not.toThrow();
                }),
                { numRuns: 1000 }
            );
        });

        it('normalizeAccelerator never throws on arbitrary strings', () => {
            fc.assert(
                fc.property(fc.string(), (s) => {
                    expect(() => normalizeAccelerator(s)).not.toThrow();
                }),
                { numRuns: 1000 }
            );
        });

        it('handles unicode and special characters gracefully', () => {
            // Test with various string patterns including special characters
            fc.assert(
                fc.property(fc.string({ minLength: 0, maxLength: 100 }), (s: string) => {
                    expect(() => parseAccelerator(s)).not.toThrow();
                    expect(() => isValidAccelerator(s)).not.toThrow();
                    expect(() => normalizeAccelerator(s)).not.toThrow();
                }),
                { numRuns: 500 }
            );
        });

        it('handles very long strings without crashing', () => {
            fc.assert(
                fc.property(fc.string({ minLength: 1000, maxLength: 10000 }), (s) => {
                    expect(() => parseAccelerator(s)).not.toThrow();
                    expect(() => isValidAccelerator(s)).not.toThrow();
                }),
                { numRuns: 50 }
            );
        });
    });

    // ==========================================================================
    // Property: Invalid inputs are consistently rejected
    // ==========================================================================

    describe('invalid input rejection', () => {
        it('strings with invalid modifiers are rejected', () => {
            const invalidModifier = fc
                .string({ minLength: 1 })
                .filter((s) => !VALID_MODIFIERS.some((m) => m.toLowerCase() === s.toLowerCase()));

            fc.assert(
                fc.property(invalidModifier, validKey, (invalidMod, key) => {
                    const accel = `${invalidMod}+${key}`;
                    expect(isValidAccelerator(accel)).toBe(false);
                }),
                { numRuns: 200 }
            );
        });

        it('strings with invalid keys are rejected', () => {
            // Generate strings that are definitely not valid keys
            // by using patterns that don't match any VALID_KEYS
            const invalidKey = fc
                .array(fc.constantFrom('!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_'), {
                    minLength: 1,
                    maxLength: 3,
                })
                .map((arr) => arr.join(''))
                .filter((s: string) => !VALID_KEYS.some((k) => k.toLowerCase() === s.toLowerCase()));

            fc.assert(
                fc.property(validModifier, invalidKey, (mod, invalidK) => {
                    const accel = `${mod}+${invalidK}`;
                    expect(isValidAccelerator(accel)).toBe(false);
                }),
                { numRuns: 200 }
            );
        });
    });
});

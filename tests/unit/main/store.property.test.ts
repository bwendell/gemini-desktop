/**
 * Property-based tests for SettingsStore deep merge using fast-check.
 *
 * These tests fuzz the deep merge function that combines default settings
 * with user settings, testing for prototype pollution and edge cases.
 *
 * @module store.property.test
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { deepMerge } from '../../../src/main/store';

describe('SettingsStore deepMerge property tests', () => {
    // ==========================================================================
    // Arbitrary generators for settings-like objects
    // ==========================================================================

    // Simple settings values
    const primitiveValue = fc.oneof(
        fc.string(),
        fc.integer(),
        fc.boolean(),
        fc.constant(null),
        fc.double({ noNaN: true })
    );

    // Shallow settings object
    const shallowSettings = fc.dictionary(
        fc.string().filter((s) => s.length > 0 && s.length < 20),
        primitiveValue,
        {
            minKeys: 0,
            maxKeys: 10,
        }
    );

    // Nested settings object (1 level deep)
    const nestedSettings: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
        fc.string().filter((s) => s.length > 0 && s.length < 20),
        fc.oneof(primitiveValue, shallowSettings),
        { minKeys: 0, maxKeys: 5 }
    );

    // ==========================================================================
    // Property: Source values take precedence
    // ==========================================================================

    describe('source precedence', () => {
        it('source values override target values for the same key', () => {
            fc.assert(
                fc.property(shallowSettings, shallowSettings, (target, source) => {
                    const result = deepMerge(target, source);

                    // Dangerous keys that are filtered out by deepMerge for security
                    const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype']);

                    // Every key in source (except dangerous ones) should have source's value in result
                    for (const key of Object.keys(source)) {
                        if (!dangerousKeys.has(key)) {
                            expect(result[key]).toEqual(source[key]);
                        }
                    }
                }),
                { numRuns: 500 }
            );
        });

        it('target-only keys are preserved in result', () => {
            fc.assert(
                fc.property(shallowSettings, shallowSettings, (target, source) => {
                    const result = deepMerge(target, source);

                    // Every key only in target should still be in result
                    for (const key of Object.keys(target)) {
                        if (!(key in source)) {
                            expect(result[key]).toEqual(target[key]);
                        }
                    }
                }),
                { numRuns: 500 }
            );
        });
    });

    // ==========================================================================
    // Property: Type preservation
    // ==========================================================================

    describe('type preservation', () => {
        it('arrays in source replace arrays in target (not merged)', () => {
            const targetWithArray = { items: [1, 2, 3] };
            const sourceWithArray = { items: [4, 5] };

            const result = deepMerge(targetWithArray, sourceWithArray);
            expect(result.items).toEqual([4, 5]);
        });

        it('nested objects are merged recursively', () => {
            const target = { nested: { a: 1, b: 2 } };
            const source = { nested: { b: 3, c: 4 } } as unknown as typeof target;

            const result = deepMerge(target, source);
            expect(result.nested).toEqual({ a: 1, b: 3, c: 4 });
        });

        it('null in source replaces object in target', () => {
            const target = { value: { nested: true } };
            const source = { value: null };

            const result = deepMerge(target, source as any);
            expect(result.value).toBe(null);
        });
    });

    // ==========================================================================
    // Property: Prototype pollution prevention - SECURITY CRITICAL
    // ==========================================================================

    describe('prototype pollution prevention', () => {
        it('__proto__ key in source does not pollute Object prototype', () => {
            const target = { safe: true };
            // Use JSON.parse to create an actual enumerable __proto__ property
            const source = JSON.parse('{"__proto__": {"polluted": true}}');

            const result = deepMerge(target, source);

            // The pollution should NOT affect other objects
            const newObj = {};
            expect((newObj as any).polluted).toBeUndefined();

            // Result should not have prototype pollution via its prototype chain
            expect((result as any).polluted).toBeUndefined();

            // Verify the result's prototype is still Object.prototype
            expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
        });

        it('constructor key in source does not affect prototype', () => {
            const target = { safe: true };
            const source = JSON.parse('{"constructor": {"prototype": {"polluted": true}}}');

            const result = deepMerge(target, source);

            // Verify no pollution occurred
            const newObj = {};
            expect((newObj as any).polluted).toBeUndefined();

            // Result should not have the dangerous constructor property
            expect(result.constructor).toBe(Object);
        });

        it('nested __proto__ does not cause pollution', () => {
            const target = { nested: { value: 1 } };
            const source = JSON.parse('{"nested": {"__proto__": {"evil": true}}}');

            const result = deepMerge(target, source);

            const newObj = {};
            expect((newObj as any).evil).toBeUndefined();

            // Check that nested object's prototype isn't polluted
            expect((result.nested as any).evil).toBeUndefined();
            expect(Object.getPrototypeOf(result.nested)).toBe(Object.prototype);
        });

        it('random keys including dangerous patterns are handled safely', () => {
            const dangerousKey = fc.constantFrom('__proto__', 'constructor', 'prototype', '__defineGetter__');

            fc.assert(
                fc.property(dangerousKey, primitiveValue, (key, value) => {
                    const target = { safe: true };
                    // Use computed property to create the key
                    const source = { [key]: value } as any;

                    expect(() => deepMerge(target, source)).not.toThrow();

                    // Verify no pollution
                    const newObj = {};
                    expect(Object.keys(newObj)).toEqual([]);
                }),
                { numRuns: 100 }
            );
        });
    });

    // ==========================================================================
    // Property: Robustness
    // ==========================================================================

    describe('robustness', () => {
        it('handles deeply nested objects without stack overflow', () => {
            // Create a deeply nested object
            let deep: Record<string, unknown> = { value: 'bottom' };
            for (let i = 0; i < 50; i++) {
                deep = { nested: deep };
            }

            const target = { start: 'target' };
            expect(() => deepMerge(target, deep as any)).not.toThrow();
        });

        it('handles empty objects correctly', () => {
            expect(deepMerge({}, {})).toEqual({});
            expect(deepMerge({ a: 1 }, {})).toEqual({ a: 1 });
            expect(deepMerge({}, { a: 1 })).toEqual({ a: 1 });
        });

        it('random nested structures do not throw', () => {
            fc.assert(
                fc.property(nestedSettings, nestedSettings, (target, source) => {
                    expect(() => deepMerge(target, source)).not.toThrow();
                }),
                { numRuns: 500 }
            );
        });

        it('result is always a new object (not mutating inputs)', () => {
            fc.assert(
                fc.property(shallowSettings, shallowSettings, (target, source) => {
                    const originalTarget = JSON.stringify(target);
                    const originalSource = JSON.stringify(source);

                    const result = deepMerge(target, source);

                    // Inputs should not be mutated
                    expect(JSON.stringify(target)).toBe(originalTarget);
                    expect(JSON.stringify(source)).toBe(originalSource);

                    // Result should be a new object
                    expect(result).not.toBe(target);
                    expect(result).not.toBe(source);
                }),
                { numRuns: 200 }
            );
        });
    });

    // ==========================================================================
    // Property: Idempotence and associativity
    // ==========================================================================

    describe('merge properties', () => {
        it('merging with empty source returns target values', () => {
            fc.assert(
                fc.property(shallowSettings, (target) => {
                    const result = deepMerge(target, {});
                    expect(result).toEqual(target);
                }),
                { numRuns: 200 }
            );
        });

        it('merging empty with source returns source values (except dangerous keys)', () => {
            fc.assert(
                fc.property(shallowSettings, (source) => {
                    const result = deepMerge({}, source);

                    // Dangerous keys are filtered out for security
                    const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype']);
                    const expectedSource = Object.fromEntries(
                        Object.entries(source).filter(([key]) => !dangerousKeys.has(key))
                    );

                    expect(result).toEqual(expectedSource);
                }),
                { numRuns: 200 }
            );
        });
    });
});

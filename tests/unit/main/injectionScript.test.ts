/**
 * Unit tests for InjectionScript module.
 * 
 * Tests the InjectionScriptBuilder class and utility functions.
 */
import { describe, it, expect } from 'vitest';
import {
    InjectionScriptBuilder,
    DEFAULT_INJECTION_CONFIG,
    escapeForInjection,
    InjectionLogLevel
} from '../../../src/main/utils/injectionScript';

describe('escapeForInjection', () => {
    it('escapes backslashes', () => {
        expect(escapeForInjection('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('escapes single quotes', () => {
        expect(escapeForInjection("it's a test")).toBe("it\\'s a test");
    });

    it('escapes double quotes', () => {
        expect(escapeForInjection('say "hello"')).toBe('say \\"hello\\"');
    });

    it('escapes newlines', () => {
        expect(escapeForInjection('line1\nline2')).toBe('line1\\nline2');
    });

    it('escapes carriage returns', () => {
        expect(escapeForInjection('line1\rline2')).toBe('line1\\rline2');
    });

    it('escapes tabs', () => {
        expect(escapeForInjection('col1\tcol2')).toBe('col1\\tcol2');
    });

    it('escapes null bytes', () => {
        expect(escapeForInjection('text\0more')).toBe('text\\0more');
    });

    it('handles multiple special characters', () => {
        const input = "It's a \"test\"\nwith\\path";
        const expected = "It\\'s a \\\"test\\\"\\nwith\\\\path";
        expect(escapeForInjection(input)).toBe(expected);
    });

    it('returns empty string for empty input', () => {
        expect(escapeForInjection('')).toBe('');
    });

    it('handles normal text unchanged', () => {
        expect(escapeForInjection('Hello World')).toBe('Hello World');
    });
});

describe('DEFAULT_INJECTION_CONFIG', () => {
    it('has default editor selectors', () => {
        expect(DEFAULT_INJECTION_CONFIG.editorSelectors).toBeDefined();
        expect(DEFAULT_INJECTION_CONFIG.editorSelectors.length).toBeGreaterThan(0);
    });

    it('has default submit button selectors', () => {
        expect(DEFAULT_INJECTION_CONFIG.submitButtonSelectors).toBeDefined();
        expect(DEFAULT_INJECTION_CONFIG.submitButtonSelectors.length).toBeGreaterThan(0);
    });

    it('has default blank class', () => {
        expect(DEFAULT_INJECTION_CONFIG.editorBlankClass).toBe('ql-blank');
    });

    it('has default submit delay', () => {
        expect(DEFAULT_INJECTION_CONFIG.submitDelayMs).toBe(200);
    });

    it('has default log level', () => {
        expect(DEFAULT_INJECTION_CONFIG.logLevel).toBe('info');
    });
});

describe('InjectionScriptBuilder', () => {
    describe('constructor', () => {
        it('creates a builder instance', () => {
            const builder = new InjectionScriptBuilder();
            expect(builder).toBeInstanceOf(InjectionScriptBuilder);
        });
    });

    describe('withText', () => {
        it('returns the builder for chaining', () => {
            const builder = new InjectionScriptBuilder();
            const result = builder.withText('test');
            expect(result).toBe(builder);
        });

        it('escapes text in the built script', () => {
            const script = new InjectionScriptBuilder()
                .withText("Hello 'World'")
                .build();
            expect(script).toContain("Hello \\'World\\'");
        });
    });

    describe('withConfig', () => {
        it('returns the builder for chaining', () => {
            const builder = new InjectionScriptBuilder();
            const result = builder.withConfig({ submitDelayMs: 100 });
            expect(result).toBe(builder);
        });

        it('merges partial config with defaults', () => {
            const script = new InjectionScriptBuilder()
                .withText('test')
                .withConfig({ submitDelayMs: 500 })
                .build();
            // Should still have default selectors
            expect(script).toContain('.ql-editor');
            // But with custom delay
            expect(script).toContain('500');
        });
    });

    describe('withLogLevel', () => {
        it('returns the builder for chaining', () => {
            const builder = new InjectionScriptBuilder();
            const result = builder.withLogLevel('debug');
            expect(result).toBe(builder);
        });

        it.each([
            ['debug', 0],
            ['info', 1],
            ['warn', 2],
            ['error', 3],
            ['none', 4]
        ] as [InjectionLogLevel, number][])(
            'sets log level %s with priority %d',
            (level, expectedPriority) => {
                const script = new InjectionScriptBuilder()
                    .withText('test')
                    .withLogLevel(level)
                    .build();
                expect(script).toContain(`LOG_LEVEL_PRIORITY = ${expectedPriority}`);
            }
        );
    });

    describe('withAutoSubmit', () => {
        it('returns the builder for chaining', () => {
            const builder = new InjectionScriptBuilder();
            const result = builder.withAutoSubmit(false);
            expect(result).toBe(builder);
        });

        it('includes auto-submit logic when true', () => {
            const script = new InjectionScriptBuilder()
                .withText('test')
                .withAutoSubmit(true)
                .build();
            expect(script).toContain('shouldAutoSubmit = true');
        });

        it('skips auto-submit when false', () => {
            const script = new InjectionScriptBuilder()
                .withText('test')
                .withAutoSubmit(false)
                .build();
            expect(script).toContain('shouldAutoSubmit = false');
        });
    });

    describe('withEditorSelectors', () => {
        it('returns the builder for chaining', () => {
            const builder = new InjectionScriptBuilder();
            const result = builder.withEditorSelectors(['.custom-editor']);
            expect(result).toBe(builder);
        });

        it('uses custom selectors in built script', () => {
            const script = new InjectionScriptBuilder()
                .withText('test')
                .withEditorSelectors(['.my-editor', '#input-field'])
                .build();
            expect(script).toContain('.my-editor');
            expect(script).toContain('#input-field');
        });
    });

    describe('withSubmitButtonSelectors', () => {
        it('returns the builder for chaining', () => {
            const builder = new InjectionScriptBuilder();
            const result = builder.withSubmitButtonSelectors(['.custom-button']);
            expect(result).toBe(builder);
        });

        it('uses custom selectors in built script', () => {
            const script = new InjectionScriptBuilder()
                .withText('test')
                .withSubmitButtonSelectors(['.my-submit', '#send-btn'])
                .build();
            expect(script).toContain('.my-submit');
            expect(script).toContain('#send-btn');
        });
    });

    describe('withSubmitDelay', () => {
        it('returns the builder for chaining', () => {
            const builder = new InjectionScriptBuilder();
            const result = builder.withSubmitDelay(1000);
            expect(result).toBe(builder);
        });

        it('uses custom delay in built script', () => {
            const script = new InjectionScriptBuilder()
                .withText('test')
                .withSubmitDelay(750)
                .build();
            expect(script).toContain('750');
        });
    });

    describe('build', () => {
        it('returns a valid JavaScript string', () => {
            const script = new InjectionScriptBuilder()
                .withText('Hello World')
                .build();

            // Should be valid JavaScript (no syntax errors when parsing)
            expect(() => new Function(script)).not.toThrow();
        });

        it('includes IIFE wrapper', () => {
            const script = new InjectionScriptBuilder()
                .withText('test')
                .build();
            expect(script).toContain('(function()');
            expect(script).toContain('})()');
        });

        it('includes use strict directive', () => {
            const script = new InjectionScriptBuilder()
                .withText('test')
                .build();
            expect(script).toContain("'use strict'");
        });

        it('includes logging utilities', () => {
            const script = new InjectionScriptBuilder()
                .withText('test')
                .build();
            expect(script).toContain('LOG_PREFIX');
            expect(script).toContain('[QuickChat]');
            expect(script).toContain('function log(');
        });

        it('includes defensive utilities', () => {
            const script = new InjectionScriptBuilder()
                .withText('test')
                .build();
            expect(script).toContain('function safeQuerySelector');
            expect(script).toContain('function safeDispatchEvent');
            expect(script).toContain('function safeFocus');
            expect(script).toContain('function safeClick');
        });

        it('includes Selection API text insertion', () => {
            const script = new InjectionScriptBuilder()
                .withText('test')
                .build();
            expect(script).toContain('insertTextWithSelectionAPI');
            expect(script).toContain('createTextNode');
            expect(script).toContain('getSelection');
        });

        it('includes result object structure', () => {
            const script = new InjectionScriptBuilder()
                .withText('test')
                .build();
            expect(script).toContain('success: false');
            expect(script).toContain('error: null');
            expect(script).toContain('editorFound: false');
            expect(script).toContain('textInjected: false');
            expect(script).toContain('submitScheduled: false');
        });

        it('handles complex chained configuration', () => {
            const script = new InjectionScriptBuilder()
                .withText('Complex message with "quotes"')
                .withLogLevel('debug')
                .withAutoSubmit(true)
                .withSubmitDelay(300)
                .withEditorSelectors(['.custom-editor'])
                .withSubmitButtonSelectors(['.custom-btn'])
                .build();

            expect(script).toContain('LOG_LEVEL_PRIORITY = 0'); // debug
            expect(script).toContain('shouldAutoSubmit = true');
            expect(script).toContain('300');
            expect(script).toContain('.custom-editor');
            expect(script).toContain('.custom-btn');
            expect(script).toContain('Complex message with \\"quotes\\"');
        });
    });
});







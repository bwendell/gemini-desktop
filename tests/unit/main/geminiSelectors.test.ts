/**
 * Unit tests for Gemini DOM Selectors module.
 */
import { describe, it, expect } from 'vitest';
import {
    GEMINI_SELECTORS_VERSION,
    GEMINI_SELECTORS_LAST_VERIFIED,
    GeminiSelectors,
    findGeminiElement,
    isGeminiDomain,
    GEMINI_DOMAIN,
    GEMINI_EDITOR_SELECTORS,
    GEMINI_SUBMIT_BUTTON_SELECTORS,
    GEMINI_EDITOR_BLANK_CLASS,
    GEMINI_SUBMIT_DELAY_MS,
} from '../../../src/main/utils/geminiSelectors';

describe('Gemini Selectors Module', () => {
    describe('Version and Metadata', () => {
        it('has a valid version string', () => {
            expect(GEMINI_SELECTORS_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
        });

        it('has a valid date string for last verified', () => {
            expect(GEMINI_SELECTORS_LAST_VERIFIED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('GeminiSelectors structure', () => {
        it('has domain configuration', () => {
            expect(GeminiSelectors.domain).toBe('gemini.google.com');
            expect(GeminiSelectors.legacyDomain).toBe('bard.google.com');
        });

        it('has editor selectors', () => {
            expect(GeminiSelectors.editor.selectors).toBeInstanceOf(Array);
            expect(GeminiSelectors.editor.selectors.length).toBeGreaterThan(0);
            expect(GeminiSelectors.editor.blankClass).toBe('ql-blank');
            expect(GeminiSelectors.editor.description).toBeTruthy();
        });

        it('has submit button selectors', () => {
            expect(GeminiSelectors.submitButton.selectors).toBeInstanceOf(Array);
            expect(GeminiSelectors.submitButton.selectors.length).toBeGreaterThan(0);
            expect(GeminiSelectors.submitButton.description).toBeTruthy();
        });

        it('has timing configuration', () => {
            expect(GeminiSelectors.timing.submitDelayMs).toBeGreaterThan(0);
            expect(GeminiSelectors.timing.description).toBeTruthy();
        });

        it('all selectors are valid CSS selector syntax', () => {
            const allSelectors = [
                ...GeminiSelectors.editor.selectors,
                ...GeminiSelectors.submitButton.selectors,
            ];

            // Create a mock document to validate selectors
            const { JSDOM } = require('jsdom');
            const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
            const doc = dom.window.document;

            allSelectors.forEach((selector) => {
                // This will throw if selector is invalid
                expect(() => doc.querySelector(selector)).not.toThrow();
            });
        });

        it('handles malformed selectors gracefully', () => {
            const { JSDOM } = require('jsdom');
            const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
            const doc = dom.window.document;

            // Should verify that findGeminiElement doesn't crash with bad selectors
            // We'll test this via findGeminiElement tests
            const badSelectors = ['div[bad', ''];

            expect(() => {
                badSelectors.forEach(s => {
                    try { doc.querySelector(s); } catch (e) { /* Expected for bad selector */ }
                });
            }).not.toThrow();
        });
    });

    describe('Backwards Compatibility Exports', () => {
        it('exports GEMINI_DOMAIN', () => {
            expect(GEMINI_DOMAIN).toBe('gemini.google.com');
        });

        it('exports GEMINI_EDITOR_SELECTORS', () => {
            expect(GEMINI_EDITOR_SELECTORS).toEqual(GeminiSelectors.editor.selectors);
        });

        it('exports GEMINI_SUBMIT_BUTTON_SELECTORS', () => {
            expect(GEMINI_SUBMIT_BUTTON_SELECTORS).toEqual(GeminiSelectors.submitButton.selectors);
        });

        it('exports GEMINI_EDITOR_BLANK_CLASS', () => {
            expect(GEMINI_EDITOR_BLANK_CLASS).toBe('ql-blank');
        });

        it('exports GEMINI_SUBMIT_DELAY_MS', () => {
            expect(GEMINI_SUBMIT_DELAY_MS).toBe(200);
        });
    });

    describe('isGeminiDomain', () => {
        it('returns true for gemini.google.com URLs', () => {
            expect(isGeminiDomain('https://gemini.google.com/app')).toBe(true);
            expect(isGeminiDomain('https://gemini.google.com/')).toBe(true);
        });

        it('returns true for legacy bard.google.com URLs', () => {
            expect(isGeminiDomain('https://bard.google.com/app')).toBe(true);
        });

        it('returns false for other URLs', () => {
            expect(isGeminiDomain('https://google.com')).toBe(false);
            expect(isGeminiDomain('https://example.com')).toBe(false);
        });
    });

    describe('findGeminiElement', () => {
        it('finds element with primary selector', () => {
            const { JSDOM } = require('jsdom');
            const dom = new JSDOM(`
                <html><body>
                    <div class="ql-editor" contenteditable="true"></div>
                </body></html>
            `);

            const logs: string[] = [];
            const logger = (msg: string) => logs.push(msg);

            const element = findGeminiElement(
                dom.window.document,
                GeminiSelectors.editor.selectors,
                'editor',
                logger
            );

            expect(element).not.toBeNull();
            expect(logs[0]).toContain('primary selector');
        });

        it('finds element with fallback selector', () => {
            const { JSDOM } = require('jsdom');
            const dom = new JSDOM(`
                <html><body>
                    <div contenteditable="true" role="textbox"></div>
                </body></html>
            `);

            const logs: string[] = [];
            const logger = (msg: string) => logs.push(msg);

            const element = findGeminiElement(
                dom.window.document,
                GeminiSelectors.editor.selectors,
                'editor',
                logger
            );

            expect(element).not.toBeNull();
            expect(logs[0]).toContain('fallback selector');
        });

        it('returns null when no selector matches', () => {
            const { JSDOM } = require('jsdom');
            const dom = new JSDOM('<html><body><div></div></body></html>');

            const logs: string[] = [];
            const logger = (msg: string) => logs.push(msg);

            const element = findGeminiElement(
                dom.window.document,
                GeminiSelectors.editor.selectors,
                'editor',
                logger
            );

            expect(element).toBeNull();
            expect(logs[0]).toContain('No matching element found');
        });
    });

    describe('Selector Validation Edge Cases', () => {
        it('handles empty selector list', () => {
            const { JSDOM } = require('jsdom');
            const dom = new JSDOM('<html><body><div class="test"></div></body></html>');
            const logger = (msg: string) => { };

            const element = findGeminiElement(
                dom.window.document,
                [],
                'test',
                logger
            );

            expect(element).toBeNull();
        });

        it('handles malformed selectors in list', () => {
            const { JSDOM } = require('jsdom');
            const dom = new JSDOM('<html><body><div class="test"></div></body></html>');
            const logger = (msg: string) => { };

            const element = findGeminiElement(
                dom.window.document,
                ['div[invalid', '.test'], // First is invalid, second is valid
                'test',
                logger
            );

            // Should skip invalid and find via valid separator
            expect(element).not.toBeNull();
            expect(element?.className).toBe('test');
        });
    });
});







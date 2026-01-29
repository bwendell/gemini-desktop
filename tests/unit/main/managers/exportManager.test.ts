import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExportManager from '../../../../src/main/managers/exportManager';

// Mock electron-log
vi.mock('electron-log', () => ({
    default: {
        transports: {
            file: { level: 'info' },
        },
        scope: vi.fn().mockReturnThis(),
        log: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock electron
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn().mockReturnValue('/mock/downloads'),
    },
    dialog: {
        showSaveDialog: vi.fn().mockResolvedValue({ canceled: true }),
    },
    BrowserWindow: vi.fn(),
}));

// Mock turndown - use class constructor for proper instantiation
vi.mock('turndown', () => ({
    default: class MockTurndownService {
        use() {}
        turndown() {
            return 'mocked markdown';
        }
    },
}));

vi.mock('turndown-plugin-gfm', () => ({
    gfm: {},
}));

vi.mock('marked', () => ({
    marked: {
        parse: vi.fn().mockReturnValue('<p>mocked html</p>'),
    },
}));

describe('ExportManager URL Validation Security', () => {
    let exportManager: ExportManager;

    beforeEach(() => {
        exportManager = new ExportManager();
    });

    /**
     * These tests verify the fix for CodeQL alert:
     * "Incomplete URL substring sanitization - 'gemini.google.com' can be anywhere in the URL"
     *
     * The vulnerability was that using `.includes('gemini.google.com')` allowed bypass attacks like:
     * - attacker.com/gemini.google.com (path injection)
     * - gemini.google.com.attacker.com (subdomain prefix)
     * - evilgemini.google.com (no dot separation)
     */
    describe('isAllowedGeminiUrl (security)', () => {
        // Access private method for testing
        const isAllowedUrl = (url: string): boolean => {
            return (exportManager as any).isAllowedGeminiUrl(url);
        };

        describe('should ALLOW legitimate Gemini URLs', () => {
            it('allows exact gemini.google.com domain', () => {
                expect(isAllowedUrl('https://gemini.google.com/')).toBe(true);
                expect(isAllowedUrl('https://gemini.google.com/app')).toBe(true);
                expect(isAllowedUrl('https://gemini.google.com/chat/abc123')).toBe(true);
            });

            it('allows gemini.google.com subdomains', () => {
                expect(isAllowedUrl('https://api.gemini.google.com/')).toBe(true);
                expect(isAllowedUrl('https://staging.gemini.google.com/')).toBe(true);
                expect(isAllowedUrl('https://deep.sub.gemini.google.com/')).toBe(true);
            });

            it('allows exact aistudio.google.com domain', () => {
                expect(isAllowedUrl('https://aistudio.google.com/')).toBe(true);
                expect(isAllowedUrl('https://aistudio.google.com/prompts')).toBe(true);
            });

            it('allows aistudio.google.com subdomains', () => {
                expect(isAllowedUrl('https://api.aistudio.google.com/')).toBe(true);
            });

            it('handles case insensitivity', () => {
                expect(isAllowedUrl('https://GEMINI.GOOGLE.COM/')).toBe(true);
                expect(isAllowedUrl('https://Gemini.Google.Com/app')).toBe(true);
            });
        });

        describe('should REJECT bypass attempts (security critical)', () => {
            it('rejects domain in URL path (path injection)', () => {
                // attacker.com/gemini.google.com should NOT be allowed
                expect(isAllowedUrl('https://attacker.com/gemini.google.com')).toBe(false);
                expect(isAllowedUrl('https://evil.com/fake/gemini.google.com/app')).toBe(false);
            });

            it('rejects domain as subdomain prefix (subdomain injection)', () => {
                // gemini.google.com.attacker.com should NOT be allowed
                expect(isAllowedUrl('https://gemini.google.com.attacker.com/')).toBe(false);
                expect(isAllowedUrl('https://aistudio.google.com.evil.org/')).toBe(false);
            });

            it('rejects domains without dot separation (suffix attack)', () => {
                // evilgemini.google.com should NOT be allowed
                expect(isAllowedUrl('https://evilgemini.google.com/')).toBe(false);
                expect(isAllowedUrl('https://fakeaistudio.google.com/')).toBe(false);
                expect(isAllowedUrl('https://notgemini.google.com/')).toBe(false);
            });

            it('rejects similar-looking but different domains', () => {
                expect(isAllowedUrl('https://gemini-google.com/')).toBe(false);
                expect(isAllowedUrl('https://gemini.google.org/')).toBe(false);
                expect(isAllowedUrl('https://google.com/')).toBe(false);
                expect(isAllowedUrl('https://gemini.com/')).toBe(false);
            });

            it('rejects domain in query string', () => {
                expect(isAllowedUrl('https://attacker.com/?redirect=gemini.google.com')).toBe(false);
            });

            it('rejects domain in fragment', () => {
                expect(isAllowedUrl('https://attacker.com/#gemini.google.com')).toBe(false);
            });

            it('rejects domain in username/password', () => {
                expect(isAllowedUrl('https://gemini.google.com@attacker.com/')).toBe(false);
            });
        });

        describe('should handle edge cases safely', () => {
            it('rejects invalid URLs', () => {
                expect(isAllowedUrl('not-a-url')).toBe(false);
                expect(isAllowedUrl('')).toBe(false);
                expect(isAllowedUrl('javascript:alert(1)')).toBe(false);
            });

            it('rejects file:// protocol', () => {
                expect(isAllowedUrl('file:///C:/gemini.google.com')).toBe(false);
            });

            it('handles URLs with ports', () => {
                expect(isAllowedUrl('https://gemini.google.com:443/')).toBe(true);
                expect(isAllowedUrl('https://gemini.google.com:8080/')).toBe(true);
            });
        });
    });
});

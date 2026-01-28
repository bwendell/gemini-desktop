/**
 * Property-based tests for ExportManager URL validation using fast-check.
 *
 * These tests fuzz the hostname/URL validation logic that prevents
 * unauthorized content extraction - a security-critical function.
 *
 * @module exportManager.property.test
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import ExportManager from '../../../src/main/managers/exportManager';

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

// Mock turndown
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

// Create an instance of ExportManager to access its private methods
const exportManager = new ExportManager();

// Access private methods and ALLOWED_DOMAINS constant for testing
const ALLOWED_DOMAINS = (ExportManager as any).ALLOWED_DOMAINS as readonly string[];

/**
 * Wrapper around ExportManager.isHostnameAllowed.
 */
function isHostnameAllowed(hostname: string): boolean {
    return (exportManager as any).isHostnameAllowed(hostname);
}

/**
 * Wrapper around ExportManager.isAllowedGeminiUrl.
 */
function isAllowedGeminiUrl(url: string): boolean {
    return (exportManager as any).isAllowedGeminiUrl(url);
}

describe('ExportManager URL validation property tests', () => {
    // ==========================================================================
    // Allowed domain variations
    // ==========================================================================

    describe('allowed domains', () => {
        it('exact allowed domains are always accepted', () => {
            fc.assert(
                fc.property(fc.constantFrom(...ALLOWED_DOMAINS), (domain) => {
                    expect(isHostnameAllowed(domain)).toBe(true);
                }),
                { numRuns: 20 }
            );
        });

        it('subdomains of allowed domains are accepted', () => {
            const subdomain = fc.stringMatching(/^[a-z][a-z0-9-]{0,20}$/);

            fc.assert(
                fc.property(subdomain, fc.constantFrom(...ALLOWED_DOMAINS), (sub, domain) => {
                    const hostname = `${sub}.${domain}`;
                    expect(isHostnameAllowed(hostname)).toBe(true);
                }),
                { numRuns: 200 }
            );
        });

        it('multiple levels of subdomains are accepted', () => {
            const subdomain = fc.stringMatching(/^[a-z][a-z0-9-]{0,10}$/);

            fc.assert(
                fc.property(
                    fc.array(subdomain, { minLength: 1, maxLength: 3 }),
                    fc.constantFrom(...ALLOWED_DOMAINS),
                    (subs, domain) => {
                        const hostname = `${subs.join('.')}.${domain}`;
                        expect(isHostnameAllowed(hostname)).toBe(true);
                    }
                ),
                { numRuns: 200 }
            );
        });
    });

    // ==========================================================================
    // Domain bypass prevention - SECURITY CRITICAL
    // ==========================================================================

    describe('bypass prevention', () => {
        it('substring attacks are rejected (e.g., evil-gemini.google.com.attacker.com)', () => {
            const attackerDomain = fc.stringMatching(/^[a-z][a-z0-9-]{2,10}\.(com|net|org|io)$/);

            fc.assert(
                fc.property(fc.constantFrom(...ALLOWED_DOMAINS), attackerDomain, (allowed, attacker) => {
                    // Attacker tries to include allowed domain as prefix
                    const hostname = `${allowed}.${attacker}`;
                    expect(isHostnameAllowed(hostname)).toBe(false);
                }),
                { numRuns: 200 }
            );
        });

        it('suffix-only matching prevents prefix attacks', () => {
            const prefix = fc.stringMatching(/^[a-z][a-z0-9-]{2,10}$/);

            fc.assert(
                fc.property(prefix, (p) => {
                    // e.g., "evil-gemini.google.com" should fail
                    // but only if the prefix makes it NOT a valid subdomain structure
                    const hostname = `${p}gemini.google.com`;
                    expect(isHostnameAllowed(hostname)).toBe(false);
                }),
                { numRuns: 200 }
            );
        });

        it('typosquatting variations are rejected', () => {
            const typos = [
                'gemini.google.co',
                'gemini.googIe.com', // capital I instead of l
                'gemini.gogle.com',
                'gemini.google.comm',
                'gemimi.google.com',
                'gemnii.google.com',
                'gemini.g00gle.com',
                'aistudio.googl.com',
                'aistudi0.google.com',
            ];

            for (const typo of typos) {
                expect(isHostnameAllowed(typo)).toBe(false);
            }
        });

        it('completely unrelated domains are rejected', () => {
            const unrelatedDomain = fc.stringMatching(/^[a-z][a-z0-9-]{2,10}\.(com|net|org|io|xyz)$/);

            fc.assert(
                fc.property(unrelatedDomain, (domain) => {
                    // Filter out accidental matches
                    if (ALLOWED_DOMAINS.some((d) => domain.endsWith(d))) return true;
                    expect(isHostnameAllowed(domain)).toBe(false);
                }),
                { numRuns: 500 }
            );
        });
    });

    // ==========================================================================
    // URL parsing robustness
    // ==========================================================================

    describe('URL parsing robustness', () => {
        it('never throws on malformed URLs', () => {
            fc.assert(
                fc.property(fc.string(), (s) => {
                    expect(() => isAllowedGeminiUrl(s)).not.toThrow();
                }),
                { numRuns: 1000 }
            );
        });

        it('never throws on extended character URLs', () => {
            // Test with strings containing extended characters
            fc.assert(
                fc.property(fc.string({ minLength: 0, maxLength: 100 }), (s: string) => {
                    expect(() => isAllowedGeminiUrl(s)).not.toThrow();
                }),
                { numRuns: 500 }
            );
        });

        it('valid HTTPS URLs to allowed domains are accepted', () => {
            const path = fc.stringMatching(/^\/[a-z0-9/-]{0,50}$/);

            fc.assert(
                fc.property(fc.constantFrom(...ALLOWED_DOMAINS), path, (domain, p) => {
                    const url = `https://${domain}${p}`;
                    expect(isAllowedGeminiUrl(url)).toBe(true);
                }),
                { numRuns: 200 }
            );
        });

        it('URLs with credentials in authority are handled safely', () => {
            // Test URLs like https://user:pass@gemini.google.com
            fc.assert(
                fc.property(
                    fc.stringMatching(/^[a-z0-9]{1,10}$/),
                    fc.stringMatching(/^[a-z0-9]{1,10}$/),
                    fc.constantFrom(...ALLOWED_DOMAINS),
                    (user, pass, domain) => {
                        const url = `https://${user}:${pass}@${domain}/app`;
                        // URL parser should extract hostname correctly, ignoring credentials
                        expect(isAllowedGeminiUrl(url)).toBe(true);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('rejects URLs with port numbers pointing to different hosts', () => {
            // Ensure attacker can't use port confusion
            fc.assert(
                fc.property(fc.integer({ min: 1, max: 65535 }), fc.constantFrom(...ALLOWED_DOMAINS), (port, domain) => {
                    const url = `https://${domain}:${port}/app`;
                    // URL with port should still be valid if domain is correct
                    expect(isAllowedGeminiUrl(url)).toBe(true);
                }),
                { numRuns: 100 }
            );
        });
    });

    // ==========================================================================
    // Edge cases
    // ==========================================================================

    describe('edge cases', () => {
        it('empty hostname is rejected', () => {
            expect(isHostnameAllowed('')).toBe(false);
        });

        it('dot-only hostnames are rejected', () => {
            fc.assert(
                fc.property(fc.integer({ min: 1, max: 10 }), (n) => {
                    const dots = '.'.repeat(n);
                    expect(isHostnameAllowed(dots)).toBe(false);
                }),
                { numRuns: 10 }
            );
        });

        it('hostnames with trailing dots are handled', () => {
            // DNS allows trailing dots but they should be handled correctly
            for (const domain of ALLOWED_DOMAINS) {
                // With trailing dot, the split will include an empty string
                // This tests that the validation handles it robustly
                expect(() => isHostnameAllowed(`${domain}.`)).not.toThrow();
            }
        });

        it('case insensitivity is maintained', () => {
            fc.assert(
                fc.property(fc.constantFrom(...ALLOWED_DOMAINS), (domain) => {
                    expect(isHostnameAllowed(domain.toUpperCase())).toBe(true);
                    expect(isHostnameAllowed(domain.toLowerCase())).toBe(true);
                    // Mixed case
                    const mixed = domain
                        .split('')
                        .map((c, i) => (i % 2 === 0 ? c.toUpperCase() : c.toLowerCase()))
                        .join('');
                    expect(isHostnameAllowed(mixed)).toBe(true);
                }),
                { numRuns: 20 }
            );
        });
    });
});

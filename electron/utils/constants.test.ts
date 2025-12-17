/**
 * Unit tests for constants utility.
 */
import { describe, it, expect } from 'vitest';
import {
    INTERNAL_DOMAINS,
    OAUTH_DOMAINS,
    GOOGLE_ACCOUNTS_URL,
    AUTH_WINDOW_CONFIG,
    isInternalDomain,
    isOAuthDomain
} from '../utils/constants';

describe('Constants', () => {
    describe('INTERNAL_DOMAINS', () => {
        it('includes gemini.google.com', () => {
            expect(INTERNAL_DOMAINS).toContain('gemini.google.com');
        });

        it('is an array', () => {
            expect(Array.isArray(INTERNAL_DOMAINS)).toBe(true);
        });
    });

    describe('OAUTH_DOMAINS', () => {
        it('includes accounts.google.com', () => {
            expect(OAUTH_DOMAINS).toContain('accounts.google.com');
        });

        it('includes accounts.youtube.com', () => {
            expect(OAUTH_DOMAINS).toContain('accounts.youtube.com');
        });

        it('is an array', () => {
            expect(Array.isArray(OAUTH_DOMAINS)).toBe(true);
        });
    });

    describe('GOOGLE_ACCOUNTS_URL', () => {
        it('is the correct URL', () => {
            expect(GOOGLE_ACCOUNTS_URL).toBe('https://accounts.google.com');
        });
    });

    describe('AUTH_WINDOW_CONFIG', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const config = AUTH_WINDOW_CONFIG as any;

        it('has correct dimensions', () => {
            expect(config.width).toBe(500);
            expect(config.height).toBe(700);
        });

        it('has correct title', () => {
            expect(config.title).toBe('Sign in to Google');
        });

        it('has autoHideMenuBar enabled', () => {
            expect(config.autoHideMenuBar).toBe(true);
        });

        it('has secure webPreferences', () => {
            expect(config.webPreferences.contextIsolation).toBe(true);
            expect(config.webPreferences.nodeIntegration).toBe(false);
        });
    });
});

describe('isInternalDomain', () => {
    it('returns true for gemini.google.com', () => {
        expect(isInternalDomain('gemini.google.com')).toBe(true);
    });

    it('returns true for subdomain of gemini.google.com', () => {
        expect(isInternalDomain('share.gemini.google.com')).toBe(true);
    });

    it('returns false for accounts.google.com', () => {
        expect(isInternalDomain('accounts.google.com')).toBe(false);
    });

    it('returns false for external domains', () => {
        expect(isInternalDomain('google.com')).toBe(false);
        expect(isInternalDomain('example.com')).toBe(false);
    });

    it('returns false for partial matches', () => {
        expect(isInternalDomain('notgemini.google.com')).toBe(false);
    });
});

describe('isOAuthDomain', () => {
    it('returns true for accounts.google.com', () => {
        expect(isOAuthDomain('accounts.google.com')).toBe(true);
    });

    it('returns true for accounts.youtube.com', () => {
        expect(isOAuthDomain('accounts.youtube.com')).toBe(true);
    });

    it('returns true for subdomain of OAuth domain', () => {
        expect(isOAuthDomain('sub.accounts.google.com')).toBe(true);
    });

    it('returns false for gemini.google.com', () => {
        expect(isOAuthDomain('gemini.google.com')).toBe(false);
    });

    it('returns false for external domains', () => {
        expect(isOAuthDomain('google.com')).toBe(false);
        expect(isOAuthDomain('example.com')).toBe(false);
    });

    it('returns false for partial matches', () => {
        expect(isOAuthDomain('fakeaccounts.google.com')).toBe(false);
    });
});

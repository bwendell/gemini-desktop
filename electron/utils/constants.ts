/**
 * Application constants for the Electron main process.
 * Centralized configuration values used across electron modules.
 */

import type { BrowserWindowConstructorOptions } from 'electron';

// =========================================================================
// Domain Configuration
// =========================================================================

/**
 * Domains that should open inside Electron windows.
 * These URLs open in new Electron windows instead of the system browser.
 */
export const INTERNAL_DOMAINS = [
    'gemini.google.com'
] as const;

/**
 * OAuth domains that require special handling.
 * These are intercepted and opened in a BrowserWindow with shared session.
 */
export const OAUTH_DOMAINS = [
    'accounts.google.com',
    'accounts.youtube.com'
] as const;

// =========================================================================
// Window Configuration
// =========================================================================

/**
 * Default URL for Google sign-in.
 */
export const GOOGLE_ACCOUNTS_URL = 'https://accounts.google.com' as const;

/**
 * Configuration for the authentication window.
 */
export const AUTH_WINDOW_CONFIG: BrowserWindowConstructorOptions = {
    width: 500,
    height: 700,
    title: 'Sign in to Google',
    autoHideMenuBar: true,
    webPreferences: {
        // Uses default session (shared with main window)
        contextIsolation: true,
        nodeIntegration: false,
    },
};

// =========================================================================
// Domain Helpers
// =========================================================================

/**
 * Check if a hostname should be handled internally (in Electron) vs externally (system browser).
 * 
 * @param hostname - The hostname to check
 * @returns True if the URL should open in Electron
 */
export function isInternalDomain(hostname: string): boolean {
    return INTERNAL_DOMAINS.some(domain =>
        hostname === domain || hostname.endsWith('.' + domain)
    );
}

/**
 * Check if a hostname is a Google OAuth domain.
 * OAuth domains are opened in a dedicated BrowserWindow with shared session.
 * 
 * @param hostname - The hostname to check
 * @returns True if the URL is an OAuth domain
 */
export function isOAuthDomain(hostname: string): boolean {
    return OAUTH_DOMAINS.some(domain =>
        hostname === domain || hostname.endsWith('.' + domain)
    );
}

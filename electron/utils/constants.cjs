/**
 * Application constants for the Electron main process.
 * Centralized configuration values used across electron modules.
 */

// =========================================================================
// Domain Configuration
// =========================================================================

/**
 * Domains that should open inside Electron windows.
 * These URLs open in new Electron windows instead of the system browser.
 * 
 * @type {string[]}
 */
const INTERNAL_DOMAINS = [
    'gemini.google.com'
];

/**
 * OAuth domains that require special handling.
 * These are intercepted and opened in a BrowserWindow with shared session.
 * 
 * @type {string[]}
 */
const OAUTH_DOMAINS = [
    'accounts.google.com',
    'accounts.youtube.com'
];

// =========================================================================
// Window Configuration
// =========================================================================

/**
 * Default URL for Google sign-in.
 * @type {string}
 */
const GOOGLE_ACCOUNTS_URL = 'https://accounts.google.com';

/**
 * Configuration for the authentication window.
 * @type {Object}
 */
const AUTH_WINDOW_CONFIG = {
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
 * @param {string} hostname - The hostname to check
 * @returns {boolean} True if the URL should open in Electron
 */
function isInternalDomain(hostname) {
    return INTERNAL_DOMAINS.some(domain =>
        hostname === domain || hostname.endsWith('.' + domain)
    );
}

/**
 * Check if a hostname is a Google OAuth domain.
 * OAuth domains are opened in a dedicated BrowserWindow with shared session.
 * 
 * @param {string} hostname - The hostname to check
 * @returns {boolean} True if the URL is an OAuth domain
 */
function isOAuthDomain(hostname) {
    return OAUTH_DOMAINS.some(domain =>
        hostname === domain || hostname.endsWith('.' + domain)
    );
}

module.exports = {
    // Domains
    INTERNAL_DOMAINS,
    OAUTH_DOMAINS,
    GOOGLE_ACCOUNTS_URL,
    // Window config
    AUTH_WINDOW_CONFIG,
    // Helpers
    isInternalDomain,
    isOAuthDomain
};

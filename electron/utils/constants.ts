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

// =============================================================================
// Window Configuration Constants
// =============================================================================

/**
 * Base webPreferences for all windows.
 * Enforces security best practices across the application.
 */
export const BASE_WEB_PREFERENCES: BrowserWindowConstructorOptions['webPreferences'] = {
    contextIsolation: true,
    nodeIntegration: false,
} as const;

/**
 * Get titleBarStyle based on platform.
 * macOS uses 'hidden' for custom titlebar, others use default frame.
 * 
 * @returns 'hidden' on macOS, undefined on other platforms
 */
export function getTitleBarStyle(): 'hidden' | undefined {
    return process.platform === 'darwin' ? 'hidden' : undefined;
}

/**
 * Base configuration shared by all application windows.
 */
export const BASE_WINDOW_CONFIG: Partial<BrowserWindowConstructorOptions> = {
    backgroundColor: '#1a1a1a',
    show: false, // Prevent flash, show on ready-to-show event
    webPreferences: BASE_WEB_PREFERENCES,
} as const;

/**
 * Configuration for the main application window.
 */
export const MAIN_WINDOW_CONFIG: BrowserWindowConstructorOptions = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    ...BASE_WINDOW_CONFIG,
};

/**
 * Configuration for the options/settings window.
 */
export const OPTIONS_WINDOW_CONFIG: BrowserWindowConstructorOptions = {
    width: 600,
    height: 400,
    resizable: true,
    minimizable: true,
    maximizable: false,
    frame: false,
    ...BASE_WINDOW_CONFIG,
    show: true, // Options window shows immediately
};

// =============================================================================
// Development Server Configuration
// =============================================================================

/**
 * Development server base URL.
 */
export const DEV_SERVER_URL = 'http://localhost:1420';

/**
 * Development server port.
 */
export const DEV_SERVER_PORT = 1420;

/**
 * Get URL for a dev server page.
 * 
 * @param page - Optional page path (e.g., 'options.html')
 * @returns Full dev server URL
 * @example
 * getDevUrl() // 'http://localhost:1420'
 * getDevUrl('options.html') // 'http://localhost:1420/options.html'
 */
export function getDevUrl(page: string = ''): string {
    return page ? `${DEV_SERVER_URL}/${page}` : DEV_SERVER_URL;
}

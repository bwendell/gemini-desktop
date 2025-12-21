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
 * Full URL for Google sign-in page.
 */
export const GOOGLE_SIGNIN_URL = `${GOOGLE_ACCOUNTS_URL}/signin` as const;

// =========================================================================
// External URLs
// =========================================================================

/**
 * GitHub repository base URL.
 */
export const GITHUB_REPO_URL = 'https://github.com/bwendell/gemini-desktop' as const;

/**
 * GitHub issues URL for bug reports.
 */
export const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues` as const;

/**
 * GitHub license file URL.
 */
export const GITHUB_LICENSE_URL = `${GITHUB_REPO_URL}/blob/main/LICENSE` as const;

/**
 * GitHub disclaimer file URL.
 */
export const GITHUB_DISCLAIMER_URL = `${GITHUB_REPO_URL}/blob/main/DISCLAIMER.md` as const;

/**
 * Google Terms of Service URL.
 */
export const GOOGLE_TOS_URL = 'https://policies.google.com/terms' as const;

/**
 * Google Generative AI Terms URL.
 */
export const GOOGLE_GENAI_TERMS_URL = 'https://policies.google.com/terms/generative-ai' as const;

/**
 * Main Gemini application URL.
 */
export const GEMINI_APP_URL = 'https://gemini.google.com/app' as const;

// =========================================================================
// Gemini DOM Selectors
// =========================================================================
// NOTE: These are re-exported from geminiSelectors.ts for backwards compatibility.
// For new code, import directly from './geminiSelectors' for better organization.
// See geminiSelectors.ts for version tracking and selector documentation.

export {
    GEMINI_DOMAIN,
    GEMINI_EDITOR_SELECTORS,
    GEMINI_SUBMIT_BUTTON_SELECTORS,
    GEMINI_EDITOR_BLANK_CLASS,
    GEMINI_SUBMIT_DELAY_MS,
    GeminiSelectors,
    findGeminiElement,
    isGeminiDomain,
} from './geminiSelectors';

// =========================================================================
// IPC Channel Names
// =========================================================================

/**
 * IPC channel names used for main process <-> renderer communication.
 * Centralized to ensure consistency between ipcMain handlers and ipcRenderer calls.
 */
export const IPC_CHANNELS = {
    // Window controls
    WINDOW_MINIMIZE: 'window-minimize',
    WINDOW_MAXIMIZE: 'window-maximize',
    WINDOW_CLOSE: 'window-close',
    WINDOW_IS_MAXIMIZED: 'window-is-maximized',

    // Theme
    THEME_GET: 'theme:get',
    THEME_SET: 'theme:set',
    THEME_CHANGED: 'theme:changed',

    // App
    OPEN_OPTIONS: 'open-options-window',
    OPEN_GOOGLE_SIGNIN: 'open-google-signin',

    // Quick Chat
    QUICK_CHAT_SUBMIT: 'quick-chat:submit',
    QUICK_CHAT_HIDE: 'quick-chat:hide',
    QUICK_CHAT_CANCEL: 'quick-chat:cancel',
    QUICK_CHAT_EXECUTE: 'quick-chat:execute',
} as const;

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
    sandbox: true,
    webSecurity: true, // Explicit is better than implicit
} as const;

/**
 * Get titleBarStyle based on platform.
 * macOS uses 'hidden' for custom titlebar, others use default frame.
 * 
 * @returns 'hidden' on macOS, undefined on other platforms
 */
export function getTitleBarStyle(): 'hidden' | undefined {
    /* v8 ignore next */
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
    minWidth: 200,
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

/**
 * Configuration for the Quick Chat floating window.
 * Spotlight-like appearance: frameless, transparent, always-on-top.
 */
export const QUICK_CHAT_WIDTH = 600;
export const QUICK_CHAT_HEIGHT = 80;

export const QUICK_CHAT_WINDOW_CONFIG: BrowserWindowConstructorOptions = {
    width: QUICK_CHAT_WIDTH,
    height: QUICK_CHAT_HEIGHT,
    resizable: false,
    minimizable: false,
    maximizable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    ...BASE_WINDOW_CONFIG,
    backgroundColor: undefined, // Override for transparency
    show: false, // Show when ready
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

// =============================================================================
// Platform Constants
// =============================================================================

export const isMacOS = process.platform === 'darwin';
export const isWindows = process.platform === 'win32';
export const isLinux = process.platform === 'linux';
export const isDev = process.env.NODE_ENV === 'development';

// =============================================================================
// Tray Configuration
// =============================================================================

/**
 * Menu item configuration for system tray context menu.
 * Designed for extensibility - add new items here and TrayManager will pick them up.
 * 
 * @example Adding a new menu item:
 * ```typescript
 * export const TRAY_MENU_ITEMS = {
 *     ...TRAY_MENU_ITEMS,
 *     SETTINGS: { label: 'Settings', id: 'settings' },
 * };
 * ```
 */
export interface TrayMenuItem {
    /** Display label for the menu item */
    label: string;
    /** Unique identifier for the menu item (used in handlers) */
    id: string;
    /** Optional keyboard accelerator */
    accelerator?: string;
    /** Whether this is a separator (label ignored if true) */
    isSeparator?: boolean;
}

/**
 * Predefined tray menu items.
 * TrayManager iterates over these to build the context menu.
 */
export const TRAY_MENU_ITEMS: Record<string, TrayMenuItem> = {
    SHOW: { label: 'Show Gemini Desktop', id: 'show' },
    SEPARATOR: { label: '', id: 'separator', isSeparator: true },
    QUIT: { label: 'Quit', id: 'quit' },
};

/**
 * Tooltip for the tray icon.
 */
export const TRAY_TOOLTIP = 'Gemini Desktop' as const;

/**
 * E2E Test Constants for Gemini Desktop.
 *
 * Centralizes all selectors, domains, and configuration values used in E2E tests.
 * This makes the tests maintainable if Gemini's DOM structure changes.
 *
 * @module e2eConstants
 */

// =============================================================================
// Gemini DOM Selectors (Re-exported from main constants)
// =============================================================================

// Import from geminiSelectors.ts directly to avoid pulling in Electron-dependent code.
// constants.ts imports waylandDetector -> logger -> electron.app which fails in E2E test runner.
export {
    GEMINI_DOMAIN,
    GEMINI_EDITOR_SELECTORS,
    GEMINI_SUBMIT_BUTTON_SELECTORS,
    GEMINI_EDITOR_BLANK_CLASS,
    GEMINI_SUBMIT_DELAY_MS,
    GEMINI_MICROPHONE_BUTTON_SELECTORS,
    GEMINI_ERROR_TOAST_SELECTORS,
    GEMINI_MICROPHONE_ERROR_TEXT,
    GEMINI_CONVERSATION_TITLE_SELECTORS,
} from '../../../src/main/utils/geminiSelectors';

// Import locally for use in other constants
import { GEMINI_DOMAIN as _GEMINI_DOMAIN } from '../../../src/main/utils/geminiSelectors';

/**
 * Alternative domain patterns that might appear in Gemini URLs.
 * Ordered by priority - first match wins.
 */
export const GEMINI_DOMAIN_PATTERNS = [
    _GEMINI_DOMAIN,
    'bard.google.com', // Legacy domain fallback
] as const;

/**
 * Additional fallback selectors for E2E testing.
 * These supplement the main selectors for edge cases in tests.
 */
export const GEMINI_EDITOR_FALLBACK_SELECTORS = ['div[contenteditable="true"][data-placeholder]'] as const;

export const GEMINI_SUBMIT_BUTTON_FALLBACK_SELECTORS = [
    'button[aria-label="Send"]',
    'button[data-mat-icon-name="send"]',
] as const;

// =============================================================================
// Timing Configuration (sourced from shared module)
// =============================================================================

// Re-export E2E_TIMING from shared so existing imports keep working unchanged.
export { E2E_TIMING } from '../../shared/timing-constants';

// =============================================================================
// Error Messages
// =============================================================================

/**
 * Standardized error messages for E2E test debugging.
 */
export const E2E_ERROR_MESSAGES = {
    WINDOW_MANAGER_NOT_FOUND: 'WindowManager not found on app instance',
    MAIN_WINDOW_NOT_FOUND: 'Main window not found',
    QUICK_CHAT_WINDOW_NOT_FOUND: 'Quick Chat window not found',
    GEMINI_IFRAME_NOT_FOUND: 'Gemini iframe not found in frames',
    EDITOR_NOT_FOUND: 'Gemini editor element not found',
    SUBMIT_BUTTON_NOT_FOUND: 'Submit button not found or disabled',
} as const;

// =============================================================================
// Toast IDs
// =============================================================================

/**
 * Toast IDs used by toast components.
 * Must match the TOAST_ID constants in src/renderer/components/toast/*.tsx
 */
export const TOAST_IDS = {
    /** LinuxHotkeyNotice toast - shown when global hotkeys unavailable on Linux */
    LINUX_HOTKEY_NOTICE: 'linux-hotkey-notice',
} as const;

// =============================================================================
// Selector Utilities
// =============================================================================

/**
 * Find an element using multiple selectors.
 * Returns the first matching element.
 *
 * @param document - The document to search in
 * @param selectors - Array of CSS selectors to try
 * @returns The first matching element or null
 */
export function findElementBySelectors(document: Document, selectors: readonly string[]): Element | null {
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            return element;
        }
    }
    return null;
}

/**
 * Check if a URL matches any of the Gemini domain patterns.
 *
 * @param url - The URL to check
 * @returns True if the URL matches a Gemini domain
 */
export function isGeminiUrl(url: string): boolean {
    return GEMINI_DOMAIN_PATTERNS.some((domain) => url.includes(domain));
}

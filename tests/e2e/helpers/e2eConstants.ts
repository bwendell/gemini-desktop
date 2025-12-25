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

// Import from the single source of truth
export {
  GEMINI_DOMAIN,
  GEMINI_EDITOR_SELECTORS,
  GEMINI_SUBMIT_BUTTON_SELECTORS,
  GEMINI_EDITOR_BLANK_CLASS,
  GEMINI_SUBMIT_DELAY_MS,
  GEMINI_MICROPHONE_BUTTON_SELECTORS,
  GEMINI_ERROR_TOAST_SELECTORS,
  GEMINI_MICROPHONE_ERROR_TEXT,
} from '../../../src/main/utils/constants';

// Import locally for use in other constants
import { GEMINI_DOMAIN as _GEMINI_DOMAIN } from '../../../src/main/utils/constants';

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
export const GEMINI_EDITOR_FALLBACK_SELECTORS = [
  'div[contenteditable="true"][data-placeholder]',
] as const;

export const GEMINI_SUBMIT_BUTTON_FALLBACK_SELECTORS = [
  'button[aria-label="Send"]',
  'button[data-mat-icon-name="send"]',
] as const;

// =============================================================================
// Timing Configuration
// =============================================================================

/**
 * Delays and timeouts used in E2E tests.
 * Values are in milliseconds.
 */
export const E2E_TIMING = {
  /** Delay before clicking the submit button after text injection */
  SUBMIT_DELAY_MS: 200,

  /** Standard pause for UI state changes (e.g., window visibility) */
  UI_STATE_PAUSE_MS: 300,

  /** Extended pause for slow operations (e.g., iframe loading) */
  EXTENDED_PAUSE_MS: 500,

  /** Time to wait for Quick Chat window to appear */
  QUICK_CHAT_SHOW_DELAY_MS: 500,

  /** Time to wait for Quick Chat window to hide */
  QUICK_CHAT_HIDE_DELAY_MS: 200,

  /** Initial wait time for iframe to load */
  IFRAME_LOAD_WAIT_MS: 2000,

  /** Time to wait for window animations/transitions (e.g. minimize/maximize) */
  WINDOW_TRANSITION: 500,

  /** Short pause for quick restore operations or state updates */
  QUICK_RESTORE: 300,

  /** Short pause for state cleanup between tests */
  CLEANUP_PAUSE: 200,

  /** Pause for IPC round-trip and state propagation */
  IPC_ROUND_TRIP: 300,

  /** Pause for window hide/show operations (tray interactions) */
  WINDOW_HIDE_SHOW: 500,

  /** Pause for multiple operation cycles */
  CYCLE_PAUSE: 400,

  /** Extended wait for fullscreen transitions */
  FULLSCREEN_TRANSITION: 1000,

  /** Pause for multi-window operations */
  MULTI_WINDOW_PAUSE: 1000,

  /** Timeout for waitUntil conditions expecting window state changes */
  WINDOW_STATE_TIMEOUT: 5000,

  /** Interval for polling window state */
  WINDOW_STATE_POLL_INTERVAL: 200,

  /** Time to wait for animation settling */
  ANIMATION_SETTLE: 500,
} as const;

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
export function findElementBySelectors(
  document: Document,
  selectors: readonly string[]
): Element | null {
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

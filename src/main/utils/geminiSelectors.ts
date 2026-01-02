/**
 * Gemini DOM Selectors Module
 *
 * Centralizes all CSS selectors for interacting with the Gemini website.
 * Designed for easy updates when gemini.google.com changes its DOM structure.
 *
 * MAINTENANCE GUIDE:
 * - When Gemini changes, update selectors here
 * - Run E2E tests to verify: npm run test:e2e
 * - Update GEMINI_SELECTORS_LAST_VERIFIED after manual verification
 *
 * @module geminiSelectors
 */

/**
 * Version of the selector configuration.
 * Increment when making breaking changes to selector structure.
 */
export const GEMINI_SELECTORS_VERSION = '1.0.0';

/**
 * Date when selectors were last manually verified against gemini.google.com.
 * Update this after confirming selectors work on the live site.
 */
export const GEMINI_SELECTORS_LAST_VERIFIED = '2025-12-23';

/**
 * Gemini selector configuration organized by component.
 * Each component has:
 * - selectors: Array of CSS selectors in priority order (first match wins)
 * - description: Human-readable description for debugging
 * - Additional component-specific properties
 */
export const GeminiSelectors = {
  /**
   * Domain for matching Gemini iframe URLs.
   */
  domain: 'gemini.google.com',

  /**
   * Legacy domain that may still appear in some URLs.
   */
  legacyDomain: 'bard.google.com',

  /**
   * Chat input editor configuration.
   * Gemini uses Quill.js for the rich text editor.
   */
  editor: {
    /**
     * CSS selectors for finding the chat input editor.
     * Ordered by specificity - first match wins.
     */
    selectors: [
      '.ql-editor[contenteditable="true"]',
      '.ql-editor',
      '[contenteditable="true"][role="textbox"]',
    ] as const,

    /**
     * CSS class that indicates the editor is empty/blank.
     * Must be removed when injecting text.
     */
    blankClass: 'ql-blank',

    /**
     * Description for logging/debugging.
     */
    description: 'Quill-based rich text editor',
  },

  /**
   * Submit/send button configuration.
   */
  submitButton: {
    /**
     * CSS selectors for finding the send message button.
     * Ordered by specificity - first match wins.
     */
    selectors: [
      'button.send-button[aria-label="Send message"]',
      'button.send-button',
      'button[aria-label="Send message"]',
    ] as const,

    /**
     * Description for logging/debugging.
     */
    description: 'Send message button',
  },

  /**
   * Microphone button configuration.
   * Used for speech dictation / voice input.
   */
  microphoneButton: {
    /**
     * CSS selectors for finding the microphone button.
     * Ordered by specificity - first match wins.
     */
    selectors: [
      'button[data-node-type="speech_dictation_mic_button"]',
      'button[aria-label="Microphone"]',
      'speech-dictation-mic-button button',
    ] as const,

    /**
     * Description for logging/debugging.
     */
    description: 'Speech dictation microphone button',
  },

  /**
   * Error toast / snackbar configuration.
   * Used to detect permission errors displayed to the user.
   */
  errorToast: {
    /**
     * CSS selectors for finding error toast messages.
     * Gemini uses Angular Material snackbar for toasts.
     */
    selectors: ['[matsnackbarlabel]', '.mat-mdc-snack-bar-label', '.mdc-snackbar__label'] as const,

    /**
     * Error message text for microphone permission denied.
     * Used to detect if microphone access failed.
     */
    microphoneErrorText: 'Unable to access the microphone',

    /**
     * Description for logging/debugging.
     */
    description: 'Error toast / snackbar message',
  },

  /**
   * Timing configuration for DOM interactions.
   */
  timing: {
    /**
     * Delay in milliseconds before clicking submit after text injection.
     * Allows Angular/Quill to process the text injection.
     */
    submitDelayMs: 500,

    /**
     * Description for logging/debugging.
     */
    description: 'Delay timings for DOM interactions',
  },
} as const;

/**
 * Type for the GeminiSelectors configuration object.
 */
export type GeminiSelectorsConfig = typeof GeminiSelectors;

/**
 * Find the first matching element from an array of selectors.
 * Logs which selector matched for debugging.
 *
 * @param document - The document to search in
 * @param selectors - Array of CSS selectors to try
 * @param componentName - Name of the component for logging (e.g., 'editor', 'submitButton')
 * @param logger - Optional logger function (defaults to console.log)
 * @returns The first matching element or null
 */
export function findGeminiElement(
  document: Document,
  selectors: readonly string[],
  componentName: string,
  logger?: (message: string) => void
): Element | null {
  const log = logger || console.log;

  for (let i = 0; i < selectors.length; i++) {
    const selector = selectors[i];
    const element = document.querySelector(selector);

    if (element) {
      if (i === 0) {
        log(`[GeminiSelectors] ${componentName}: Found with primary selector`);
      } else {
        log(
          `[GeminiSelectors] ${componentName}: Found with fallback selector #${i + 1}: "${selector}"`
        );
      }
      return element;
    }
  }

  log(`[GeminiSelectors] ${componentName}: No matching element found`);
  return null;
}

/**
 * Check if a URL belongs to a Gemini domain.
 * Uses proper URL parsing to prevent substring bypass attacks (CWE-20).
 *
 * @param url - URL string to check
 * @returns True if the URL is for Gemini
 */
export function isGeminiDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return (
      hostname === GeminiSelectors.domain ||
      hostname.endsWith(`.${GeminiSelectors.domain}`) ||
      hostname === GeminiSelectors.legacyDomain ||
      hostname.endsWith(`.${GeminiSelectors.legacyDomain}`) ||
      hostname === 'aistudio.google.com' ||
      hostname.endsWith('.aistudio.google.com')
    );
  } catch {
    // Invalid URL
    return false;
  }
}

// Re-export individual selector arrays for backwards compatibility
export const GEMINI_DOMAIN = GeminiSelectors.domain;
export const GEMINI_EDITOR_SELECTORS = GeminiSelectors.editor.selectors;
export const GEMINI_SUBMIT_BUTTON_SELECTORS = GeminiSelectors.submitButton.selectors;
export const GEMINI_EDITOR_BLANK_CLASS = GeminiSelectors.editor.blankClass;
export const GEMINI_SUBMIT_DELAY_MS = GeminiSelectors.timing.submitDelayMs;
export const GEMINI_MICROPHONE_BUTTON_SELECTORS = GeminiSelectors.microphoneButton.selectors;
export const GEMINI_ERROR_TOAST_SELECTORS = GeminiSelectors.errorToast.selectors;
export const GEMINI_MICROPHONE_ERROR_TEXT = GeminiSelectors.errorToast.microphoneErrorText;

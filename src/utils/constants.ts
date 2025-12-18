/**
 * Application constants shared across the frontend.
 * Centralized configuration values used in React components.
 */

// =========================================================================
// External URLs
// =========================================================================

/**
 * GitHub repository base URL.
 */
export const GITHUB_REPO_URL = 'https://github.com/bwendell/gemini-desktop' as const;

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

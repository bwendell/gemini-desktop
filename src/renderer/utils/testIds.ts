/**
 * Centralized Test IDs for the application.
 *
 * Use these constants for data-testid attributes to ensure consistency
 * between React components and E2E test selectors.
 *
 * @module testIds
 */

// =============================================================================
// Main App
// =============================================================================

export const APP_TEST_IDS = {
  WEBVIEW_CONTAINER: 'webview-container',
  WEBVIEW_LOADING: 'webview-loading',
  WEBVIEW_ERROR: 'webview-error',
  GEMINI_IFRAME: 'gemini-iframe',
} as const;

// =============================================================================
// Layout
// =============================================================================

export const LAYOUT_TEST_IDS = {
  MAIN_LAYOUT: 'main-layout',
} as const;

// =============================================================================
// Titlebar (Main Window)
// =============================================================================

export const TITLEBAR_TEST_IDS = {
  TITLEBAR: 'titlebar',
  TITLEBAR_TITLE: 'titlebar-title',
  MENU_BAR: 'titlebar-menu-bar',
  MINIMIZE_BUTTON: 'minimize-button',
  MAXIMIZE_BUTTON: 'maximize-button',
  CLOSE_BUTTON: 'close-button',
  APP_ICON: 'app-icon',
  /** Dynamic: Use with menu label, e.g., "File" */
  menuButton: (label: string) => `menu-button-${label}`,
  /** Dynamic: Use with menu item label, e.g., "Options" */
  menuItem: (label: string) => `menu-item-${label}`,
} as const;

// =============================================================================
// Options Window
// =============================================================================

export const OPTIONS_TEST_IDS = {
  OPTIONS_WINDOW: 'options-window',
  OPTIONS_TABS: 'options-tabs',
  OPTIONS_CONTENT: 'options-content',
  OPTIONS_TITLEBAR: 'options-titlebar',
  OPTIONS_TITLEBAR_TITLE: 'options-titlebar-title',
  OPTIONS_WINDOW_CONTROLS: 'options-window-controls',
  OPTIONS_MINIMIZE_BUTTON: 'options-minimize-button',
  OPTIONS_CLOSE_BUTTON: 'options-close-button',
  THEME_SELECTOR: 'theme-selector',
  /** Dynamic: Use with tab id */
  optionsTab: (id: string) => `options-tab-${id}`,
  /** Dynamic: Use with theme id (light, dark, system) */
  themeCard: (id: string) => `theme-card-${id}`,
  /** Dynamic: Use with theme id */
  themeCheckmark: (id: string) => `theme-checkmark-${id}`,
} as const;

// =============================================================================
// About Section
// =============================================================================

export const ABOUT_TEST_IDS = {
  ABOUT_SECTION: 'about-section',
  ABOUT_VERSION: 'about-version',
  ABOUT_DISCLAIMER: 'about-disclaimer',
  ABOUT_LICENSE_LINK: 'about-license-link',
  ABOUT_DISCLAIMER_LINK: 'about-disclaimer-link',
  ABOUT_GOOGLE_TOS_LINK: 'about-google-tos-link',
  ABOUT_GOOGLE_AI_LINK: 'about-google-ai-link',
} as const;

// =============================================================================
// Quick Chat
// =============================================================================

export const QUICK_CHAT_TEST_IDS = {
  QUICK_CHAT_CONTAINER: 'quick-chat-container',
  QUICK_CHAT_INPUT: 'quick-chat-input',
  QUICK_CHAT_SUBMIT: 'quick-chat-submit',
} as const;

// =============================================================================
// Combined Export (for convenience)
// =============================================================================

export const TEST_IDS = {
  ...APP_TEST_IDS,
  ...LAYOUT_TEST_IDS,
  ...TITLEBAR_TEST_IDS,
  ...OPTIONS_TEST_IDS,
  ...ABOUT_TEST_IDS,
  ...QUICK_CHAT_TEST_IDS,
} as const;

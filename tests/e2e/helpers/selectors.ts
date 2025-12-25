/**
 * Centralized E2E Selectors.
 * All CSS selectors in one place for easy updates and consistency.
 * 
 * Imports test IDs from the shared testIds module to ensure consistency
 * between React components and E2E tests.
 * 
 * Includes:
 * - Dynamic selector generators (functions)
 * - Static CSS strings
 * - `data-testid` based selectors for robustness
 */

import {
    LAYOUT_TEST_IDS,
    TITLEBAR_TEST_IDS,
    OPTIONS_TEST_IDS,
    QUICK_CHAT_TEST_IDS,
} from '../../../src/renderer/utils/testIds';

/**
 * Helper to create a data-testid selector from an ID string.
 */
const testId = (id: string) => `[data-testid="${id}"]`;

export const Selectors = {
    // Main Window
    /** The main application container */
    mainLayout: testId(LAYOUT_TEST_IDS.MAIN_LAYOUT),
    /** The custom titlebar element (Windows/Linux) */
    titlebar: 'header.titlebar',
    /** The title text within the titlebar */
    titlebarTitle: '.titlebar-title',
    /** The app icon in the titlebar */
    titlebarIcon: testId(TITLEBAR_TEST_IDS.APP_ICON),
    /** The container holding the official Gemini webview */
    webviewContainer: '.webview-container',

    // Custom Menu (Windows/Linux only)
    /** The menu bar container */
    menuBar: '.titlebar-menu-bar',
    /** 
     * Generates a selector for a top-level menu button.
     * @param label The menu label (e.g., 'File')
     */
    menuButton: (label: string) => testId(TITLEBAR_TEST_IDS.menuButton(label)),
    /** 
     * Generates a selector for a dropdown menu item.
     * @param label The item label (e.g., 'Options')
     */
    menuItem: (label: string) => testId(TITLEBAR_TEST_IDS.menuItem(label)),
    /** The container for the active dropdown menu */
    menuDropdown: '.titlebar-menu-dropdown',

    // Window Controls (Windows/Linux only)
    minimizeButton: testId(TITLEBAR_TEST_IDS.MINIMIZE_BUTTON),
    maximizeButton: testId(TITLEBAR_TEST_IDS.MAXIMIZE_BUTTON),
    closeButton: testId(TITLEBAR_TEST_IDS.CLOSE_BUTTON),

    // Options Window
    optionsTitlebar: '.options-titlebar',
    optionsCloseButton: testId(OPTIONS_TEST_IDS.OPTIONS_CLOSE_BUTTON),
    /** 
     * Generates a selector for a theme selection card.
     * @param theme The theme ID (e.g., 'light', 'dark', 'system')
     */
    themeCard: (theme: string) => testId(OPTIONS_TEST_IDS.themeCard(theme)),

    // Quick Chat
    quickChatContainer: testId(QUICK_CHAT_TEST_IDS.QUICK_CHAT_CONTAINER),
    quickChatInput: testId(QUICK_CHAT_TEST_IDS.QUICK_CHAT_INPUT),
    quickChatSubmit: testId(QUICK_CHAT_TEST_IDS.QUICK_CHAT_SUBMIT),
} as const;


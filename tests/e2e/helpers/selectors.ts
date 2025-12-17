/**
 * Centralized E2E Selectors.
 * All CSS selectors in one place for easy updates and consistency.
 * 
 * Includes:
 * - Dynamic selector generators (functions)
 * - Static CSS strings
 * - `data-testid` based selectors for robustness
 */
export const Selectors = {
    // Main Window
    /** The main application container */
    mainLayout: '[data-testid="main-layout"]',
    /** The custom titlebar element (Windows/Linux) */
    titlebar: 'header.titlebar',
    /** The title text within the titlebar */
    titlebarTitle: '.titlebar-title',
    /** The container holding the official Gemini webview */
    webviewContainer: '.webview-container',

    // Custom Menu (Windows/Linux only)
    /** The menu bar container */
    menuBar: '.titlebar-menu-bar',
    /** 
     * Generates a selector for a top-level menu button.
     * @param label The menu label (e.g., 'File')
     */
    menuButton: (label: string) => `[data-testid="menu-button-${label}"]`,
    /** 
     * Generates a selector for a dropdown menu item.
     * @param label The item label (e.g., 'Options')
     */
    menuItem: (label: string) => `[data-testid="menu-item-${label}"]`,
    /** The container for the active dropdown menu */
    menuDropdown: '.titlebar-menu-dropdown',

    // Window Controls (Windows/Linux only)
    minimizeButton: '[data-testid="minimize-button"]',
    maximizeButton: '[data-testid="maximize-button"]',
    closeButton: '[data-testid="close-button"]',

    // Options Window
    optionsTitlebar: '.options-titlebar',
    optionsCloseButton: '[data-testid="options-close-button"]',
    /** 
     * Generates a selector for a theme selection card.
     * @param theme The theme ID (e.g., 'light', 'dark', 'system')
     */
    themeCard: (theme: string) => `[data-testid="theme-card-${theme}"]`,
} as const;

/**
 * Main Window Page Object.
 *
 * Encapsulates all selectors and interactions for the main application window,
 * including the titlebar, menu, and window controls.
 *
 * @module MainWindowPage
 */

/// <reference path="../helpers/wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import { BasePage } from './BasePage';
import { Selectors } from '../helpers/selectors';
import { clickMenuItemById } from '../helpers/menuActions';
import { E2E_TIMING } from '../helpers/e2eConstants';

/**
 * Page Object for the main application window.
 */
export class MainWindowPage extends BasePage {
    constructor() {
        super('MainWindowPage');
    }

    // ===========================================================================
    // Locators (getters returning selector strings)
    // ===========================================================================

    /** Main layout container selector */
    get mainLayoutSelector(): string {
        return Selectors.mainLayout;
    }

    /** Custom titlebar selector (Windows/Linux) */
    get titlebarSelector(): string {
        return Selectors.titlebar;
    }

    /** Titlebar title text selector */
    get titlebarTitleSelector(): string {
        return Selectors.titlebarTitle;
    }

    /** Minimize button selector */
    get minimizeButtonSelector(): string {
        return Selectors.minimizeButton;
    }

    /** Maximize button selector */
    get maximizeButtonSelector(): string {
        return Selectors.maximizeButton;
    }

    /** Close button selector */
    get closeButtonSelector(): string {
        return Selectors.closeButton;
    }

    /** Menu bar container selector */
    get menuBarSelector(): string {
        return Selectors.menuBar;
    }

    /** Webview container selector */
    get webviewContainerSelector(): string {
        return Selectors.webviewContainer;
    }

    // ===========================================================================
    // Wait Operations
    // ===========================================================================

    /**
     * Wait for the main window to be fully loaded.
     * @param timeout - Timeout in milliseconds (default: 15000)
     */
    async waitForLoad(timeout = 15000): Promise<void> {
        await this.waitForElementToExist(this.mainLayoutSelector, timeout);
        this.log('Main window loaded');
    }

    /**
     * Wait for the titlebar to be displayed.
     * @param timeout - Timeout in milliseconds (default: 5000)
     */
    async waitForTitlebar(timeout = 5000): Promise<void> {
        await this.waitForElement(this.titlebarSelector, timeout);
    }

    // ===========================================================================
    // Menu Actions
    // ===========================================================================

    /**
     * Open the Options window via File menu.
     */
    async openOptionsViaMenu(): Promise<void> {
        await clickMenuItemById('menu-file-options');
        this.log('Opened Options via menu');
    }

    /**
     * Open the About dialog via Help menu.
     */
    async openAboutViaMenu(): Promise<void> {
        await clickMenuItemById('menu-help-about');
        this.log('Opened About via menu');
    }

    /**
     * Click a menu item by its ID.
     * @param menuId - The menu item ID (e.g., 'menu-file-options')
     */
    async clickMenuById(menuId: string): Promise<void> {
        await clickMenuItemById(menuId);
        this.log(`Clicked menu: ${menuId}`);
    }

    /**
     * Open a top-level menu by clicking its button.
     * @param menuLabel - The menu label (e.g., 'File', 'View', 'Help')
     */
    async openMenu(menuLabel: string): Promise<void> {
        const menuButtonSelector = Selectors.menuButton(menuLabel);
        await this.clickElement(menuButtonSelector);
        this.log(`Opened menu: ${menuLabel}`);
    }

    /**
     * Check if the menu dropdown is visible.
     */
    async isDropdownVisible(): Promise<boolean> {
        return this.isElementDisplayed(Selectors.menuDropdown);
    }

    /**
     * Wait for the menu dropdown to open.
     * @param timeout - Timeout in milliseconds (default: 2000)
     */
    async waitForDropdownOpen(timeout = 2000): Promise<void> {
        await this.waitForElementToExist(Selectors.menuDropdown, timeout);
        this.log('Menu dropdown opened');
    }

    /**
     * Wait for the menu dropdown to close.
     * @param timeout - Timeout in milliseconds (default: 2000)
     */
    async waitForDropdownClose(timeout = 2000): Promise<void> {
        await this.waitForElementToDisappear(Selectors.menuDropdown, timeout);
        this.log('Menu dropdown closed');
    }

    /**
     * Check if a menu item exists in the dropdown.
     * @param itemLabel - The menu item label (e.g., 'Options', 'About Gemini Desktop')
     */
    async isMenuItemExisting(itemLabel: string): Promise<boolean> {
        return this.isElementExisting(Selectors.menuItem(itemLabel));
    }

    /**
     * Close the menu dropdown by clicking the titlebar.
     */
    async closeDropdownByClickingTitlebar(): Promise<void> {
        await this.clickElement(this.titlebarSelector);
        this.log('Closed dropdown by clicking titlebar');
    }

    // ===========================================================================
    // Window Control Actions
    // ===========================================================================

    /**
     * Click the minimize button.
     */
    async clickMinimize(): Promise<void> {
        await this.clickElement(this.minimizeButtonSelector);
        await this.pause(E2E_TIMING.WINDOW_TRANSITION);
        this.log('Clicked minimize');
    }

    /**
     * Click the maximize/restore button.
     */
    async clickMaximize(): Promise<void> {
        await this.clickElement(this.maximizeButtonSelector);
        await this.pause(E2E_TIMING.WINDOW_TRANSITION);
        this.log('Clicked maximize/restore');
    }

    /**
     * Click the close button.
     */
    async clickClose(): Promise<void> {
        await this.clickElement(this.closeButtonSelector);
        this.log('Clicked close');
    }

    // ===========================================================================
    // State Queries
    // ===========================================================================

    /**
     * Check if the main window is loaded.
     */
    async isLoaded(): Promise<boolean> {
        return this.isElementExisting(this.mainLayoutSelector);
    }

    /**
     * Check if the titlebar is displayed.
     */
    async isTitlebarDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.titlebarSelector);
    }

    /**
     * Get the title text from the titlebar.
     */
    async getTitleText(): Promise<string> {
        return this.getElementText(this.titlebarTitleSelector);
    }

    /**
     * Check if the minimize button is displayed.
     */
    async isMinimizeButtonDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.minimizeButtonSelector);
    }

    /**
     * Check if the maximize button is displayed.
     */
    async isMaximizeButtonDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.maximizeButtonSelector);
    }

    /**
     * Check if the close button is displayed.
     */
    async isCloseButtonDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.closeButtonSelector);
    }

    /**
     * Check if the menu bar is displayed.
     */
    async isMenuBarDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.menuBarSelector);
    }

    /**
     * Check if the webview container is displayed.
     */
    async isWebviewDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.webviewContainerSelector);
    }

    // ===========================================================================
    // Window Bounds Operations
    // ===========================================================================

    /**
     * Interface for window bounds.
     */
    private static readonly WindowBoundsDefault = { x: 0, y: 0, width: 1200, height: 800 };

    /**
     * Get current window bounds from the main window.
     */
    async getWindowBounds(): Promise<{ x: number; y: number; width: number; height: number }> {
        const bounds = await browser.electron.execute((electron: typeof import('electron')) => {
            const wins = electron.BrowserWindow.getAllWindows();
            const mainWindow = wins.find((w) => !w.isDestroyed());
            if (!mainWindow) {
                return { x: 0, y: 0, width: 1200, height: 800 };
            }
            return mainWindow.getBounds();
        });
        this.log(`Got window bounds: ${JSON.stringify(bounds)}`);
        return bounds;
    }

    /**
     * Set window bounds.
     * @param bounds - The bounds to set (x, y, width, height)
     */
    async setWindowBounds(bounds: { x: number; y: number; width: number; height: number }): Promise<void> {
        await browser.electron.execute(
            (electron: typeof import('electron'), b: { x: number; y: number; width: number; height: number }) => {
                const wins = electron.BrowserWindow.getAllWindows();
                const mainWindow = wins.find((w) => !w.isDestroyed());
                if (mainWindow) {
                    mainWindow.setBounds(b);
                }
            },
            bounds
        );
        await this.pause(E2E_TIMING.ANIMATION_SETTLE);
        this.log(`Set window bounds: ${JSON.stringify(bounds)}`);
    }

    /**
     * Read window bounds settings from the settings file.
     * @returns The saved window bounds, or null if not found
     */
    async readWindowBoundsFromSettings(): Promise<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null> {
        const bounds = await browser.electron.execute((electron: typeof import('electron')) => {
            const path = require('path');
            const fs = require('fs');

            const userDataPath = electron.app.getPath('userData');
            const settingsPath = path.join(userDataPath, 'settings.json');

            try {
                if (!fs.existsSync(settingsPath)) {
                    return null;
                }
                const content = fs.readFileSync(settingsPath, 'utf-8');
                const settings = JSON.parse(content);
                return settings.windowBounds || null;
            } catch (error) {
                console.error('[E2E] Failed to read settings file:', error);
                return null;
            }
        });
        this.log(`Read window bounds from settings: ${JSON.stringify(bounds)}`);
        return bounds;
    }

    /**
     * Triggers a network request from the main window's renderer context.
     * Useful for testing network-triggered behaviors like response notifications.
     * @param url - The URL to fetch
     * @param method - The HTTP method (default: 'POST')
     */
    async triggerNetworkRequest(url: string, method: string = 'POST'): Promise<void> {
        await browser.execute(
            (targetUrl: string, targetMethod: string) => {
                fetch(targetUrl, { method: targetMethod }).catch(() => {
                    // We don't care about the response, just that the request happened
                });
            },
            url,
            method
        );
        this.log(`Triggered ${method} request to: ${url}`);
    }
}

/**
 * Main Window Page Object.
 *
 * Encapsulates all selectors and interactions for the main application window,
 * including the titlebar, menu, and window controls.
 *
 * @module MainWindowPage
 */

/// <reference path="../helpers/wdio-electron.d.ts" />

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
}

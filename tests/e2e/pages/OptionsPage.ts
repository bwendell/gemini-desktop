/**
 * Options Page Object.
 *
 * Encapsulates all selectors and interactions for the Options window.
 * Includes Settings and About tabs, theme controls, and hotkey settings.
 *
 * @module OptionsPage
 */

/// <reference path="../helpers/wdio-electron.d.ts" />

import { BasePage } from './BasePage';
import { Selectors } from '../helpers/selectors';
import { browser } from '@wdio/globals';
import {
  navigateToOptionsTab,
  closeOptionsWindow,
  waitForOptionsWindow,
} from '../helpers/optionsWindowActions';

/**
 * Page Object for the Options Window.
 * Provides methods to interact with settings, themes, hotkeys, and about section.
 */
export class OptionsPage extends BasePage {
  constructor() {
    super('OptionsPage');
  }

  // ===========================================================================
  // LOCATORS
  // ===========================================================================

  /** Selector for the options content container */
  get contentSelector(): string {
    return '[data-testid="options-content"]';
  }

  /** Selector for the Settings tab */
  get settingsTabSelector(): string {
    return '[data-testid="options-tab-settings"]';
  }

  /** Selector for the About tab */
  get aboutTabSelector(): string {
    return '[data-testid="options-tab-about"]';
  }

  /** Selector for the theme selector section */
  get themeSelectorSelector(): string {
    return '[data-testid="theme-selector"]';
  }

  /** Selector for the about section */
  get aboutSectionSelector(): string {
    return '[data-testid="about-section"]';
  }

  /** Selector for the version text element */
  get versionSelector(): string {
    return '[data-testid="about-version"]';
  }

  /** Selector for the disclaimer section */
  get disclaimerSelector(): string {
    return '[data-testid="about-disclaimer"]';
  }

  /** Selector for the license link */
  get licenseLinkSelector(): string {
    return '[data-testid="about-license-link"]';
  }

  /** Selector for the options window titlebar */
  get titlebarSelector(): string {
    return '.options-titlebar';
  }

  /** Selector for the titlebar icon */
  get titlebarIconSelector(): string {
    return '[data-testid="app-icon"]';
  }

  /** Selector for the window controls container */
  get windowControlsSelector(): string {
    return '.options-window-controls';
  }

  /** Selector for the minimize button */
  get minimizeButtonSelector(): string {
    return '[data-testid="options-minimize-button"]';
  }

  /** Selector for the close button */
  get closeButtonSelector(): string {
    return '[data-testid="options-close-button"]';
  }

  /** Selector for the maximize button (should not exist in options window) */
  get maximizeButtonSelector(): string {
    return '[data-testid="options-maximize-button"]';
  }

  /**
   * Get selector for a specific theme card.
   * @param theme - Theme ID (e.g., 'light', 'dark', 'system')
   */
  themeCardSelector(theme: string): string {
    return Selectors.themeCard(theme);
  }

  /**
   * Get selector for a specific hotkey toggle.
   * @param hotkeyId - Hotkey ID (e.g., 'alwaysOnTop', 'quickChat', 'stealthMode')
   */
  hotkeyToggleSelector(hotkeyId: string): string {
    return `[data-testid="hotkey-toggle-${hotkeyId}"]`;
  }

  /**
   * Get selector for a specific hotkey row.
   * @param hotkeyId - Hotkey ID
   */
  hotkeyRowSelector(hotkeyId: string): string {
    return `[data-testid="hotkey-row-${hotkeyId}"]`;
  }

  /** Selector for the master hotkey toggle switch */
  get masterHotkeyToggleSelector(): string {
    return '[data-testid="hotkey-toggle-switch"]';
  }

  // ===========================================================================
  // TAB NAVIGATION
  // ===========================================================================

  /**
   * Navigate to the Settings tab.
   */
  async navigateToSettings(): Promise<void> {
    this.log('Navigating to Settings tab');
    await navigateToOptionsTab('settings');
  }

  /**
   * Navigate to the About tab.
   */
  async navigateToAbout(): Promise<void> {
    this.log('Navigating to About tab');
    await navigateToOptionsTab('about');
  }

  /**
   * Check if the Settings tab is currently active.
   */
  async isSettingsTabActive(): Promise<boolean> {
    const tab = await this.$(this.settingsTabSelector);
    const ariaSelected = await tab.getAttribute('aria-selected');
    const dataActive = await tab.getAttribute('data-active');
    return ariaSelected === 'true' || dataActive === 'true';
  }

  /**
   * Check if the About tab is currently active.
   */
  async isAboutTabActive(): Promise<boolean> {
    const tab = await this.$(this.aboutTabSelector);
    const ariaSelected = await tab.getAttribute('aria-selected');
    const dataActive = await tab.getAttribute('data-active');
    return ariaSelected === 'true' || dataActive === 'true';
  }

  // ===========================================================================
  // THEME ACTIONS
  // ===========================================================================

  /**
   * Select a theme.
   * @param theme - Theme to select ('light', 'dark', or 'system')
   */
  async selectTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    this.log(`Selecting theme: ${theme}`);
    const themeCard = await this.waitForElement(this.themeCardSelector(theme));
    await themeCard.click();
    await this.pause();
  }

  /**
   * Get the currently active theme from the document's data-theme attribute.
   */
  async getCurrentTheme(): Promise<string | null> {
    return this.execute(() => {
      return document.documentElement.getAttribute('data-theme');
    });
  }

  /**
   * Check if the theme selector is displayed.
   */
  async isThemeSelectorDisplayed(): Promise<boolean> {
    return this.isElementDisplayed(this.themeSelectorSelector);
  }

  // ===========================================================================
  // HOTKEY ACTIONS
  // ===========================================================================

  /**
   * Get the hotkey toggle element.
   * @param hotkeyId - Hotkey ID (e.g., 'alwaysOnTop', 'quickChat', 'stealthMode')
   */
  async getHotkeyToggle(hotkeyId: string): Promise<WebdriverIO.Element> {
    return this.waitForElement(this.hotkeyToggleSelector(hotkeyId));
  }

  /**
   * Check if a hotkey is enabled (toggle is on).
   * @param hotkeyId - Hotkey ID
   */
  async isHotkeyEnabled(hotkeyId: string): Promise<boolean> {
    const toggle = await this.getHotkeyToggle(hotkeyId);
    const checked = await toggle.getAttribute('aria-checked');
    const dataChecked = await toggle.getAttribute('data-checked');
    return checked === 'true' || dataChecked === 'true';
  }

  /**
   * Toggle a hotkey on or off.
   * @param hotkeyId - Hotkey ID
   */
  async toggleHotkey(hotkeyId: string): Promise<void> {
    this.log(`Toggling hotkey: ${hotkeyId}`);
    const toggle = await this.getHotkeyToggle(hotkeyId);
    await toggle.click();
    await this.pause();
  }

  /**
   * Enable a hotkey (if not already enabled).
   * @param hotkeyId - Hotkey ID
   */
  async enableHotkey(hotkeyId: string): Promise<void> {
    const isEnabled = await this.isHotkeyEnabled(hotkeyId);
    if (!isEnabled) {
      await this.toggleHotkey(hotkeyId);
    }
  }

  /**
   * Disable a hotkey (if not already disabled).
   * @param hotkeyId - Hotkey ID
   */
  async disableHotkey(hotkeyId: string): Promise<void> {
    const isEnabled = await this.isHotkeyEnabled(hotkeyId);
    if (isEnabled) {
      await this.toggleHotkey(hotkeyId);
    }
  }

  /**
   * Check if the master hotkey toggle is enabled.
   */
  async isMasterHotkeyEnabled(): Promise<boolean> {
    const toggle = await this.waitForElement(this.masterHotkeyToggleSelector);
    const checked = await toggle.getAttribute('aria-checked');
    const dataChecked = await toggle.getAttribute('data-checked');
    return checked === 'true' || dataChecked === 'true';
  }

  /**
   * Toggle the master hotkey on/off switch.
   */
  async toggleMasterHotkey(): Promise<void> {
    this.log('Toggling master hotkey');
    const toggle = await this.waitForElement(this.masterHotkeyToggleSelector);
    await toggle.click();
    await this.pause();
  }

  /**
   * Get the hotkey row element.
   * @param hotkeyId - Hotkey ID
   */
  async getHotkeyRow(hotkeyId: string): Promise<WebdriverIO.Element> {
    return this.waitForElement(this.hotkeyRowSelector(hotkeyId));
  }

  // ===========================================================================
  // ABOUT TAB QUERIES
  // ===========================================================================

  /**
   * Get the version text displayed in the About tab.
   */
  async getVersionText(): Promise<string> {
    return this.getElementText(this.versionSelector);
  }

  /**
   * Get the text content of the about section.
   */
  async getAboutSectionText(): Promise<string> {
    return this.getElementText(this.aboutSectionSelector);
  }

  /**
   * Check if the about section is displayed.
   */
  async isAboutSectionDisplayed(): Promise<boolean> {
    return this.isElementDisplayed(this.aboutSectionSelector);
  }

  /**
   * Check if the disclaimer is displayed.
   */
  async isDisclaimerDisplayed(): Promise<boolean> {
    return this.isElementDisplayed(this.disclaimerSelector);
  }

  /**
   * Check if the license link is present and clickable.
   */
  async isLicenseLinkPresent(): Promise<boolean> {
    return this.isElementExisting(this.licenseLinkSelector);
  }

  // ===========================================================================
  // TITLEBAR AND WINDOW CONTROLS
  // ===========================================================================

  /**
   * Check if the titlebar is displayed.
   */
  async isTitlebarDisplayed(): Promise<boolean> {
    return this.isElementDisplayed(this.titlebarSelector);
  }

  /**
   * Get the titlebar element.
   */
  async getTitlebar(): Promise<WebdriverIO.Element> {
    return this.waitForElement(this.titlebarSelector);
  }

  /**
   * Check if the titlebar icon is displayed with valid src.
   */
  async isTitlebarIconValid(): Promise<{ exists: boolean; hasValidSrc: boolean; width: number }> {
    // Query the titlebar, then find the icon within it
    const titlebar = await this.getTitlebar();
    const icon = await titlebar.$(this.titlebarIconSelector);
    const exists = await icon.isExisting();
    if (!exists) {
      return { exists: false, hasValidSrc: false, width: 0 };
    }
    const src = await icon.getAttribute('src');
    const hasValidSrc = src ? /icon(-.*)?\.png/.test(src) : false;
    const width = (await icon.getProperty('naturalWidth')) as number;
    return { exists: true, hasValidSrc, width: Number(width) };
  }

  /**
   * Check if window controls container is displayed.
   */
  async isWindowControlsDisplayed(): Promise<boolean> {
    return this.isElementDisplayed(this.windowControlsSelector);
  }

  /**
   * Get the count of buttons in the window controls container.
   */
  async getWindowControlButtonCount(): Promise<number> {
    const container = await this.$(this.windowControlsSelector);
    const buttons = await container.$$('button');
    return buttons.length;
  }

  /**
   * Check if the minimize button is displayed.
   */
  async isMinimizeButtonDisplayed(): Promise<boolean> {
    return this.isElementDisplayed(this.minimizeButtonSelector);
  }

  /**
   * Check if the close button is displayed.
   */
  async isCloseButtonDisplayed(): Promise<boolean> {
    return this.isElementDisplayed(this.closeButtonSelector);
  }

  /**
   * Check if the maximize button exists (should NOT exist in options window).
   */
  async isMaximizeButtonExisting(): Promise<boolean> {
    return this.isElementExisting(this.maximizeButtonSelector);
  }

  /**
   * Click the close button.
   */
  async clickCloseButton(): Promise<void> {
    this.log('Clicking close button');
    await this.clickElement(this.closeButtonSelector);
  }

  // ===========================================================================
  // WINDOW LIFECYCLE
  // ===========================================================================

  /**
   * Wait for the options window to fully load.
   * @param timeout - Timeout in milliseconds (default: 10000)
   */
  async waitForLoad(timeout = 10000): Promise<void> {
    this.log('Waiting for Options window to load');
    await waitForOptionsWindow(timeout);
  }

  /**
   * Close the options window and switch back to the main window.
   */
  async close(): Promise<void> {
    this.log('Closing Options window');
    await closeOptionsWindow();
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Get the current URL hash (for tab state verification).
   */
  async getUrlHash(): Promise<string> {
    const url = await browser.getUrl();
    const hashIndex = url.indexOf('#');
    return hashIndex >= 0 ? url.substring(hashIndex) : '';
  }
}

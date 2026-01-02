/**
 * Quick Chat Page Object.
 *
 * Encapsulates all selectors and interactions for the Quick Chat popup window.
 * Delegates to existing quickChatActions helper functions where appropriate.
 *
 * @module QuickChatPage
 */

/// <reference path="../helpers/wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import { BasePage } from './BasePage';
import { Selectors } from '../helpers/selectors';
import {
  showQuickChatWindow,
  hideQuickChatWindow,
  getQuickChatState,
  submitQuickChatText,
} from '../helpers/quickChatActions';

/**
 * Page Object for the Quick Chat popup window.
 * Provides methods for visibility, input actions, and state queries.
 */
export class QuickChatPage extends BasePage {
  constructor() {
    super('QuickChatPage');
  }

  // ===========================================================================
  // LOCATORS (getters returning selector strings)
  // ===========================================================================

  /** Selector for the Quick Chat container element */
  get containerSelector(): string {
    return Selectors.quickChatContainer;
  }

  /** Selector for the Quick Chat input field */
  get inputSelector(): string {
    return Selectors.quickChatInput;
  }

  /** Selector for the Quick Chat submit button */
  get submitButtonSelector(): string {
    return Selectors.quickChatSubmit;
  }

  // ===========================================================================
  // VISIBILITY
  // ===========================================================================

  /**
   * Show the Quick Chat window.
   * Creates the window if it doesn't exist.
   */
  async show(): Promise<void> {
    this.log('Showing Quick Chat window');
    await showQuickChatWindow();
  }

  /**
   * Hide the Quick Chat window.
   */
  async hide(): Promise<void> {
    this.log('Hiding Quick Chat window');
    await hideQuickChatWindow();
  }

  /**
   * Check if the Quick Chat window is visible.
   * @returns True if the Quick Chat window is visible
   */
  async isVisible(): Promise<boolean> {
    const state = await getQuickChatState();
    return state.windowVisible;
  }

  /**
   * Wait for the Quick Chat window to become visible.
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  async waitForVisible(timeout = 5000): Promise<void> {
    await browser.waitUntil(
      async () => {
        const state = await getQuickChatState();
        return state.windowVisible || state.windowFocused || state.windowReady;
      },
      {
        timeout,
        interval: 100,
        timeoutMsg: `[${this.pageName}] Quick Chat window did not become visible within ${timeout}ms`,
      }
    );
    this.log('Quick Chat window is visible');
  }

  /**
   * Wait for the Quick Chat window to be hidden.
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  async waitForHidden(timeout = 5000): Promise<void> {
    await browser.waitUntil(
      async () => {
        const state = await getQuickChatState();
        return !state.windowVisible;
      },
      {
        timeout,
        interval: 100,
        timeoutMsg: `[${this.pageName}] Quick Chat window did not hide within ${timeout}ms`,
      }
    );
    this.log('Quick Chat window is hidden');
  }

  // ===========================================================================
  // INPUT ACTIONS
  // ===========================================================================

  /**
   * Type text into the Quick Chat input field.
   * @param text - Text to type
   */
  async typeText(text: string): Promise<void> {
    const input = await this.waitForElement(this.inputSelector);
    await input.click();
    await browser.keys(text);
    this.log(`Typed: "${text}"`);
  }

  /**
   * Clear the Quick Chat input field.
   */
  async clearInput(): Promise<void> {
    const input = await this.waitForElement(this.inputSelector);
    await input.click();
    // Select all and delete to clear any existing text
    await browser.keys(['Control', 'a']);
    await browser.keys(['Backspace']);
    this.log('Cleared input field');
  }

  /**
   * Click the submit button.
   * Focuses input first to ensure React state is synchronized before clicking.
   */
  async submit(): Promise<void> {
    // Focus input first to ensure React state is synchronized
    // This matches the pattern in submitViaEnter and prevents race conditions
    // where the button click reads stale state (especially on Windows CI)
    const input = await this.$(this.inputSelector);
    await input.click();

    const submitButton = await this.waitForElement(this.submitButtonSelector);
    await submitButton.click();
    this.log('Clicked submit button');
  }

  /**
   * Submit text via Quick Chat (type and submit).
   * Uses the quickChatActions helper to handle the full flow.
   * @param text - Text to submit
   */
  async submitText(text: string): Promise<void> {
    this.log(`Submitting text: "${text}"`);
    await submitQuickChatText(text);
  }

  /**
   * Press Enter to submit the current input.
   */
  async submitViaEnter(): Promise<void> {
    const input = await this.$(this.inputSelector);
    await input.click();
    await browser.keys(['Enter']);
    this.log('Submitted via Enter key');
  }

  /**
   * Press Escape to cancel and hide Quick Chat.
   */
  async cancel(): Promise<void> {
    await browser.keys(['Escape']);
    this.log('Cancelled via Escape key');
  }

  // ===========================================================================
  // STATE QUERIES
  // ===========================================================================

  /**
   * Get the current value of the input field.
   * @returns The input field value
   */
  async getInputValue(): Promise<string> {
    const input = await this.waitForElement(this.inputSelector);
    return input.getValue();
  }

  /**
   * Check if the input field is focused.
   * @returns True if the input field has focus
   */
  async isInputFocused(): Promise<boolean> {
    const input = await this.$(this.inputSelector);
    const isFocused = await browser.execute((el) => {
      return document.activeElement === el;
    }, input);
    return isFocused;
  }

  /**
   * Check if the submit button is enabled.
   * @returns True if the submit button is enabled
   */
  async isSubmitEnabled(): Promise<boolean> {
    return this.isElementEnabled(this.submitButtonSelector);
  }

  /**
   * Check if the input field is displayed.
   * @returns True if the input field is displayed
   */
  async isInputDisplayed(): Promise<boolean> {
    return this.isElementDisplayed(this.inputSelector);
  }

  /**
   * Check if the submit button is displayed.
   * @returns True if the submit button is displayed
   */
  async isSubmitDisplayed(): Promise<boolean> {
    return this.isElementDisplayed(this.submitButtonSelector);
  }

  /**
   * Get the full Quick Chat window state.
   * @returns The QuickChatState object with window state details
   */
  async getWindowState() {
    return getQuickChatState();
  }

  // ===========================================================================
  // WINDOW MANAGEMENT
  // ===========================================================================

  /**
   * Switch the browser context to the Quick Chat window.
   * @returns True if Quick Chat window was found and switched to
   */
  async switchToQuickChatWindow(): Promise<boolean> {
    const handles = await browser.getWindowHandles();

    for (const handle of handles) {
      await browser.switchToWindow(handle);
      const container = await this.$(this.containerSelector);
      if (await container.isExisting()) {
        this.log('Switched to Quick Chat window');
        return true;
      }
    }

    this.log('Quick Chat window not found in window handles');
    return false;
  }

  /**
   * Switch the browser context to the Quick Chat window by title.
   * @returns True if Quick Chat window was found and switched to
   */
  async switchToQuickChatByTitle(): Promise<boolean> {
    const handles = await browser.getWindowHandles();

    for (const handle of handles) {
      await browser.switchToWindow(handle);
      const title = await browser.getTitle();
      if (title.includes('Quick Chat')) {
        this.log('Switched to Quick Chat window (by title)');
        return true;
      }
    }

    this.log('Quick Chat window not found by title');
    return false;
  }
}

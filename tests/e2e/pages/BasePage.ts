/**
 * Base Page Object Class.
 *
 * Abstract base class that all page objects extend.
 * Provides common helper methods for element interaction and logging.
 *
 * @module BasePage
 */

/// <reference path="../helpers/wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import { E2E_TIMING } from '../helpers/e2eConstants';
import { E2ELogger } from '../helpers/logger';

/**
 * Abstract base class for all Page Objects.
 * Encapsulates common element interaction patterns.
 */
export abstract class BasePage {
  /** Name of this page for logging purposes */
  protected readonly pageName: string;

  constructor(pageName: string) {
    this.pageName = pageName;
  }

  // ===========================================================================
  // Element Selection
  // ===========================================================================

  /**
   * Select a single element by selector.
   * @param selector - CSS selector string
   */
  protected async $(selector: string): Promise<WebdriverIO.Element> {
    return browser.$(selector);
  }

  /**
   * Select multiple elements by selector.
   * @param selector - CSS selector string
   */
  protected async $$(selector: string): Promise<WebdriverIO.Element[]> {
    const parent = await browser.$('body');
    return parent.$$(selector);
  }

  // ===========================================================================
  // Wait Operations
  // ===========================================================================

  /**
   * Wait for an element to be displayed.
   * @param selector - CSS selector string
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  protected async waitForElement(
    selector: string,
    timeout = 5000
  ): Promise<WebdriverIO.Element> {
    const element = await this.$(selector);
    await element.waitForDisplayed({
      timeout,
      timeoutMsg: `[${this.pageName}] Element '${selector}' not displayed within ${timeout}ms`,
    });
    return element;
  }

  /**
   * Wait for an element to exist in the DOM (regardless of visibility).
   * @param selector - CSS selector string
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  protected async waitForElementToExist(
    selector: string,
    timeout = 5000
  ): Promise<WebdriverIO.Element> {
    const element = await this.$(selector);
    await element.waitForExist({
      timeout,
      timeoutMsg: `[${this.pageName}] Element '${selector}' did not exist within ${timeout}ms`,
    });
    return element;
  }

  /**
   * Wait for an element to disappear.
   * @param selector - CSS selector string
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  protected async waitForElementToDisappear(
    selector: string,
    timeout = 5000
  ): Promise<void> {
    const element = await this.$(selector);
    await element.waitForDisplayed({
      timeout,
      reverse: true,
      timeoutMsg: `[${this.pageName}] Element '${selector}' was still displayed after ${timeout}ms`,
    });
  }

  // ===========================================================================
  // Element Interactions
  // ===========================================================================

  /**
   * Click an element by selector.
   * @param selector - CSS selector string
   */
  protected async clickElement(selector: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.click();
    this.log(`Clicked: ${selector}`);
  }

  /**
   * Type text into an input element.
   * @param selector - CSS selector string
   * @param text - Text to type
   */
  protected async typeIntoElement(selector: string, text: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.setValue(text);
    this.log(`Typed into ${selector}: "${text}"`);
  }

  /**
   * Clear an input element.
   * @param selector - CSS selector string
   */
  protected async clearElement(selector: string): Promise<void> {
    const element = await this.waitForElement(selector);
    await element.clearValue();
    this.log(`Cleared: ${selector}`);
  }

  // ===========================================================================
  // Element State Queries
  // ===========================================================================

  /**
   * Get the text content of an element.
   * @param selector - CSS selector string
   */
  protected async getElementText(selector: string): Promise<string> {
    const element = await this.waitForElement(selector);
    return element.getText();
  }

  /**
   * Get the value of an input element.
   * @param selector - CSS selector string
   */
  protected async getElementValue(selector: string): Promise<string> {
    const element = await this.waitForElement(selector);
    return element.getValue();
  }

  /**
   * Get an attribute value from an element.
   * @param selector - CSS selector string
   * @param attribute - Attribute name
   */
  protected async getElementAttribute(
    selector: string,
    attribute: string
  ): Promise<string | null> {
    const element = await this.$(selector);
    return element.getAttribute(attribute);
  }

  /**
   * Check if an element is displayed.
   * @param selector - CSS selector string
   */
  protected async isElementDisplayed(selector: string): Promise<boolean> {
    try {
      const element = await this.$(selector);
      return await element.isDisplayed();
    } catch {
      return false;
    }
  }

  /**
   * Check if an element exists in the DOM.
   * @param selector - CSS selector string
   */
  protected async isElementExisting(selector: string): Promise<boolean> {
    try {
      const element = await this.$(selector);
      return await element.isExisting();
    } catch {
      return false;
    }
  }

  /**
   * Check if an element is enabled (not disabled).
   * @param selector - CSS selector string
   */
  protected async isElementEnabled(selector: string): Promise<boolean> {
    try {
      const element = await this.$(selector);
      return await element.isEnabled();
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  /**
   * Pause execution for a specified time.
   * @param ms - Milliseconds to pause (default: UI_STATE_PAUSE_MS)
   */
  protected async pause(ms = E2E_TIMING.UI_STATE_PAUSE_MS): Promise<void> {
    await browser.pause(ms);
  }

  /**
   * Execute JavaScript in the browser context.
   * @param script - Script to execute
   */
  protected async execute<T>(script: () => T): Promise<T> {
    return browser.execute(script);
  }

  /**
   * Log a message with the page name prefix.
   * @param message - Message to log
   */
  protected log(message: string): void {
    E2ELogger.info(this.pageName, message);
  }
}

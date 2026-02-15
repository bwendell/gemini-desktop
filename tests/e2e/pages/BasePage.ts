/**
 * Base Page Object Class.
 *
 * Abstract base class that all page objects extend.
 * Provides common helper methods for element interaction and logging.
 *
 * @module BasePage
 */

import { browser } from '@wdio/globals';
import { E2E_TIMING } from '../helpers/e2eConstants';
import { E2ELogger } from '../helpers/logger';

type WdioBrowser = {
    $(selector: string): Promise<WebdriverIO.Element>;
    pause(ms: number): Promise<void>;
    execute<T>(script: string | ((...args: any[]) => T), ...args: any[]): Promise<T>;
    waitUntil<T>(
        condition: () => Promise<T> | T,
        options?: {
            timeout?: number;
            timeoutMsg?: string;
            interval?: number;
        }
    ): Promise<T>;
};

type WdioElement = {
    waitForDisplayed(options?: { timeout?: number; reverse?: boolean; timeoutMsg?: string }): Promise<boolean>;
    waitForExist(options?: { timeout?: number; reverse?: boolean; timeoutMsg?: string }): Promise<boolean>;
    click(): Promise<void>;
    setValue(value: string): Promise<void>;
    clearValue(): Promise<void>;
    getText(): Promise<string>;
    getValue(): Promise<string>;
    getAttribute(attribute: string): Promise<string | null>;
    isDisplayed(): Promise<boolean>;
    isExisting(): Promise<boolean>;
    isEnabled(): Promise<boolean>;
    $$(selector: string): Promise<WebdriverIO.Element[]>;
};

const wdioBrowser = browser as unknown as WdioBrowser;

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
        return wdioBrowser.$(selector);
    }

    /**
     * Select multiple elements by selector.
     * @param selector - CSS selector string
     */
    protected async $$(selector: string): Promise<WebdriverIO.Element[]> {
        const parent = (await wdioBrowser.$('body')) as unknown as WdioElement;
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
    protected async waitForElement(selector: string, timeout = 5000): Promise<WebdriverIO.Element> {
        const element = await this.$(selector);
        await (element as unknown as WdioElement).waitForDisplayed({
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
    protected async waitForElementToExist(selector: string, timeout = 5000): Promise<WebdriverIO.Element> {
        const element = await this.$(selector);
        await (element as unknown as WdioElement).waitForExist({
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
    protected async waitForElementToDisappear(selector: string, timeout = 5000): Promise<void> {
        const element = await this.$(selector);
        await (element as unknown as WdioElement).waitForDisplayed({
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
        await (element as unknown as WdioElement).click();
        this.log(`Clicked: ${selector}`);
    }

    /**
     * Type text into an input element.
     * @param selector - CSS selector string
     * @param text - Text to type
     */
    protected async typeIntoElement(selector: string, text: string): Promise<void> {
        const element = await this.waitForElement(selector);
        await (element as unknown as WdioElement).setValue(text);
        this.log(`Typed into ${selector}: "${text}"`);
    }

    /**
     * Clear an input element.
     * @param selector - CSS selector string
     */
    protected async clearElement(selector: string): Promise<void> {
        const element = await this.waitForElement(selector);
        await (element as unknown as WdioElement).clearValue();
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
        return (element as unknown as WdioElement).getText();
    }

    /**
     * Get the value of an input element.
     * @param selector - CSS selector string
     */
    protected async getElementValue(selector: string): Promise<string> {
        const element = await this.waitForElement(selector);
        return (element as unknown as WdioElement).getValue();
    }

    /**
     * Get an attribute value from an element.
     * @param selector - CSS selector string
     * @param attribute - Attribute name
     */
    protected async getElementAttribute(selector: string, attribute: string): Promise<string | null> {
        const element = await this.$(selector);
        return (element as unknown as WdioElement).getAttribute(attribute);
    }

    /**
     * Check if an element is displayed.
     * @param selector - CSS selector string
     */
    protected async isElementDisplayed(selector: string): Promise<boolean> {
        try {
            const element = await this.$(selector);
            return await (element as unknown as WdioElement).isDisplayed();
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
            return await (element as unknown as WdioElement).isExisting();
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
            return await (element as unknown as WdioElement).isEnabled();
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
        await wdioBrowser.pause(ms);
    }

    /**
     * Execute JavaScript in the browser context.
     * @param script - Script to execute
     */
    protected async execute<T, Args extends unknown[]>(script: (...args: Args) => T, ...args: Args): Promise<T> {
        return wdioBrowser.execute(script, ...args);
    }

    protected async waitUntil<T>(
        condition: () => Promise<T> | T,
        options?: {
            timeout?: number;
            timeoutMsg?: string;
            interval?: number;
        }
    ): Promise<T> {
        return wdioBrowser.waitUntil(condition, options);
    }

    /**
     * Log a message with the page name prefix.
     * @param message - Message to log
     */
    protected log(message: string): void {
        E2ELogger.info(this.pageName, message);
    }
}

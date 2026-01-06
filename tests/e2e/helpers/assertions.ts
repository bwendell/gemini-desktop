/**
 * E2E Assertion Helpers.
 *
 * Provides reusable assertion utilities for common verification patterns.
 * These helpers reduce boilerplate and improve test readability.
 *
 * @module assertions
 */

/// <reference path="./wdio-electron.d.ts" />

import { browser, $, expect } from '@wdio/globals';
import { E2ELogger } from './logger';

// =============================================================================
// Element Display Assertions
// =============================================================================

/**
 * Asserts that an element is displayed within the timeout.
 * Combines waitForDisplayed and expect for cleaner test code.
 *
 * @param selector - CSS selector for the element
 * @param options - Optional configuration
 * @param options.timeout - Timeout in ms (default: 5000)
 * @param options.timeoutMsg - Custom timeout message
 */
export async function expectElementDisplayed(
    selector: string,
    options: { timeout?: number; timeoutMsg?: string } = {}
): Promise<void> {
    const { timeout = 5000, timeoutMsg } = options;
    const element = await $(selector);
    await element.waitForDisplayed({
        timeout,
        timeoutMsg: timeoutMsg || `Element '${selector}' was not displayed within ${timeout}ms`,
    });
    await expect(element).toBeDisplayed();
    E2ELogger.info('assertions', `✓ Element displayed: ${selector}`);
}

/**
 * Asserts that an element is NOT displayed (hidden or removed).
 *
 * @param selector - CSS selector for the element
 * @param options - Optional configuration
 * @param options.timeout - Timeout in ms (default: 5000)
 */
export async function expectElementNotDisplayed(selector: string, options: { timeout?: number } = {}): Promise<void> {
    const { timeout = 5000 } = options;
    const element = await $(selector);
    await element.waitForDisplayed({
        timeout,
        reverse: true,
        timeoutMsg: `Element '${selector}' was still displayed after ${timeout}ms`,
    });
    E2ELogger.info('assertions', `✓ Element not displayed: ${selector}`);
}

/**
 * Asserts that an element exists in the DOM (regardless of visibility).
 *
 * @param selector - CSS selector for the element
 * @param options - Optional configuration
 */
export async function expectElementExists(selector: string, options: { timeout?: number } = {}): Promise<void> {
    const { timeout = 5000 } = options;
    const element = await $(selector);
    await element.waitForExist({
        timeout,
        timeoutMsg: `Element '${selector}' did not exist within ${timeout}ms`,
    });
    E2ELogger.info('assertions', `✓ Element exists: ${selector}`);
}

// =============================================================================
// Tab/Selection State Assertions
// =============================================================================

/**
 * Asserts that a tab is currently active (aria-selected="true").
 *
 * @param tabName - The tab identifier (used to construct data-testid)
 * @param options - Optional configuration
 * @param options.selectorPattern - Custom selector pattern (default: options-tab-{tabName})
 */
export async function expectTabActive(
    tabName: string,
    options: { selectorPattern?: string; timeout?: number } = {}
): Promise<void> {
    const { selectorPattern = `options-tab-${tabName}`, timeout = 5000 } = options;
    const selector = `[data-testid="${selectorPattern}"]`;
    const tab = await $(selector);

    await tab.waitForDisplayed({ timeout });
    const isSelected = await tab.getAttribute('aria-selected');
    expect(isSelected).toBe('true');

    E2ELogger.info('assertions', `✓ Tab active: ${tabName}`);
}

/**
 * Asserts that a tab is NOT active (aria-selected="false" or not set).
 *
 * @param tabName - The tab identifier
 */
export async function expectTabNotActive(tabName: string, options: { selectorPattern?: string } = {}): Promise<void> {
    const { selectorPattern = `options-tab-${tabName}` } = options;
    const selector = `[data-testid="${selectorPattern}"]`;
    const tab = await $(selector);

    const isSelected = await tab.getAttribute('aria-selected');
    expect(isSelected).not.toBe('true');

    E2ELogger.info('assertions', `✓ Tab not active: ${tabName}`);
}

// =============================================================================
// Theme Assertions
// =============================================================================

/**
 * Asserts that the specified theme is currently applied to the document.
 *
 * @param expectedTheme - The expected theme ('light' or 'dark')
 */
export async function expectThemeApplied(expectedTheme: 'light' | 'dark'): Promise<void> {
    const actualTheme = await browser.execute(() => {
        return document.documentElement.getAttribute('data-theme');
    });

    expect(actualTheme).toBe(expectedTheme);
    E2ELogger.info('assertions', `✓ Theme applied: ${expectedTheme}`);
}

/**
 * Gets the current theme without asserting.
 * Useful for conditional logic in tests.
 *
 * @returns The current theme value
 */
export async function getCurrentTheme(): Promise<string | null> {
    return browser.execute(() => {
        return document.documentElement.getAttribute('data-theme');
    });
}

// =============================================================================
// Window Count Assertions
// =============================================================================

/**
 * Asserts that the application has exactly the specified number of windows.
 *
 * @param expectedCount - Expected number of windows
 * @param options - Optional configuration
 */
export async function expectWindowCount(expectedCount: number, options: { timeout?: number } = {}): Promise<void> {
    const { timeout = 5000 } = options;

    await browser.waitUntil(
        async () => {
            const handles = await browser.getWindowHandles();
            return handles.length === expectedCount;
        },
        {
            timeout,
            timeoutMsg: `Expected ${expectedCount} windows, but found ${(await browser.getWindowHandles()).length}`,
        }
    );

    const handles = await browser.getWindowHandles();
    expect(handles.length).toBe(expectedCount);
    E2ELogger.info('assertions', `✓ Window count: ${expectedCount}`);
}

/**
 * Asserts that a new window has been opened (count increased by at least 1).
 *
 * @param initialCount - The initial window count before the action
 */
export async function expectNewWindowOpened(initialCount: number, options: { timeout?: number } = {}): Promise<void> {
    const { timeout = 5000 } = options;

    await browser.waitUntil(
        async () => {
            const handles = await browser.getWindowHandles();
            return handles.length > initialCount;
        },
        {
            timeout,
            timeoutMsg: `No new window opened. Initial count: ${initialCount}`,
        }
    );

    E2ELogger.info('assertions', `✓ New window opened (was ${initialCount})`);
}

// =============================================================================
// Toggle/Checkbox Assertions
// =============================================================================

/**
 * Asserts that a toggle switch is in the expected state.
 *
 * @param toggleTestId - The data-testid of the toggle
 * @param expectedState - Whether it should be checked/enabled
 */
export async function expectToggleState(
    toggleTestId: string,
    expectedState: boolean,
    options: { timeout?: number } = {}
): Promise<void> {
    const { timeout = 5000 } = options;
    const selector = `[data-testid="${toggleTestId}"]`;
    const toggle = await $(selector);

    await toggle.waitForDisplayed({ timeout });

    // Toggles may use 'checked', 'aria-checked', or a class
    const ariaChecked = await toggle.getAttribute('aria-checked');
    const isChecked = await toggle.getAttribute('checked');
    const className = await toggle.getAttribute('class');

    const actualState = ariaChecked === 'true' || isChecked !== null || (className && className.includes('checked'));

    expect(actualState).toBe(expectedState);
    E2ELogger.info('assertions', `✓ Toggle ${toggleTestId}: ${expectedState ? 'ON' : 'OFF'}`);
}

// =============================================================================
// Text Content Assertions
// =============================================================================

/**
 * Asserts that an element contains the expected text.
 *
 * @param selector - CSS selector for the element
 * @param expectedText - Text that should be present (can be partial)
 */
export async function expectElementContainsText(
    selector: string,
    expectedText: string,
    options: { timeout?: number } = {}
): Promise<void> {
    const { timeout = 5000 } = options;
    const element = await $(selector);

    await element.waitForDisplayed({ timeout });
    const actualText = await element.getText();

    expect(actualText.toLowerCase()).toContain(expectedText.toLowerCase());
    E2ELogger.info('assertions', `✓ Element contains text: "${expectedText}"`);
}

/**
 * Asserts that an element has exactly the expected text.
 *
 * @param selector - CSS selector for the element
 * @param expectedText - Exact text expected
 */
export async function expectElementText(
    selector: string,
    expectedText: string,
    options: { timeout?: number } = {}
): Promise<void> {
    const { timeout = 5000 } = options;
    const element = await $(selector);

    await element.waitForDisplayed({ timeout });
    const actualText = await element.getText();

    expect(actualText).toBe(expectedText);
    E2ELogger.info('assertions', `✓ Element text: "${expectedText}"`);
}

// =============================================================================
// URL/Navigation Assertions
// =============================================================================

/**
 * Asserts that the current URL contains the expected hash.
 *
 * @param expectedHash - Hash fragment to check for (e.g., '#about')
 */
export async function expectUrlHash(expectedHash: string): Promise<void> {
    const url = await browser.getUrl();
    expect(url).toContain(expectedHash);
    E2ELogger.info('assertions', `✓ URL contains hash: ${expectedHash}`);
}

/**
 * Asserts that the current URL contains a substring.
 *
 * @param expectedSubstring - Substring to check for
 */
export async function expectUrlContains(expectedSubstring: string): Promise<void> {
    const url = await browser.getUrl();
    expect(url).toContain(expectedSubstring);
    E2ELogger.info('assertions', `✓ URL contains: ${expectedSubstring}`);
}

// =============================================================================
// Toast Assertions
// =============================================================================

/**
 * Waits for a toast notification to appear and optionally verifies its content.
 *
 * @param options - Configuration options
 * @param options.selector - Custom toast selector (default: [data-testid="update-toast"])
 * @param options.containsText - Optional text the toast should contain
 * @param options.timeout - Timeout in ms (default: 5000)
 */
export async function expectToastDisplayed(
    options: { selector?: string; containsText?: string; timeout?: number } = {}
): Promise<void> {
    const { selector = '[data-testid="update-toast"]', containsText, timeout = 5000 } = options;

    const toast = await $(selector);
    await toast.waitForDisplayed({ timeout });
    await expect(toast).toBeDisplayed();

    if (containsText) {
        const text = await toast.getText();
        expect(text.toLowerCase()).toContain(containsText.toLowerCase());
    }

    E2ELogger.info('assertions', `✓ Toast displayed${containsText ? `: "${containsText}"` : ''}`);
}

// =============================================================================
// CSS Property Assertions
// =============================================================================

/**
 * Asserts that an element has a specific CSS property value.
 *
 * @param selector - CSS selector for the element
 * @param property - CSS property name
 * @param expectedValue - Expected value (can be partial match)
 */
export async function expectCssProperty(selector: string, property: string, expectedValue: string): Promise<void> {
    const element = await $(selector);
    const cssValue = await element.getCSSProperty(property);

    expect(cssValue.value).toContain(expectedValue);
    E2ELogger.info('assertions', `✓ CSS ${property}: ${expectedValue}`);
}

// =============================================================================
// Attribute Assertions
// =============================================================================

/**
 * Asserts that an element has a specific attribute value.
 *
 * @param selector - CSS selector for the element
 * @param attribute - Attribute name
 * @param expectedValue - Expected value
 */
export async function expectAttribute(selector: string, attribute: string, expectedValue: string): Promise<void> {
    const element = await $(selector);
    const actualValue = await element.getAttribute(attribute);

    expect(actualValue).toBe(expectedValue);
    E2ELogger.info('assertions', `✓ Attribute ${attribute}="${expectedValue}"`);
}

/**
 * Asserts that an element has a class.
 *
 * @param selector - CSS selector for the element
 * @param className - Class name to check for
 */
export async function expectHasClass(selector: string, className: string): Promise<void> {
    const element = await $(selector);
    const classes = await element.getAttribute('class');

    expect(classes).toContain(className);
    E2ELogger.info('assertions', `✓ Has class: ${className}`);
}

/**
 * Asserts that an element does NOT have a class.
 *
 * @param selector - CSS selector for the element
 * @param className - Class name that should be absent
 */
export async function expectNotHasClass(selector: string, className: string): Promise<void> {
    const element = await $(selector);
    const classes = await element.getAttribute('class');

    expect(classes).not.toContain(className);
    E2ELogger.info('assertions', `✓ Does not have class: ${className}`);
}

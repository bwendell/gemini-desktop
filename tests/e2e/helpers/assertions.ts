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

type ElementDebugState = {
    exists: boolean | null;
    displayed: boolean | null;
    enabled: boolean | null;
    text: string | null;
    boundingBox: { x: number; y: number; w: number; h: number } | null;
};

type WindowDebugState = {
    title: string | null;
    url: string | null;
};

type AssertionErrorOptions = {
    baseMessage: string;
    selector?: string;
    timeoutMs?: number;
    startTime?: number;
    extraLines?: string[];
};

const TEXT_PREVIEW_LIMIT = 200;

const formatBoolean = (value: boolean | null): string => {
    if (value === null) {
        return 'unknown';
    }

    return value ? 'true' : 'false';
};

const formatTextPreview = (text: string | null): string => {
    if (text === null) {
        return 'unknown';
    }

    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return '';
    }

    if (normalized.length <= TEXT_PREVIEW_LIMIT) {
        return normalized;
    }

    return `${normalized.slice(0, TEXT_PREVIEW_LIMIT)}…`;
};

const formatBoundingBox = (boundingBox: ElementDebugState['boundingBox']): string => {
    if (!boundingBox) {
        return 'unknown';
    }

    return `{x: ${boundingBox.x}, y: ${boundingBox.y}, w: ${boundingBox.w}, h: ${boundingBox.h}}`;
};

const toErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    try {
        return JSON.stringify(error);
    } catch {
        return String(error);
    }
};

export async function captureElementDebugState(selector: string): Promise<ElementDebugState> {
    const element = await $(selector);
    let exists: boolean | null = null;
    let displayed: boolean | null = null;
    let enabled: boolean | null = null;
    let text: string | null = null;
    let boundingBox: ElementDebugState['boundingBox'] = null;

    try {
        exists = await element.isExisting();
    } catch {
        exists = null;
    }

    if (exists) {
        try {
            displayed = await element.isDisplayed();
        } catch {
            displayed = null;
        }

        try {
            enabled = await element.isEnabled();
        } catch {
            enabled = null;
        }

        try {
            text = await element.getText();
        } catch {
            text = null;
        }

        try {
            const location = await element.getLocation();
            const size = await element.getSize();
            boundingBox = { x: location.x, y: location.y, w: size.width, h: size.height };
        } catch {
            boundingBox = null;
        }
    }

    return {
        exists,
        displayed,
        enabled,
        text,
        boundingBox,
    };
}

const captureWindowDebugState = async (): Promise<WindowDebugState> => {
    let title: string | null = null;
    let url: string | null = null;

    try {
        title = await browser.getTitle();
    } catch {
        title = null;
    }

    try {
        url = await browser.getUrl();
    } catch {
        url = null;
    }

    return { title, url };
};

const buildAssertionErrorMessage = (
    options: AssertionErrorOptions,
    elementState: ElementDebugState | null,
    windowState: WindowDebugState | null,
    originalError: unknown
): string => {
    const lines: string[] = [`AssertionError: ${options.baseMessage}`];

    if (options.selector) {
        lines.push(`Selector: ${options.selector}`);
        const safeState: ElementDebugState = elementState ?? {
            exists: null,
            displayed: null,
            enabled: null,
            text: null,
            boundingBox: null,
        };
        lines.push(
            `Exists: ${formatBoolean(safeState.exists)} | Displayed: ${formatBoolean(
                safeState.displayed
            )} | Enabled: ${formatBoolean(safeState.enabled)}`
        );
        lines.push(
            `Text: "${formatTextPreview(safeState.text)}" | BoundingBox: ${formatBoundingBox(safeState.boundingBox)}`
        );
    }

    if (windowState) {
        const title = windowState.title ?? 'unknown';
        const url = windowState.url ?? 'unknown';
        lines.push(`Window: "${title}" @ ${url}`);
    }

    if (options.startTime !== undefined || options.timeoutMs !== undefined) {
        const waitedMs = options.startTime !== undefined ? Math.max(0, Date.now() - options.startTime) : null;
        const timeoutMs = options.timeoutMs ?? null;
        const waitedDisplay = waitedMs === null ? 'unknown' : `${waitedMs}ms`;
        const timeoutDisplay = timeoutMs === null ? 'unknown' : `${timeoutMs}ms`;
        lines.push(`Waited: ${waitedDisplay} (timeout: ${timeoutDisplay})`);
    }

    if (options.extraLines && options.extraLines.length > 0) {
        lines.push(...options.extraLines);
    }

    const originalMessage = toErrorMessage(originalError);
    if (originalMessage) {
        lines.push(`Original Error: ${originalMessage}`);
    }

    return lines.map((line, index) => (index === 0 ? line : `  ${line}`)).join('\n');
};

const throwEnhancedAssertionError = async (error: unknown, options: AssertionErrorOptions): Promise<never> => {
    const elementState = options.selector ? await captureElementDebugState(options.selector) : null;
    const windowState = await captureWindowDebugState();
    const message = buildAssertionErrorMessage(options, elementState, windowState, error);

    if (error instanceof Error) {
        error.message = message;
        throw error;
    }

    throw new Error(message);
};

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
    const startTime = Date.now();
    const resolvedTimeoutMsg = timeoutMsg || `Element '${selector}' was not displayed within ${timeout}ms`;

    try {
        await element.waitForDisplayed({
            timeout,
            timeoutMsg: resolvedTimeoutMsg,
        });
        await expect(element).toBeDisplayed();
        E2ELogger.info('assertions', `✓ Element displayed: ${selector}`);
    } catch (error) {
        const extraLines = timeoutMsg ? [`TimeoutMessage: ${resolvedTimeoutMsg}`] : undefined;
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected element "${selector}" to be displayed`,
            selector,
            timeoutMs: timeout,
            startTime,
            extraLines,
        });
    }
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
    const startTime = Date.now();
    const timeoutMsg = `Element '${selector}' was still displayed after ${timeout}ms`;

    try {
        await element.waitForDisplayed({
            timeout,
            reverse: true,
            timeoutMsg,
        });
        E2ELogger.info('assertions', `✓ Element not displayed: ${selector}`);
    } catch (error) {
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected element "${selector}" to be hidden`,
            selector,
            timeoutMs: timeout,
            startTime,
            extraLines: [`TimeoutMessage: ${timeoutMsg}`],
        });
    }
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
    const startTime = Date.now();
    const timeoutMsg = `Element '${selector}' did not exist within ${timeout}ms`;

    try {
        await element.waitForExist({
            timeout,
            timeoutMsg,
        });
        E2ELogger.info('assertions', `✓ Element exists: ${selector}`);
    } catch (error) {
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected element "${selector}" to exist`,
            selector,
            timeoutMs: timeout,
            startTime,
            extraLines: [`TimeoutMessage: ${timeoutMsg}`],
        });
    }
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
    const startTime = Date.now();
    let isSelected: string | null = null;

    try {
        await tab.waitForDisplayed({ timeout });
        isSelected = await tab.getAttribute('aria-selected');
        expect(isSelected).toBe('true');
        E2ELogger.info('assertions', `✓ Tab active: ${tabName}`);
    } catch (error) {
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected tab "${tabName}" to be active`,
            selector,
            timeoutMs: timeout,
            startTime,
            extraLines: [`AriaSelected: ${isSelected ?? 'null'}`],
        });
    }
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
    let isSelected: string | null = null;

    try {
        isSelected = await tab.getAttribute('aria-selected');
        expect(isSelected).not.toBe('true');
        E2ELogger.info('assertions', `✓ Tab not active: ${tabName}`);
    } catch (error) {
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected tab "${tabName}" to be inactive`,
            selector,
            extraLines: [`AriaSelected: ${isSelected ?? 'null'}`],
        });
    }
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
    let actualTheme: string | null = null;

    try {
        actualTheme = await browser.execute(() => {
            return document.documentElement.getAttribute('data-theme');
        });

        expect(actualTheme).toBe(expectedTheme);
        E2ELogger.info('assertions', `✓ Theme applied: ${expectedTheme}`);
    } catch (error) {
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected theme "${expectedTheme}" to be applied`,
            extraLines: [`ActualTheme: ${actualTheme ?? 'unknown'}`],
        });
    }
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
    const startTime = Date.now();
    let lastKnownCount: number | null = null;

    try {
        await browser.waitUntil(
            async () => {
                const handles = await browser.getWindowHandles();
                lastKnownCount = handles.length;
                return handles.length === expectedCount;
            },
            {
                timeout,
                timeoutMsg: `Expected ${expectedCount} windows, but found ${(await browser.getWindowHandles()).length}`,
            }
        );

        const handles = await browser.getWindowHandles();
        lastKnownCount = handles.length;
        expect(handles.length).toBe(expectedCount);
        E2ELogger.info('assertions', `✓ Window count: ${expectedCount}`);
    } catch (error) {
        const timeoutMsg = `Expected ${expectedCount} windows, but found ${lastKnownCount ?? 'unknown'}`;
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected window count to be ${expectedCount}`,
            timeoutMs: timeout,
            startTime,
            extraLines: [`CurrentWindowCount: ${lastKnownCount ?? 'unknown'}`, `TimeoutMessage: ${timeoutMsg}`],
        });
    }
}

/**
 * Asserts that a new window has been opened (count increased by at least 1).
 *
 * @param initialCount - The initial window count before the action
 */
export async function expectNewWindowOpened(initialCount: number, options: { timeout?: number } = {}): Promise<void> {
    const { timeout = 5000 } = options;
    const startTime = Date.now();
    let lastKnownCount: number | null = null;

    try {
        await browser.waitUntil(
            async () => {
                const handles = await browser.getWindowHandles();
                lastKnownCount = handles.length;
                return handles.length > initialCount;
            },
            {
                timeout,
                timeoutMsg: `No new window opened. Initial count: ${initialCount}`,
            }
        );

        E2ELogger.info('assertions', `✓ New window opened (was ${initialCount})`);
    } catch (error) {
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected a new window to open (initial count: ${initialCount})`,
            timeoutMs: timeout,
            startTime,
            extraLines: [`CurrentWindowCount: ${lastKnownCount ?? 'unknown'}`],
        });
    }
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
    const startTime = Date.now();
    let ariaChecked: string | null = null;
    let isChecked: string | null = null;
    let className: string | null = null;
    let actualState: boolean | null = null;

    try {
        await toggle.waitForDisplayed({ timeout });

        // Toggles may use 'checked', 'aria-checked', or a class
        ariaChecked = await toggle.getAttribute('aria-checked');
        isChecked = await toggle.getAttribute('checked');
        className = await toggle.getAttribute('class');

        actualState =
            ariaChecked === 'true' || isChecked !== null || (className && className.includes('checked')) || false;

        expect(actualState).toBe(expectedState);
        E2ELogger.info('assertions', `✓ Toggle ${toggleTestId}: ${expectedState ? 'ON' : 'OFF'}`);
    } catch (error) {
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected toggle "${toggleTestId}" to be ${expectedState ? 'ON' : 'OFF'}`,
            selector,
            timeoutMs: timeout,
            startTime,
            extraLines: [
                `AriaChecked: ${ariaChecked ?? 'null'}`,
                `CheckedAttribute: ${isChecked ?? 'null'}`,
                `ClassName: ${className ?? 'null'}`,
                `ResolvedState: ${actualState === null ? 'unknown' : actualState ? 'ON' : 'OFF'}`,
            ],
        });
    }
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
    const startTime = Date.now();
    let actualText: string | null = null;

    try {
        await element.waitForDisplayed({ timeout });
        actualText = await element.getText();

        expect((actualText ?? '').toLowerCase()).toContain(expectedText.toLowerCase());
        E2ELogger.info('assertions', `✓ Element contains text: "${expectedText}"`);
    } catch (error) {
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected element "${selector}" to contain text "${expectedText}"`,
            selector,
            timeoutMs: timeout,
            startTime,
            extraLines: [`ActualText: "${formatTextPreview(actualText)}"`],
        });
    }
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
    const startTime = Date.now();
    let actualText: string | null = null;

    try {
        await element.waitForDisplayed({ timeout });
        actualText = await element.getText();

        expect(actualText).toBe(expectedText);
        E2ELogger.info('assertions', `✓ Element text: "${expectedText}"`);
    } catch (error) {
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected element "${selector}" text to be "${expectedText}"`,
            selector,
            timeoutMs: timeout,
            startTime,
            extraLines: [`ActualText: "${formatTextPreview(actualText)}"`],
        });
    }
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
    let url: string | null = null;

    try {
        url = await browser.getUrl();
        expect(url).toContain(expectedHash);
        E2ELogger.info('assertions', `✓ URL contains hash: ${expectedHash}`);
    } catch (error) {
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected URL to contain hash "${expectedHash}"`,
            extraLines: [`ActualUrl: ${url ?? 'unknown'}`],
        });
    }
}

/**
 * Asserts that the current URL contains a substring.
 *
 * @param expectedSubstring - Substring to check for
 */
export async function expectUrlContains(expectedSubstring: string): Promise<void> {
    let url: string | null = null;

    try {
        url = await browser.getUrl();
        expect(url).toContain(expectedSubstring);
        E2ELogger.info('assertions', `✓ URL contains: ${expectedSubstring}`);
    } catch (error) {
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected URL to contain "${expectedSubstring}"`,
            extraLines: [`ActualUrl: ${url ?? 'unknown'}`],
        });
    }
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
    const startTime = Date.now();
    let actualText: string | null = null;

    try {
        await toast.waitForDisplayed({ timeout });
        await expect(toast).toBeDisplayed();

        if (containsText) {
            actualText = await toast.getText();
            expect((actualText ?? '').toLowerCase()).toContain(containsText.toLowerCase());
        }

        E2ELogger.info('assertions', `✓ Toast displayed${containsText ? `: "${containsText}"` : ''}`);
    } catch (error) {
        const extraLines = containsText
            ? [`ExpectedText: "${containsText}"`, `ActualText: "${formatTextPreview(actualText)}"`]
            : undefined;
        return throwEnhancedAssertionError(error, {
            baseMessage: containsText
                ? `Expected toast "${selector}" to contain text "${containsText}"`
                : `Expected toast "${selector}" to be displayed`,
            selector,
            timeoutMs: timeout,
            startTime,
            extraLines,
        });
    }
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
    let cssValue: string | null = null;

    try {
        const cssProperty = await element.getCSSProperty(property);
        cssValue = cssProperty.value;

        expect(cssValue).toContain(expectedValue);
        E2ELogger.info('assertions', `✓ CSS ${property}: ${expectedValue}`);
    } catch (error) {
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected element "${selector}" CSS ${property} to contain "${expectedValue}"`,
            selector,
            extraLines: [`ActualValue: ${cssValue ?? 'unknown'}`],
        });
    }
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
    let actualValue: string | null = null;

    try {
        actualValue = await element.getAttribute(attribute);
        expect(actualValue).toBe(expectedValue);
        E2ELogger.info('assertions', `✓ Attribute ${attribute}="${expectedValue}"`);
    } catch (error) {
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected element "${selector}" attribute ${attribute} to be "${expectedValue}"`,
            selector,
            extraLines: [`ActualValue: ${actualValue ?? 'null'}`],
        });
    }
}

/**
 * Asserts that an element has a class.
 *
 * @param selector - CSS selector for the element
 * @param className - Class name to check for
 */
export async function expectHasClass(selector: string, className: string): Promise<void> {
    const element = await $(selector);
    let classes: string | null = null;

    try {
        classes = await element.getAttribute('class');
        expect(classes).toContain(className);
        E2ELogger.info('assertions', `✓ Has class: ${className}`);
    } catch (error) {
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected element "${selector}" to have class "${className}"`,
            selector,
            extraLines: [`ActualClasses: ${classes ?? 'null'}`],
        });
    }
}

/**
 * Asserts that an element does NOT have a class.
 *
 * @param selector - CSS selector for the element
 * @param className - Class name that should be absent
 */
export async function expectNotHasClass(selector: string, className: string): Promise<void> {
    const element = await $(selector);
    let classes: string | null = null;

    try {
        classes = await element.getAttribute('class');
        expect(classes).not.toContain(className);
        E2ELogger.info('assertions', `✓ Does not have class: ${className}`);
    } catch (error) {
        return throwEnhancedAssertionError(error, {
            baseMessage: `Expected element "${selector}" to not have class "${className}"`,
            selector,
            extraLines: [`ActualClasses: ${classes ?? 'null'}`],
        });
    }
}

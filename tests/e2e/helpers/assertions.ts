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

export const captureWindowDebugState = async (): Promise<WindowDebugState> => {
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

export const buildAssertionErrorMessage = (
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

export const throwEnhancedAssertionError = async (error: unknown, options: AssertionErrorOptions): Promise<never> => {
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

// =============================================================================
// Toggle/Checkbox Assertions
// =============================================================================

// =============================================================================
// Text Content Assertions
// =============================================================================

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

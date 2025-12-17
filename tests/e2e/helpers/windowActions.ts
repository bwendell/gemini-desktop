/**
 * Window management utilities.
 */
import { browser, $ } from '@wdio/globals';
import { isMacOS } from './platform';
import { E2ELogger } from './logger';

/**
 * Wait for a specific number of windows to exist.
 * @param expectedCount The number of windows expected
 * @param timeout Timeout in ms (default 5000)
 */
export async function waitForWindowCount(expectedCount: number, timeout = 5000): Promise<void> {
    await browser.waitUntil(
        async () => (await browser.getWindowHandles()).length === expectedCount,
        {
            timeout,
            timeoutMsg: `Expected ${expectedCount} windows, but found ${(await browser.getWindowHandles()).length}`
        }
    );
}

/**
 * Switch to a window by its index in the handles array.
 * @param index The 0-based index of the window
 */
export async function switchToWindowByIndex(index: number): Promise<void> {
    const handles = await browser.getWindowHandles();
    if (handles[index]) {
        await browser.switchToWindow(handles[index]);
    } else {
        throw new Error(`Window at index ${index} does not exist. Total windows: ${handles.length}`);
    }
}

/**
 * Closes the current focused window using platform-specific methods.
 * - macOS: invalidates using Command+W
 * - Windows/Linux: uses close button if present, else Alt+F4
 */
export async function closeCurrentWindow(): Promise<void> {
    const mac = await isMacOS();
    if (mac) {
        E2ELogger.info('windowActions', 'Closing window via Keyboard (Cmd+W) for macOS');
        await browser.keys(['Meta', 'w']);
    } else {
        const closeBtn = await $('[data-testid="close-button"], [data-testid="options-close-button"]');
        if (await closeBtn.isExisting()) {
            E2ELogger.info('windowActions', 'Closing window via GUI Close Button');
            await closeBtn.click();
        } else {
            E2ELogger.info('windowActions', 'Closing window via Keyboard (Alt+F4) fallback');
            await browser.keys(['Alt', 'F4']);
        }
    }
}

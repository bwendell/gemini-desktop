/**
 * Options Window E2E Test Helpers.
 *
 * Provides utilities for interacting with the Options window.
 *
 * @module optionsWindowActions
 */

/// <reference path="./wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import { E2ELogger } from './logger';
import { isMacOS } from './platform';
import { E2E_TIMING } from './e2eConstants';
import { waitForWindowCount } from './waitUtilities';

type OWBrowser = {
    keys(value: string | string[]): Promise<void>;
    waitUntil<T>(condition: () => Promise<T> | T, options?: { timeout?: number; timeoutMsg?: string }): Promise<T>;
    getWindowHandles(): Promise<string[]>;
    switchToWindow(handle: string): Promise<void>;
    closeWindow(): Promise<void>;
    $(
        selector: string
    ): Promise<{
        isExisting(): Promise<boolean>;
        waitForDisplayed(opts?: { timeout?: number; timeoutMsg?: string }): Promise<void>;
        click(): Promise<void>;
    }>;
};
const owBrowser = browser as unknown as OWBrowser;
/**
 * Opens the options window using the keyboard shortcut (Cmd+, or Ctrl+,).
 *
 * @param waitMs - Time to wait after pressing keys (defaults to E2E_TIMING.IPC_ROUND_TRIP)
 */
export async function openOptionsWindowViaHotkey(waitMs = E2E_TIMING.IPC_ROUND_TRIP): Promise<void> {
    const isMac = await isMacOS();
    const modifier = isMac ? 'Meta' : 'Control';
    E2ELogger.info('optionsWindowActions', `Opening Options window via hotkey: ${modifier}+,`);
    await owBrowser.keys([modifier, ',']);
    await waitForWindowCount(2, waitMs);
}

/**
 * Waits for the options window to be present and loaded.
 * Handles switching context to the options window if multiple windows are open.
 *
 * @param timeout - Timeout in milliseconds (defaults to 5000)
 */
export async function waitForOptionsWindow(timeout = 10000): Promise<void> {
    E2ELogger.info('optionsWindowActions', 'Waiting for Options window to load');

    // Wait for a second window to appear if not already there
    await owBrowser.waitUntil(async () => (await owBrowser.getWindowHandles()).length > 1, {
        timeout,
        timeoutMsg: 'Options window handle did not appear',
    });

    const handles = await owBrowser.getWindowHandles();
    // Assume the last window is the new one (Options)
    await owBrowser.switchToWindow(handles[handles.length - 1]);

    await owBrowser.waitUntil(
        async () => {
            const content = await owBrowser.$('[data-testid="options-content"]');
            return await content.isExisting();
        },
        {
            timeout,
            timeoutMsg: 'Options window content ([data-testid="options-content"]) did not load',
        }
    );
}

/**
 * Closes the currently focused options window and switches back to the main window.
 */
export async function closeOptionsWindow(): Promise<void> {
    E2ELogger.info('optionsWindowActions', 'Closing Options window');
    await owBrowser.closeWindow();

    const handles = await owBrowser.getWindowHandles();
    if (handles.length > 0) {
        await owBrowser.switchToWindow(handles[0]);
    }
}

/**
 * Retrieves the window handle for the options window.
 * Assumes the options window is the second window in the list.
 */
export async function getOptionsWindowHandle(): Promise<string | null> {
    const handles = await owBrowser.getWindowHandles();
    return handles.length > 1 ? handles[1] : null;
}

/**
 * Switches the browser context to the options window.
 * Throws an error if the options window is not found.
 */
export async function switchToOptionsWindow(): Promise<void> {
    E2ELogger.info('optionsWindowActions', 'Switching to Options window');
    const handle = await getOptionsWindowHandle();
    if (!handle) {
        throw new Error('Options window handle not found');
    }
    await owBrowser.switchToWindow(handle);
}

/**
 * Navigates to a specific tab in the options window.
 *
 * @param tabName - The name of the tab to navigate to (e.g., 'settings', 'about').
 */
export async function navigateToOptionsTab(tabName: string): Promise<void> {
    E2ELogger.info('optionsWindowActions', `Navigating to options tab: ${tabName}`);
    const tabSelector = `[data-testid="options-tab-${tabName}"]`;
    const tab = await owBrowser.$(tabSelector);

    await tab.waitForDisplayed({
        timeout: 5000,
        timeoutMsg: `Options tab '${tabName}' not displayed`,
    });
    await tab.click();
}

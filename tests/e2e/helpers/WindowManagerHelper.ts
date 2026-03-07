/**
 * Window Manager Helper.
 *
 * Provides safe window cleanup operations that properly handle WebDriver session cleanup.
 * This module addresses the issue where closing windows via browser.execute() causes
 * the WebDriver connection to drop.
 *
 * @module WindowManagerHelper
 */

import { browser } from '@wdio/globals';
import { E2ELogger } from './logger';

type BrowserWithElectronClose = {
    getWindowHandles(): Promise<string[]>;
    switchToWindow(handle: string): Promise<void>;
    closeWindow(): Promise<void>;
    execute<T>(script: (...args: unknown[]) => T, ...args: unknown[]): Promise<T>;
};

const helperBrowser = browser as unknown as BrowserWithElectronClose;

async function isWindowsRuntime(): Promise<boolean> {
    return helperBrowser.execute(() => navigator.platform.toLowerCase().includes('win'));
}

export async function closeFocusedWindowSafely(): Promise<void> {
    if (await isWindowsRuntime()) {
        await helperBrowser.execute(() => {
            (window as Window & { electronAPI?: { closeWindow?: () => void } }).electronAPI?.closeWindow?.();
        });
        return;
    }

    await helperBrowser.closeWindow();
}

/**
 * Safely closes all windows except the main window.
 * Uses platform-safe close behavior to avoid Windows session disconnects.
 *
 * @param mainWindowHandle - The handle of the main window to preserve
 */
export async function closeAllSecondaryWindows(mainWindowHandle: string): Promise<void> {
    const handles = await helperBrowser.getWindowHandles();

    for (const handle of handles) {
        if (handle !== mainWindowHandle) {
            try {
                await helperBrowser.switchToWindow(handle);
                E2ELogger.info('WindowManagerHelper', `Closing secondary window: ${handle}`);
                await closeFocusedWindowSafely();
            } catch {
                // Window might already be closed
                E2ELogger.info('WindowManagerHelper', `Window ${handle} already closed or inaccessible`);
            }
        }
    }

    // Switch back to main window
    await switchToMainWindowSafely(mainWindowHandle);
}

/**
 * Safely switch back to the main window, with fallback to first available window.
 *
 * @param mainWindowHandle - The expected main window handle
 */
export async function switchToMainWindowSafely(mainWindowHandle: string): Promise<void> {
    const remainingHandles = await browser.getWindowHandles();

    if (remainingHandles.includes(mainWindowHandle)) {
        await browser.switchToWindow(mainWindowHandle);
        E2ELogger.info('WindowManagerHelper', 'Switched back to main window');
    } else if (remainingHandles.length > 0) {
        await browser.switchToWindow(remainingHandles[0]);
        E2ELogger.info(
            'WindowManagerHelper',
            `Main window not found, switched to first available: ${remainingHandles[0]}`
        );
    }
}

/**
 * Close a specific window by its handle.
 * Uses platform-safe close behavior to avoid Windows session disconnects.
 *
 * @param windowHandle - The handle of the window to close
 * @param returnToHandle - Optional handle to switch to after closing
 */
export async function closeWindowByHandle(windowHandle: string, returnToHandle?: string): Promise<void> {
    try {
        await helperBrowser.switchToWindow(windowHandle);
        E2ELogger.info('WindowManagerHelper', `Closing window: ${windowHandle}`);
        await closeFocusedWindowSafely();
    } catch {
        E2ELogger.info('WindowManagerHelper', `Window ${windowHandle} already closed or inaccessible`);
    }

    if (returnToHandle) {
        await switchToMainWindowSafely(returnToHandle);
    }
}

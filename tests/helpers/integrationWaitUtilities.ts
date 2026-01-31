/// <reference path="../e2e/helpers/wdio-electron.d.ts" />

import { browser } from '@wdio/globals';

/** Default timeout for wait operations (ms) */
export const DEFAULT_TIMEOUT = 5000;

/** Default polling interval for wait operations (ms) */
export const DEFAULT_INTERVAL = 100;

/**
 * Wait for zoom factor to reach expected value.
 * Polls webContents.getZoomFactor() until it matches.
 *
 * @param expectedZoomPercent - Expected zoom percentage (e.g., 150 for 150%)
 * @param options - Wait options
 */
export async function waitForZoomLevel(
    expectedZoomPercent: number,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;
    const expectedFactor = expectedZoomPercent / 100;

    await browser.waitUntil(
        async () => {
            const actualFactor = await browser.electron.execute(() => {
                // @ts-expect-error - global.windowManager is available in main process
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.getZoomFactor();
                }
                return null;
            });
            if (actualFactor === null) return false;
            // Use tolerance for floating point comparison
            return Math.abs(actualFactor - expectedFactor) < 0.01;
        },
        {
            timeout,
            interval,
            timeoutMsg: `Zoom level did not reach ${expectedZoomPercent}% within ${timeout}ms`,
        }
    );
}

/**
 * Wait for a store value to match expected value.
 * Polls ipcManager.store.get() until it matches.
 *
 * IMPORTANT: When using browser.electron.execute() with parameters,
 * the wdio-electron service always passes `electron` module as the
 * first argument to the callback. Additional parameters are appended
 * after `electron`. Example:
 *   browser.electron.execute((_electron, myKey) => { ... }, key)
 *
 * @param key - Store key to check
 * @param expectedValue - Expected value
 * @param options - Wait options
 */
export async function waitForStorePersistence<T>(
    key: string,
    expectedValue: T,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;

    await browser.waitUntil(
        async () => {
            const actualValue = await browser.electron.execute((_electron, storeKey) => {
                // @ts-expect-error - global.ipcManager is available in main process
                return global.ipcManager.store.get(storeKey);
            }, key);
            return actualValue === expectedValue;
        },
        {
            timeout,
            interval,
            timeoutMsg: `Store key "${key}" did not reach expected value within ${timeout}ms`,
        }
    );
}

/**
 * Wait for IPC operations to settle.
 * Used after operations that trigger IPC communication.
 * Uses a short deterministic wait with verification.
 *
 * @param options - Wait options
 */
export async function waitForIPCSettle(options: { timeout?: number; interval?: number } = {}): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, interval = 50 } = options;

    // Wait for any pending IPC by checking that the main window is responsive
    await browser.waitUntil(
        async () => {
            const isResponsive = await browser.electron.execute(() => {
                // @ts-expect-error - global.windowManager is available in main process
                const mainWin = global.windowManager.getMainWindow();
                return mainWin && !mainWin.isDestroyed() && !mainWin.webContents.isLoading();
            });
            return isResponsive === true;
        },
        {
            timeout,
            interval,
            timeoutMsg: `IPC did not settle within ${timeout}ms`,
        }
    );
}

/**
 * Wait for window count to reach expected value.
 * Polls BrowserWindow.getAllWindows().length.
 *
 * @param expectedCount - Expected number of windows
 * @param options - Wait options
 */
export async function waitForWindowCount(
    expectedCount: number,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;

    await browser.waitUntil(
        async () => {
            const handles = await browser.getWindowHandles();
            return handles.length === expectedCount;
        },
        {
            timeout,
            interval,
            timeoutMsg: `Window count did not reach ${expectedCount} within ${timeout}ms`,
        }
    );
}

/**
 * Wait for window count to be greater than a value.
 * Useful for waiting for new windows to appear.
 *
 * @param minCount - Minimum number of windows expected
 * @param options - Wait options
 */
export async function waitForWindowCountGreaterThan(
    minCount: number,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;

    await browser.waitUntil(
        async () => {
            const handles = await browser.getWindowHandles();
            return handles.length > minCount;
        },
        {
            timeout,
            interval,
            timeoutMsg: `Window count did not exceed ${minCount} within ${timeout}ms`,
        }
    );
}

/**
 * Wait for a window state predicate to be true.
 * Generic utility for custom window state checks.
 *
 * @param predicate - Function that returns true when condition is met (runs in main process)
 * @param options - Wait options
 */
export async function waitForWindowState(
    predicate: () => boolean,
    options: { timeout?: number; interval?: number; timeoutMsg?: string } = {}
): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL, timeoutMsg } = options;

    await browser.waitUntil(
        async () => {
            const result = await browser.electron.execute(predicate);
            return result === true;
        },
        {
            timeout,
            interval,
            timeoutMsg: timeoutMsg || `Window state predicate not satisfied within ${timeout}ms`,
        }
    );
}

/**
 * Wait for an Electron state getter to return expected value.
 * Generic utility for polling any main process state.
 *
 * @param getter - Function that returns current state (runs in main process)
 * @param expected - Expected value
 * @param options - Wait options
 */
export async function waitForElectronState<T>(
    getter: () => T,
    expected: T,
    options: { timeout?: number; interval?: number; timeoutMsg?: string } = {}
): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL, timeoutMsg } = options;

    await browser.waitUntil(
        async () => {
            const actual = await browser.electron.execute(getter);
            return actual === expected;
        },
        {
            timeout,
            interval,
            timeoutMsg: timeoutMsg || `Electron state did not reach expected value within ${timeout}ms`,
        }
    );
}

/**
 * Wait for main window visibility state.
 *
 * @param visible - Expected visibility state
 * @param options - Wait options
 */
export async function waitForMainWindowVisibility(
    visible: boolean,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;

    await browser.waitUntil(
        async () => {
            const isVisible = await browser.electron.execute(() => {
                // @ts-expect-error - global.windowManager is available in main process
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.isVisible();
                }
                return false;
            });
            return isVisible === visible;
        },
        {
            timeout,
            interval,
            timeoutMsg: `Main window visibility did not become ${visible} within ${timeout}ms`,
        }
    );
}

/**
 * Wait for main window to be focused.
 *
 * @param focused - Expected focus state
 * @param options - Wait options
 */
export async function waitForMainWindowFocus(
    focused: boolean,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;

    await browser.waitUntil(
        async () => {
            const isFocused = await browser.electron.execute(() => {
                // @ts-expect-error - global.windowManager is available in main process
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.isFocused();
                }
                return false;
            });
            return isFocused === focused;
        },
        {
            timeout,
            interval,
            timeoutMsg: `Main window focus did not become ${focused} within ${timeout}ms`,
        }
    );
}

/**
 * Wait for app initialization to complete.
 * Used at the start of test suites.
 *
 * @param options - Wait options
 */
export async function waitForAppReady(options: { timeout?: number; interval?: number } = {}): Promise<void> {
    const { timeout = 10000, interval = DEFAULT_INTERVAL } = options;

    // Wait for at least one window handle
    await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0, {
        timeout,
        interval,
        timeoutMsg: 'No window handles available',
    });

    // Wait for renderer to be ready
    await browser.execute(async () => {
        return await new Promise<void>((resolve) => {
            if (document.readyState === 'complete') return resolve();
            window.addEventListener('load', () => resolve());
        });
    });

    // Wait for main process to be fully initialized
    await browser.waitUntil(
        async () => {
            const ready = await browser.electron.execute(() => {
                // @ts-expect-error - global.windowManager is available in main process
                return global.windowManager && global.windowManager.getMainWindow() !== null;
            });
            return ready === true;
        },
        {
            timeout,
            interval,
            timeoutMsg: 'App did not become ready within timeout',
        }
    );
}

export async function waitForSecondaryWindowsClose(
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;

    // Single-shot-per-iteration approach: close ONE window per waitUntil cycle,
    // then let CDP fully process before checking/closing the next.
    // This prevents race conditions where CDP commands pile up during teardown.
    await browser.waitUntil(
        async () => {
            const handles = await browser.getWindowHandles();

            if (handles.length <= 1) {
                return true;
            }

            const mainHandle = handles[0];
            const secondaryHandle = handles[1];

            try {
                await browser.switchToWindow(secondaryHandle);

                // SAFETY: Verify URL to prevent closing main window (would crash the app)
                const url = await browser.getUrl();
                const isSecondary = url.includes('options') || url.includes('quickchat');

                if (isSecondary) {
                    await browser.execute(() => {
                        const api = (window as any).electronAPI;
                        if (api?.closeWindow) {
                            api.closeWindow();
                        } else {
                            window.close();
                        }
                    });
                }

                await browser.switchToWindow(mainHandle);
            } catch {
                // Window closed mid-operation - will re-check on next iteration
            }

            return false;
        },
        {
            timeout,
            interval,
            timeoutMsg: 'Secondary windows did not close within timeout',
        }
    );

    // Ensure we're on the main window
    const finalHandles = await browser.getWindowHandles();
    if (finalHandles.length > 0) {
        await browser.switchToWindow(finalHandles[0]);
    }
}

/**
 * Wait for toast/notification to appear or disappear.
 *
 * @param visible - Expected visibility state
 * @param options - Wait options
 */
export async function waitForToastVisibility(
    visible: boolean,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;

    await browser.waitUntil(
        async () => {
            const toastVisible = await browser.electron.execute(() => {
                // @ts-expect-error - global.windowManager is available in main process
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    // Check for toast element in the renderer
                    return mainWin.webContents.executeJavaScript(
                        'document.querySelector("[data-testid=\'toast\']") !== null'
                    );
                }
                return false;
            });
            return toastVisible === visible;
        },
        {
            timeout,
            interval,
            timeoutMsg: `Toast visibility did not become ${visible} within ${timeout}ms`,
        }
    );
}

/**
 * Wait for update state to reach expected value.
 * Used in auto-update tests.
 *
 * @param expectedState - Expected update state
 * @param options - Wait options
 */
export async function waitForUpdateState(
    expectedState: string,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;

    await browser.waitUntil(
        async () => {
            const state = await browser.electron.execute(() => {
                // @ts-expect-error - global.updateManager is available in main process
                if (global.updateManager) {
                    return global.updateManager.getState?.() || null;
                }
                return null;
            });
            return state === expectedState;
        },
        {
            timeout,
            interval,
            timeoutMsg: `Update state did not reach "${expectedState}" within ${timeout}ms`,
        }
    );
}

/**
 * Wait for a UI toggle element to reach expected state.
 * Polls the element's checked/aria-checked state.
 *
 * @param selector - CSS selector for the toggle element
 * @param expectedState - Expected checked state (true/false)
 * @param options - Wait options
 */
export async function waitForUIToggle(
    selector: string,
    expectedState: boolean,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, interval = 50 } = options;

    await browser.waitUntil(
        async () => {
            const isChecked = await browser.electron.execute((_electron, sel) => {
                // @ts-expect-error - global.windowManager is available in main process
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.executeJavaScript(`
                        (function() {
                            const el = document.querySelector('${sel}');
                            if (!el) return null;
                            return el.checked ?? el.getAttribute('aria-checked') === 'true';
                        })()
                    `);
                }
                return null;
            }, selector);
            return isChecked === expectedState;
        },
        {
            timeout,
            interval,
            timeoutMsg: `UI toggle "${selector}" did not reach state ${expectedState} within ${timeout}ms`,
        }
    );
}

/**
 * Wait for options/settings to be saved and persisted.
 * Combines IPC settle with store verification.
 *
 * @param storeKey - The store key to verify
 * @param expectedValue - Expected value after save
 * @param options - Wait options
 */
export async function waitForOptionsSave<T>(
    storeKey: string,
    expectedValue: T,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;

    // First wait for IPC to settle
    await waitForIPCSettle({ timeout: Math.floor(timeout / 2), interval });

    // Then verify store value
    await browser.waitUntil(
        async () => {
            const actualValue = await browser.electron.execute((_electron, key) => {
                // @ts-expect-error - global.ipcManager is available in main process
                return global.ipcManager.store.get(key);
            }, storeKey);
            return actualValue === expectedValue;
        },
        {
            timeout: Math.floor(timeout / 2),
            interval,
            timeoutMsg: `Options save for "${storeKey}" did not reach expected value within ${timeout}ms`,
        }
    );
}

/**
 * Wait for content to finish loading in main window.
 * Checks webContents.isLoading() returns false.
 *
 * @param options - Wait options
 */
export async function waitForContentReady(options: { timeout?: number; interval?: number } = {}): Promise<void> {
    const { timeout = 10000, interval = DEFAULT_INTERVAL } = options;

    await browser.waitUntil(
        async () => {
            const isLoading = await browser.electron.execute(() => {
                // @ts-expect-error - global.windowManager is available in main process
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.isLoading();
                }
                return true; // Assume loading if no window
            });
            return isLoading === false;
        },
        {
            timeout,
            interval,
            timeoutMsg: `Content did not finish loading within ${timeout}ms`,
        }
    );
}

/**
 * Wait for notification manager state to match expected value.
 *
 * @param enabled - Expected enabled state
 * @param options - Wait options
 */
export async function waitForNotificationState(
    enabled: boolean,
    options: { timeout?: number; interval?: number } = {}
): Promise<void> {
    const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;

    await browser.waitUntil(
        async () => {
            const isEnabled = await browser.electron.execute(() => {
                // @ts-expect-error - global.ipcManager is available in main process
                if (global.ipcManager && global.ipcManager.store) {
                    return global.ipcManager.store.get('responseNotificationsEnabled');
                }
                return null;
            });
            return isEnabled === enabled;
        },
        {
            timeout,
            interval,
            timeoutMsg: `Notification state did not become ${enabled} within ${timeout}ms`,
        }
    );
}

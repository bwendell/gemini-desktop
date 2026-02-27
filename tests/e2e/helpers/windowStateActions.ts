/**
 * Window state actions for E2E testing.
 *
 * Provides access to Electron window state via IPC calls.
 * Works on all platforms (Windows, macOS, Linux).
 *
 * ## Architecture
 * - Uses browser.execute() to call window.electronAPI methods
 * - Uses browser.electron.execute() for direct BrowserWindow access
 * - Graceful fallbacks when APIs are unavailable
 *
 * @module windowStateActions
 */
/// <reference path="./wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import { E2ELogger } from './logger';
import { E2E_TIMING } from './e2eConstants';
import { waitForUIState } from './waitUtilities';

// ============================================================================
// Types
// ============================================================================

export interface WindowState {
    isMaximized: boolean;
    isMinimized: boolean;
    isFullScreen: boolean;
    isVisible: boolean;
    isDestroyed: boolean;
}

type WindowStateBrowser = typeof browser & {
    pause(ms: number): Promise<void>;
    execute<T>(script: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T>;
    electron: {
        execute<T, A extends unknown[]>(
            fn: (electron: typeof import('electron'), ...args: A) => T,
            ...args: A
        ): Promise<T>;
    };
};

const windowStateBrowser = browser as unknown as WindowStateBrowser;

async function executeElectronWithRetry<T>(action: () => Promise<T>): Promise<T> {
    let result!: T;
    let lastError: unknown;
    let succeeded = false;
    const ready = await waitForUIState(
        async () => {
            try {
                result = await action();
                succeeded = true;
                return true;
            } catch (error) {
                lastError = error;
                return false;
            }
        },
        {
            timeout: E2E_TIMING.TIMEOUTS?.IPC_OPERATION ?? 3000,
            interval: E2E_TIMING.POLLING?.IPC ?? 50,
            description: 'Electron bridge execute',
        }
    );

    if (!ready || !succeeded) {
        throw lastError instanceof Error ? lastError : new Error('Electron bridge execute failed');
    }

    return result;
}

// ============================================================================
// State Query Functions
// ============================================================================

/**
 * Gets the complete window state.
 *
 * @returns Object with isMaximized, isMinimized, isFullScreen
 */
export async function getWindowState(): Promise<WindowState> {
    const state = await executeElectronWithRetry(() =>
        windowStateBrowser.electron.execute((electron: typeof import('electron')) => {
            // use getAllWindows() because getFocusedWindow() returns null if window is minimized
            const wins = electron.BrowserWindow.getAllWindows();
            const win = wins[0];

            if (!win) {
                return {
                    isMaximized: false,
                    isMinimized: false,
                    isFullScreen: false,
                    isVisible: false,
                    isDestroyed: false,
                };
            }
            return {
                isMaximized: win.isMaximized(),
                isMinimized: win.isMinimized(),
                isFullScreen: win.isFullScreen(),
                isVisible: win.isVisible(),
                isDestroyed: win.isDestroyed(),
            };
        })
    );

    E2ELogger.info('windowStateActions', `Window state: ${JSON.stringify(state)}`);
    return state;
}

/**
 * Checks if the current window is maximized.
 */
export async function isWindowMaximized(): Promise<boolean> {
    const result = await windowStateBrowser.execute(() => {
        return (window as any).electronAPI?.isMaximized?.() ?? false;
    });

    // If electronAPI method doesn't exist, fall back to Electron direct access
    if (result === false) {
        const state = await getWindowState();
        return state.isMaximized;
    }

    return result;
}

/**
 * Checks if the current window is minimized.
 */
export async function isWindowMinimized(): Promise<boolean> {
    const state = await getWindowState();
    return state.isMinimized;
}

/**
 * Checks if the current window is in fullscreen mode.
 */
export async function isWindowFullScreen(): Promise<boolean> {
    const state = await getWindowState();
    return state.isFullScreen;
}

/**
 * Checks if the current window is visible.
 */
export async function isWindowVisible(): Promise<boolean> {
    const state = await getWindowState();
    return state.isVisible;
}

/**
 * Checks if the current window is destroyed.
 */
export async function isWindowDestroyed(): Promise<boolean> {
    const state = await getWindowState();
    return state.isDestroyed;
}

// ============================================================================
// Action Functions (via IPC)
// ============================================================================

/**
 * Maximizes the current window via Electron API.
 */
export async function maximizeWindow(): Promise<void> {
    E2ELogger.info('windowStateActions', 'Maximizing window via API');

    await windowStateBrowser.execute(() => {
        (window as any).electronAPI?.maximizeWindow?.();
    });

    // Give the window time to transition
    await windowStateBrowser.pause(E2E_TIMING.QUICK_RESTORE);
}

/**
 * Minimizes the current window via Electron API.
 */
export async function minimizeWindow(): Promise<void> {
    E2ELogger.info('windowStateActions', 'Minimizing window via API');

    await windowStateBrowser.execute(() => {
        (window as any).electronAPI?.minimizeWindow?.();
    });

    await windowStateBrowser.pause(E2E_TIMING.QUICK_RESTORE);
}

/**
 * Restores the window from maximized/minimized state.
 */
export async function restoreWindow(): Promise<void> {
    E2ELogger.info('windowStateActions', 'Restoring window via API');

    // Use direct Electron API for restore (not exposed via electronAPI)
    await executeElectronWithRetry(() =>
        windowStateBrowser.electron.execute((electron: typeof import('electron')) => {
            const win = electron.BrowserWindow.getAllWindows()[0];
            if (win) {
                if (win.isMaximized()) {
                    win.unmaximize();
                }
                if (win.isMinimized()) {
                    win.restore();
                }
                if (!win.isVisible()) {
                    win.show();
                }
            }
        })
    );

    await windowStateBrowser.pause(E2E_TIMING.QUICK_RESTORE);
}

/**
 * Closes the current window via Electron API.
 */
export async function closeWindow(): Promise<void> {
    E2ELogger.info('windowStateActions', 'Closing window via API');

    await windowStateBrowser.execute(() => {
        (window as any).electronAPI?.closeWindow?.();
    });
}

/**
 * Hides the current window (e.g., minimize to tray).
 */
export async function hideWindow(): Promise<void> {
    E2ELogger.info('windowStateActions', 'Hiding window via API');

    await executeElectronWithRetry(() =>
        windowStateBrowser.electron.execute((electron: typeof import('electron')) => {
            const win = electron.BrowserWindow.getAllWindows()[0];
            if (win) {
                win.hide();
            }
        })
    );

    await windowStateBrowser.pause(E2E_TIMING.QUICK_RESTORE);
}

/**
 * Shows the current window (e.g., restore from tray).
 */
export async function showWindow(): Promise<void> {
    E2ELogger.info('windowStateActions', 'Showing window via API');

    await windowStateBrowser.execute(() => {
        (window as any).electronAPI?.showWindow?.();
    });

    await windowStateBrowser.pause(E2E_TIMING.QUICK_RESTORE);
}

/**
 * Toggles fullscreen mode via Electron API.
 */
export async function toggleFullscreen(): Promise<void> {
    E2ELogger.info('windowStateActions', 'Toggling fullscreen via API');

    await windowStateBrowser.execute(() => {
        (window as any).electronAPI?.toggleFullscreen?.();
    });

    await windowStateBrowser.pause(E2E_TIMING.WINDOW_TRANSITION);
}

/**
 * Sets fullscreen mode to specific state.
 */
export async function setFullScreen(fullscreen: boolean): Promise<void> {
    E2ELogger.info('windowStateActions', `Setting fullscreen to: ${fullscreen}`);

    await executeElectronWithRetry(() =>
        windowStateBrowser.electron.execute((electron: typeof import('electron'), fs) => {
            const win = electron.BrowserWindow.getAllWindows()[0];
            if (win) {
                win.setFullScreen(fs);
            }
        }, fullscreen)
    );

    await windowStateBrowser.pause(E2E_TIMING.WINDOW_TRANSITION);
}

/**
 * Forces focus on the current window.
 *
 * In automated E2E environments, the Electron window may not have OS-level focus.
 * This helper forces focus using BrowserWindow.focus() and returns whether
 * focus was successfully gained (verified via document.hasFocus()).
 *
 * @returns True if focus was gained, false if environment doesn't support programmatic focus
 */
export async function focusWindow(): Promise<boolean> {
    E2ELogger.info('windowStateActions', 'Focusing window via API');

    // Force focus via Electron API
    await executeElectronWithRetry(() =>
        windowStateBrowser.electron.execute((electron: typeof import('electron')) => {
            const win = electron.BrowserWindow.getAllWindows()[0];
            if (win) {
                win.focus();
            }
        })
    );

    // Give time for focus to take effect
    await windowStateBrowser.pause(E2E_TIMING.QUICK_RESTORE);

    // Verify focus was gained
    const hasFocus = await windowStateBrowser.execute(() => document.hasFocus());

    if (!hasFocus) {
        E2ELogger.info(
            'windowStateActions',
            'Window focus not gained - environment may not support programmatic focus'
        );
    }

    return hasFocus;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Waits for window to reach a specific state.
 *
 * @param predicate - Function that returns true when desired state is reached
 * @param timeoutMs - Maximum wait time
 * @param pollIntervalMs - How often to check state
 */
export async function waitForWindowState(
    predicate: (state: WindowState) => boolean,
    timeoutMs = 5000,
    pollIntervalMs = 100
): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        const state = await getWindowState();
        if (predicate(state)) {
            return;
        }
        await windowStateBrowser.pause(pollIntervalMs);
    }

    throw new Error(`Window did not reach expected state within ${timeoutMs}ms`);
}

/**
 * Waits for all windows to be hidden (not visible).
 *
 * Use this instead of waitForWindowCount(0) when testing hide-to-tray behavior,
 * as WebDriver can still detect hidden windows on Windows/Linux.
 *
 * @param timeoutMs - Maximum wait time (default 5000ms)
 */
export async function waitForAllWindowsHidden(timeoutMs = 5000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        const allHidden = await windowStateBrowser.electron.execute((electron: typeof import('electron')) => {
            const wins = electron.BrowserWindow.getAllWindows();
            return wins.every((win: import('electron').BrowserWindow) => !win.isVisible());
        });

        if (allHidden) {
            E2ELogger.info('windowStateActions', 'All windows are hidden');
            return;
        }

        await windowStateBrowser.pause(100);
    }

    throw new Error(`Windows did not become hidden within ${timeoutMs}ms`);
}

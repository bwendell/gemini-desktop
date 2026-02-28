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
import {
    executeElectronWithRetry,
    waitForUIState,
    waitForWindowTransition,
    waitForFullscreenTransition,
    waitForMacOSWindowStabilize,
} from './waitUtilities';

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

type WdioBrowser = {
    execute<T>(script: (...args: unknown[]) => T, ...args: unknown[]): Promise<T>;
    pause(ms: number): Promise<void>;
    electron: {
        execute<T>(script: (electron: ElectronModule, ...args: unknown[]) => T, ...args: unknown[]): Promise<T>;
    };
};

type ElectronBrowserWindow = {
    isMaximized(): boolean;
    isMinimized(): boolean;
    isFullScreen(): boolean;
    isVisible(): boolean;
    isDestroyed(): boolean;
    unmaximize(): void;
    restore(): void;
    show(): void;
    hide(): void;
    focus(): void;
    setFullScreen(fullscreen: boolean): void;
};

type ElectronModule = {
    BrowserWindow: {
        getAllWindows(): ElectronBrowserWindow[];
    };
};

const wdioBrowser = browser as unknown as WdioBrowser;

// ============================================================================
// State Query Functions
// ============================================================================

/**
 * Gets the complete window state.
 *
 * @returns Object with isMaximized, isMinimized, isFullScreen
 */
export interface WindowStateOptions {
    log?: boolean;
}

export async function getWindowState(options: WindowStateOptions = {}): Promise<WindowState> {
    const state = await wdioBrowser.electron.execute((electron) => {
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
    });

    if (options.log !== false) {
        E2ELogger.info('windowStateActions', `Window state: ${JSON.stringify(state)}`);
    }
    return state;
}

/**
 * Checks if the current window is maximized.
 */
export async function isWindowMaximized(): Promise<boolean> {
    const result = await wdioBrowser.execute(() => {
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

    await wdioBrowser.execute(() => {
        (window as any).electronAPI?.maximizeWindow?.();
    });

    // Give the window time to transition
    await waitForWindowTransition(
        async () => {
            const state = await getWindowState({ log: false });
            return state.isMaximized;
        },
        { description: 'Window maximize' }
    );
}

/**
 * Minimizes the current window via Electron API.
 */
export async function minimizeWindow(): Promise<void> {
    E2ELogger.info('windowStateActions', 'Minimizing window via API');

    await wdioBrowser.execute(() => {
        (window as any).electronAPI?.minimizeWindow?.();
    });

    await waitForWindowTransition(
        async () => {
            const state = await getWindowState({ log: false });
            return state.isMinimized;
        },
        { description: 'Window minimize' }
    );
}

/**
 * Restores the window from maximized/minimized state.
 */
export async function restoreWindow(): Promise<void> {
    E2ELogger.info('windowStateActions', 'Restoring window via API');

    // Use direct Electron API for restore (not exposed via electronAPI)
    await executeElectronWithRetry(
        () =>
            wdioBrowser.electron.execute((electron) => {
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
            }),
        { description: 'Window restore' }
    );

    await waitForWindowTransition(
        async () => {
            const state = await getWindowState({ log: false });
            return !state.isMaximized && !state.isMinimized && state.isVisible;
        },
        { description: 'Window restore' }
    );
}

/**
 * Closes the current window via Electron API.
 */
export async function closeWindow(): Promise<void> {
    E2ELogger.info('windowStateActions', 'Closing window via API');

    await wdioBrowser.execute(() => {
        (window as any).electronAPI?.closeWindow?.();
    });
}

/**
 * Hides the current window (e.g., minimize to tray).
 */
export async function hideWindow(): Promise<void> {
    E2ELogger.info('windowStateActions', 'Hiding window via API');

    await executeElectronWithRetry(
        () =>
            wdioBrowser.electron.execute((electron) => {
                const win = electron.BrowserWindow.getAllWindows()[0];
                if (win) {
                    win.hide();
                }
            }),
        { description: 'Window hide' }
    );

    await waitForWindowTransition(
        async () => {
            const state = await getWindowState({ log: false });
            return !state.isVisible;
        },
        { description: 'Window hide' }
    );
}

/**
 * Shows the current window (e.g., restore from tray).
 */
export async function showWindow(): Promise<void> {
    E2ELogger.info('windowStateActions', 'Showing window via API');

    await executeElectronWithRetry(
        () =>
            wdioBrowser.electron.execute((electron) => {
                const win = electron.BrowserWindow.getAllWindows()[0];
                if (win) {
                    win.show();
                    win.focus();
                }
            }),
        { description: 'Window show' }
    );

    // On macOS, window operations need extra stabilization time
    await waitForMacOSWindowStabilize(undefined, { description: 'Window show (macOS)' });
    await waitForWindowTransition(
        async () => {
            const state = await getWindowState({ log: false });
            return state.isVisible;
        },
        { description: 'Window show' }
    );
}

/**
 * Toggles fullscreen mode via Electron API.
 */
export async function toggleFullscreen(): Promise<void> {
    E2ELogger.info('windowStateActions', 'Toggling fullscreen via API');

    // Get current fullscreen state before toggle
    const wasFullscreen = await isWindowFullScreen();

    await wdioBrowser.execute(() => {
        (window as any).electronAPI?.toggleFullscreen?.();
    });

    const targetState = !wasFullscreen;

    await waitForFullscreenTransition(targetState, isWindowFullScreen, {
        timeout: E2E_TIMING.TIMEOUTS?.FULLSCREEN_TRANSITION,
    });
}

/**
 * Sets fullscreen mode to specific state.
 */
export async function setFullScreen(fullscreen: boolean): Promise<void> {
    E2ELogger.info('windowStateActions', `Setting fullscreen to: ${fullscreen}`);

    await executeElectronWithRetry(
        () =>
            wdioBrowser.electron.execute((electron, fs) => {
                const win = electron.BrowserWindow.getAllWindows()[0];
                if (win) {
                    const fullscreenState = Boolean(fs);
                    win.setFullScreen(fullscreenState);
                }
            }, fullscreen),
        { description: 'Window fullscreen toggle' }
    );

    await waitForFullscreenTransition(fullscreen, isWindowFullScreen, {
        timeout: E2E_TIMING.TIMEOUTS?.FULLSCREEN_TRANSITION,
    });
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
    await executeElectronWithRetry(
        () =>
            wdioBrowser.electron.execute((electron) => {
                const win = electron.BrowserWindow.getAllWindows()[0];
                if (win) {
                    win.focus();
                }
            }),
        { description: 'Window focus' }
    );

    // Wait for focus to be gained using condition-based wait
    const focusGained = await waitForUIState(
        async () => {
            return await wdioBrowser.execute(() => document.hasFocus());
        },
        {
            timeout: E2E_TIMING.TIMEOUTS?.UI_STATE,
            description: 'Window focus',
        }
    );

    // Verify focus was gained
    if (!focusGained) {
        E2ELogger.info(
            'windowStateActions',
            'Window focus not gained - environment may not support programmatic focus'
        );
    }

    return focusGained;
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
        const state = await getWindowState({ log: false });
        if (predicate(state)) {
            return;
        }
        await wdioBrowser.pause(pollIntervalMs);
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
    const isMacOS = process.platform === 'darwin';
    const effectiveTimeout = isMacOS ? Math.max(timeoutMs, 10000) : timeoutMs;
    const stableDuration = isMacOS ? 300 : 0;
    const startTime = Date.now();
    let stableStartTime: number | null = null;

    while (Date.now() - startTime < effectiveTimeout) {
        const allHidden = await executeElectronWithRetry(
            () =>
                wdioBrowser.electron.execute((electron) => {
                    const wins = electron.BrowserWindow.getAllWindows();
                    return wins.every((win) => !win.isVisible());
                }),
            { description: 'All windows hidden' }
        );

        if (allHidden) {
            if (!stableDuration) {
                E2ELogger.info('windowStateActions', 'All windows are hidden');
                return;
            }

            const now = Date.now();
            if (stableStartTime === null) {
                stableStartTime = now;
            } else if (now - stableStartTime >= stableDuration) {
                E2ELogger.info('windowStateActions', 'All windows are hidden (stable)');
                return;
            }
        } else {
            stableStartTime = null;
        }

        await wdioBrowser.pause(100);
    }

    throw new Error(`Windows did not become hidden within ${effectiveTimeout}ms`);
}

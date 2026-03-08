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
    const state = await browser.electron.execute((electron) => {
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
    const result = await browser.execute(() => {
        return (window as any).electronAPI?.isMaximized?.() ?? false;
    });

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

    await browser.execute(() => {
        (window as any).electronAPI?.maximizeWindow?.();
    });

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

    await browser.execute(() => {
        (window as any).electronAPI?.minimizeWindow?.();
    });

    const minimized = await waitForWindowTransition(
        async () => {
            const state = await getWindowState({ log: false });
            return state.isMinimized;
        },
        { description: 'Window minimize' }
    );

    if (minimized) {
        return;
    }

    E2ELogger.info('windowStateActions', 'Minimize via API did not complete, using fallback');
    await browser.electron.execute((electron) => {
        const win = electron.BrowserWindow.getAllWindows()[0];
        if (win && !win.isMinimized()) {
            win.minimize();
        }
    });

    const minimizedFallback = await waitForWindowTransition(
        async () => {
            const state = await getWindowState({ log: false });
            return state.isMinimized;
        },
        { description: 'Window minimize (fallback)' }
    );

    if (!minimizedFallback) {
        throw new Error('Window minimize did not complete after fallback');
    }
}

/**
 * Restores the window from maximized/minimized state.
 */
export async function restoreWindow(): Promise<void> {
    E2ELogger.info('windowStateActions', 'Restoring window via API');

    await browser.electron.execute((electron) => {
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
    });

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

    await browser.execute(() => {
        (window as any).electronAPI?.closeWindow?.();
    });
}

/**
 * Hides the current window (e.g., minimize to tray).
 */
export async function hideWindow(): Promise<void> {
    E2ELogger.info('windowStateActions', 'Hiding window via API');

    await browser.electron.execute((electron) => {
        const win = electron.BrowserWindow.getAllWindows()[0];
        if (win) {
            win.hide();
        }
    });

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

    await browser.electron.execute((electron) => {
        const win = electron.BrowserWindow.getAllWindows()[0];
        if (win) {
            win.show();
            win.focus();
        }
    });

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

    const wasFullscreen = await isWindowFullScreen();

    await browser.execute(() => {
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

    await browser.electron.execute((electron, fs) => {
        const win = electron.BrowserWindow.getAllWindows()[0];
        if (win) {
            const fullscreenState = Boolean(fs);
            win.setFullScreen(fullscreenState);
        }
    }, fullscreen);

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

    await browser.electron.execute((electron) => {
        const win = electron.BrowserWindow.getAllWindows()[0];
        if (win) {
            win.focus();
        }
    });

    const focusGained = await waitForUIState(
        async () => {
            return await browser.execute(() => document.hasFocus());
        },
        {
            timeout: E2E_TIMING.TIMEOUTS?.UI_STATE,
            description: 'Window focus',
        }
    );

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
        await browser.pause(pollIntervalMs);
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
        const allHidden = await browser.electron.execute((electron) => {
            const wins = electron.BrowserWindow.getAllWindows();
            return wins.every((win) => !win.isVisible());
        });

        if (allHidden) {
            E2ELogger.info('windowStateActions', 'All windows are hidden');
            return;
        }

        await browser.pause(100);
    }

    throw new Error(`Windows did not become hidden within ${timeoutMs}ms`);
}

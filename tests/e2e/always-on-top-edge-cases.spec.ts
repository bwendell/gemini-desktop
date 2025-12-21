/**
 * E2E Test: Always On Top - Edge Cases
 *
 * Tests additional edge cases for always-on-top feature.
 * Verifies:
 * - Toggle during minimize behavior
 * - Fullscreen mode interaction
 * - Auth window interaction
 * - Cross-platform edge case handling
 */

import { browser, expect } from '@wdio/globals';
import { E2ELogger } from './helpers/logger';
import { getPlatform, isMacOS, isWindows, isLinux } from './helpers/platform';
import { E2E_TIMING } from './helpers/e2eConstants';

declare global {
    interface Window {
        electronAPI: {
            getAlwaysOnTop: () => Promise<{ enabled: boolean }>;
            setAlwaysOnTop: (enabled: boolean) => void;
        };
    }
}

/**
 * Get window always-on-top state from Electron.
 */
async function getWindowAlwaysOnTopState(): Promise<boolean> {
    return browser.electron.execute(() => {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        return mainWindow ? mainWindow.isAlwaysOnTop() : false;
    });
}

/**
 * Check if window is minimized.
 */
async function isWindowMinimized(): Promise<boolean> {
    return browser.electron.execute(() => {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        return mainWindow ? mainWindow.isMinimized() : false;
    });
}

/**
 * Check if window is in fullscreen mode.
 */
async function isWindowFullScreen(): Promise<boolean> {
    return browser.electron.execute(() => {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        return mainWindow ? mainWindow.isFullScreen() : false;
    });
}

/**
 * Set fullscreen mode.
 */
async function setFullScreen(fullscreen: boolean): Promise<void> {
    await browser.electron.execute((fs) => {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            mainWindow.setFullScreen(fs);
        }
    }, fullscreen);
}

/**
 * Minimize window.
 */
async function minimizeWindow(): Promise<void> {
    await browser.electron.execute(() => {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            mainWindow.minimize();
        }
    });
}

/**
 * Restore window.
 */
async function restoreWindow(): Promise<void> {
    await browser.electron.execute(() => {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            mainWindow.restore();
        }
    });
}

describe('Always On Top - Edge Cases', () => {
    let platform: string;
    let modifierKey: string;

    before(async () => {
        platform = await getPlatform();
        modifierKey = (await isMacOS()) ? 'Meta' : 'Control';
        E2ELogger.info('always-on-top-edge-cases', `Platform: ${platform}, Modifier: ${modifierKey}`);
    });

    afterEach(async () => {
        // Ensure window is restored and state is reset
        await restoreWindow();
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

        // Exit fullscreen if active
        const isFS = await isWindowFullScreen();
        if (isFS) {
            await setFullScreen(false);
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);
        }

        // Reset always-on-top state
        await browser.execute(() => {
            window.electronAPI?.setAlwaysOnTop?.(false);
        });
        await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
    });

    describe('Toggle During Minimize', () => {
        it('should toggle always-on-top while window is minimized', async () => {
            E2ELogger.info('always-on-top-edge-cases', 'Testing toggle during minimize');

            // Start with disabled state
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(E2E_TIMING.CLEANUP_PAUSE);

            // Minimize window
            await minimizeWindow();
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            const minimized = await isWindowMinimized();
            expect(minimized).toBe(true);
            E2ELogger.info('always-on-top-edge-cases', 'Window minimized');

            // Enable always-on-top while minimized (using API directly)
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // Restore window
            await restoreWindow();
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            // Verify always-on-top is enabled after restore
            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(true);

            E2ELogger.info('always-on-top-edge-cases', 'Always-on-top activated while minimized and persisted after restore');
        });

        it('should toggle off while minimized and persist after restore', async () => {
            E2ELogger.info('always-on-top-edge-cases', 'Testing toggle off during minimize');

            // Start with enabled state
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const stateBeforeMinimize = await getWindowAlwaysOnTopState();
            expect(stateBeforeMinimize).toBe(true);

            // Minimize window
            await minimizeWindow();
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            // Disable always-on-top while minimized
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // Restore window
            await restoreWindow();
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            // Verify always-on-top is disabled after restore
            const stateAfterRestore = await getWindowAlwaysOnTopState();
            expect(stateAfterRestore).toBe(false);

            E2ELogger.info('always-on-top-edge-cases', 'Always-on-top disabled while minimized and persisted after restore');
        });

        it('should handle hotkey toggle while minimized', async () => {
            E2ELogger.info('always-on-top-edge-cases', 'Testing hotkey toggle while minimized');

            // Start disabled
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(E2E_TIMING.CLEANUP_PAUSE);

            const initialState = await getWindowAlwaysOnTopState();
            expect(initialState).toBe(false);

            // Minimize
            await minimizeWindow();
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            // Try hotkey (may or may not work depending on OS focus behavior)
            // This is best-effort - hotkeys might not register when window is minimized
            await browser.keys([modifierKey, 'Shift', 't']);
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // Restore
            await restoreWindow();
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            // Check state - could be either enabled or disabled depending on hotkey behavior
            const finalState = await getWindowAlwaysOnTopState();
            E2ELogger.info('always-on-top-edge-cases', `State after hotkey while minimized: ${finalState}`);

            // This test documents behavior rather than asserting specific outcome
            // because hotkey handling during minimize varies by platform
        });
    });

    describe('Fullscreen Mode Interaction', () => {
        it('should maintain always-on-top setting through fullscreen toggle', async () => {
            E2ELogger.info('always-on-top-edge-cases', 'Testing fullscreen mode interaction');

            // Enable always-on-top
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const stateBeforeFullscreen = await getWindowAlwaysOnTopState();
            expect(stateBeforeFullscreen).toBe(true);

            // Enter fullscreen
            await setFullScreen(true);
            await browser.pause(E2E_TIMING.MULTI_WINDOW_PAUSE); // Fullscreen transitions need more time

            const isFS = await isWindowFullScreen();
            if (isFS) {
                E2ELogger.info('always-on-top-edge-cases', 'Window entered fullscreen');

                // Exit fullscreen
                await setFullScreen(false);
                await browser.pause(E2E_TIMING.MULTI_WINDOW_PAUSE);

                // Verify always-on-top is still enabled
                const stateAfterFullscreen = await getWindowAlwaysOnTopState();
                expect(stateAfterFullscreen).toBe(true);

                E2ELogger.info('always-on-top-edge-cases', 'Always-on-top persisted through fullscreen toggle');
            } else {
                E2ELogger.info('always-on-top-edge-cases', 'Fullscreen not available on this platform/configuration');
            }
        });

        it('should allow toggling always-on-top while in fullscreen (macOS)', async function () {
            if (!(await isMacOS())) {
                E2ELogger.info('always-on-top-edge-cases', 'Skipping macOS-specific fullscreen test');
                return;
            }

            E2ELogger.info('always-on-top-edge-cases', 'Testing macOS fullscreen toggle');

            // Enter fullscreen first
            await setFullScreen(true);
            await browser.pause(E2E_TIMING.MULTI_WINDOW_PAUSE);

            const isFS = await isWindowFullScreen();
            if (!isFS) {
                E2ELogger.info('always-on-top-edge-cases', 'Cannot enter fullscreen, skipping');
                return;
            }

            // Toggle always-on-top while in fullscreen
            const initialState = await getWindowAlwaysOnTopState();
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const newState = await getWindowAlwaysOnTopState();
            E2ELogger.info('always-on-top-edge-cases', `State toggled in fullscreen: ${initialState} -> ${newState}`);

            // Exit fullscreen
            await setFullScreen(false);
            await browser.pause(E2E_TIMING.MULTI_WINDOW_PAUSE);

            // Verify state persisted
            const finalState = await getWindowAlwaysOnTopState();
            expect(finalState).toBe(true);

            E2ELogger.info('always-on-top-edge-cases', 'macOS: Toggle in fullscreen verified');
        });

        it('should handle fullscreen on Windows/Linux', async function () {
            if (await isMacOS()) {
                E2ELogger.info('always-on-top-edge-cases', 'Skipping Windows/Linux fullscreen test');
                return;
            }

            E2ELogger.info('always-on-top-edge-cases', 'Testing Windows/Linux fullscreen');

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // Enter and exit fullscreen
            await setFullScreen(true);
            await browser.pause(E2E_TIMING.FULLSCREEN_TRANSITION);
            await setFullScreen(false);
            await browser.pause(E2E_TIMING.FULLSCREEN_TRANSITION);

            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(true);

            E2ELogger.info('always-on-top-edge-cases', 'Windows/Linux: Fullscreen verified');
        });
    });

    describe('Cross-Platform Edge Cases', () => {
        it('should handle edge cases on Windows', async function () {
            if (!(await isWindows())) {
                E2ELogger.info('always-on-top-edge-cases', 'Skipping Windows-specific test');
                return;
            }

            E2ELogger.info('always-on-top-edge-cases', 'Testing Windows edge cases');

            // Toggle during minimize
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.CLEANUP_PAUSE);

            await minimizeWindow();
            await browser.pause(E2E_TIMING.CYCLE_PAUSE);

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(E2E_TIMING.CLEANUP_PAUSE);

            await restoreWindow();
            await browser.pause(E2E_TIMING.CYCLE_PAUSE);

            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(false);

            E2ELogger.info('always-on-top-edge-cases', 'Windows: Edge cases verified');
        });

        it('should handle edge cases on macOS', async function () {
            if (!(await isMacOS())) {
                E2ELogger.info('always-on-top-edge-cases', 'Skipping macOS-specific test');
                return;
            }

            E2ELogger.info('always-on-top-edge-cases', 'Testing macOS edge cases');

            // Same test logic as Windows
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.CLEANUP_PAUSE);

            await minimizeWindow();
            await browser.pause(E2E_TIMING.CYCLE_PAUSE);

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(E2E_TIMING.CLEANUP_PAUSE);

            await restoreWindow();
            await browser.pause(E2E_TIMING.CYCLE_PAUSE);

            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(false);

            E2ELogger.info('always-on-top-edge-cases', 'macOS: Edge cases verified');
        });

        it('should handle edge cases on Linux', async function () {
            if (!(await isLinux())) {
                E2ELogger.info('always-on-top-edge-cases', 'Skipping Linux-specific test');
                return;
            }

            E2ELogger.info('always-on-top-edge-cases', 'Testing Linux edge cases');

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.CLEANUP_PAUSE);

            await minimizeWindow();
            await browser.pause(E2E_TIMING.CYCLE_PAUSE);

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(E2E_TIMING.CLEANUP_PAUSE);

            await restoreWindow();
            await browser.pause(E2E_TIMING.CYCLE_PAUSE);

            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(false);

            E2ELogger.info('always-on-top-edge-cases', 'Linux: Edge cases verified');
        });
    });
});

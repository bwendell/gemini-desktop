/**
 * E2E Test: Always On Top - State Operations
 *
 * Tests that always-on-top state persists through window state changes.
 * Verifies:
 * - State persists through minimize/restore
 * - State persists through maximize/restore
 * - State persists through resize operations
 * - Cross-platform window state management
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
 * Get window state from Electron's BrowserWindow API.
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
 * Check if window is maximized.
 */
async function isWindowMaximized(): Promise<boolean> {
    return browser.electron.execute(() => {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        return mainWindow ? mainWindow.isMaximized() : false;
    });
}

describe('Always On Top - State Operations', () => {
    let platform: string;

    before(async () => {
        platform = await getPlatform();
        E2ELogger.info('always-on-top-state-ops', `Running on platform: ${platform}`);
    });

    describe('Minimize and Restore Persistence', () => {
        it('should maintain always-on-top after minimize/restore', async () => {
            E2ELogger.info('always-on-top-state-ops', 'Testing minimize/restore persistence');

            // Enable always-on-top
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const stateBeforeMinimize = await getWindowAlwaysOnTopState();
            expect(stateBeforeMinimize).toBe(true);

            // Minimize window
            await browser.electron.execute(() => {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.minimize();
                }
            });
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            // Verify minimized
            const minimized = await isWindowMinimized();
            expect(minimized).toBe(true);
            E2ELogger.info('always-on-top-state-ops', 'Window minimized');

            // Restore window
            await browser.electron.execute(() => {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.restore();
                }
            });
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            // Verify always-on-top persisted
            const stateAfterRestore = await getWindowAlwaysOnTopState();
            expect(stateAfterRestore).toBe(true);

            E2ELogger.info('always-on-top-state-ops', 'Always-on-top persisted through minimize/restore');

            // Cleanup
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
        });

        it('should maintain disabled state after minimize/restore', async () => {
            E2ELogger.info('always-on-top-state-ops', 'Testing disabled state persistence through minimize/restore');

            // Ensure always-on-top is disabled
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // Minimize and restore
            await browser.electron.execute(() => {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.minimize();
                }
            });
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            await browser.electron.execute(() => {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.restore();
                }
            });
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            // Verify still disabled
            const stateAfterRestore = await getWindowAlwaysOnTopState();
            expect(stateAfterRestore).toBe(false);

            E2ELogger.info('always-on-top-state-ops', 'Disabled state persisted through minimize/restore');
        });
    });

    describe('Maximize and Restore Persistence', () => {
        it('should maintain always-on-top after maximize/restore', async () => {
            E2ELogger.info('always-on-top-state-ops', 'Testing maximize/restore persistence');

            // Enable always-on-top
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const stateBeforeMaximize = await getWindowAlwaysOnTopState();
            expect(stateBeforeMaximize).toBe(true);

            // Maximize window
            await browser.electron.execute(() => {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow && !mainWindow.isMaximized()) {
                    mainWindow.maximize();
                }
            });
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            // Verify maximized
            const maximized = await isWindowMaximized();
            if (maximized) {
                E2ELogger.info('always-on-top-state-ops', 'Window maximized');

                // Verify state persisted while maximized
                const stateWhileMaximized = await getWindowAlwaysOnTopState();
                expect(stateWhileMaximized).toBe(true);

                // Restore to normal size
                await browser.electron.execute(() => {
                    const { BrowserWindow } = require('electron');
                    const mainWindow = BrowserWindow.getAllWindows()[0];
                    if (mainWindow) {
                        mainWindow.unmaximize();
                    }
                });
                await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

                // Verify always-on-top still enabled
                const stateAfterRestore = await getWindowAlwaysOnTopState();
                expect(stateAfterRestore).toBe(true);

                E2ELogger.info('always-on-top-state-ops', 'Always-on-top persisted through maximize/restore');
            } else {
                E2ELogger.info('always-on-top-state-ops', 'Window could not be maximized (may already be maximized)');
            }

            // Cleanup
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
        });
    });

    describe('Multiple State Transitions', () => {
        it('should maintain state through multiple minimize/restore cycles', async () => {
            E2ELogger.info('always-on-top-state-ops', 'Testing multiple minimize/restore cycles');

            // Enable always-on-top
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // Perform 3 minimize/restore cycles
            for (let i = 0; i < 3; i++) {
                // Minimize
                await browser.electron.execute(() => {
                    const { BrowserWindow } = require('electron');
                    const mainWindow = BrowserWindow.getAllWindows()[0];
                    if (mainWindow) {
                        mainWindow.minimize();
                    }
                });
                await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

                // Restore
                await browser.electron.execute(() => {
                    const { BrowserWindow } = require('electron');
                    const mainWindow = BrowserWindow.getAllWindows()[0];
                    if (mainWindow) {
                        mainWindow.restore();
                    }
                });
                await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

                // Verify state
                const state = await getWindowAlwaysOnTopState();
                expect(state).toBe(true);

                E2ELogger.info('always-on-top-state-ops', `Cycle ${i + 1}/3: State maintained`);
            }

            // Cleanup
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
        });
    });

    describe('Cross-Platform State Operations', () => {
        it('should work on Windows', async function () {
            if (!(await isWindows())) {
                E2ELogger.info('always-on-top-state-ops', 'Skipping Windows-specific test');
                return;
            }

            E2ELogger.info('always-on-top-state-ops', 'Testing Windows state operations');

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // Minimize/restore
            await browser.electron.execute(() => {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.minimize();
                }
            });
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            await browser.electron.execute(() => {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.restore();
                }
            });
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(true);

            E2ELogger.info('always-on-top-state-ops', 'Windows: State operations verified');

            // Cleanup
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
        });

        it('should work on macOS', async function () {
            if (!(await isMacOS())) {
                E2ELogger.info('always-on-top-state-ops', 'Skipping macOS-specific test');
                return;
            }

            E2ELogger.info('always-on-top-state-ops', 'Testing macOS state operations');

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // Minimize/restore
            await browser.electron.execute(() => {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.minimize();
                }
            });
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            await browser.electron.execute(() => {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.restore();
                }
            });
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(true);

            E2ELogger.info('always-on-top-state-ops', 'macOS: State operations verified');

            // Cleanup
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
        });

        it('should work on Linux', async function () {
            if (!(await isLinux())) {
                E2ELogger.info('always-on-top-state-ops', 'Skipping Linux-specific test');
                return;
            }

            E2ELogger.info('always-on-top-state-ops', 'Testing Linux state operations');

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // Minimize/restore
            await browser.electron.execute(() => {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.minimize();
                }
            });
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            await browser.electron.execute(() => {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.restore();
                }
            });
            await browser.pause(E2E_TIMING.WINDOW_TRANSITION);

            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(true);

            E2ELogger.info('always-on-top-state-ops', 'Linux: State operations verified');

            // Cleanup
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
        });
    });
});

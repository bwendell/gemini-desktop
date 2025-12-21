/**
 * E2E Test: Always On Top - Tray Interaction
 *
 * Tests always-on-top behavior with system tray minimize/restore.
 * Verifies:
 * - State persists when minimizing to tray
 * - State persists when restoring from tray
 * - Cross-platform tray behavior
 */

import { browser, expect } from '@wdio/globals';
import { E2ELogger } from './helpers/logger';
import { getPlatform, isMacOS, isWindows, isLinux } from './helpers/platform';

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
 * Check if window is visible.
 */
async function isWindowVisible(): Promise<boolean> {
    return browser.electron.execute(() => {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        return mainWindow ? mainWindow.isVisible() : false;
    });
}

/**
 * Hide window (minimize to tray).
 */
async function hideWindow(): Promise<void> {
    await browser.electron.execute(() => {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            mainWindow.hide();
        }
    });
}

/**
 * Show window (restore from tray).
 */
async function showWindow(): Promise<void> {
    await browser.electron.execute(() => {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

describe('Always On Top - Tray Interaction', () => {
    let platform: string;

    before(async () => {
        platform = await getPlatform();
        E2ELogger.info('always-on-top-tray', `Running on platform: ${platform}`);
    });

    afterEach(async () => {
        // Ensure window is visible and reset state
        await showWindow();
        await browser.pause(300);
        await browser.execute(() => {
            window.electronAPI?.setAlwaysOnTop?.(false);
        });
        await browser.pause(200);
    });

    describe('Hide and Show Persistence', () => {
        it('should maintain always-on-top after hide/show', async () => {
            E2ELogger.info('always-on-top-tray', 'Testing hide/show persistence');

            // Enable always-on-top
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(300);

            const stateBeforeHide = await getWindowAlwaysOnTopState();
            expect(stateBeforeHide).toBe(true);

            // Hide window (simulate minimize to tray)
            await hideWindow();
            await browser.pause(500);

            // Verify window is hidden
            const visible = await isWindowVisible();
            expect(visible).toBe(false);

            E2ELogger.info('always-on-top-tray', 'Window hidden');

            // Show window (restore from tray)
            await showWindow();
            await browser.pause(500);

            // Verify window is visible again
            const visibleAfter = await isWindowVisible();
            expect(visibleAfter).toBe(true);

            // Verify always-on-top persisted
            const stateAfterShow = await getWindowAlwaysOnTopState();
            expect(stateAfterShow).toBe(true);

            E2ELogger.info('always-on-top-tray', 'Always-on-top persisted through hide/show');
        });

        it('should maintain disabled state after hide/show', async () => {
            E2ELogger.info('always-on-top-tray', 'Testing disabled state through hide/show');

            // Ensure disabled
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(300);

            // Hide and show
            await hideWindow();
            await browser.pause(500);
            await showWindow();
            await browser.pause(500);

            // Verify still disabled
            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(false);

            E2ELogger.info('always-on-top-tray', 'Disabled state persisted through hide/show');
        });
    });

    describe('Multiple Hide/Show Cycles', () => {
        it('should maintain always-on-top through multiple cycles', async () => {
            E2ELogger.info('always-on-top-tray', 'Testing multiple hide/show cycles');

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(300);

            // Perform 3 hide/show cycles
            for (let i = 0; i < 3; i++) {
                await hideWindow();
                await browser.pause(400);
                await showWindow();
                await browser.pause(400);

                const state = await getWindowAlwaysOnTopState();
                expect(state).toBe(true);

                E2ELogger.info('always-on-top-tray', `Cycle ${i + 1}/3: State maintained`);
            }
        });
    });

    describe('Toggle While Hidden', () => {
        it('should maintain state set before hide when shown', async () => {
            E2ELogger.info('always-on-top-tray', 'Testing state set before hide');

            // First disable
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(200);

            // Then enable
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(200);

            // Hide
            await hideWindow();
            await browser.pause(500);

            // Show
            await showWindow();
            await browser.pause(500);

            // Should still be enabled
            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(true);

            E2ELogger.info('always-on-top-tray', 'State set before hide was maintained');
        });
    });

    describe('Cross-Platform Tray Behavior', () => {
        it('should work on Windows', async function () {
            if (!(await isWindows())) {
                E2ELogger.info('always-on-top-tray', 'Skipping Windows-specific test');
                return;
            }

            E2ELogger.info('always-on-top-tray', 'Testing Windows tray behavior');

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(300);

            await hideWindow();
            await browser.pause(500);
            await showWindow();
            await browser.pause(500);

            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(true);

            E2ELogger.info('always-on-top-tray', 'Windows: Tray behavior verified');
        });

        it('should work on macOS', async function () {
            if (!(await isMacOS())) {
                E2ELogger.info('always-on-top-tray', 'Skipping macOS-specific test');
                return;
            }

            E2ELogger.info('always-on-top-tray', 'Testing macOS tray behavior');

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(300);

            await hideWindow();
            await browser.pause(500);
            await showWindow();
            await browser.pause(500);

            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(true);

            E2ELogger.info('always-on-top-tray', 'macOS: Tray behavior verified');
        });

        it('should work on Linux', async function () {
            if (!(await isLinux())) {
                E2ELogger.info('always-on-top-tray', 'Skipping Linux-specific test');
                return;
            }

            E2ELogger.info('always-on-top-tray', 'Testing Linux tray behavior');

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(300);

            await hideWindow();
            await browser.pause(500);
            await showWindow();
            await browser.pause(500);

            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(true);

            E2ELogger.info('always-on-top-tray', 'Linux: Tray behavior verified');
        });
    });
});

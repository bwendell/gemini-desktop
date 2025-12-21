/**
 * E2E Test: Always On Top - Z-Order Verification
 *
 * Tests that the always-on-top feature correctly affects window stacking order.
 * Verifies:
 * - When enabled, window stays above others
 * - When disabled, window follows normal z-order
 * - State can be queried accurately from Electron
 * 
 * NOTE: Direct z-order visual verification is challenging in WebdriverIO.
 * We use Electron's isAlwaysOnTop() API as the source of truth, which is
 * the same underlying API that controls the visual behavior.
 *
 * Cross-platform: Windows, macOS, Linux
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
 * Query the actual window state from Electron's BrowserWindow API.
 * This is the most reliable way to verify always-on-top state.
 */
async function getWindowAlwaysOnTopState(): Promise<boolean> {
    return browser.electron.execute(() => {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        return mainWindow ? mainWindow.isAlwaysOnTop() : false;
    });
}

describe('Always On Top - Z-Order Verification', () => {
    let platform: string;

    before(async () => {
        platform = await getPlatform();
        E2ELogger.info('always-on-top-z-order', `Running on platform: ${platform}`);
    });

    describe('Enabled State Z-Order', () => {
        it('should report always-on-top as enabled when set', async () => {
            E2ELogger.info('always-on-top-z-order', 'Testing enabled state');

            // Enable always-on-top
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(300);

            // Verify via Electron API (renderer side)
            const rendererState = await browser.execute(() => {
                return window.electronAPI?.getAlwaysOnTop?.();
            });

            expect(rendererState?.enabled).toBe(true);

            // Verify via Electron main process BrowserWindow API
            const mainProcessState = await getWindowAlwaysOnTopState();
            expect(mainProcessState).toBe(true);

            E2ELogger.info('always-on-top-z-order', 'Enabled state verified in both renderer and main process');

            // Reset
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(200);
        });

        it('should maintain always-on-top state after window operations', async () => {
            E2ELogger.info('always-on-top-z-order', 'Testing state persistence through window operations');

            // Enable always-on-top
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(300);

            // Minimize and restore
            await browser.electron.execute(() => {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.minimize();
                }
            });
            await browser.pause(500);

            await browser.electron.execute(() => {
                const { BrowserWindow } = require('electron');
                const mainWindow = BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.restore();
                }
            });
            await browser.pause(500);

            // Verify state still enabled
            const stateAfterMinimize = await getWindowAlwaysOnTopState();
            expect(stateAfterMinimize).toBe(true);

            E2ELogger.info('always-on-top-z-order', 'Always-on-top persisted through minimize/restore');

            // Reset
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(200);
        });
    });

    describe('Disabled State Z-Order', () => {
        it('should report always-on-top as disabled when unset', async () => {
            E2ELogger.info('always-on-top-z-order', 'Testing disabled state');

            // Explicitly disable always-on-top
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(300);

            // Verify via Electron API (renderer side)
            const rendererState = await browser.execute(() => {
                return window.electronAPI?.getAlwaysOnTop?.();
            });

            expect(rendererState?.enabled).toBe(false);

            // Verify via main process
            const mainProcessState = await getWindowAlwaysOnTopState();
            expect(mainProcessState).toBe(false);

            E2ELogger.info('always-on-top-z-order', 'Disabled state verified in both processes');
        });

        it('should return to normal z-order when disabled', async () => {
            E2ELogger.info('always-on-top-z-order', 'Testing transition from enabled to disabled');

            // First enable
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(300);

            let state = await getWindowAlwaysOnTopState();
            expect(state).toBe(true);

            // Then disable
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(300);

            state = await getWindowAlwaysOnTopState();
            expect(state).toBe(false);

            E2ELogger.info('always-on-top-z-order', 'Successfully transitioned from enabled to disabled');
        });
    });

    describe('State Synchronization', () => {
        it('should have renderer and main process states synchronized', async () => {
            E2ELogger.info('always-on-top-z-order', 'Testing state synchronization');

            // Test with enabled state
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(300);

            const rendererEnabled = await browser.execute(() => {
                return window.electronAPI?.getAlwaysOnTop?.();
            });
            const mainEnabled = await getWindowAlwaysOnTopState();

            expect(rendererEnabled?.enabled).toBe(mainEnabled);
            expect(mainEnabled).toBe(true);

            // Test with disabled state
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(300);

            const rendererDisabled = await browser.execute(() => {
                return window.electronAPI?.getAlwaysOnTop?.();
            });
            const mainDisabled = await getWindowAlwaysOnTopState();

            expect(rendererDisabled?.enabled).toBe(mainDisabled);
            expect(mainDisabled).toBe(false);

            E2ELogger.info('always-on-top-z-order', 'State synchronized across processes');
        });
    });

    describe('Cross-Platform Z-Order Behavior', () => {
        it('should work correctly on Windows', async function () {
            if (!(await isWindows())) {
                E2ELogger.info('always-on-top-z-order', 'Skipping Windows-specific test');
                return;
            }

            E2ELogger.info('always-on-top-z-order', 'Testing Windows z-order behavior');

            // Enable
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(300);

            const enabled = await getWindowAlwaysOnTopState();
            expect(enabled).toBe(true);

            // Disable
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(300);

            const disabled = await getWindowAlwaysOnTopState();
            expect(disabled).toBe(false);

            E2ELogger.info('always-on-top-z-order', 'Windows: Z-order control verified');
        });

        it('should work correctly on macOS', async function () {
            if (!(await isMacOS())) {
                E2ELogger.info('always-on-top-z-order', 'Skipping macOS-specific test');
                return;
            }

            E2ELogger.info('always-on-top-z-order', 'Testing macOS z-order behavior');

            // Enable
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(300);

            const enabled = await getWindowAlwaysOnTopState();
            expect(enabled).toBe(true);

            // Disable
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(300);

            const disabled = await getWindowAlwaysOnTopState();
            expect(disabled).toBe(false);

            E2ELogger.info('always-on-top-z-order', 'macOS: Z-order control verified');
        });

        it('should work correctly on Linux', async function () {
            if (!(await isLinux())) {
                E2ELogger.info('always-on-top-z-order', 'Skipping Linux-specific test');
                return;
            }

            E2ELogger.info('always-on-top-z-order', 'Testing Linux z-order behavior');

            // Enable
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(300);

            const enabled = await getWindowAlwaysOnTopState();
            expect(enabled).toBe(true);

            // Disable
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(300);

            const disabled = await getWindowAlwaysOnTopState();
            expect(disabled).toBe(false);

            E2ELogger.info('always-on-top-z-order', 'Linux: Z-order control verified');
        });
    });
});

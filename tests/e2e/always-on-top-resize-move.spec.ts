/**
 * E2E Test: Always On Top - Resize and Move
 *
 * Tests that always-on-top state persists through window resize and move operations.
 * Verifies:
 * - State persists when window is resized
 * - State persists when window is moved
 * - State persists through both operations combined
 * - Cross-platform resize/move behavior
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
 * Get current window bounds.
 */
async function getWindowBounds(): Promise<{ x: number; y: number; width: number; height: number }> {
    return browser.electron.execute(() => {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        return mainWindow ? mainWindow.getBounds() : { x: 0, y: 0, width: 800, height: 600 };
    });
}

/**
 * Set window bounds.
 */
async function setWindowBounds(bounds: { x?: number; y?: number; width?: number; height?: number }): Promise<void> {
    await browser.electron.execute((boundsParam) => {
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            mainWindow.setBounds(boundsParam);
        }
    }, bounds);
}

describe('Always On Top - Resize and Move', () => {
    let platform: string;
    let originalBounds: { x: number; y: number; width: number; height: number };

    before(async () => {
        platform = await getPlatform();
        E2ELogger.info('always-on-top-resize-move', `Running on platform: ${platform}`);
        // Store original bounds for cleanup
        originalBounds = await getWindowBounds();
    });

    afterEach(async () => {
        // Restore original bounds
        await setWindowBounds(originalBounds);
        await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
        // Reset state
        await browser.execute(() => {
            window.electronAPI?.setAlwaysOnTop?.(false);
        });
        await browser.pause(E2E_TIMING.CLEANUP_PAUSE);
    });

    describe('Resize Persistence', () => {
        it('should maintain always-on-top after resizing window', async () => {
            E2ELogger.info('always-on-top-resize-move', 'Testing resize persistence');

            // Enable always-on-top
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const stateBeforeResize = await getWindowAlwaysOnTopState();
            expect(stateBeforeResize).toBe(true);

            // Resize window (make it larger)
            const currentBounds = await getWindowBounds();
            await setWindowBounds({
                width: currentBounds.width + 100,
                height: currentBounds.height + 100
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // Verify always-on-top persisted
            const stateAfterResize = await getWindowAlwaysOnTopState();
            expect(stateAfterResize).toBe(true);

            E2ELogger.info('always-on-top-resize-move', 'Always-on-top persisted through resize (larger)');

            // Resize window (make it smaller)
            await setWindowBounds({
                width: currentBounds.width - 50,
                height: currentBounds.height - 50
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const stateAfterShrink = await getWindowAlwaysOnTopState();
            expect(stateAfterShrink).toBe(true);

            E2ELogger.info('always-on-top-resize-move', 'Always-on-top persisted through resize (smaller)');
        });

        it('should maintain disabled state after resizing window', async () => {
            E2ELogger.info('always-on-top-resize-move', 'Testing disabled state persist through resize');

            // Ensure always-on-top is disabled
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(false);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const stateBeforeResize = await getWindowAlwaysOnTopState();
            expect(stateBeforeResize).toBe(false);

            // Resize window
            const currentBounds = await getWindowBounds();
            await setWindowBounds({
                width: currentBounds.width + 150,
                height: currentBounds.height + 100
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // Verify still disabled
            const stateAfterResize = await getWindowAlwaysOnTopState();
            expect(stateAfterResize).toBe(false);

            E2ELogger.info('always-on-top-resize-move', 'Disabled state persisted through resize');
        });
    });

    describe('Move Persistence', () => {
        it('should maintain always-on-top after moving window', async () => {
            E2ELogger.info('always-on-top-resize-move', 'Testing move persistence');

            // Enable always-on-top
            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const stateBeforeMove = await getWindowAlwaysOnTopState();
            expect(stateBeforeMove).toBe(true);

            // Move window
            const currentBounds = await getWindowBounds();
            await setWindowBounds({
                x: currentBounds.x + 50,
                y: currentBounds.y + 50
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // Verify always-on-top persisted
            const stateAfterMove = await getWindowAlwaysOnTopState();
            expect(stateAfterMove).toBe(true);

            E2ELogger.info('always-on-top-resize-move', 'Always-on-top persisted through move');
        });

        it('should maintain always-on-top after multiple moves', async () => {
            E2ELogger.info('always-on-top-resize-move', 'Testing multiple moves');

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // Move window multiple times
            for (let i = 0; i < 3; i++) {
                const currentBounds = await getWindowBounds();
                await setWindowBounds({
                    x: currentBounds.x + 20,
                    y: currentBounds.y + 20
                });
                await browser.pause(E2E_TIMING.CLEANUP_PAUSE);

                const state = await getWindowAlwaysOnTopState();
                expect(state).toBe(true);

                E2ELogger.info('always-on-top-resize-move', `Move ${i + 1}/3: State maintained`);
            }
        });
    });

    describe('Combined Resize and Move', () => {
        it('should maintain always-on-top through combined resize and move', async () => {
            E2ELogger.info('always-on-top-resize-move', 'Testing combined resize and move');

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            // Resize and move simultaneously
            const currentBounds = await getWindowBounds();
            await setWindowBounds({
                x: currentBounds.x + 30,
                y: currentBounds.y + 30,
                width: currentBounds.width + 80,
                height: currentBounds.height + 60
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const stateAfterBoth = await getWindowAlwaysOnTopState();
            expect(stateAfterBoth).toBe(true);

            E2ELogger.info('always-on-top-resize-move', 'Always-on-top persisted through combined resize and move');
        });
    });

    describe('Cross-Platform Resize/Move', () => {
        it('should work on Windows', async function () {
            if (!(await isWindows())) {
                E2ELogger.info('always-on-top-resize-move', 'Skipping Windows-specific test');
                return;
            }

            E2ELogger.info('always-on-top-resize-move', 'Testing Windows resize/move');

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const currentBounds = await getWindowBounds();
            await setWindowBounds({
                x: currentBounds.x + 40,
                y: currentBounds.y + 40,
                width: currentBounds.width + 50,
                height: currentBounds.height + 50
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(true);

            E2ELogger.info('always-on-top-resize-move', 'Windows: Resize/move verified');
        });

        it('should work on macOS', async function () {
            if (!(await isMacOS())) {
                E2ELogger.info('always-on-top-resize-move', 'Skipping macOS-specific test');
                return;
            }

            E2ELogger.info('always-on-top-resize-move', 'Testing macOS resize/move');

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const currentBounds = await getWindowBounds();
            await setWindowBounds({
                x: currentBounds.x + 40,
                y: currentBounds.y + 40,
                width: currentBounds.width + 50,
                height: currentBounds.height + 50
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(true);

            E2ELogger.info('always-on-top-resize-move', 'macOS: Resize/move verified');
        });

        it('should work on Linux', async function () {
            if (!(await isLinux())) {
                E2ELogger.info('always-on-top-resize-move', 'Skipping Linux-specific test');
                return;
            }

            E2ELogger.info('always-on-top-resize-move', 'Testing Linux resize/move');

            await browser.execute(() => {
                window.electronAPI?.setAlwaysOnTop?.(true);
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const currentBounds = await getWindowBounds();
            await setWindowBounds({
                x: currentBounds.x + 40,
                y: currentBounds.y + 40,
                width: currentBounds.width + 50,
                height: currentBounds.height + 50
            });
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

            const state = await getWindowAlwaysOnTopState();
            expect(state).toBe(true);

            E2ELogger.info('always-on-top-resize-move', 'Linux: Resize/move verified');
        });
    });
});

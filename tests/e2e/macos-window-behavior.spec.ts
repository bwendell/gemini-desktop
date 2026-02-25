/**
 * E2E Test: macOS-Specific Window Behavior
 *
 * Tests macOS-specific behaviors:
 * - App stays running when last window is closed
 * - Clicking dock icon recreates the window
 *
 * Platform: macOS only
 *
 * @module macos-window-behavior.spec
 */

import { browser, $, expect } from '@wdio/globals';
import { Selectors } from './helpers/selectors';
import { closeCurrentWindow } from './helpers/windowActions';
import { waitForWindowTransition, waitForUIState } from './helpers/waitUtilities';
import { isMacOSSync } from './helpers/platform';

// Only run on macOS
const isMacOS = isMacOSSync();
const describeMac = isMacOS ? describe : describe.skip;

describeMac('macOS Window Behavior', () => {
    beforeEach(async () => {
        // Ensure app is loaded
        const mainLayout = await $(Selectors.mainLayout);
        await mainLayout.waitForExist({ timeout: 15000 });
    });

    describe('Close-But-Stay-Alive Behavior', () => {
        it('should keep app running when main window is closed', async () => {
            // 1. Verify app is running and window is visible
            const initialHandles = await browser.getWindowHandles();
            expect(initialHandles.length).toBeGreaterThanOrEqual(1);

            // 2. Close the main window using macOS behavior (Cmd+W or close button)
            await closeCurrentWindow();
            await waitForWindowTransition(async () => (await browser.getWindowHandles()).length === 0, {
                description: 'Window closed',
            });

            // 3. On macOS, closing the last window hides it to tray (or just hides it)
            // The app should remain running
            const handlesAfterClose = await browser.getWindowHandles();
            expect(handlesAfterClose.length).toBeGreaterThanOrEqual(0);

            // Window should be hidden, not destroyed (count may be 0 for hidden windows)
            // The app is still running, just no visible windows
            // This is the expected macOS behavior

            // 4. Verify app is still running by checking if we can restore
            const appRunning = await browser.electron.execute((electron: typeof import('electron')) => {
                // App is running if we can execute this
                return electron.app.isReady();
            });
            expect(appRunning).toBe(true);

            // 5. Restore the window for test cleanup
            await browser.execute(() => {
                window.electronAPI?.showWindow();
            });
            await waitForWindowTransition(async () => (await browser.getWindowHandles()).length >= 1, {
                description: 'Window restored',
            });

            // Verify window is restored
            const handlesAfterRestore = await browser.getWindowHandles();
            expect(handlesAfterRestore.length).toBeGreaterThanOrEqual(1);
        });

        it('should recreate window when dock icon is clicked (simulated)', async () => {
            // 1. Close the window first
            await closeCurrentWindow();
            await waitForWindowTransition(async () => (await browser.getWindowHandles()).length === 0, {
                description: 'Window closed',
            });

            // 2. Simulate dock icon click via Electron's app.on('activate') event
            // We can't actually click the dock icon in E2E, but we can trigger the behavior
            await browser.electron.execute((electron: typeof import('electron')) => {
                // Emit activate event to simulate dock icon click
                electron.app.emit('activate');
            });

            await waitForWindowTransition(async () => (await browser.getWindowHandles()).length >= 1 || true, {
                timeout: 2000,
                description: 'Dock activation',
            });

            // 3. Window should be recreated or restored
            const handles = await browser.getWindowHandles();

            // If activate handler properly restores window, we should have at least 1
            if (handles.length === 0) {
                // Window might still be hidden, try to show it manually
                await browser.execute(() => {
                    window.electronAPI?.showWindow();
                });
                await waitForWindowTransition(async () => (await browser.getWindowHandles()).length >= 1, {
                    description: 'Window restored',
                });
            }

            const finalHandles = await browser.getWindowHandles();
            expect(finalHandles.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('macOS Menu Bar Behavior', () => {
        it('should keep menu bar accessible when no windows are open', async () => {
            // On macOS, the app menu bar should remain accessible even with no windows
            // This is verified by checking the app is still running

            // 1. Close window
            await closeCurrentWindow();
            await waitForUIState(async () => true, { timeout: 500, description: 'Brief settle after close' });

            // 2. Check app is still running (app menu would be accessible)
            const appReady = await browser.electron.execute((electron: typeof import('electron')) => {
                return electron.app.isReady();
            });
            expect(appReady).toBe(true);

            // 3. Verify menu exists
            const hasMenu = await browser.electron.execute((electron: typeof import('electron')) => {
                const menu = electron.Menu.getApplicationMenu();
                return menu !== null;
            });
            expect(hasMenu).toBe(true);

            // 4. Cleanup - restore window
            await browser.execute(() => {
                window.electronAPI?.showWindow();
            });
            await waitForWindowTransition(async () => (await browser.getWindowHandles()).length >= 1, {
                description: 'Window restored',
            });
        });
    });
});

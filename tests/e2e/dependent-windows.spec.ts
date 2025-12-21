/**
 * E2E Test: Dependent Windows Behavior
 *
 * Tests that auxiliary windows (options) close when the main window
 * is hidden to the system tray (close-to-tray behavior).
 * 
 * This implements the "dependent windows" pattern where child windows
 * have a lifecycle tied to the parent window.
 */

import { browser, $, expect } from '@wdio/globals';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForWindowCount, closeCurrentWindow } from './helpers/windowActions';
import { E2ELogger } from './helpers/logger';
import { Selectors } from './helpers/selectors';

describe('Dependent Windows', () => {
    /**
     * Helper to get the main window handle by checking for main-layout element
     */
    async function getMainWindowHandle(): Promise<string> {
        const handles = await browser.getWindowHandles();
        for (const handle of handles) {
            await browser.switchToWindow(handle);
            const isMain = await browser.execute(() => {
                return document.querySelector('[data-testid="main-layout"]') !== null;
            });
            if (isMain) {
                return handle;
            }
        }
        return handles[0];
    }

    it('should close options window when main window hides to tray', async () => {
        // 1. Open Options window via menu
        await clickMenuItemById('menu-file-options');

        // 2. Wait for options window to appear (2 windows total)
        await waitForWindowCount(2, 5000);
        E2ELogger.info('dependent-windows', 'Options window opened successfully');

        const handles = await browser.getWindowHandles();
        expect(handles.length).toBe(2);

        // 3. Find and switch to main window
        const mainHandle = await getMainWindowHandle();
        await browser.switchToWindow(mainHandle);

        // 4. Close main window (triggers hide-to-tray behavior)
        // Use cross-platform helper (guarantees correct closure method per OS)
        await closeCurrentWindow();
        E2ELogger.info('dependent-windows', 'Closed main window via helper');

        // 5. Wait for both windows to close/hide
        // When main window hides to tray, options window should also close
        await browser.pause(1000); // Allow time for window operations

        // 6. Verify no windows remain visible (both hidden/closed)
        // Note: The main window is hidden (not closed), so window count drops to 0
        await waitForWindowCount(0, 5000);
        E2ELogger.info('dependent-windows', 'Both windows closed/hidden as expected');

        // 7. Restore from tray to verify app is still running
        // Use Electron API to restore the main window
        // 7. Restore from tray to verify app is still running
        // Use Electron API to restore the main window
        await browser.execute(() => {
            // Access Electron main process via IPC exposed in preload
            window.electronAPI.showWindow();
        });

        // Alternative: Click tray icon (platform-specific, may not work in all CI)
        // For now, we verify the windows closed which is the core functionality
    });

    it('should allow reopening options window after restoring from tray', async () => {
        // 1. First, hide the main window to tray with options open
        await clickMenuItemById('menu-file-options');
        await waitForWindowCount(2, 5000);

        const mainHandle = await getMainWindowHandle();
        await browser.switchToWindow(mainHandle);

        // Close to tray
        // Close to tray
        await closeCurrentWindow();
        await browser.pause(1000);

        // 2. Wait for windows to close
        await waitForWindowCount(0, 5000);

        // 3. Restore main window from tray via Electron API
        // Use electron service to simulate tray click
        // 3. Restore main window from tray via Electron API
        await browser.execute(() => {
            window.electronAPI.showWindow();
        });

        // 4. Wait for main window to reappear
        await waitForWindowCount(1, 5000);
        E2ELogger.info('dependent-windows', 'Main window restored from tray');

        // 5. Open options window again
        await clickMenuItemById('menu-file-options');

        // 6. Verify options window opens successfully
        await waitForWindowCount(2, 5000);
        const handles = await browser.getWindowHandles();
        expect(handles.length).toBe(2);

        // 7. Switch to options window and verify it's functional
        const optionsHandle = handles.find(h => h !== (await getMainWindowHandle()));
        if (optionsHandle) {
            await browser.switchToWindow(optionsHandle);
            const titlebar = await $(Selectors.optionsTitlebar);
            await expect(titlebar).toExist();
            E2ELogger.info('dependent-windows', 'Options window reopened successfully after restore');
        }

        // 8. Clean up - close options window
        const optionsCloseBtn = await $(Selectors.optionsCloseButton);
        await optionsCloseBtn.click();
        await waitForWindowCount(1, 5000);
    });
});

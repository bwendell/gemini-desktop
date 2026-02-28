/**
 * E2E Test: Dependent Windows Behavior
 *
 * Tests that auxiliary windows (options) close when the main window
 * is hidden to the system tray (close-to-tray behavior).
 *
 * This implements the "dependent windows" pattern where child windows
 * have a lifecycle tied to the parent window.
 */

import { browser, expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage, TrayPage, AuthWindowPage } from './pages';
import { waitForWindowCount, closeCurrentWindow } from './helpers/windowActions';
import { waitForAllWindowsHidden } from './helpers/windowStateActions';
import { waitForAppReady, waitForElectronBridgeReady, ensureSingleWindow } from './helpers/workflows';
import { waitForUIState, waitForWindowTransition } from './helpers/waitUtilities';

describe('Dependent Windows', () => {
    type E2EBrowser = typeof browser & {
        getWindowHandles(): Promise<string[]>;
        switchToWindow(handle: string): Promise<void>;
    };

    const wdioBrowser = browser as unknown as E2EBrowser;
    const mainWindow = new MainWindowPage();
    const optionsPage = new OptionsPage();
    const tray = new TrayPage();
    const authWindow = new AuthWindowPage();

    beforeEach(async () => {
        await waitForAppReady();
        await waitForElectronBridgeReady();
    });

    afterEach(async () => {
        await ensureSingleWindow();
    });

    it('should close options window when main window hides to tray', async () => {
        // 1. Open Options window via menu
        await mainWindow.openOptionsViaMenu();

        // 2. Wait for options window to appear (2 windows total)
        await waitForWindowCount(2, 5000);

        const handles = await wdioBrowser.getWindowHandles();
        expect(handles.length).toBe(2);

        // 3. Switch to main window and close it (triggers hide-to-tray behavior)
        const mainHandle = handles[0];
        await wdioBrowser.switchToWindow(mainHandle);

        await closeCurrentWindow();

        // 5. Wait for both windows to close/hide
        // When main window hides to tray, options window should also close
        await waitForWindowTransition(
            async () => {
                const handles = await wdioBrowser.getWindowHandles();
                return handles.length === 0;
            },
            { description: 'All windows hidden after main window close' }
        );

        // 6. Verify no windows remain visible (both hidden/closed)
        // Note: The main window is hidden (not closed), so window count drops to 0
        await waitForAllWindowsHidden(5000);

        // 7. Restore from tray to verify app is still running
        await tray.clickShowMenuItemAndWait();
    });

    it('should allow reopening options window after restoring from tray', async () => {
        // 1. First, hide the main window to tray with options open
        await mainWindow.openOptionsViaMenu();
        await waitForWindowCount(2, 5000);

        const handles = await wdioBrowser.getWindowHandles();
        const mainHandle = handles[0];
        await wdioBrowser.switchToWindow(mainHandle);

        await closeCurrentWindow();
        await waitForWindowTransition(
            async () => {
                const handles = await wdioBrowser.getWindowHandles();
                return handles.length === 0;
            },
            { description: 'Windows hidden during close-to-tray' }
        );

        // 2. Wait for windows to close
        await waitForAllWindowsHidden(5000);

        // 3. Restore main window from tray via Show menu
        await tray.clickShowMenuItemAndWait();

        // 4. Wait for main window to reappear
        await waitForWindowCount(1, 5000);

        // 5. Open options window again
        await mainWindow.openOptionsViaMenu();

        // 6. Verify options window opens successfully
        await waitForWindowCount(2, 5000);
        const newHandles = await wdioBrowser.getWindowHandles();
        expect(newHandles.length).toBe(2);

        // 7. Switch to options window and verify it's functional
        await wdioBrowser.switchToWindow(newHandles[1]);
        await optionsPage.waitForLoad();

        // 8. Clean up - close options window
        await optionsPage.close();
        await waitForWindowCount(1, 5000);
    });

    it('should close all dependent windows (Options + Auth) when main window hides to tray', async () => {
        // 1. Open Options window
        await mainWindow.openOptionsViaMenu();
        await waitForWindowCount(2, 5000);

        // 2. Switch to main window and open Auth window via menu
        const handles = await wdioBrowser.getWindowHandles();
        const mainHandle = handles[0];
        await wdioBrowser.switchToWindow(mainHandle);
        await authWindow.openViaMenu();

        // Wait for auth window to appear (might already be open from Options)
        await waitForUIState(
            async () => {
                const allHandles = await wdioBrowser.getWindowHandles();
                return allHandles.length >= 2;
            },
            { description: 'Auth window appears' }
        );
        const allHandles = await wdioBrowser.getWindowHandles();

        // Should have at least 2 windows (main + options, auth may merge or not)
        expect(allHandles.length).toBeGreaterThanOrEqual(2);

        await wdioBrowser.switchToWindow(mainHandle);
        await closeCurrentWindow();

        // 4. Wait for all windows to close/hide
        await waitForWindowTransition(
            async () => {
                const handles = await wdioBrowser.getWindowHandles();
                return handles.length === 0;
            },
            { description: 'All windows closed with main window', timeout: 7000 }
        );
        await waitForAllWindowsHidden(5000);

        // 5. Restore from tray for cleanup
        await tray.clickShowMenuItemAndWait();
        await waitForWindowCount(1, 5000);
    });
});

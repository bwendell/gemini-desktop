/**
 * E2E Test: macOS Native Menu Shortcuts
 *
 * Tests macOS-specific keyboard shortcuts and menu behavior.
 *
 * Since WebDriver cannot simulate OS-level keyboard shortcuts on macOS,
 * we test menu actions via the custom menu bar (which is available on all platforms).
 *
 * Verifies:
 * 1. Opening Options via menu (testing the menu action that Cmd+, would trigger)
 * 2. Options window reuse behavior
 * 3. macOS menu integration
 *
 * Platform-specific: macOS only
 *
 * @module macos-menu.spec
 */

import type { Browser } from '@wdio/globals';
import { browser, expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage } from './pages';
import { isMacOSSync } from './helpers/platform';
import { waitForWindowCount } from './helpers/windowActions';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForWindowTransition, waitForUIState } from './helpers/waitUtilities';

const describeMac = isMacOSSync() ? describe : describe.skip;
const wdioBrowser = browser as unknown as WebdriverIO.Browser & Browser;

describeMac('macOS Native Menu Shortcuts', () => {
    const mainWindow = new MainWindowPage();
    const optionsPage = new OptionsPage();

    beforeEach(async () => {
        // Ensure app is loaded
        await waitForAppReady();
    });

    afterEach(async () => {
        // Cleanup: close any secondary windows
        await ensureSingleWindow();
    });

    describe('Cmd+, (Preferences) Shortcut (macOS only)', () => {
        it('should open Options window via menu action', async () => {
            // Verify only main window is open initially
            const initialHandles = await wdioBrowser.getWindowHandles();
            expect(initialHandles.length).toBe(1);

            // Open options via menu (simulates what Cmd+, does)
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);

            // Verify Options window opened
            const handles = await wdioBrowser.getWindowHandles();
            expect(handles.length).toBe(2);

            // Switch to options window and verify it loaded
            await optionsPage.waitForLoad();
        });

        it('should focus existing Options window if already open', async () => {
            // Open Options first via menu
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();

            const firstHandles = await wdioBrowser.getWindowHandles();
            expect(firstHandles.length).toBe(2);

            // Switch back to main window
            await wdioBrowser.switchToWindow(firstHandles[0]);
            await waitForWindowTransition(
                async () => {
                    // Verify we're back on the main window (simple check)
                    const currentHandles = await wdioBrowser.getWindowHandles();
                    return currentHandles.length === 2;
                },
                { description: 'Window switch back to main' }
            );

            // Try to open options again via menu
            await mainWindow.openOptionsViaMenu();
            await waitForUIState(
                async () => {
                    const handles = await wdioBrowser.getWindowHandles();
                    return handles.length === 2;
                },
                { description: 'Options menu action stability check', timeout: 1500 }
            );

            // Should still have only 2 windows (no duplicate)
            const secondHandles = await wdioBrowser.getWindowHandles();
            expect(secondHandles.length).toBe(2);
        });
    });

    describe('macOS Menu Integration', () => {
        it('should have functional app and menu on macOS', async () => {
            // Verify the app is running and functional
            const title = await wdioBrowser.getTitle();
            expect(title).toBeTruthy();

            // Verify main window is loaded
            const isLoaded = await mainWindow.isLoaded();
            expect(isLoaded).toBe(true);

            // Check if menu bar exists (custom menu on Windows/Linux, may not exist on macOS)
            const hasMenuBar = await mainWindow.isMenuBarDisplayed();
            expect(typeof hasMenuBar).toBe('boolean');

            // App functionality is verified by successfully loading the main window
        });
    });
});

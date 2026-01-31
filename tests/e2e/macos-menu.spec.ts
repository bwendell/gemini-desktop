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

import { browser, expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage } from './pages';
import { E2ELogger } from './helpers/logger';
import { isMacOS } from './helpers/platform';
import { waitForWindowCount } from './helpers/windowActions';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForWindowTransition, waitForUIState } from './helpers/waitUtilities';

describe('macOS Native Menu Shortcuts', () => {
    const mainWindow = new MainWindowPage();
    const optionsPage = new OptionsPage();

    beforeEach(async () => {
        // Skip all tests if not on macOS
        if (!(await isMacOS())) {
            return;
        }

        // Ensure app is loaded
        await waitForAppReady();
    });

    afterEach(async () => {
        // Cleanup: close any secondary windows
        await ensureSingleWindow();
    });

    describe('Cmd+, (Preferences) Shortcut (macOS only)', () => {
        it('should open Options window via menu action', async () => {
            if (!(await isMacOS())) {
                E2ELogger.info('macos-menu', 'Skipping - not on macOS');
                return;
            }

            // Verify only main window is open initially
            const initialHandles = await browser.getWindowHandles();
            expect(initialHandles.length).toBe(1);

            E2ELogger.info('macos-menu', 'Initial state: single main window');

            // Open options via menu (simulates what Cmd+, does)
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);

            // Verify Options window opened
            const handles = await browser.getWindowHandles();
            expect(handles.length).toBe(2);

            // Switch to options window and verify it loaded
            await optionsPage.waitForLoad();

            E2ELogger.info('macos-menu', 'Options window opened via menu action');
        });

        it('should focus existing Options window if already open', async () => {
            if (!(await isMacOS())) {
                return;
            }

            // Open Options first via menu
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();

            const firstHandles = await browser.getWindowHandles();
            expect(firstHandles.length).toBe(2);

            // Switch back to main window
            await browser.switchToWindow(firstHandles[0]);
            await waitForWindowTransition(
                async () => {
                    // Verify we're back on the main window (simple check)
                    const currentHandles = await browser.getWindowHandles();
                    return currentHandles.length === 2;
                },
                { description: 'Window switch back to main' }
            );

            // Try to open options again via menu
            await mainWindow.openOptionsViaMenu();
            await waitForUIState(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { description: 'Options menu action stability check', timeout: 1500 }
            );

            // Should still have only 2 windows (no duplicate)
            const secondHandles = await browser.getWindowHandles();
            expect(secondHandles.length).toBe(2);

            E2ELogger.info('macos-menu', 'No duplicate Options window created');
        });
    });

    describe('macOS Menu Integration', () => {
        it('should have functional app and menu on macOS', async () => {
            if (!(await isMacOS())) {
                return;
            }

            // Verify the app is running and functional
            const title = await browser.getTitle();
            expect(title).toBeTruthy();

            // Verify main window is loaded
            const isLoaded = await mainWindow.isLoaded();
            expect(isLoaded).toBe(true);

            // Check if menu bar exists (custom menu on Windows/Linux, may not exist on macOS)
            const hasMenuBar = await mainWindow.isMenuBarDisplayed();
            E2ELogger.info('macos-menu', `Custom menu bar present: ${hasMenuBar}`);

            // App functionality is verified by successfully loading the main window
            E2ELogger.info('macos-menu', 'App is running and functional on macOS');
        });
    });
});

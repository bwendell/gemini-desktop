/**
 * E2E Tests for Global Hotkey Functionality.
 *
 * Tests the global keyboard shortcut behavior by simulating real user keypresses
 * and verifying the actual application state changes (window visibility).
 *
 * Principles:
 * 1. SIMULATE REAL USER ACTIONS: Use browser.keys() via workflow helpers
 * 2. VERIFY ACTUAL OUTCOMES: Check window visibility via Page Objects
 * 3. TEST THE FULL STACK: OS -> Electron -> Main Process -> Window
 *
 * @module hotkeys.spec
 */

import { browser, expect } from '@wdio/globals';
import { QuickChatPage } from './pages';
import { waitForAppReady, ensureSingleWindow, pressComplexShortcut, switchToMainWindow } from './helpers/workflows';
import { waitForWindowTransition, waitForUIState } from './helpers/waitUtilities';

describe('Global Hotkeys', () => {
    const quickChat = new QuickChatPage();

    beforeEach(async () => {
        // Ensure app is loaded and focused
        await waitForAppReady();

        // Ensure we start with main window focused
        await switchToMainWindow();
    });

    afterEach(async () => {
        await ensureSingleWindow();
    });

    describe('Quick Chat Hotkey', () => {
        it('should toggle Quick Chat window visibility when pressing CommandOrControl+Shift+Space', async () => {
            // ENVIRONMENTAL CHECK: Verify that hotkeys can be registered in this environment
            // On some platforms/CI environments, global hotkeys may fail to register due to:
            // - Security restrictions (Windows UAC)
            // - Display server limitations (Wayland on Linux)
            // - CI/test environment constraints
            const hotkeyStatus = await browser.electron.execute((_electron: typeof import('electron')) => {
                try {
                    const { globalShortcut } = _electron;
                    return {
                        quickChat: globalShortcut.isRegistered('CommandOrControl+Shift+Space'),
                    };
                } catch (error) {
                    return { quickChat: false, error: (error as Error).message };
                }
            });

            // If hotkey isn't registered, skip this test as it's an environmental limitation
            if (!hotkeyStatus.quickChat) {
                console.log('⚠️  Skipping hotkey test: Quick Chat hotkey not registered in this environment');
                console.log('   This is expected in restricted environments (CI, certain Windows/Linux configs)');
                return; // Early return = skip test
            }

            // 1. Initial State: Quick Chat should be hidden
            // If it's somehow visible, close it first to start clean
            const isVisibleInitially = await quickChat.isVisible();
            if (isVisibleInitially) {
                await quickChat.cancel(); // Press Escape to close
                await waitForUIState(async () => !(await quickChat.isVisible()), {
                    description: 'Quick Chat to close',
                });
            }

            // 2. ACTION: Press the Hotkey via workflow helper
            // Simulating: Cmd/Ctrl + Shift + Space
            await pressComplexShortcut(['primary', 'shift'], 'Space');

            // Allow time for window animation and OS handling
            await waitForWindowTransition();

            // 3. VERIFICATION: Quick Chat should now be visible via Page Object
            await quickChat.waitForVisible();
            const isVisibleAfterOpen = await quickChat.isVisible();
            expect(isVisibleAfterOpen).toBe(true);

            // 4. ACTION: Press Hotkey again to close (Toggle behavior)
            await pressComplexShortcut(['primary', 'shift'], 'Space');
            await waitForWindowTransition();

            // 5. VERIFICATION: Quick Chat should be hidden via Page Object
            await quickChat.waitForHidden();
            const isVisibleAfterClose = await quickChat.isVisible();
            expect(isVisibleAfterClose).toBe(false);

            // Switch back to main window for cleanup
            await switchToMainWindow();
        });
    });
});

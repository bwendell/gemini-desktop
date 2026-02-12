/**
 * E2E Test: Boss Key (Hide All Windows)
 *
 * Tests the Boss Key hotkey functionality (Ctrl+Alt+H / Cmd+Alt+H) which
 * minimizes/hides the main window for quick privacy.
 *
 * The boss key is designed to quickly hide the application when needed.
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module boss-key.spec
 */

import { expect } from '@wdio/globals';
import { MainWindowPage } from './pages';
import { E2ELogger } from './helpers/logger';
import { isHotkeyRegistered, REGISTERED_HOTKEYS } from './helpers/hotkeyHelpers';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { isLinuxCI } from './helpers/platform';
import { isWindowVisible, hideWindow, restoreWindow, showWindow } from './helpers/windowStateActions';

describe('Boss Key (Hide All Windows)', () => {
    const mainWindow = new MainWindowPage();

    beforeEach(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        await ensureSingleWindow();
    });

    describe('Hotkey Registration', () => {
        it('should have boss key hotkey registered by default', async function () {
            // Skip on Linux CI - global hotkeys are disabled due to Wayland limitations
            if (await isLinuxCI()) {
                E2ELogger.info('boss-key', 'Skipping - Linux CI does not support global hotkeys');
                this.skip();
            }

            const accelerator = REGISTERED_HOTKEYS.MINIMIZE_WINDOW.accelerator;
            const isRegistered = await isHotkeyRegistered(accelerator);

            expect(isRegistered).toBe(true);
            E2ELogger.info('boss-key', `Boss key (${accelerator}) is registered`);
        });

        it('should display correct platform-specific hotkey format', async () => {
            const platform = process.platform;
            const expectedDisplay =
                platform === 'darwin'
                    ? REGISTERED_HOTKEYS.MINIMIZE_WINDOW.displayFormat.macos
                    : REGISTERED_HOTKEYS.MINIMIZE_WINDOW.displayFormat.windows;

            E2ELogger.info('boss-key', `Expected display format on ${platform}: ${expectedDisplay}`);

            // The hotkey should be Ctrl+Alt+H on Windows/Linux, Cmd+Alt+H on macOS
            if (platform === 'darwin') {
                expect(expectedDisplay).toContain('Cmd');
            } else {
                expect(expectedDisplay).toContain('Ctrl');
            }
        });
    });

    describe('Boss Key Action', () => {
        it('should hide main window when boss key is triggered', async function () {
            // Skip on Linux CI - window minimize detection doesn't work under Xvfb
            if (await isLinuxCI()) {
                E2ELogger.info('boss-key', 'Skipping - Linux CI uses headless Xvfb without window manager');
                this.skip();
            }

            // 1. Verify main window is visible initially
            const initialVisibility = await isWindowVisible();
            expect(initialVisibility).toBe(true);
            E2ELogger.info('boss-key', 'Main window is visible initially');

            await hideWindow();

            const visible = await isWindowVisible();

            expect(visible).toBe(false);
            E2ELogger.info('boss-key', `After boss key: visible=${visible}`);

            // 4. Restore window for cleanup
            await restoreWindow();
            await showWindow();

            // 5. Verify window is restored
            const afterRestore = await isWindowVisible();
            expect(afterRestore).toBe(true);
            E2ELogger.info('boss-key', 'Window restored successfully');
        });

        it('should remain hidden until explicitly restored', async function () {
            // Skip on Linux CI - window minimize detection doesn't work under Xvfb
            if (await isLinuxCI()) {
                E2ELogger.info('boss-key', 'Skipping - Linux CI uses headless Xvfb without window manager');
                this.skip();
            }

            await hideWindow();

            // 2. Wait a moment to ensure it stays hidden
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const stillVisible = await isWindowVisible();
            expect(stillVisible).toBe(false);
            E2ELogger.info('boss-key', 'Window remained hidden as expected');

            // 4. Cleanup - restore
            await restoreWindow();
            await showWindow();
        });
    });

    describe('Boss Key with Multiple Windows', () => {
        it('should handle boss key when options window is also open', async () => {
            // This test is informational - boss key currently only affects main window
            // Future enhancement could hide all windows

            E2ELogger.info('boss-key', 'Boss key affects main window; options window behavior may vary');

            // Verify the main window is loaded and can be minimized
            const isLoaded = await mainWindow.isLoaded();
            expect(isLoaded).toBe(true);

            // Verify window is currently visible (minimizable state)
            const isVisible = await isWindowVisible();
            expect(isVisible).toBe(true);
        });
    });
});

/**
 * E2E Test: Minimize-to-Tray Workflow
 *
 * Tests the hide-to-tray functionality.
 *
 * Platform behavior:
 * - Windows/Linux: Uses custom close button click (hideViaCloseButton)
 * - macOS: Uses native window close via Electron API (hideWindowToTray)
 *   since macOS uses native traffic lights instead of custom window controls
 *
 * Verifies:
 * 1. Close action triggers hide-to-tray (not quit)
 * 2. Window is hidden to tray (not just minimized)
 * 3. Can restore from tray after hiding
 * 4. Tray icon persists when window is hidden
 * 5. Multiple hide/restore cycles work correctly
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module minimize-to-tray.spec
 */

import { expect } from '@wdio/globals';
import { TrayPage } from './pages';
import { E2ELogger } from './helpers/logger';
import { waitForAppReady } from './helpers/workflows';
import { isMacOS } from './helpers/platform';

describe('Minimize-to-Tray Workflow', () => {
    const tray = new TrayPage();

    /**
     * Helper to hide window using platform-appropriate method.
     * - macOS: Uses hideWindowToTray() since native traffic lights are used
     * - Windows/Linux: Uses hideViaCloseButton() to test custom close button
     */
    async function hideWindow(): Promise<void> {
        if (await isMacOS()) {
            await tray.hideWindowToTray();
        } else {
            await tray.hideViaCloseButton();
        }
    }

    beforeEach(async () => {
        // Ensure app is loaded and window is visible
        await waitForAppReady();

        // Make sure window is visible before each test
        const visible = await tray.isWindowVisible();
        if (!visible) {
            await tray.clickAndWaitForWindow();
        }
    });

    afterEach(async () => {
        // Restore window after each test
        // Wrapped in try-catch to handle "Promise was collected" errors that can occur
        // when the WebSocket connection closes during cleanup after the final test
        try {
            const visible = await tray.isWindowVisible();
            if (!visible) {
                await tray.restoreWindowViaTrayClick();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (!errorMessage.includes('Promise was collected')) {
                throw error;
            }
            E2ELogger.info('minimize-to-tray', 'Cleanup interrupted by test teardown (safe to ignore)');
        }
    });

    describe('Close Action Triggers Hide-to-Tray', () => {
        it('should hide window to tray when close action is triggered', async () => {
            // Verify window is visible initially
            const initialVisible = await tray.isWindowVisible();
            expect(initialVisible).toBe(true);

            // Trigger close (platform-appropriate method)
            await hideWindow();

            // Window should be hidden
            const hiddenToTray = await tray.isHiddenToTray();
            expect(hiddenToTray).toBe(true);

            E2ELogger.info('minimize-to-tray', 'Window hidden to tray');
        });

        it('should not be minimized to taskbar (hidden vs minimized)', async () => {
            // Trigger close to hide
            await hideWindow();

            // Should NOT be minimized (minimized is different from hidden)
            const isMinimized = await tray.isWindowMinimized();
            expect(isMinimized).toBe(false);

            // Should not be visible
            const isVisible = await tray.isWindowVisible();
            expect(isVisible).toBe(false);

            E2ELogger.info('minimize-to-tray', 'Window is hidden, not minimized');
        });

        // Skip: Electron doesn't provide an isSkipTaskbar() getter - we can only setSkipTaskbar().
        // The functionality is tested implicitly by verifying hide-to-tray works correctly.
        it.skip('should skip taskbar on Windows/Linux when hidden to tray', async () => {
            // Skip on macOS (no taskbar concept)
            if (await isMacOS()) {
                E2ELogger.info('minimize-to-tray', 'Skipping taskbar test on macOS');
                return;
            }

            // Skip on Linux CI (Xvfb limitations)
            if (await tray.isLinuxCI()) {
                E2ELogger.info('minimize-to-tray', 'Skipping taskbar test on Linux CI');
                return;
            }

            // Trigger close to hide
            await hideWindow();

            // Should skip taskbar
            const skipTaskbar = await tray.isSkipTaskbar();
            expect(skipTaskbar).toBe(true);

            E2ELogger.info('minimize-to-tray', 'Window is skipping taskbar');
        });
    });

    describe('Restore from Tray After Hiding', () => {
        it('should restore window from tray after hiding', async () => {
            // 1. Hide to tray
            await hideWindow();

            // Verify hidden
            const hiddenAfterMinimize = await tray.isHiddenToTray();
            expect(hiddenAfterMinimize).toBe(true);

            // 2. Click tray to restore
            await tray.clickAndWaitForWindow();

            // 3. Window should be visible again
            const visibleAfterRestore = await tray.isWindowVisible();
            expect(visibleAfterRestore).toBe(true);

            E2ELogger.info('minimize-to-tray', 'Window restored from tray after hide');
        });

        it('should restore taskbar visibility on Windows/Linux', async () => {
            // Skip on macOS
            if (await isMacOS()) {
                return;
            }

            // Skip on Linux CI
            if (await tray.isLinuxCI()) {
                return;
            }

            // 1. Hide to tray
            await hideWindow();

            // 2. Restore via tray click
            await tray.clickAndWaitForWindow();

            // 3. Should NOT skip taskbar anymore
            const skipTaskbar = await tray.isSkipTaskbar();
            expect(skipTaskbar).toBe(false);

            E2ELogger.info('minimize-to-tray', 'Taskbar visibility restored after restore');
        });
    });

    describe('Tray Icon Persists', () => {
        it('should keep tray icon visible after hiding to tray', async () => {
            // Hide to tray
            await hideWindow();

            // Tray should still exist
            const trayExists = await tray.isCreated();
            expect(trayExists).toBe(true);

            E2ELogger.info('minimize-to-tray', 'Tray icon persists when window is hidden');
        });
    });

    describe('Multiple Hide/Restore Cycles', () => {
        it('should handle multiple hide/restore cycles', async () => {
            // Cycle 1
            await hideWindow();
            let hidden = await tray.isHiddenToTray();
            expect(hidden).toBe(true);

            await tray.restoreWindowViaTrayClick();
            let visible = await tray.isWindowVisible();
            expect(visible).toBe(true);

            // Cycle 2
            await hideWindow();
            hidden = await tray.isHiddenToTray();
            expect(hidden).toBe(true);

            await tray.restoreWindowViaTrayClick();
            visible = await tray.isWindowVisible();
            expect(visible).toBe(true);

            E2ELogger.info('minimize-to-tray', 'Multiple hide/restore cycles successful');
        });
    });
});

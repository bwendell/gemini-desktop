/**
 * E2E Test: System Tray Functionality
 *
 * Tests the system tray icon and context menu behavior across platforms.
 *
 * Verifies:
 * 1. Tray icon is created on app startup
 * 2. Tray click restores window from tray
 * 3. Tray has correct tooltip
 * 4. Tray "Show" action restores window
 * 5. Tray "Quit" action exits app (skipped - causes session issues)
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module tray.spec
 */

import { expect } from '@wdio/globals';
import { E2ELogger } from './helpers/logger';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForMacOSWindowStabilize } from './helpers/waitUtilities';
import { TrayPage } from './pages';

describe('System Tray Functionality', () => {
    const tray = new TrayPage();

    beforeEach(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        // Wrap cleanup in try-catch to prevent cascading failures from WebSocket issues
        try {
            // Ensure tray click restored the window and clean up
            const isVisible = await tray.isWindowVisible();
            if (!isVisible) {
                // Restore window if it's hidden to allow next test to work
                await tray.restoreWindowViaTrayClick();
            }
            await ensureSingleWindow();
        } catch (error) {
            // Log but don't fail - WebSocket issues in cleanup shouldn't cascade
            E2ELogger.warn('tray', `afterEach cleanup error (may be harmless): ${error}`);
        }
    });

    describe('Tray Icon Creation', () => {
        it('should create tray icon on app startup', async () => {
            const trayExists = await tray.isCreated();

            expect(trayExists).toBe(true);
            E2ELogger.info('tray', 'Tray icon verified as existing');
        });

        // Skip: Electron Tray API has no getToolTip() method - we can only setToolTip().
        // The tooltip is verified implicitly by the tray existing (tooltip is set in createTray()).
        it.skip('should have correct tooltip on tray icon', async () => {
            const tooltip = await tray.getTooltip();

            // Tooltip should be set (from TRAY_TOOLTIP constant)
            expect(tooltip).not.toBeNull();
            expect(tooltip).toContain('Gemini');

            E2ELogger.info('tray', `Tray tooltip: "${tooltip}"`);
        });

        it('should report tray state correctly', async () => {
            const state = await tray.getState();

            expect(state.exists).toBe(true);
            expect(state.isDestroyed).toBe(false);
            // Note: state.tooltip will be null because Electron has no getToolTip() API
            // The tooltip being set is verified implicitly by tray creation working.

            E2ELogger.info('tray', `Tray state: ${JSON.stringify(state)}`);
        });
    });

    describe('Tray Click Behavior', () => {
        it('should restore window when tray icon is clicked', async () => {
            // 1. First hide window to tray
            await tray.hideWindowToTray();

            // Verify window is hidden
            const visibleAfterClose = await tray.isWindowVisible();
            expect(visibleAfterClose).toBe(false);

            // 2. Click the tray icon and wait for window
            await tray.clickAndWaitForWindow();

            // 3. Window should be visible again
            const visibleAfterTrayClick = await tray.isWindowVisible();
            expect(visibleAfterTrayClick).toBe(true);

            E2ELogger.info('tray', 'Tray click restored window successfully');
        });
    });

    describe('Tray Context Menu Actions', () => {
        it('should restore window when "Show" menu item is clicked', async () => {
            // 1. Hide window to tray
            await tray.hideWindowToTray();

            // Verify hidden
            const visibleAfterClose = await tray.isWindowVisible();
            expect(visibleAfterClose).toBe(false);

            // 2. Click "Show" menu item and wait
            await tray.clickShowMenuItemAndWait();

            // 3. Window should be visible
            const visibleAfterShow = await tray.isWindowVisible();
            expect(visibleAfterShow).toBe(true);

            E2ELogger.info('tray', 'Show menu item restored window successfully');
        });

        // Note: We skip testing "Quit" because it would terminate the app
        // and break the E2E session. The quit functionality is tested
        // via unit tests in trayManager.test.ts
        it.skip('should quit app when "Quit" menu item is clicked', async () => {
            // This would call: await tray.clickQuitMenuItem();
            // But we can't test this without ending the session
        });
    });

    describe('Tray Integration with Window State', () => {
        it('should work correctly after multiple hide/restore cycles', async () => {
            // Cycle 1: Hide and restore via tray click
            await tray.hideAndRestoreViaTrayClick();
            let isVisible = await tray.isWindowVisible();
            expect(isVisible).toBe(true);

            // Cycle 2: Hide and restore via menu
            await tray.hideAndRestoreViaShowMenu();
            isVisible = await tray.isWindowVisible();
            expect(isVisible).toBe(true);

            // Cycle 3: Hide and restore via click again
            await tray.hideAndRestoreViaTrayClick();
            isVisible = await tray.isWindowVisible();
            expect(isVisible).toBe(true);

            E2ELogger.info('tray', 'Multiple hide/restore cycles completed successfully');
        });

        it('should keep tray icon after window is hidden', async () => {
            // Hide window
            await tray.hideWindowToTray();

            // Tray should still exist
            const trayExists = await tray.isCreated();
            expect(trayExists).toBe(true);

            // Restore window for cleanup
            await tray.restoreWindowViaTrayClick();

            // Extra stabilization for macOS WebSocket stability
            await waitForMacOSWindowStabilize(async () => await tray.isWindowVisible(), {
                description: 'Window stabilization after tray restore',
            });

            E2ELogger.info('tray', 'Tray icon persists when window is hidden');
        });
    });
});

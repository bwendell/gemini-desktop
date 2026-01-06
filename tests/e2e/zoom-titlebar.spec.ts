/**
 * E2E Test: Zoom Control via Custom Titlebar (Task 7.3)
 *
 * Tests zoom in/out functionality via the custom titlebar menu on Windows/Linux.
 * These tests verify the HTML-based custom titlebar menu integration.
 *
 * Golden Rule: "If this code path was broken, would this test fail?"
 * - If menu item not rendered: element not found, test fails
 * - If click handler not working: zoom level won't change
 * - If zoom percentage label not updating: assertion on label fails
 *
 * @see docs/E2E_TESTING_GUIDELINES.md
 */

import { browser, expect, $ } from '@wdio/globals';
import { waitForAppReady, ensureSingleWindow, switchToMainWindow, waitForIpcSettle } from './helpers/workflows';
import { isMacOS } from './helpers/platform';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';

describe('Zoom Control via Custom Titlebar E2E', () => {
    beforeEach(async () => {
        await waitForAppReady();
        await switchToMainWindow();

        // Reset zoom to 100% before each test for clean state
        await browser.electron.execute(() => {
            global.windowManager.setZoomLevel(100);
        });
        await waitForIpcSettle();
    });

    afterEach(async () => {
        // Reset zoom level to 100% after tests
        await browser.electron.execute(() => {
            global.windowManager.setZoomLevel(100);
        });
        // Close any open menu dropdowns by clicking elsewhere
        try {
            const body = await $('body');
            await body.click();
        } catch {
            // Ignore if body is not available
        }
        await ensureSingleWindow();
    });

    /**
     * Helper function to open the View menu in the custom titlebar.
     */
    async function openViewMenu(): Promise<void> {
        const viewMenuBtn = await $('[data-testid="menu-button-View"]');
        await viewMenuBtn.waitForClickable({ timeout: 5000 });
        await viewMenuBtn.click();

        // Wait for dropdown to appear
        const dropdown = await $('.titlebar-menu-dropdown');
        await dropdown.waitForDisplayed({ timeout: 2000 });
    }

    /**
     * Helper function to close any open menu by clicking outside.
     */
    async function closeMenu(): Promise<void> {
        const body = await $('body');
        await body.click();
        await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
    }

    /**
     * Helper function to get the text content of a menu item.
     */
    async function getMenuItemText(menuItemId: string): Promise<string> {
        const menuItem = await $(`[data-menu-id="${menuItemId}"]`);
        await menuItem.waitForDisplayed({ timeout: 2000 });
        return await menuItem.getText();
    }

    /**
     * Helper function to click a menu item in the dropdown.
     */
    async function clickMenuItem(menuItemId: string): Promise<void> {
        const menuItem = await $(`[data-menu-id="${menuItemId}"]`);
        await menuItem.waitForClickable({ timeout: 2000 });
        await menuItem.click();
    }

    // ===========================================================================
    // 7.3.1 Test custom titlebar View menu shows Zoom In item with percentage
    // ===========================================================================

    describe('Custom Titlebar Zoom Menu Items (7.3.1-7.3.2)', () => {
        it('7.3.1 should show Zoom In item with (100%) label in View menu', async () => {
            // Skip on macOS (uses native menu bar)
            if (await isMacOS()) {
                E2ELogger.info('zoom-titlebar', 'Skipping Windows/Linux test on macOS');
                return;
            }

            E2ELogger.info('zoom-titlebar', 'Testing Zoom In menu item visibility');

            // Open the View menu
            await openViewMenu();

            // Check Zoom In item text
            const zoomInText = await getMenuItemText('menu-view-zoom-in');
            expect(zoomInText).toContain('Zoom In');
            expect(zoomInText).toContain('(100%)');
            E2ELogger.info('zoom-titlebar', `Zoom In item text: ${zoomInText}`);

            await closeMenu();
            E2ELogger.info('zoom-titlebar', '✓ Zoom In menu item visibility test passed');
        });

        it('7.3.2 should show Zoom Out item with (100%) label in View menu', async () => {
            // Skip on macOS (uses native menu bar)
            if (await isMacOS()) {
                E2ELogger.info('zoom-titlebar', 'Skipping Windows/Linux test on macOS');
                return;
            }

            E2ELogger.info('zoom-titlebar', 'Testing Zoom Out menu item visibility');

            // Open the View menu
            await openViewMenu();

            // Check Zoom Out item text
            const zoomOutText = await getMenuItemText('menu-view-zoom-out');
            expect(zoomOutText).toContain('Zoom Out');
            expect(zoomOutText).toContain('(100%)');
            E2ELogger.info('zoom-titlebar', `Zoom Out item text: ${zoomOutText}`);

            await closeMenu();
            E2ELogger.info('zoom-titlebar', '✓ Zoom Out menu item visibility test passed');
        });
    });

    // ===========================================================================
    // 7.3.3-7.3.4 Test clicking Zoom In/Out menu items changes zoom
    // ===========================================================================

    describe('Custom Titlebar Zoom Actions (7.3.3-7.3.4)', () => {
        it('7.3.3 should increase zoom when clicking Zoom In menu item', async () => {
            // Skip on macOS (uses native menu bar)
            if (await isMacOS()) {
                E2ELogger.info('zoom-titlebar', 'Skipping Windows/Linux test on macOS');
                return;
            }

            E2ELogger.info('zoom-titlebar', 'Testing Zoom In menu item click');

            // Verify initial zoom is 100%
            const initialZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(initialZoom).toBe(100);

            // Open View menu and click Zoom In
            await openViewMenu();
            await clickMenuItem('menu-view-zoom-in');
            await waitForIpcSettle();

            // Verify zoom increased
            const newZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(newZoom).toBeGreaterThan(100);
            E2ELogger.info('zoom-titlebar', `Zoom increased from 100% to ${newZoom}%`);

            E2ELogger.info('zoom-titlebar', '✓ Zoom In menu item click test passed');
        });

        it('7.3.4 should decrease zoom when clicking Zoom Out menu item', async () => {
            // Skip on macOS (uses native menu bar)
            if (await isMacOS()) {
                E2ELogger.info('zoom-titlebar', 'Skipping Windows/Linux test on macOS');
                return;
            }

            E2ELogger.info('zoom-titlebar', 'Testing Zoom Out menu item click');

            // First zoom in to have room to zoom out
            await browser.electron.execute(() => {
                global.windowManager.setZoomLevel(125);
            });
            await waitForIpcSettle();

            const startZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(startZoom).toBe(125);
            E2ELogger.info('zoom-titlebar', `Starting zoom: ${startZoom}%`);

            // Open View menu and click Zoom Out
            await openViewMenu();
            await clickMenuItem('menu-view-zoom-out');
            await waitForIpcSettle();

            // Verify zoom decreased
            const newZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(newZoom).toBeLessThan(startZoom);
            E2ELogger.info('zoom-titlebar', `Zoom decreased from ${startZoom}% to ${newZoom}%`);

            E2ELogger.info('zoom-titlebar', '✓ Zoom Out menu item click test passed');
        });
    });

    // ===========================================================================
    // 7.3.5 Test zoom label updates after zoom change
    // ===========================================================================

    describe('Custom Titlebar Zoom Label Updates (7.3.5)', () => {
        it('7.3.5 should update menu item labels after zoom change', async () => {
            // Skip on macOS (uses native menu bar)
            if (await isMacOS()) {
                E2ELogger.info('zoom-titlebar', 'Skipping Windows/Linux test on macOS');
                return;
            }

            E2ELogger.info('zoom-titlebar', 'Testing zoom label updates');

            // Set zoom to 150%
            await browser.electron.execute(() => {
                global.windowManager.setZoomLevel(150);
            });
            await waitForIpcSettle();

            // Open View menu and check labels
            await openViewMenu();

            const zoomInText = await getMenuItemText('menu-view-zoom-in');
            expect(zoomInText).toContain('(150%)');
            E2ELogger.info('zoom-titlebar', `Zoom In label after change: ${zoomInText}`);

            const zoomOutText = await getMenuItemText('menu-view-zoom-out');
            expect(zoomOutText).toContain('(150%)');
            E2ELogger.info('zoom-titlebar', `Zoom Out label after change: ${zoomOutText}`);

            await closeMenu();
            E2ELogger.info('zoom-titlebar', '✓ Zoom label update test passed');
        });
    });

    // ===========================================================================
    // 7.3.6-7.3.7 Test zoom bounds via custom titlebar
    // ===========================================================================

    describe('Custom Titlebar Zoom Bounds (7.3.6-7.3.7)', () => {
        it('7.3.6 should cap at 200% after multiple Zoom In clicks', async () => {
            // Skip on macOS (uses native menu bar)
            if (await isMacOS()) {
                E2ELogger.info('zoom-titlebar', 'Skipping Windows/Linux test on macOS');
                return;
            }

            E2ELogger.info('zoom-titlebar', 'Testing 200% zoom cap via titlebar menu');

            // Set zoom close to max
            await browser.electron.execute(() => {
                global.windowManager.setZoomLevel(175);
            });
            await waitForIpcSettle();

            // Click Zoom In multiple times
            for (let i = 0; i < 5; i++) {
                await openViewMenu();
                await clickMenuItem('menu-view-zoom-in');
                await waitForIpcSettle();
                await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
            }

            // Verify zoom is capped at 200%
            const finalZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(finalZoom).toBe(200);
            E2ELogger.info('zoom-titlebar', `Final zoom after multiple Zoom In: ${finalZoom}%`);

            E2ELogger.info('zoom-titlebar', '✓ 200% zoom cap test passed');
        });

        it('7.3.7 should cap at 50% after multiple Zoom Out clicks', async () => {
            // Skip on macOS (uses native menu bar)
            if (await isMacOS()) {
                E2ELogger.info('zoom-titlebar', 'Skipping Windows/Linux test on macOS');
                return;
            }

            E2ELogger.info('zoom-titlebar', 'Testing 50% zoom cap via titlebar menu');

            // Set zoom close to min
            await browser.electron.execute(() => {
                global.windowManager.setZoomLevel(67);
            });
            await waitForIpcSettle();

            // Click Zoom Out multiple times
            for (let i = 0; i < 5; i++) {
                await openViewMenu();
                await clickMenuItem('menu-view-zoom-out');
                await waitForIpcSettle();
                await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
            }

            // Verify zoom is capped at 50%
            const finalZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(finalZoom).toBe(50);
            E2ELogger.info('zoom-titlebar', `Final zoom after multiple Zoom Out: ${finalZoom}%`);

            E2ELogger.info('zoom-titlebar', '✓ 50% zoom cap test passed');
        });
    });
});

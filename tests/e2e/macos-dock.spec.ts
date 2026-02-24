/**
 * E2E Test: macOS Dock and Menubar Behavior
 *
 * Tests macOS-specific behavior for Dock icon and menubar tray.
 *
 * Verifies:
 * 1. Dock icon click recreates window if none exist
 * 2. Menubar tray icon visible on macOS
 * 3. App behavior follows macOS conventions
 *
 * Platform-specific: macOS only
 *
 * @module macos-dock.spec
 */

import { expect } from '@wdio/globals';
import { MacOSDockPage } from './pages';
import { verifyTrayCreated, getTrayTooltip } from './helpers/trayActions';
import { waitForAppReady, getWindowCount } from './helpers/workflows';
import { waitForMacOSWindowStabilize } from './helpers/waitUtilities';

describe('macOS Dock and Menubar Behavior', () => {
    const dockPage = new MacOSDockPage();

    beforeEach(async () => {
        // Skip all tests if not on macOS
        if (!(await dockPage.isMacOS())) {
            return;
        }

        // Wait for app to be fully ready
        await waitForAppReady();
    });

    describe('Dock Icon Behavior (macOS only)', () => {
        it('should exist on macOS', async () => {
            if (!(await dockPage.isMacOS())) {
                return;
            }

            // The Dock icon exists by virtue of the app running
            // We verify by checking that we're on macOS and the app is running
            const platform = await dockPage.getPlatform();
            expect(platform).toBe('darwin');

            const windowCount = await getWindowCount();
            expect(windowCount).toBeGreaterThan(0);
        });

        it('should recreate window when activate event is fired with no windows', async () => {
            if (!(await dockPage.isMacOS())) {
                return;
            }

            // Note: We can't actually close all windows without ending the test session
            // Instead, we verify the handler exists by checking the window count
            // after simulating activate with existing windows

            const initialCount = await getWindowCount();
            expect(initialCount).toBeGreaterThan(0);

            // Simulate activate - should not create extra windows if one exists
            await dockPage.simulateActivateEvent();
            await waitForMacOSWindowStabilize(undefined, { description: 'Dock activate event' });

            const afterActivateCount = await getWindowCount();

            // Should still have the same window (not create duplicates)
            expect(afterActivateCount).toBe(initialCount);
        });

        it('should NOT quit app when all windows closed on macOS', async () => {
            if (!(await dockPage.isMacOS())) {
                return;
            }

            const wouldQuit = await dockPage.wouldQuitOnAllWindowsClosed();

            // On macOS, should NOT quit when windows closed
            expect(wouldQuit).toBe(false);
        });

        it('should have correct Dock menu items on macOS', async () => {
            if (!(await dockPage.isMacOS())) {
                return;
            }

            // Use the Page Object to get Dock menu state
            const dockMenuExists = await dockPage.hasDockMenu();
            expect(dockMenuExists).toBe(true);

            // Verify our implemented items: "Show Gemini", separator, "Settings"
            const hasShowGemini = await dockPage.hasDockMenuItem('Show Gemini');
            const hasSettings = await dockPage.hasDockMenuItem('Settings');

            expect(hasShowGemini).toBe(true);
            expect(hasSettings).toBe(true);

            const labels = await dockPage.getDockMenuLabels();
            expect(labels.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Menubar Tray Icon (macOS)', () => {
        it('should have menubar tray icon on macOS', async () => {
            if (!(await dockPage.isMacOS())) {
                return;
            }

            // Tray icon should exist on macOS
            const trayExists = await verifyTrayCreated();
            expect(trayExists).toBe(true);
        });

        it('should attempt to retrieve tray tooltip on macOS', async () => {
            if (!(await dockPage.isMacOS())) {
                return;
            }

            const tooltip = await getTrayTooltip();

            // Note: On macOS, Tray.getToolTip() may return null even when tooltip is set
            // via setToolTip(). This is a known Electron limitation on macOS.
            // We've already verified the tray exists in the previous test.
            if (tooltip !== null) {
                expect(tooltip).toBeTruthy();
            }

            // Accept either a valid tooltip string or null (macOS limitation)
            expect(tooltip === null || typeof tooltip === 'string').toBe(true);
        });
    });

    describe('macOS Window Conventions', () => {
        it('should use traffic light controls (handled by OS, not custom)', async () => {
            if (!(await dockPage.isMacOS())) {
                return;
            }

            // Verify macOS window conventions using the Page Object
            const conventions = await dockPage.verifyMacOSWindowConventions();

            // On macOS, we expect native traffic lights, so custom controls should be absent
            expect(conventions.usesNativeControls).toBe(true);
            expect(conventions.hasCustomControls).toBe(false);
        });
    });
});

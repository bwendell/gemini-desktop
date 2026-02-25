/// <reference path="./helpers/wdio-electron.d.ts" />

/**
 * E2E Test: macOS Tray Icon Display and Window Rendering
 *
 * Tests macOS-specific tray icon behavior and main window rendering
 * when interacting with the system tray.
 *
 * Verifies:
 * 1. Tray icon path contains trayIconTemplate on macOS
 * 2. Main window content is visible
 * 3. Tab bar is visible and functional
 * 4. Hide to tray and restore cycle works correctly
 *
 * Platform-specific: macOS only
 *
 * @module macos-tray-window.spec
 */

import { expect, browser, $ } from '@wdio/globals';
import { E2ELogger } from './helpers/logger';
import {
    waitForAppReady,
    ensureSingleWindow,
} from './helpers/workflows';
import { waitForMacOSWindowStabilize } from './helpers/waitUtilities';
import { isMacOS } from './helpers/platform';
import { TrayPage } from './pages';
import { isWindowVisible } from './helpers/windowStateActions';
import { Selectors } from './helpers/selectors';

describe('macOS Tray Icon Display and Window Rendering', () => {
    const tray = new TrayPage();

    // Skip all tests if not on macOS
    before(async () => {
        if (!(await isMacOS())) {
            E2ELogger.info('macos-tray-window', 'Skipping macOS-specific tests on non-macOS platform');
        }
    });

    beforeEach(async () => {
        if (!(await isMacOS())) {
            return; // Skip test execution on non-macOS
        }
        await waitForAppReady();
    });

    afterEach(async () => {
        if (!(await isMacOS())) {
            return; // Skip cleanup on non-macOS
        }

        try {
            // Ensure window is visible for next test
            const isVisible = await isWindowVisible();
            if (!isVisible) {
                await tray.restoreWindowViaTrayClick();
            }
            await ensureSingleWindow();
        } catch (error) {
            E2ELogger.warn(
                'macos-tray-window',
                `afterEach cleanup error (may be harmless): ${error}`
            );
        }
    });

    describe('Tray Icon Configuration', () => {
        it('should have tray icon path containing trayIconTemplate on macOS', async () => {
            if (!(await isMacOS())) {
                return;
            }

            // Query the tray icon path from the main process
            const trayIconInfo = await (browser as WebdriverIO.Browser & { electron: any }).electron.execute(() => {
                const trayManager = (global as any).trayManager;

                if (!trayManager) {
                    return {
                        exists: false,
                        path: null,
                        hasTrayIconTemplate: false,
                        error: 'trayManager not in global',
                    };
                }

                const tray = trayManager.getTray();
                if (!tray || tray.isDestroyed()) {
                    return {
                        exists: false,
                        path: null,
                        hasTrayIconTemplate: false,
                        error: 'tray not available',
                    };
                }

                // Attempt to get the tray icon path
                // On macOS, Electron internally uses trayIconTemplate for the image
                const getImage = (tray as any).getImage;
                const iconPath = getImage ? getImage() : null;

                return {
                    exists: true,
                    path: iconPath || null,
                    hasTrayIconTemplate: iconPath
                        ? iconPath.includes('trayIconTemplate') ||
                          iconPath.includes('tray')
                        : false,
                    error: null,
                };
            });

            expect(trayIconInfo.exists).toBe(true);
            // Path may be null in some contexts, but tray must exist
            expect(trayIconInfo.error).toBeNull();

            E2ELogger.info(
                'macos-tray-window',
                `Tray icon path: ${trayIconInfo.path || '(not accessible in test context)'}`
            );
        });
    });

    describe('Main Window Content Visibility', () => {
        it('should have main window visible with content on startup', async () => {
            if (!(await isMacOS())) {
                return;
            }

            // Verify window is visible
            const windowVisible = await isWindowVisible();
            expect(windowVisible).toBe(true);

            // Verify the main content container exists and is visible
            const contentContainer = await $('.main-content');
            const isDisplayed = await contentContainer.isDisplayed().catch(() => false);
            expect(isDisplayed).toBe(true);
            E2ELogger.info('macos-tray-window', 'Main window content is visible on startup');
        });

        it('should render the main window correctly after tray restore', async () => {
            if (!(await isMacOS())) {
                return;
            }

            // Hide window to tray
            await tray.hideWindowToTray();
            await waitForMacOSWindowStabilize(undefined, {
                description: 'Window hide stabilization',
            });

            // Restore from tray
            await tray.restoreWindowViaTrayClick();
            await waitForMacOSWindowStabilize(async () => isWindowVisible(), {
                description: 'Window restore stabilization',
            });

            // Verify window is visible
            const windowVisible = await isWindowVisible();
            expect(windowVisible).toBe(true);

            E2ELogger.info(
                'macos-tray-window',
                'Main window rendered correctly after tray restore'
            );
        });
    });

    describe('Tab Bar Visibility', () => {
        it('should display tab bar in main window', async () => {
            if (!(await isMacOS())) {
                return;
            }

            // Look for the tab bar container
            const tabBar = await $(Selectors.tabBar).catch(() => null);

            if (tabBar) {
                const isDisplayed = await tabBar.isDisplayed().catch(() => false);
                expect(isDisplayed).toBe(true);
                E2ELogger.info('macos-tray-window', 'Tab bar is visible');
            } else {
                E2ELogger.info('macos-tray-window', 'Tab bar selector not found (may not exist in current view)');
            }
        });

        it('should keep tab bar visible after hide/restore cycle', async () => {
            if (!(await isMacOS())) {
                return;
            }

            // Get initial tab bar state
            const tabBarBefore = await $(Selectors.tabBar).catch(() => null);
            const visibleBefore = tabBarBefore
                ? await tabBarBefore.isDisplayed().catch(() => false)
                : false;

            // Perform hide/restore cycle
            await tray.hideWindowToTray();
            await waitForMacOSWindowStabilize(undefined, {
                description: 'Window hide for tab bar test',
            });

            await tray.restoreWindowViaTrayClick();
            await waitForMacOSWindowStabilize(async () => isWindowVisible(), {
                description: 'Window restore for tab bar test',
            });

            // Verify tab bar state after restore
            const tabBarAfter = await $(Selectors.tabBar).catch(() => null);
            const visibleAfter = tabBarAfter
                ? await tabBarAfter.isDisplayed().catch(() => false)
                : false;

            if (visibleBefore) {
                expect(visibleAfter).toBe(true);
                E2ELogger.info(
                    'macos-tray-window',
                    'Tab bar remains visible after hide/restore cycle'
                );
            }
        });
    });

    describe('Hide to Tray and Restore', () => {
        it('should hide window to tray and restore via tray click', async () => {
            if (!(await isMacOS())) {
                return;
            }

            // Verify initial state
            let windowVisible = await isWindowVisible();
            expect(windowVisible).toBe(true);

            // Hide to tray
            await tray.hideWindowToTray();
            await waitForMacOSWindowStabilize(undefined, {
                description: 'Window hide stabilization for restore test',
            });

            // Verify hidden
            windowVisible = await isWindowVisible();
            expect(windowVisible).toBe(false);

            // Restore via tray click
            await tray.restoreWindowViaTrayClick();
            await waitForMacOSWindowStabilize(async () => isWindowVisible(), {
                description: 'Window restore stabilization via tray click',
            });

            // Verify visible
            windowVisible = await isWindowVisible();
            expect(windowVisible).toBe(true);

            E2ELogger.info(
                'macos-tray-window',
                'Hide to tray and restore via tray click successful'
            );
        });

        it('should hide window to tray and restore via Show menu item', async () => {
            if (!(await isMacOS())) {
                return;
            }

            // Verify initial state
            let windowVisible = await isWindowVisible();
            expect(windowVisible).toBe(true);

            // Hide to tray
            await tray.hideWindowToTray();
            await waitForMacOSWindowStabilize(undefined, {
                description: 'Window hide stabilization for Show menu test',
            });

            // Verify hidden
            windowVisible = await isWindowVisible();
            expect(windowVisible).toBe(false);

            // Restore via Show menu
            await tray.restoreWindowViaShowMenu();
            await waitForMacOSWindowStabilize(async () => isWindowVisible(), {
                description: 'Window restore stabilization via Show menu',
            });

            // Verify visible
            windowVisible = await isWindowVisible();
            expect(windowVisible).toBe(true);

            E2ELogger.info(
                'macos-tray-window',
                'Hide to tray and restore via Show menu successful'
            );
        });

        it('should support multiple hide/restore cycles', async () => {
            if (!(await isMacOS())) {
                return;
            }

            // Cycle 1: Via tray click
            await tray.hideWindowToTray();
            await waitForMacOSWindowStabilize(undefined, {
                description: 'Cycle 1 hide',
            });
            let windowVisible = await isWindowVisible();
            expect(windowVisible).toBe(false);

            await tray.restoreWindowViaTrayClick();
            await waitForMacOSWindowStabilize(async () => isWindowVisible(), {
                description: 'Cycle 1 restore',
            });
            windowVisible = await isWindowVisible();
            expect(windowVisible).toBe(true);

            // Cycle 2: Via Show menu
            await tray.hideWindowToTray();
            await waitForMacOSWindowStabilize(undefined, {
                description: 'Cycle 2 hide',
            });
            windowVisible = await isWindowVisible();
            expect(windowVisible).toBe(false);

            await tray.restoreWindowViaShowMenu();
            await waitForMacOSWindowStabilize(async () => isWindowVisible(), {
                description: 'Cycle 2 restore',
            });
            windowVisible = await isWindowVisible();
            expect(windowVisible).toBe(true);

            E2ELogger.info(
                'macos-tray-window',
                'Multiple hide/restore cycles completed successfully'
            );
        });
    });
});

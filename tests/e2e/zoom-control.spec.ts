/**
 * E2E Test: Zoom Control (Task 7.1)
 *
 * Tests zoom in/out functionality via menu accelerators.
 * Uses the native Electron Menu API to trigger zoom actions since WebDriver
 * cannot reliably trigger menu accelerators via synthesized keyboard events.
 *
 * Golden Rule: "If this code path was broken, would this test fail?"
 * - If menu item click handler is wrong: zoom level won't change
 * - If windowManager.zoomIn() is broken: zoom level won't change
 * - If zoom level not applied to webContents: getZoomFactor will be wrong
 *
 * @see docs/E2E_TESTING_GUIDELINES.md
 */

import { browser, expect } from '@wdio/globals';
import { waitForAppReady, ensureSingleWindow, switchToMainWindow, waitForIpcSettle } from './helpers/workflows';
import { triggerZoomIn, triggerZoomOut, getMenuItemState } from './helpers/menuActions';
import { readUserPreferences } from './helpers/persistenceActions';
import { isMacOS } from './helpers/platform';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';

describe('Zoom Control E2E', () => {
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
        await ensureSingleWindow();
    });

    // ===========================================================================
    // 7.1 Test Ctrl+= zooms in via keyboard shortcut
    // ===========================================================================

    describe('Zoom In via Keyboard Shortcut (7.1)', () => {
        it('should increase zoom level when pressing Ctrl+=', async () => {
            E2ELogger.info('zoom-control', 'Testing Ctrl+= zoom in keyboard shortcut');

            // 1. Verify initial zoom level is 100%
            const initialZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(initialZoom).toBe(100);
            E2ELogger.info('zoom-control', `Initial zoom level: ${initialZoom}%`);

            // 2. Verify initial webContents zoom factor
            const initialZoomFactor = await browser.electron.execute(() => {
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.getZoomFactor();
                }
                return null;
            });
            expect(initialZoomFactor).toBeCloseTo(1.0, 2);
            E2ELogger.info('zoom-control', `Initial zoom factor: ${initialZoomFactor}`);

            // 3. Trigger zoom in via menu (more reliable than keyboard shortcuts)
            await triggerZoomIn();
            await waitForIpcSettle();

            // 4. Verify zoom level increased
            const newZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(newZoom).toBeGreaterThan(initialZoom);
            E2ELogger.info('zoom-control', `New zoom level after Ctrl+=: ${newZoom}%`);

            // 5. Verify the expected step (100% -> 110%)
            expect(newZoom).toBe(110);

            // 6. Verify webContents zoom factor was actually applied
            const newZoomFactor = await browser.electron.execute(() => {
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.getZoomFactor();
                }
                return null;
            });
            expect(newZoomFactor).toBeCloseTo(1.1, 2);
            E2ELogger.info('zoom-control', `New zoom factor: ${newZoomFactor}`);

            E2ELogger.info('zoom-control', '✓ Ctrl+= zoom in test passed');
        });

        it('should zoom in multiple steps with repeated Ctrl+= presses', async () => {
            E2ELogger.info('zoom-control', 'Testing multiple Ctrl+= presses');

            // 1. Get initial zoom level
            const initialZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(initialZoom).toBe(100);

            // 2. Trigger zoom in three times via menu
            await triggerZoomIn();
            await waitForIpcSettle();
            await triggerZoomIn();
            await waitForIpcSettle();
            await triggerZoomIn();
            await waitForIpcSettle();

            // 3. Verify zoom level increased through multiple steps
            // 100% -> 110% -> 125% -> 150%
            const finalZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(finalZoom).toBe(150);
            E2ELogger.info('zoom-control', `Final zoom level after 3 presses: ${finalZoom}%`);

            // 4. Verify webContents zoom factor matches
            const finalZoomFactor = await browser.electron.execute(() => {
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.getZoomFactor();
                }
                return null;
            });
            expect(finalZoomFactor).toBeCloseTo(1.5, 2);

            E2ELogger.info('zoom-control', '✓ Multiple Ctrl+= zoom in test passed');
        });
    });

    // ===========================================================================
    // 7.1.2 Test Ctrl+- zooms out via keyboard shortcut
    // ===========================================================================

    describe('Zoom Out via Keyboard Shortcut (7.1.2)', () => {
        it('should decrease zoom level when pressing Ctrl+-', async () => {
            E2ELogger.info('zoom-control', 'Testing Ctrl+- zoom out keyboard shortcut');

            // 1. Verify initial zoom level is 100%
            const initialZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(initialZoom).toBe(100);
            E2ELogger.info('zoom-control', `Initial zoom level: ${initialZoom}%`);

            // 2. Verify initial webContents zoom factor
            const initialZoomFactor = await browser.electron.execute(() => {
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.getZoomFactor();
                }
                return null;
            });
            expect(initialZoomFactor).toBeCloseTo(1.0, 2);
            E2ELogger.info('zoom-control', `Initial zoom factor: ${initialZoomFactor}`);

            // 3. Trigger zoom out via menu (more reliable than keyboard shortcuts)
            await triggerZoomOut();
            await waitForIpcSettle();

            // 4. Verify zoom level decreased
            const newZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(newZoom).toBeLessThan(initialZoom);
            E2ELogger.info('zoom-control', `New zoom level after Ctrl+-: ${newZoom}%`);

            // 5. Verify the expected step (100% -> 90%)
            expect(newZoom).toBe(90);

            // 6. Verify webContents zoom factor was actually applied
            const newZoomFactor = await browser.electron.execute(() => {
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.getZoomFactor();
                }
                return null;
            });
            expect(newZoomFactor).toBeCloseTo(0.9, 2);
            E2ELogger.info('zoom-control', `New zoom factor: ${newZoomFactor}`);

            E2ELogger.info('zoom-control', '✓ Ctrl+- zoom out test passed');
        });

        it('should zoom out multiple steps with repeated Ctrl+- presses', async () => {
            E2ELogger.info('zoom-control', 'Testing multiple Ctrl+- presses');

            // 1. Get initial zoom level
            const initialZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(initialZoom).toBe(100);

            // 2. Trigger zoom out three times via menu
            await triggerZoomOut();
            await waitForIpcSettle();
            await triggerZoomOut();
            await waitForIpcSettle();
            await triggerZoomOut();
            await waitForIpcSettle();

            // 3. Verify zoom level decreased through multiple steps
            // 100% -> 90% -> 80% -> 75%
            const finalZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(finalZoom).toBe(75);
            E2ELogger.info('zoom-control', `Final zoom level after 3 presses: ${finalZoom}%`);

            // 4. Verify webContents zoom factor matches
            const finalZoomFactor = await browser.electron.execute(() => {
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.getZoomFactor();
                }
                return null;
            });
            expect(finalZoomFactor).toBeCloseTo(0.75, 2);

            E2ELogger.info('zoom-control', '✓ Multiple Ctrl+- zoom out test passed');
        });
    });

    // ===========================================================================
    // 7.1.3 Test multiple zoom in presses reach 200% cap
    // ===========================================================================

    describe('Zoom In Cap at 200% (7.1.3)', () => {
        it('should cap zoom at 200% with multiple Ctrl+= presses', async () => {
            E2ELogger.info('zoom-control', 'Testing zoom in cap at 200%');

            // 1. Set zoom to near maximum (175%) to reduce number of key presses
            await browser.electron.execute(() => {
                global.windowManager.setZoomLevel(175);
            });
            await waitForIpcSettle();

            // Verify we're at 175%
            const initialZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(initialZoom).toBe(175);

            // 2. Trigger zoom in multiple times (should hit 200% and stop)
            // 175% -> 200% -> 200% (capped)
            for (let i = 0; i < 5; i++) {
                await triggerZoomIn();
                await waitForIpcSettle();
            }

            // 3. Verify zoom is capped at 200%
            const finalZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(finalZoom).toBe(200);
            E2ELogger.info('zoom-control', `Final zoom level: ${finalZoom}% (capped at 200%)`);

            // 4. Verify webContents zoom factor
            const zoomFactor = await browser.electron.execute(() => {
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.getZoomFactor();
                }
                return null;
            });
            expect(zoomFactor).toBeCloseTo(2.0, 2);

            E2ELogger.info('zoom-control', '✓ Zoom in cap at 200% test passed');
        });
    });

    // ===========================================================================
    // 7.1.4 Test multiple zoom out presses reach 50% cap
    // ===========================================================================

    describe('Zoom Out Cap at 50% (7.1.4)', () => {
        it('should cap zoom at 50% with multiple Ctrl+- presses', async () => {
            E2ELogger.info('zoom-control', 'Testing zoom out cap at 50%');

            // 1. Set zoom to near minimum (67%) to reduce number of key presses
            await browser.electron.execute(() => {
                global.windowManager.setZoomLevel(67);
            });
            await waitForIpcSettle();

            // Verify we're at 67%
            const initialZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(initialZoom).toBe(67);

            // 2. Trigger zoom out multiple times (should hit 50% and stop)
            // 67% -> 50% -> 50% (capped)
            for (let i = 0; i < 5; i++) {
                await triggerZoomOut();
                await waitForIpcSettle();
            }

            // 3. Verify zoom is capped at 50%
            const finalZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(finalZoom).toBe(50);
            E2ELogger.info('zoom-control', `Final zoom level: ${finalZoom}% (capped at 50%)`);

            // 4. Verify webContents zoom factor
            const zoomFactor = await browser.electron.execute(() => {
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.getZoomFactor();
                }
                return null;
            });
            expect(zoomFactor).toBeCloseTo(0.5, 2);

            E2ELogger.info('zoom-control', '✓ Zoom out cap at 50% test passed');
        });
    });

    // ===========================================================================
    // 7.1.5 Test zoom level persists across app restart
    // ===========================================================================

    describe('Zoom Level Persistence (7.1.5)', () => {
        it('should persist zoom level to settings file', async () => {
            E2ELogger.info('zoom-control', 'Testing zoom level persistence');

            // 1. Set zoom to 150% using menu actions
            await browser.electron.execute(() => {
                global.windowManager.setZoomLevel(100);
            });
            await waitForIpcSettle();

            // Trigger zoom in multiple times to reach 150%
            // 100% -> 110% -> 125% -> 150%
            await triggerZoomIn();
            await waitForIpcSettle();
            await triggerZoomIn();
            await waitForIpcSettle();
            await triggerZoomIn();
            await waitForIpcSettle();

            // Verify zoom is at 150%
            const zoomLevel = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(zoomLevel).toBe(150);

            // 2. Wait for settings to be persisted to disk
            await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

            // 3. Read zoom level from user-preferences.json to verify persistence
            const prefs = await readUserPreferences();
            const persistedZoom = prefs?.zoomLevel;

            expect(persistedZoom).toBe(150);
            E2ELogger.info('zoom-control', `Zoom level persisted to file: ${persistedZoom}%`);

            E2ELogger.info('zoom-control', '✓ Zoom level persistence test passed');
        });

        it('should restore zoom level from settings on initialization', async () => {
            E2ELogger.info('zoom-control', 'Testing zoom level restoration');

            // 1. Set a non-default zoom level directly via windowManager
            //    (simulating what ipcManager does on startup)
            await browser.electron.execute(() => {
                global.windowManager.initializeZoomLevel(125);
                global.windowManager.applyZoomLevel();
            });
            await waitForIpcSettle();

            // 2. Verify zoom level was set
            const restoredZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(restoredZoom).toBe(125);

            // 3. Verify webContents has the restored zoom
            const zoomFactor = await browser.electron.execute(() => {
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.getZoomFactor();
                }
                return null;
            });
            expect(zoomFactor).toBeCloseTo(1.25, 2);

            E2ELogger.info('zoom-control', `Zoom restored: ${restoredZoom}%`);
            E2ELogger.info('zoom-control', '✓ Zoom level restoration test passed');
        });
    });

    // ===========================================================================
    // 7.1.6 Test zoom shortcuts work when main window has focus
    // ===========================================================================

    describe('Zoom Shortcuts Require Window Focus (7.1.6)', () => {
        it('should respond to zoom shortcuts when main window is focused', async () => {
            E2ELogger.info('zoom-control', 'Testing zoom shortcuts with focused window');

            // 1. Ensure we're on the main window and it's focused
            await switchToMainWindow();

            // 2. Focus the main window via Electron
            await browser.electron.execute(() => {
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    mainWin.focus();
                }
            });
            await waitForIpcSettle();

            // 3. Verify window is focused
            const isFocused = await browser.electron.execute(() => {
                const mainWin = global.windowManager.getMainWindow();
                return mainWin && !mainWin.isDestroyed() && mainWin.isFocused();
            });
            expect(isFocused).toBe(true);

            // 4. Trigger zoom in via menu and verify zoom changes
            const initialZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });

            await triggerZoomIn();
            await waitForIpcSettle();

            const newZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });

            expect(newZoom).toBeGreaterThan(initialZoom);
            E2ELogger.info('zoom-control', `Zoom changed from ${initialZoom}% to ${newZoom}% with focused window`);

            E2ELogger.info('zoom-control', '✓ Zoom shortcuts with focus test passed');
        });

        it('should use application shortcuts (not global) for zoom', async () => {
            E2ELogger.info('zoom-control', 'Verifying zoom uses app shortcuts, not global');

            // This test verifies that zoom shortcuts are registered as application
            // menu accelerators, not as globalShortcut handlers.
            //
            // We check that the menu items with IDs exist - they are defined with
            // accelerators in menuManager.ts buildViewMenu().

            // Check zoom-in menu item exists
            const zoomInMenuItem = await browser.electron.execute((electron) => {
                const appMenu = electron.Menu.getApplicationMenu();
                if (!appMenu) return null;
                const item = appMenu.getMenuItemById('menu-view-zoom-in');
                if (!item) return null;
                return {
                    exists: true,
                    hasAccelerator: item.accelerator !== undefined,
                    accelerator: item.accelerator,
                };
            });

            expect(zoomInMenuItem).not.toBeNull();
            expect(zoomInMenuItem?.exists).toBe(true);
            expect(zoomInMenuItem?.hasAccelerator).toBe(true);
            E2ELogger.info('zoom-control', `Zoom In accelerator: ${zoomInMenuItem?.accelerator}`);

            // Check zoom-out menu item exists
            const zoomOutMenuItem = await browser.electron.execute((electron) => {
                const appMenu = electron.Menu.getApplicationMenu();
                if (!appMenu) return null;
                const item = appMenu.getMenuItemById('menu-view-zoom-out');
                if (!item) return null;
                return {
                    exists: true,
                    hasAccelerator: item.accelerator !== undefined,
                    accelerator: item.accelerator,
                };
            });

            expect(zoomOutMenuItem).not.toBeNull();
            expect(zoomOutMenuItem?.exists).toBe(true);
            expect(zoomOutMenuItem?.hasAccelerator).toBe(true);
            E2ELogger.info('zoom-control', `Zoom Out accelerator: ${zoomOutMenuItem?.accelerator}`);

            E2ELogger.info('zoom-control', 'Verified zoom menu items have application accelerators');

            E2ELogger.info('zoom-control', '✓ App shortcuts verification test passed');
        });
    });

    // ===========================================================================
    // 7.2 Native Menu Tests (macOS Only)
    // ===========================================================================

    describe('Native Menu Tests (7.2) - macOS Only', () => {
        it('7.2.1 should show current zoom percentage in View menu item labels', async () => {
            // Skip on non-macOS platforms
            if (!(await isMacOS())) {
                E2ELogger.info('zoom-control', 'Skipping macOS-specific test on non-macOS platform');
                return;
            }

            E2ELogger.info('zoom-control', 'Testing View menu shows zoom percentage (macOS)');

            // 1. Get the zoom-in menu item state (should show 100% at default)
            const zoomInState = await getMenuItemState('menu-view-zoom-in');
            expect(zoomInState.exists).toBe(true);
            expect(zoomInState.label).toContain('(100%)');
            E2ELogger.info('zoom-control', `Zoom In label: ${zoomInState.label}`);

            // 2. Get the zoom-out menu item state (should also show 100%)
            const zoomOutState = await getMenuItemState('menu-view-zoom-out');
            expect(zoomOutState.exists).toBe(true);
            expect(zoomOutState.label).toContain('(100%)');
            E2ELogger.info('zoom-control', `Zoom Out label: ${zoomOutState.label}`);

            E2ELogger.info('zoom-control', '✓ View menu zoom percentage test passed');
        });

        it('7.2.2 should increase zoom when clicking View > Zoom In menu item', async () => {
            // Skip on non-macOS platforms
            if (!(await isMacOS())) {
                E2ELogger.info('zoom-control', 'Skipping macOS-specific test on non-macOS platform');
                return;
            }

            E2ELogger.info('zoom-control', 'Testing View > Zoom In menu item click (macOS)');

            // 1. Verify initial zoom is 100%
            const initialZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(initialZoom).toBe(100);

            // 2. Click the Zoom In menu item
            await triggerZoomIn();
            await waitForIpcSettle();

            // 3. Verify zoom increased
            const newZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(newZoom).toBeGreaterThan(100);
            E2ELogger.info('zoom-control', `Zoom increased from 100% to ${newZoom}%`);

            // 4. Verify menu label updated
            const zoomInState = await getMenuItemState('menu-view-zoom-in');
            expect(zoomInState.label).toContain(`(${newZoom}%)`);
            E2ELogger.info('zoom-control', `Updated Zoom In label: ${zoomInState.label}`);

            E2ELogger.info('zoom-control', '✓ View > Zoom In menu item test passed');
        });

        it('7.2.3 should decrease zoom when clicking View > Zoom Out menu item', async () => {
            // Skip on non-macOS platforms
            if (!(await isMacOS())) {
                E2ELogger.info('zoom-control', 'Skipping macOS-specific test on non-macOS platform');
                return;
            }

            E2ELogger.info('zoom-control', 'Testing View > Zoom Out menu item click (macOS)');

            // 1. First zoom in to have room to zoom out
            await triggerZoomIn();
            await waitForIpcSettle();

            const zoomAfterIn = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(zoomAfterIn).toBeGreaterThan(100);
            E2ELogger.info('zoom-control', `Starting zoom: ${zoomAfterIn}%`);

            // 2. Click the Zoom Out menu item
            await triggerZoomOut();
            await waitForIpcSettle();

            // 3. Verify zoom decreased
            const newZoom = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(newZoom).toBeLessThan(zoomAfterIn);
            E2ELogger.info('zoom-control', `Zoom decreased from ${zoomAfterIn}% to ${newZoom}%`);

            // 4. Verify menu label updated
            const zoomOutState = await getMenuItemState('menu-view-zoom-out');
            expect(zoomOutState.label).toContain(`(${newZoom}%)`);
            E2ELogger.info('zoom-control', `Updated Zoom Out label: ${zoomOutState.label}`);

            E2ELogger.info('zoom-control', '✓ View > Zoom Out menu item test passed');
        });
    });

    // ===========================================================================
    // 7.4 Visual Verification (All Platforms)
    // ===========================================================================

    describe('Visual Verification (7.4)', () => {
        it('7.4.1 should visually reflect zoom change in webContents', async () => {
            E2ELogger.info('zoom-control', 'Testing visual zoom reflection');

            // 1. Verify initial zoom factor is 1.0 (100%)
            const initialFactor = await browser.electron.execute(() => {
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.getZoomFactor();
                }
                return null;
            });
            expect(initialFactor).toBeCloseTo(1.0, 2);
            E2ELogger.info('zoom-control', `Initial zoom factor: ${initialFactor}`);

            // 2. Zoom in to 150% (100 -> 110 -> 125 -> 150)
            await triggerZoomIn();
            await waitForIpcSettle();
            await triggerZoomIn();
            await waitForIpcSettle();
            await triggerZoomIn();
            await waitForIpcSettle();

            // 3. Verify zoom factor is now 1.5 (150%)
            const zoomInFactor = await browser.electron.execute(() => {
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.getZoomFactor();
                }
                return null;
            });
            expect(zoomInFactor).toBeCloseTo(1.5, 2);
            E2ELogger.info('zoom-control', `Zoom factor after zoom in: ${zoomInFactor}`);

            // 4. Verify zoom level matches
            const zoomLevel = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            expect(zoomLevel).toBe(150);
            E2ELogger.info('zoom-control', `Zoom level: ${zoomLevel}%`);

            // 5. Zoom out to verify visual change works both ways
            await triggerZoomOut();
            await waitForIpcSettle();

            const afterZoomOutFactor = await browser.electron.execute(() => {
                const mainWin = global.windowManager.getMainWindow();
                if (mainWin && !mainWin.isDestroyed()) {
                    return mainWin.webContents.getZoomFactor();
                }
                return null;
            });
            expect(afterZoomOutFactor).toBeCloseTo(1.25, 2);
            E2ELogger.info('zoom-control', `Zoom factor after zoom out: ${afterZoomOutFactor}`);

            // 6. Verify the zoom factor formula: zoomLevel / 100 = zoomFactor
            const finalZoomLevel = await browser.electron.execute(() => {
                return global.windowManager.getZoomLevel();
            });
            const expectedFactor = finalZoomLevel / 100;
            expect(afterZoomOutFactor).toBeCloseTo(expectedFactor, 2);
            E2ELogger.info(
                'zoom-control',
                `Verified: ${finalZoomLevel}% / 100 = ${expectedFactor} ≈ ${afterZoomOutFactor}`
            );

            E2ELogger.info('zoom-control', '✓ Visual zoom verification test passed');
        });
    });
});

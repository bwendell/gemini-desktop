import { browser, expect } from '@wdio/globals';

import { E2ELogger } from './helpers/logger';
import { isMacOS } from './helpers/platform';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForMacOSWindowStabilize } from './helpers/waitUtilities';
import { clickTrayMenuItem, verifyTrayCreated } from './helpers/trayActions';
import { Selectors } from './helpers/selectors';
import { TrayPage } from './pages';

type TrayBrowser = {
    getWindowHandles(): Promise<string[]>;
    $(selector: string): Promise<{ waitForExist(options?: { timeout?: number }): Promise<void> }>;
};

const trayBrowser = browser as unknown as TrayBrowser;

describe('Tray', () => {
    describe('Tray Icon', () => {
        const tray = new TrayPage();

        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            try {
                const isVisible = await tray.isWindowVisible();
                if (!isVisible) {
                    await tray.restoreWindowViaTrayClick();
                }
                await ensureSingleWindow();
            } catch (error) {
                E2ELogger.warn('tray', `afterEach cleanup error (may be harmless): ${error}`);
            }
        });

        it('should create tray icon on app startup', async () => {
            const trayExists = await tray.isCreated();
            expect(trayExists).toBe(true);
        });

        it.skip('should have correct tooltip on tray icon', async () => {
            const tooltip = await tray.getTooltip();
            expect(tooltip).not.toBeNull();
            expect(tooltip).toContain('Gemini');
        });

        it('should report tray state correctly', async () => {
            const state = await tray.getState();
            expect(state.exists).toBe(true);
            expect(state.isDestroyed).toBe(false);
        });
    });

    describe('Tray Quit', () => {
        beforeEach(async () => {
            const mainLayout = await trayBrowser.$(Selectors.mainLayout);
            await mainLayout.waitForExist({ timeout: 15000 });
        });

        it('should quit the application when "Quit" menu item is clicked', async () => {
            const trayExists = await verifyTrayCreated();
            expect(trayExists).toBe(true);

            const initialHandles = await trayBrowser.getWindowHandles();
            expect(initialHandles.length).toBeGreaterThan(0);

            await clickTrayMenuItem('quit');
        });
    });

    describe('Minimize to Tray', () => {
        const tray = new TrayPage();

        async function hideWindow(): Promise<void> {
            if (await isMacOS()) {
                await tray.hideWindowToTray();
            } else {
                await tray.hideViaCloseButton();
            }
        }

        beforeEach(async () => {
            await waitForAppReady();

            const visible = await tray.isWindowVisible();
            if (!visible) {
                await tray.clickAndWaitForWindow();
            }
        });

        afterEach(async () => {
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
            }
        });

        describe('Close Action Triggers Hide-to-Tray', () => {
            it('should hide window to tray when close action is triggered', async () => {
                const initialVisible = await tray.isWindowVisible();
                expect(initialVisible).toBe(true);

                await hideWindow();

                const hiddenToTray = await tray.isHiddenToTray();
                expect(hiddenToTray).toBe(true);
            });

            it('should not be minimized to taskbar (hidden vs minimized)', async () => {
                await hideWindow();

                const isMinimized = await tray.isWindowMinimized();
                expect(isMinimized).toBe(false);

                const isVisible = await tray.isWindowVisible();
                expect(isVisible).toBe(false);
            });

            it.skip('should skip taskbar on Windows/Linux when hidden to tray', async () => {
                if (await isMacOS()) {
                    return;
                }

                if (await tray.isLinuxCI()) {
                    return;
                }

                await hideWindow();

                const skipTaskbar = await tray.isSkipTaskbar();
                expect(skipTaskbar).toBe(true);
            });
        });

        describe('Restore from Tray After Hiding', () => {
            it('should restore window from tray after hiding', async () => {
                await hideWindow();

                const hiddenAfterMinimize = await tray.isHiddenToTray();
                expect(hiddenAfterMinimize).toBe(true);

                await tray.clickAndWaitForWindow();

                const visibleAfterRestore = await tray.isWindowVisible();
                expect(visibleAfterRestore).toBe(true);
            });

            it('should restore taskbar visibility on Windows/Linux', async () => {
                if (await isMacOS()) {
                    return;
                }

                if (await tray.isLinuxCI()) {
                    return;
                }

                await hideWindow();
                await tray.clickAndWaitForWindow();

                const skipTaskbar = await tray.isSkipTaskbar();
                expect(skipTaskbar).toBe(false);
            });
        });

        describe('Tray Icon Persists', () => {
            it('should keep tray icon visible after hiding to tray', async () => {
                await hideWindow();

                const trayExists = await tray.isCreated();
                expect(trayExists).toBe(true);
            });
        });

        describe('Multiple Hide/Restore Cycles', () => {
            it('should handle multiple hide/restore cycles', async () => {
                await hideWindow();
                let hidden = await tray.isHiddenToTray();
                expect(hidden).toBe(true);

                await tray.restoreWindowViaTrayClick();
                let visible = await tray.isWindowVisible();
                expect(visible).toBe(true);

                await hideWindow();
                hidden = await tray.isHiddenToTray();
                expect(hidden).toBe(true);

                await tray.restoreWindowViaTrayClick();
                visible = await tray.isWindowVisible();
                expect(visible).toBe(true);
            });
        });
    });

    describe('Tray Integration with Window State', () => {
        const tray = new TrayPage();

        beforeEach(async () => {
            await waitForAppReady();
        });

        afterEach(async () => {
            try {
                const isVisible = await tray.isWindowVisible();
                if (!isVisible) {
                    await tray.restoreWindowViaTrayClick();
                }
                await ensureSingleWindow();
            } catch (error) {
                E2ELogger.warn('tray', `afterEach cleanup error (may be harmless): ${error}`);
            }
        });

        it('should restore window when tray icon is clicked', async () => {
            await tray.hideWindowToTray();

            const visibleAfterClose = await tray.isWindowVisible();
            expect(visibleAfterClose).toBe(false);

            await tray.clickAndWaitForWindow();

            const visibleAfterTrayClick = await tray.isWindowVisible();
            expect(visibleAfterTrayClick).toBe(true);
        });

        it('should restore window when "Show" menu item is clicked', async () => {
            await tray.hideWindowToTray();

            const visibleAfterClose = await tray.isWindowVisible();
            expect(visibleAfterClose).toBe(false);

            await tray.clickShowMenuItemAndWait();

            const visibleAfterShow = await tray.isWindowVisible();
            expect(visibleAfterShow).toBe(true);
        });

        it.skip('should quit app when "Quit" menu item is clicked', async () => {
            await tray.clickQuitMenuItem();
        });

        it('should work correctly after multiple hide/restore cycles', async () => {
            await tray.hideAndRestoreViaTrayClick();
            let isVisible = await tray.isWindowVisible();
            expect(isVisible).toBe(true);

            await tray.hideAndRestoreViaShowMenu();
            isVisible = await tray.isWindowVisible();
            expect(isVisible).toBe(true);

            await tray.hideAndRestoreViaTrayClick();
            isVisible = await tray.isWindowVisible();
            expect(isVisible).toBe(true);
        });

        it('should keep tray icon after window is hidden', async () => {
            await tray.hideWindowToTray();

            const trayExists = await tray.isCreated();
            expect(trayExists).toBe(true);

            await tray.restoreWindowViaTrayClick();

            await waitForMacOSWindowStabilize(async () => await tray.isWindowVisible(), {
                description: 'Window stabilization after tray restore',
            });
        });
    });
});

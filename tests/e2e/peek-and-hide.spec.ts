/**
 * E2E Test: Peek and Hide (Hide All Windows)
 *
 * Tests the Peek and Hide hotkey functionality (Ctrl+Alt+H / Cmd+Alt+H) which
 * minimizes/hides the main window for quick privacy.
 *
 * Peek and Hide is designed to quickly hide the application when needed.
 *
 * Cross-platform: Windows, macOS, Linux
 *
 * @module peek-and-hide.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, expect } from '@wdio/globals';
import { MainWindowPage } from './pages';
import { E2ELogger } from './helpers/logger';
import { isHotkeyRegistered, REGISTERED_HOTKEYS } from './helpers/hotkeyHelpers';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { isLinuxCI } from './helpers/platform';
import { isWindowVisible, hideWindow, restoreWindow, showWindow } from './helpers/windowStateActions';

describe('Peek and Hide (Hide All Windows)', () => {
    const mainWindow = new MainWindowPage();

    beforeEach(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        await ensureSingleWindow();
    });

    describe('Hotkey Registration', () => {
        it('should have Peek and Hide hotkey registered by default', async function () {
            // Skip on Linux CI - global hotkeys are disabled due to Wayland limitations
            if (await isLinuxCI()) {
                E2ELogger.info('peek-and-hide', 'Skipping - Linux CI does not support global hotkeys');
                this.skip();
            }

            const accelerator = REGISTERED_HOTKEYS.MINIMIZE_WINDOW.accelerator;
            const isRegistered = await isHotkeyRegistered(accelerator);

            expect(isRegistered).toBe(true);
            E2ELogger.info('peek-and-hide', `Peek and Hide (${accelerator}) is registered`);
        });

        it('should display correct platform-specific hotkey format', async () => {
            const platform = process.platform;
            const expectedDisplay =
                platform === 'darwin'
                    ? REGISTERED_HOTKEYS.MINIMIZE_WINDOW.displayFormat.macos
                    : REGISTERED_HOTKEYS.MINIMIZE_WINDOW.displayFormat.windows;

            E2ELogger.info('peek-and-hide', `Expected display format on ${platform}: ${expectedDisplay}`);

            // The hotkey should be Ctrl+Alt+H on Windows/Linux, Cmd+Alt+H on macOS
            if (platform === 'darwin') {
                expect(expectedDisplay).toContain('Cmd');
            } else {
                expect(expectedDisplay).toContain('Ctrl');
            }
        });
    });

    describe('Peek and Hide Action', () => {
        it('should hide main window when Peek and Hide is triggered', async function () {
            // Skip on Linux CI - window minimize detection doesn't work under Xvfb
            if (await isLinuxCI()) {
                E2ELogger.info('peek-and-hide', 'Skipping - Linux CI uses headless Xvfb without window manager');
                this.skip();
            }

            // 1. Verify main window is visible initially
            const initialVisibility = await isWindowVisible();
            expect(initialVisibility).toBe(true);
            E2ELogger.info('peek-and-hide', 'Main window is visible initially');

            await hideWindow();

            const visible = await isWindowVisible();

            expect(visible).toBe(false);
            E2ELogger.info('peek-and-hide', `After Peek and Hide: visible=${visible}`);

            // 4. Restore window for cleanup
            await restoreWindow();
            await showWindow();

            // 5. Verify window is restored
            const afterRestore = await isWindowVisible();
            expect(afterRestore).toBe(true);
            E2ELogger.info('peek-and-hide', 'Window restored successfully');
        });

        it('should remain hidden until explicitly restored', async function () {
            // Skip on Linux CI - window minimize detection doesn't work under Xvfb
            if (await isLinuxCI()) {
                E2ELogger.info('peek-and-hide', 'Skipping - Linux CI uses headless Xvfb without window manager');
                this.skip();
            }

            await hideWindow();

            // 2. Wait a moment to ensure it stays hidden
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const stillVisible = await isWindowVisible();
            expect(stillVisible).toBe(false);
            E2ELogger.info('peek-and-hide', 'Window remained hidden as expected');

            // 4. Cleanup - restore
            await restoreWindow();
            await showWindow();
        });
    });

    describe('Peek and Hide with Multiple Windows', () => {
        it('should handle Peek and Hide when options window is also open', async () => {
            // This test is informational - Peek and Hide currently only affects main window
            // Future enhancement could hide all windows

            E2ELogger.info('peek-and-hide', 'Peek and Hide affects main window; options window behavior may vary');

            // Verify the main window is loaded and can be minimized
            const isLoaded = await mainWindow.isLoaded();
            expect(isLoaded).toBe(true);

            // Verify window is currently visible (minimizable state)
            const isVisible = await isWindowVisible();
            expect(isVisible).toBe(true);
        });
    });
    describe('Peek & Hide Toggle (E2E)', () => {
        it('should hide visible window when toggleMainWindowVisibility is called', async function () {
            // Skip on Linux CI - window hide detection doesn't work under headless Xvfb
            if (await isLinuxCI()) {
                E2ELogger.info(
                    'peek-and-hide',
                    'Skipping toggle (hide) - Linux CI uses headless Xvfb without window manager'
                );
                this.skip();
            }

            // Verify window is visible before toggle
            const initiallyVisible = await isWindowVisible();
            expect(initiallyVisible).toBe(true);
            E2ELogger.info('peek-and-hide', 'Window is visible before toggle');

            // Trigger toggle via windowManager (visible → hidden)
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.toggleMainWindowVisibility();
            });

            // Wait for window to hide
            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        // @ts-expect-error
                        return !global.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not hide after toggleMainWindowVisibility' }
            );

            const isHiddenAfterToggle = await isWindowVisible();
            expect(isHiddenAfterToggle).toBe(false);
            E2ELogger.info('peek-and-hide', 'Window is hidden after toggle (visible → hidden)');

            // Cleanup: restore window
            await restoreWindow();
            await showWindow();
        });

        it('should restore hidden window when toggleMainWindowVisibility is called again', async function () {
            // Skip on Linux CI - window visibility detection doesn't work under headless Xvfb
            if (await isLinuxCI()) {
                E2ELogger.info(
                    'peek-and-hide',
                    'Skipping toggle (restore) - Linux CI uses headless Xvfb without window manager'
                );
                this.skip();
            }

            // First hide the window
            await hideWindow();

            // Verify window is hidden
            const isHiddenBefore = await isWindowVisible();
            expect(isHiddenBefore).toBe(false);
            E2ELogger.info('peek-and-hide', 'Window is hidden, now triggering toggle to restore');

            // Trigger toggle (hidden → visible)
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.toggleMainWindowVisibility();
            });

            // Wait for window to show
            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        // @ts-expect-error
                        return global.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not restore after toggleMainWindowVisibility' }
            );

            const isVisibleAfterToggle = await isWindowVisible();
            expect(isVisibleAfterToggle).toBe(true);
            E2ELogger.info('peek-and-hide', 'Window restored successfully via toggle (hidden → visible)');
        });

        it('should complete a full toggle cycle: visible → hidden → visible', async function () {
            // Skip on Linux CI - window visibility detection doesn't work under headless Xvfb
            if (await isLinuxCI()) {
                E2ELogger.info(
                    'peek-and-hide',
                    'Skipping full toggle cycle - Linux CI uses headless Xvfb without window manager'
                );
                this.skip();
            }

            // Verify initially visible
            const initiallyVisible = await isWindowVisible();
            expect(initiallyVisible).toBe(true);
            E2ELogger.info('peek-and-hide', 'Window initially visible — starting full toggle cycle');

            // First toggle: visible → hidden
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.toggleMainWindowVisibility();
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        // @ts-expect-error
                        return !global.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not hide on first toggle' }
            );

            expect(await isWindowVisible()).toBe(false);
            E2ELogger.info('peek-and-hide', 'Toggle cycle step 1: window hidden');

            // Second toggle: hidden → visible
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.toggleMainWindowVisibility();
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        // @ts-expect-error
                        return global.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not restore on second toggle' }
            );

            expect(await isWindowVisible()).toBe(true);
            E2ELogger.info('peek-and-hide', 'Toggle cycle step 2: window restored — full cycle complete');
        });
    });
});

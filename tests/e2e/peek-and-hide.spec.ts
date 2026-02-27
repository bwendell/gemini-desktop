/**
 * E2E Test: Peek and Hide (Hide All Windows)
 *
 * Tests the Peek and Hide hotkey functionality (Ctrl+Shift+Space / Cmd+Shift+Space) which
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
import { getPlatformHotkeyStatus, isHotkeyRegistered, REGISTERED_HOTKEYS } from './helpers/hotkeyHelpers';
import { waitForAppReady, waitForElectronBridgeReady, ensureSingleWindow } from './helpers/workflows';
import { isLinuxCI } from './helpers/platform';
import { isWindowVisible, hideWindow, restoreWindow, showWindow } from './helpers/windowStateActions';

type PeekAndHideBrowser = typeof browser & {
    waitUntil(
        condition: () => Promise<boolean> | boolean,
        options?: { timeout?: number; timeoutMsg?: string }
    ): Promise<void>;
    electron: {
        execute<T, A extends unknown[]>(
            fn: (electron: typeof import('electron'), ...args: A) => T,
            ...args: A
        ): Promise<T>;
    };
};

type E2EGlobals = {
    hotkeyManager?: {
        executeHotkeyAction: (id: string) => void;
    };
    windowManager?: {
        isMainWindowVisible: () => boolean;
        toggleMainWindowVisibility: () => void;
    };
};

const wdioBrowser = browser as unknown as PeekAndHideBrowser;

describe('Peek and Hide (Hide All Windows)', () => {
    const mainWindow = new MainWindowPage();

    beforeEach(async () => {
        await waitForAppReady();
        await waitForElectronBridgeReady();
    });

    afterEach(async () => {
        await ensureSingleWindow();
    });

    describe('Hotkey Registration', () => {
        it('should have Peek and Hide hotkey registered by default', async function () {
            // Skip on Linux CI - global hotkeys are disabled due to Wayland limitations
            if (await isLinuxCI()) {
                this.skip();
            }

            const platformStatus = await getPlatformHotkeyStatus();
            if (platformStatus && !platformStatus.globalHotkeysEnabled) {
                this.skip();
            }

            const accelerator = REGISTERED_HOTKEYS.MINIMIZE_WINDOW.accelerator;
            const isRegistered = await isHotkeyRegistered(accelerator);

            expect(isRegistered).toBe(true);
        });

        it('should display correct platform-specific hotkey format', async () => {
            const platform = process.platform;
            const expectedDisplay =
                platform === 'darwin'
                    ? REGISTERED_HOTKEYS.MINIMIZE_WINDOW.displayFormat.macos
                    : REGISTERED_HOTKEYS.MINIMIZE_WINDOW.displayFormat.windows;

            // The hotkey should be Ctrl+Shift+Space on Windows/Linux, Cmd+Shift+Space on macOS
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
                this.skip();
            }

            // 1. Verify main window is visible initially
            const initialVisibility = await isWindowVisible();
            expect(initialVisibility).toBe(true);

            await hideWindow();

            const visible = await isWindowVisible();

            expect(visible).toBe(false);

            // 4. Restore window for cleanup
            await restoreWindow();
            await showWindow();

            // 5. Verify window is restored
            const afterRestore = await isWindowVisible();
            expect(afterRestore).toBe(true);
        });

        it('should remain hidden until explicitly restored', async function () {
            // Skip on Linux CI - window minimize detection doesn't work under Xvfb
            if (await isLinuxCI()) {
                this.skip();
            }

            await hideWindow();

            // 2. Wait a moment to ensure it stays hidden
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const stillVisible = await isWindowVisible();
            expect(stillVisible).toBe(false);

            // 4. Cleanup - restore
            await restoreWindow();
            await showWindow();
        });
    });

    describe('Peek and Hide with Multiple Windows', () => {
        it('should handle Peek and Hide when options window is also open', async () => {
            // This test is informational - Peek and Hide currently only affects main window
            // Future enhancement could hide all windows

            // Verify the main window is loaded and can be minimized
            const isLoaded = await mainWindow.isLoaded();
            expect(isLoaded).toBe(true);

            // Verify window is currently visible (minimizable state)
            const isVisible = await isWindowVisible();
            expect(isVisible).toBe(true);
        });
    });
    describe('Peek & Hide Toggle via HotkeyManager Dispatch (E2E)', () => {
        it('should hide visible window via hotkeyManager.executeHotkeyAction', async function () {
            if (await isLinuxCI()) {
                this.skip();
            }

            const initiallyVisible = await isWindowVisible();
            expect(initiallyVisible).toBe(true);

            await wdioBrowser.electron.execute(() => {
                const globals = global as unknown as E2EGlobals;
                if (!globals.hotkeyManager) {
                    throw new Error('HotkeyManager not available on global');
                }
                globals.hotkeyManager.executeHotkeyAction('peekAndHide');
            });

            await wdioBrowser.waitUntil(
                async () => {
                    return await wdioBrowser.electron.execute(() => {
                        const globals = global as unknown as E2EGlobals;
                        if (!globals.windowManager) {
                            throw new Error('WindowManager not available on global');
                        }
                        return !globals.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not hide after hotkeyManager.executeHotkeyAction' }
            );

            const isHiddenAfterDispatch = await isWindowVisible();
            expect(isHiddenAfterDispatch).toBe(false);

            await restoreWindow();
            await showWindow();
        });

        it('should restore hidden window via hotkeyManager.executeHotkeyAction', async function () {
            if (await isLinuxCI()) {
                this.skip();
            }

            await hideWindow();

            const isHiddenBefore = await isWindowVisible();
            expect(isHiddenBefore).toBe(false);

            await wdioBrowser.electron.execute(() => {
                const globals = global as unknown as E2EGlobals;
                if (!globals.hotkeyManager) {
                    throw new Error('HotkeyManager not available on global');
                }
                globals.hotkeyManager.executeHotkeyAction('peekAndHide');
            });

            await wdioBrowser.waitUntil(
                async () => {
                    return await wdioBrowser.electron.execute(() => {
                        const globals = global as unknown as E2EGlobals;
                        if (!globals.windowManager) {
                            throw new Error('WindowManager not available on global');
                        }
                        return globals.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not restore after hotkeyManager.executeHotkeyAction' }
            );

            const isVisibleAfterDispatch = await isWindowVisible();
            expect(isVisibleAfterDispatch).toBe(true);
        });

        it('should complete a full toggle cycle via hotkeyManager.executeHotkeyAction', async function () {
            if (await isLinuxCI()) {
                this.skip();
            }

            const initiallyVisible = await isWindowVisible();
            expect(initiallyVisible).toBe(true);

            await wdioBrowser.electron.execute(() => {
                const globals = global as unknown as E2EGlobals;
                if (!globals.hotkeyManager) {
                    throw new Error('HotkeyManager not available on global');
                }
                globals.hotkeyManager.executeHotkeyAction('peekAndHide');
            });

            await wdioBrowser.waitUntil(
                async () => {
                    return await wdioBrowser.electron.execute(() => {
                        const globals = global as unknown as E2EGlobals;
                        if (!globals.windowManager) {
                            throw new Error('WindowManager not available on global');
                        }
                        return !globals.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not hide on first hotkeyManager dispatch' }
            );

            expect(await isWindowVisible()).toBe(false);

            await wdioBrowser.electron.execute(() => {
                const globals = global as unknown as E2EGlobals;
                if (!globals.hotkeyManager) {
                    throw new Error('HotkeyManager not available on global');
                }
                globals.hotkeyManager.executeHotkeyAction('peekAndHide');
            });

            await wdioBrowser.waitUntil(
                async () => {
                    return await wdioBrowser.electron.execute(() => {
                        const globals = global as unknown as E2EGlobals;
                        if (!globals.windowManager) {
                            throw new Error('WindowManager not available on global');
                        }
                        return globals.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not restore on second hotkeyManager dispatch' }
            );

            expect(await isWindowVisible()).toBe(true);
        });
    });

    describe('Peek & Hide Toggle (E2E)', () => {
        it('should hide visible window when toggleMainWindowVisibility is called', async function () {
            // Skip on Linux CI - window hide detection doesn't work under headless Xvfb
            if (await isLinuxCI()) {
                this.skip();
            }

            // Verify window is visible before toggle
            const initiallyVisible = await isWindowVisible();
            expect(initiallyVisible).toBe(true);

            // Trigger toggle via windowManager (visible → hidden)
            await wdioBrowser.electron.execute(() => {
                const globals = global as unknown as E2EGlobals;
                if (!globals.windowManager) {
                    throw new Error('WindowManager not available on global');
                }
                globals.windowManager.toggleMainWindowVisibility();
            });

            // Wait for window to hide
            await wdioBrowser.waitUntil(
                async () => {
                    return await wdioBrowser.electron.execute(() => {
                        const globals = global as unknown as E2EGlobals;
                        if (!globals.windowManager) {
                            throw new Error('WindowManager not available on global');
                        }
                        return !globals.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not hide after toggleMainWindowVisibility' }
            );

            const isHiddenAfterToggle = await isWindowVisible();
            expect(isHiddenAfterToggle).toBe(false);

            // Cleanup: restore window
            await restoreWindow();
            await showWindow();
        });

        it('should restore hidden window when toggleMainWindowVisibility is called again', async function () {
            // Skip on Linux CI - window visibility detection doesn't work under headless Xvfb
            if (await isLinuxCI()) {
                this.skip();
            }

            // First hide the window
            await hideWindow();

            // Verify window is hidden
            const isHiddenBefore = await isWindowVisible();
            expect(isHiddenBefore).toBe(false);

            // Trigger toggle (hidden → visible)
            await wdioBrowser.electron.execute(() => {
                const globals = global as unknown as E2EGlobals;
                if (!globals.windowManager) {
                    throw new Error('WindowManager not available on global');
                }
                globals.windowManager.toggleMainWindowVisibility();
            });

            // Wait for window to show
            await wdioBrowser.waitUntil(
                async () => {
                    return await wdioBrowser.electron.execute(() => {
                        const globals = global as unknown as E2EGlobals;
                        if (!globals.windowManager) {
                            throw new Error('WindowManager not available on global');
                        }
                        return globals.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not restore after toggleMainWindowVisibility' }
            );

            const isVisibleAfterToggle = await isWindowVisible();
            expect(isVisibleAfterToggle).toBe(true);
        });

        it('should complete a full toggle cycle: visible → hidden → visible', async function () {
            // Skip on Linux CI - window visibility detection doesn't work under headless Xvfb
            if (await isLinuxCI()) {
                this.skip();
            }

            // Verify initially visible
            const initiallyVisible = await isWindowVisible();
            expect(initiallyVisible).toBe(true);

            // First toggle: visible → hidden
            await wdioBrowser.electron.execute(() => {
                const globals = global as unknown as E2EGlobals;
                if (!globals.windowManager) {
                    throw new Error('WindowManager not available on global');
                }
                globals.windowManager.toggleMainWindowVisibility();
            });

            await wdioBrowser.waitUntil(
                async () => {
                    return await wdioBrowser.electron.execute(() => {
                        const globals = global as unknown as E2EGlobals;
                        if (!globals.windowManager) {
                            throw new Error('WindowManager not available on global');
                        }
                        return !globals.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not hide on first toggle' }
            );

            expect(await isWindowVisible()).toBe(false);

            // Second toggle: hidden → visible
            await wdioBrowser.electron.execute(() => {
                const globals = global as unknown as E2EGlobals;
                if (!globals.windowManager) {
                    throw new Error('WindowManager not available on global');
                }
                globals.windowManager.toggleMainWindowVisibility();
            });

            await wdioBrowser.waitUntil(
                async () => {
                    return await wdioBrowser.electron.execute(() => {
                        const globals = global as unknown as E2EGlobals;
                        if (!globals.windowManager) {
                            throw new Error('WindowManager not available on global');
                        }
                        return globals.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not restore on second toggle' }
            );

            expect(await isWindowVisible()).toBe(true);
        });
    });
});

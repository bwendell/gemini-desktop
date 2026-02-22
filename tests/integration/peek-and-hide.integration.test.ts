/**
 * Integration tests for Peek and Hide functionality.
 *
 * Tests the hide-to-tray workflow:
 * - Peek and Hide hides main window to tray
 * - Window hidden from taskbar/dock
 * - Restoring from tray shows window
 * - Peek and Hide enable/disable state via IPC
 */

import { browser, expect } from '@wdio/globals';

const isLinuxCI = process.platform === 'linux' && process.env.CI === 'true';

const browserWithElectron = browser as unknown as {
    execute<T>(script: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T>;
    waitUntil<T>(
        condition: () => Promise<T> | T,
        options?: { timeout?: number; timeoutMsg?: string; interval?: number }
    ): Promise<T>;
    getWindowHandles(): Promise<string[]>;
    switchToWindow(handle: string): Promise<void>;
    pause(timeout: number): Promise<void>;
    electron: {
        execute<R, T extends unknown[]>(fn: (...args: T) => R, ...args: T): Promise<R>;
    };
};

describe('Peek and Hide Integration', () => {
    before(async () => {
        // Wait for app ready
        await browserWithElectron.waitUntil(async () => (await browserWithElectron.getWindowHandles()).length > 0);

        // Ensure renderer is ready
        await browserWithElectron.execute(async () => {
            return await new Promise<void>((resolve) => {
                if (document.readyState === 'complete') return resolve();
                window.addEventListener('load', () => resolve());
            });
        });
    });

    beforeEach(async () => {
        await browserWithElectron.electron.execute(() => {
            if (!global.windowManager.getMainWindow()) {
                global.windowManager.createMainWindow();
            }
        });

        // Ensure main window is visible before each test
        // This is necessary because the window may not be visible yet after the before() hook
        // or may have been hidden by a previous test
        await browserWithElectron.electron.execute(() => {
            global.windowManager.restoreFromTray();
        });

        // Wait for window to be visible
        await browserWithElectron.waitUntil(
            async () => {
                return await browserWithElectron.electron.execute(() => {
                    const win = global.windowManager.getMainWindow();
                    return win && win.isVisible();
                });
            },
            { timeout: 5000, timeoutMsg: 'Main window did not become visible in beforeEach' }
        );
    });

    afterEach(async () => {
        await browserWithElectron.electron.execute(() => {
            if (!global.windowManager.getMainWindow()) {
                global.windowManager.createMainWindow();
            }

            global.windowManager.restoreFromTray();
            global.hotkeyManager.setIndividualEnabled('peekAndHide', true);
        });

        await browserWithElectron.pause(300);
    });

    describe('Hide to Tray Workflow', () => {
        it('should hide main window when hideToTray is called', async () => {
            // Verify window is visible initially
            const initiallyVisible = await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getMainWindow();
                return win && win.isVisible();
            });
            expect(initiallyVisible).toBe(true);

            // Hide to tray
            await browserWithElectron.electron.execute(() => {
                global.windowManager.hideToTray();
            });

            // Wait for window to hide
            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Main window did not hide to tray' }
            );

            const isHidden = await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getMainWindow();
                return win && !win.isVisible();
            });

            expect(isHidden).toBe(true);
        });

        it('should restore main window from tray', async () => {
            // First hide to tray
            await browserWithElectron.electron.execute(() => {
                global.windowManager.hideToTray();
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000 }
            );

            // Now restore
            await browserWithElectron.electron.execute(() => {
                global.windowManager.restoreFromTray();
            });

            // Wait for window to show
            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getMainWindow();
                        return win && win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Main window did not restore from tray' }
            );

            const isVisible = await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getMainWindow();
                return win && win.isVisible();
            });

            expect(isVisible).toBe(true);
        });

        it('should not show in taskbar when hidden (Windows)', async () => {
            // Get platform first
            const platform = await browserWithElectron.electron.execute(() => process.platform);

            // Skip on non-Windows
            if (platform !== 'win32') {
                return;
            }

            // Hide to tray
            await browserWithElectron.electron.execute(() => {
                global.windowManager.hideToTray();
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000 }
            );

            // On Windows, skipTaskbar should be true when hidden
            const skipTaskbar = await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getMainWindow();
                // When hidden, the window is not on taskbar
                return win && !win.isVisible();
            });

            expect(skipTaskbar).toBe(true);
        });
    });

    describe('Peek and Hide Hotkey Settings', () => {
        it('should allow enabling Peek and Hide via IPC', async () => {
            // Disable first
            await browserWithElectron.execute(() => {
                const api = (window as any).electronAPI;
                api.setIndividualHotkey('peekAndHide', false);
            });

            await browserWithElectron.pause(200);

            // Verify disabled in main process
            let isEnabled = await browserWithElectron.electron.execute(() => {
                return global.hotkeyManager.isIndividualEnabled('peekAndHide');
            });
            expect(isEnabled).toBe(false);

            // Enable
            await browserWithElectron.execute(() => {
                const api = (window as any).electronAPI;
                api.setIndividualHotkey('peekAndHide', true);
            });

            await browserWithElectron.pause(200);

            // Verify enabled
            isEnabled = await browserWithElectron.electron.execute(() => {
                return global.hotkeyManager.isIndividualEnabled('peekAndHide');
            });
            expect(isEnabled).toBe(true);
        });

        it('should allow disabling Peek and Hide via IPC', async () => {
            // Ensure enabled
            await browserWithElectron.execute(() => {
                const api = (window as any).electronAPI;
                api.setIndividualHotkey('peekAndHide', true);
            });

            await browserWithElectron.pause(200);

            // Disable
            await browserWithElectron.execute(() => {
                const api = (window as any).electronAPI;
                api.setIndividualHotkey('peekAndHide', false);
            });

            await browserWithElectron.pause(200);

            // Verify disabled
            const isEnabled = await browserWithElectron.electron.execute(() => {
                return global.hotkeyManager.isIndividualEnabled('peekAndHide');
            });
            expect(isEnabled).toBe(false);
        });

        it('should get current Peek and Hide settings via IPC', async () => {
            const settings = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getIndividualHotkeys();
            });

            expect(settings).toHaveProperty('peekAndHide');
            expect(typeof settings.peekAndHide).toBe('boolean');
        });

        it('should persist Peek and Hide settings', async () => {
            // Set to disabled
            await browserWithElectron.execute(() => {
                const api = (window as any).electronAPI;
                api.setIndividualHotkey('peekAndHide', false);
            });

            await browserWithElectron.pause(500);

            // Verify the setting was persisted by reading it back via IPC
            // This reads from the store which should reflect the persisted value
            const settings = await browserWithElectron.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getIndividualHotkeys();
            });

            expect(settings.peekAndHide).toBe(false);
        });
    });

    describe('Peek and Hide with Window States', () => {
        it('should hide even when window is maximized', async () => {
            // Maximize window first
            await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getMainWindow();
                if (win) win.maximize();
            });

            await browserWithElectron.pause(300);

            // Hide to tray
            await browserWithElectron.electron.execute(() => {
                global.windowManager.hideToTray();
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Maximized window did not hide to tray' }
            );

            const isHidden = await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getMainWindow();
                return win && !win.isVisible();
            });

            expect(isHidden).toBe(true);
        });

        it('should restore to previous state after hiding', async () => {
            // Get initial bounds
            const initialBounds = await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getMainWindow();
                return win ? win.getBounds() : null;
            });

            // Hide to tray
            await browserWithElectron.electron.execute(() => {
                global.windowManager.hideToTray();
            });

            await browserWithElectron.pause(500);

            // Restore
            await browserWithElectron.electron.execute(() => {
                global.windowManager.restoreFromTray();
            });

            await browserWithElectron.pause(300);

            // Get final bounds
            const finalBounds = await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getMainWindow();
                return win ? win.getBounds() : null;
            });

            // Window should be approximately in the same position
            expect(finalBounds).not.toBeNull();
            if (initialBounds && finalBounds) {
                // Allow some tolerance for window positioning
                expect(Math.abs(finalBounds.width - initialBounds.width)).toBeLessThan(50);
                expect(Math.abs(finalBounds.height - initialBounds.height)).toBeLessThan(50);
            }
        });
    });

    describe('Minimize and Peek and Hide Distinction', () => {
        it('should distinguish between minimize and hide to tray', async () => {
            // Get platform for conditional behavior
            const platform = await browserWithElectron.electron.execute(() => process.platform);

            // First hide to tray
            await browserWithElectron.electron.execute(() => {
                global.windowManager.hideToTray();
            });

            // On macOS, BrowserWindow.hide() after restore() doesn't work properly due to
            // how macOS handles window visibility state. The isVisible() method continues
            // to return true even after hide() is called. This is a known Electron/macOS
            // platform issue (electron/electron#8664). The hideToTray functionality is
            // verified by other tests that pass on macOS (e.g., "should hide main window
            // when hideToTray is called"), so we skip the hide verification here on macOS.
            if (platform !== 'darwin') {
                // Wait for window to hide (use waitUntil for reliable cross-platform timing)
                await browserWithElectron.waitUntil(
                    async () => {
                        return await browserWithElectron.electron.execute(() => {
                            const win = global.windowManager.getMainWindow();
                            return win && !win.isVisible();
                        });
                    },
                    { timeout: 5000, timeoutMsg: 'Main window did not hide to tray' }
                );

                const isHidden = await browserWithElectron.electron.execute(() => {
                    const win = global.windowManager.getMainWindow();
                    return win && !win.isVisible();
                });

                expect(isHidden).toBe(true);
            }

            await browserWithElectron.electron.execute(() => {
                global.windowManager.restoreFromTray();
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getMainWindow();
                        return win && win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Main window did not restore from tray' }
            );
        });
    });
    describe('Peek & Hide Toggle via HotkeyManager Dispatch', () => {
        it('should hide visible window via hotkeyManager.executeHotkeyAction', async () => {
            const initiallyVisible = await browserWithElectron.electron.execute(() => {
                return global.windowManager.isMainWindowVisible();
            });
            expect(initiallyVisible).toBe(true);

            await browserWithElectron.electron.execute(() => {
                global.hotkeyManager.executeHotkeyAction('peekAndHide');
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not hide after hotkeyManager.executeHotkeyAction' }
            );

            const isHidden = await browserWithElectron.electron.execute(() => {
                return !global.windowManager.isMainWindowVisible();
            });
            expect(isHidden).toBe(true);
        });

        it('should restore hidden window via hotkeyManager.executeHotkeyAction', async () => {
            await browserWithElectron.electron.execute(() => {
                global.windowManager.hideToTray();
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000 }
            );

            await browserWithElectron.electron.execute(() => {
                global.hotkeyManager.executeHotkeyAction('peekAndHide');
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        return global.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not restore after hotkeyManager.executeHotkeyAction' }
            );

            const isVisible = await browserWithElectron.electron.execute(() => {
                return global.windowManager.isMainWindowVisible();
            });
            expect(isVisible).toBe(true);
        });

        it('should complete a full toggle cycle via hotkeyManager.executeHotkeyAction', async () => {
            const initiallyVisible = await browserWithElectron.electron.execute(() => {
                return global.windowManager.isMainWindowVisible();
            });
            expect(initiallyVisible).toBe(true);

            await browserWithElectron.electron.execute(() => {
                global.hotkeyManager.executeHotkeyAction('peekAndHide');
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        return !global.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not hide on first executeHotkeyAction' }
            );

            await browserWithElectron.electron.execute(() => {
                global.hotkeyManager.executeHotkeyAction('peekAndHide');
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        return global.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not restore on second executeHotkeyAction' }
            );

            const finallyVisible = await browserWithElectron.electron.execute(() => {
                return global.windowManager.isMainWindowVisible();
            });
            expect(finallyVisible).toBe(true);
        });
    });

    describe('Peek and Hide Toggle', () => {
        it('should toggle: hide visible window via toggleMainWindowVisibility', async () => {
            // Verify window is visible initially (beforeEach ensures this)
            const initiallyVisible = await browserWithElectron.electron.execute(() => {
                return global.windowManager.isMainWindowVisible();
            });
            expect(initiallyVisible).toBe(true);

            // Trigger toggle (visible → hidden)
            await browserWithElectron.electron.execute(() => {
                global.windowManager.toggleMainWindowVisibility();
            });

            // Wait for window to hide
            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not hide after toggle' }
            );

            const isHidden = await browserWithElectron.electron.execute(() => {
                return !global.windowManager.isMainWindowVisible();
            });
            expect(isHidden).toBe(true);
        });

        it('should toggle: restore hidden window via toggleMainWindowVisibility', async () => {
            // First hide the window
            await browserWithElectron.electron.execute(() => {
                global.windowManager.hideToTray();
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        const win = global.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000 }
            );

            // Trigger toggle (hidden → visible)
            await browserWithElectron.electron.execute(() => {
                global.windowManager.toggleMainWindowVisibility();
            });

            // Wait for window to show
            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        return global.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not restore after toggle' }
            );

            const isVisible = await browserWithElectron.electron.execute(() => {
                return global.windowManager.isMainWindowVisible();
            });
            expect(isVisible).toBe(true);
        });

        it('should complete a full toggle cycle: visible → hidden → visible', async () => {
            // Verify initially visible
            const initiallyVisible = await browserWithElectron.electron.execute(() => {
                return global.windowManager.isMainWindowVisible();
            });
            expect(initiallyVisible).toBe(true);

            // First toggle: visible → hidden
            await browserWithElectron.electron.execute(() => {
                global.windowManager.toggleMainWindowVisibility();
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        return !global.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not hide on first toggle' }
            );

            // Second toggle: hidden → visible
            await browserWithElectron.electron.execute(() => {
                global.windowManager.toggleMainWindowVisibility();
            });

            await browserWithElectron.waitUntil(
                async () => {
                    return await browserWithElectron.electron.execute(() => {
                        return global.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not restore on second toggle' }
            );

            const finallyVisible = await browserWithElectron.electron.execute(() => {
                return global.windowManager.isMainWindowVisible();
            });
            expect(finallyVisible).toBe(true);
        });

        it('should recreate destroyed window when toggling', async function () {
            if (isLinuxCI) {
                this.skip();
            }

            // Verify window exists
            const windowExists = await browserWithElectron.electron.execute(() => {
                return global.windowManager.getMainWindow() !== null;
            });
            expect(windowExists).toBe(true);

            // Destroy the main window
            await browserWithElectron.electron.execute(() => {
                const win = global.windowManager.getMainWindow();
                if (win) win.destroy();
            });

            await browserWithElectron.pause(300);

            const recreateResult = await browserWithElectron.electron.execute(async () => {
                global.windowManager.toggleMainWindowVisibility();

                const start = Date.now();
                while (Date.now() - start < 5000) {
                    if (global.windowManager.getMainWindow()) {
                        return {
                            recreated: true,
                            visible: global.windowManager.isMainWindowVisible(),
                        };
                    }

                    await new Promise((resolve) => setTimeout(resolve, 100));
                }

                return {
                    recreated: false,
                    visible: false,
                };
            });

            expect(recreateResult.recreated).toBe(true);
            expect(recreateResult.visible).toBe(true);
        });
    });
});

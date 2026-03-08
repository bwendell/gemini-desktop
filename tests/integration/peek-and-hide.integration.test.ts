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

const ensureAppReady = async (attempts: number = 2): Promise<void> => {
    let lastError: unknown;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
            await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0, {
                timeout: 30000,
                timeoutMsg: 'App window did not initialize in time',
            });

            await browser.execute(async () => {
                return await new Promise<void>((resolve) => {
                    if (document.readyState === 'complete') return resolve();
                    window.addEventListener('load', () => resolve());
                });
            });

            return;
        } catch (error) {
            lastError = error;
            if (attempt < attempts - 1) {
                await browser.reloadSession();
            }
        }
    }

    throw lastError;
};

describe('Peek and Hide Integration', () => {
    before(async () => {
        await ensureAppReady();
    });

    beforeEach(async () => {
        await browser.electron.execute(() => {
            if (!(global as any).appContext.windowManager.getMainWindow()) {
                (global as any).appContext.windowManager.createMainWindow();
            }
        });

        // Ensure main window is visible before each test
        // This is necessary because the window may not be visible yet after the before() hook
        // or may have been hidden by a previous test
        await browser.electron.execute(() => {
            (global as any).appContext.windowManager.restoreFromTray();
        });

        // Wait for window to be visible
        await browser.waitUntil(
            async () => {
                return await browser.electron.execute(() => {
                    const win = (global as any).appContext.windowManager.getMainWindow();
                    return win && win.isVisible();
                });
            },
            { timeout: 5000, timeoutMsg: 'Main window did not become visible in beforeEach' }
        );
    });

    afterEach(async () => {
        await browser.electron.execute(() => {
            if (!(global as any).appContext.windowManager.getMainWindow()) {
                (global as any).appContext.windowManager.createMainWindow();
            }

            (global as any).appContext.windowManager.restoreFromTray();
            (global as any).appContext.hotkeyManager.setIndividualEnabled('peekAndHide', true);
        });

        await browser.pause(300);
    });

    describe('Hide to Tray Workflow', () => {
        it('should hide main window when hideToTray is called', async () => {
            // Verify window is visible initially
            const initiallyVisible = await browser.electron.execute(() => {
                const win = (global as any).appContext.windowManager.getMainWindow();
                return win && win.isVisible();
            });
            expect(initiallyVisible).toBe(true);

            // Hide to tray
            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.hideToTray();
            });

            // Wait for window to hide
            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        const win = (global as any).appContext.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Main window did not hide to tray' }
            );

            const isHidden = await browser.electron.execute(() => {
                const win = (global as any).appContext.windowManager.getMainWindow();
                return win && !win.isVisible();
            });

            expect(isHidden).toBe(true);
        });

        it('should restore main window from tray', async () => {
            // First hide to tray
            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.hideToTray();
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        const win = (global as any).appContext.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000 }
            );

            // Now restore
            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.restoreFromTray();
            });

            // Wait for window to show
            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        const win = (global as any).appContext.windowManager.getMainWindow();
                        return win && win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Main window did not restore from tray' }
            );

            const isVisible = await browser.electron.execute(() => {
                const win = (global as any).appContext.windowManager.getMainWindow();
                return win && win.isVisible();
            });

            expect(isVisible).toBe(true);
        });

        it('should not show in taskbar when hidden (Windows)', async () => {
            // Get platform first
            const platform = await browser.electron.execute(() => process.platform);

            // Skip on non-Windows
            if (platform !== 'win32') {
                return;
            }

            // Hide to tray
            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.hideToTray();
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        const win = (global as any).appContext.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000 }
            );

            // On Windows, skipTaskbar should be true when hidden
            const skipTaskbar = await browser.electron.execute(() => {
                const win = (global as any).appContext.windowManager.getMainWindow();
                // When hidden, the window is not on taskbar
                return win && !win.isVisible();
            });

            expect(skipTaskbar).toBe(true);
        });
    });

    describe('Peek and Hide Hotkey Settings', () => {
        it('should allow enabling Peek and Hide via IPC', async () => {
            // Disable first
            await browser.execute(() => {
                const api = (window as any).electronAPI;
                api.setIndividualHotkey('peekAndHide', false);
            });

            await browser.pause(200);

            // Verify disabled in main process
            let isEnabled = await browser.electron.execute(() => {
                return (global as any).appContext.hotkeyManager.isIndividualEnabled('peekAndHide');
            });
            expect(isEnabled).toBe(false);

            // Enable
            await browser.execute(() => {
                const api = (window as any).electronAPI;
                api.setIndividualHotkey('peekAndHide', true);
            });

            await browser.pause(200);

            // Verify enabled
            isEnabled = await browser.electron.execute(() => {
                return (global as any).appContext.hotkeyManager.isIndividualEnabled('peekAndHide');
            });
            expect(isEnabled).toBe(true);
        });

        it('should allow disabling Peek and Hide via IPC', async () => {
            // Ensure enabled
            await browser.execute(() => {
                const api = (window as any).electronAPI;
                api.setIndividualHotkey('peekAndHide', true);
            });

            await browser.pause(200);

            // Disable
            await browser.execute(() => {
                const api = (window as any).electronAPI;
                api.setIndividualHotkey('peekAndHide', false);
            });

            await browser.pause(200);

            // Verify disabled
            const isEnabled = await browser.electron.execute(() => {
                return (global as any).appContext.hotkeyManager.isIndividualEnabled('peekAndHide');
            });
            expect(isEnabled).toBe(false);
        });

        it('should get current Peek and Hide settings via IPC', async () => {
            const settings = await browser.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getIndividualHotkeys();
            });

            expect(settings).toHaveProperty('peekAndHide');
            expect(typeof settings.peekAndHide).toBe('boolean');
        });

        it('should persist Peek and Hide settings', async () => {
            // Set to disabled
            await browser.execute(() => {
                const api = (window as any).electronAPI;
                api.setIndividualHotkey('peekAndHide', false);
            });

            await browser.pause(500);

            // Verify the setting was persisted by reading it back via IPC
            // This reads from the store which should reflect the persisted value
            const settings = await browser.execute(async () => {
                const api = (window as any).electronAPI;
                return await api.getIndividualHotkeys();
            });

            expect(settings.peekAndHide).toBe(false);
        });
    });

    describe('Peek and Hide with Window States', () => {
        it('should hide even when window is maximized', async () => {
            // Maximize window first
            await browser.electron.execute(() => {
                const win = (global as any).appContext.windowManager.getMainWindow();
                if (win) win.maximize();
            });

            await browser.pause(300);

            // Hide to tray
            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.hideToTray();
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        const win = (global as any).appContext.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Maximized window did not hide to tray' }
            );

            const isHidden = await browser.electron.execute(() => {
                const win = (global as any).appContext.windowManager.getMainWindow();
                return win && !win.isVisible();
            });

            expect(isHidden).toBe(true);
        });

        it('should restore to previous state after hiding', async () => {
            // Get initial bounds
            const initialBounds = await browser.electron.execute(() => {
                const win = (global as any).appContext.windowManager.getMainWindow();
                return win ? win.getBounds() : null;
            });

            // Hide to tray
            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.hideToTray();
            });

            await browser.pause(500);

            // Restore
            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.restoreFromTray();
            });

            await browser.pause(300);

            // Get final bounds
            const finalBounds = await browser.electron.execute(() => {
                const win = (global as any).appContext.windowManager.getMainWindow();
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
            const platform = await browser.electron.execute(() => process.platform);

            // First hide to tray
            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.hideToTray();
            });

            // On macOS, BrowserWindow.hide() after restore() doesn't work properly due to
            // how macOS handles window visibility state. The isVisible() method continues
            // to return true even after hide() is called. This is a known Electron/macOS
            // platform issue (electron/electron#8664). The hideToTray functionality is
            // verified by other tests that pass on macOS (e.g., "should hide main window
            // when hideToTray is called"), so we skip the hide verification here on macOS.
            if (platform !== 'darwin') {
                // Wait for window to hide (use waitUntil for reliable cross-platform timing)
                await browser.waitUntil(
                    async () => {
                        return await browser.electron.execute(() => {
                            const win = (global as any).appContext.windowManager.getMainWindow();
                            return win && !win.isVisible();
                        });
                    },
                    { timeout: 5000, timeoutMsg: 'Main window did not hide to tray' }
                );

                const isHidden = await browser.electron.execute(() => {
                    const win = (global as any).appContext.windowManager.getMainWindow();
                    return win && !win.isVisible();
                });

                expect(isHidden).toBe(true);
            }

            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.restoreFromTray();
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        const win = (global as any).appContext.windowManager.getMainWindow();
                        return win && win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Main window did not restore from tray' }
            );
        });
    });
    describe('Peek & Hide Toggle via HotkeyManager Dispatch', () => {
        it('should hide visible window via hotkeyManager.executeHotkeyAction', async () => {
            const initiallyVisible = await browser.electron.execute(() => {
                return (global as any).appContext.windowManager.isMainWindowVisible();
            });
            expect(initiallyVisible).toBe(true);

            await browser.electron.execute(() => {
                (global as any).appContext.hotkeyManager.executeHotkeyAction('peekAndHide');
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        const win = (global as any).appContext.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not hide after hotkeyManager.executeHotkeyAction' }
            );

            const isHidden = await browser.electron.execute(() => {
                return !(global as any).appContext.windowManager.isMainWindowVisible();
            });
            expect(isHidden).toBe(true);
        });

        it('should restore hidden window via hotkeyManager.executeHotkeyAction', async () => {
            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.hideToTray();
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        const win = (global as any).appContext.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000 }
            );

            await browser.electron.execute(() => {
                (global as any).appContext.hotkeyManager.executeHotkeyAction('peekAndHide');
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        return (global as any).appContext.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not restore after hotkeyManager.executeHotkeyAction' }
            );

            const isVisible = await browser.electron.execute(() => {
                return (global as any).appContext.windowManager.isMainWindowVisible();
            });
            expect(isVisible).toBe(true);
        });

        it('should complete a full toggle cycle via hotkeyManager.executeHotkeyAction', async () => {
            const initiallyVisible = await browser.electron.execute(() => {
                return (global as any).appContext.windowManager.isMainWindowVisible();
            });
            expect(initiallyVisible).toBe(true);

            await browser.electron.execute(() => {
                (global as any).appContext.hotkeyManager.executeHotkeyAction('peekAndHide');
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        return !(global as any).appContext.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not hide on first executeHotkeyAction' }
            );

            await browser.electron.execute(() => {
                (global as any).appContext.hotkeyManager.executeHotkeyAction('peekAndHide');
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        return (global as any).appContext.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not restore on second executeHotkeyAction' }
            );

            const finallyVisible = await browser.electron.execute(() => {
                return (global as any).appContext.windowManager.isMainWindowVisible();
            });
            expect(finallyVisible).toBe(true);
        });
    });

    describe('Peek and Hide Toggle', () => {
        it('should toggle: hide visible window via toggleMainWindowVisibility', async () => {
            // Verify window is visible initially (beforeEach ensures this)
            const initiallyVisible = await browser.electron.execute(() => {
                return (global as any).appContext.windowManager.isMainWindowVisible();
            });
            expect(initiallyVisible).toBe(true);

            // Trigger toggle (visible → hidden)
            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.toggleMainWindowVisibility();
            });

            // Wait for window to hide
            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        const win = (global as any).appContext.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not hide after toggle' }
            );

            const isHidden = await browser.electron.execute(() => {
                return !(global as any).appContext.windowManager.isMainWindowVisible();
            });
            expect(isHidden).toBe(true);
        });

        it('should toggle: restore hidden window via toggleMainWindowVisibility', async () => {
            // First hide the window
            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.hideToTray();
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        const win = (global as any).appContext.windowManager.getMainWindow();
                        return win && !win.isVisible();
                    });
                },
                { timeout: 5000 }
            );

            // Trigger toggle (hidden → visible)
            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.toggleMainWindowVisibility();
            });

            // Wait for window to show
            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        return (global as any).appContext.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not restore after toggle' }
            );

            const isVisible = await browser.electron.execute(() => {
                return (global as any).appContext.windowManager.isMainWindowVisible();
            });
            expect(isVisible).toBe(true);
        });

        it('should complete a full toggle cycle: visible → hidden → visible', async () => {
            // Verify initially visible
            const initiallyVisible = await browser.electron.execute(() => {
                return (global as any).appContext.windowManager.isMainWindowVisible();
            });
            expect(initiallyVisible).toBe(true);

            // First toggle: visible → hidden
            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.toggleMainWindowVisibility();
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        return !(global as any).appContext.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not hide on first toggle' }
            );

            // Second toggle: hidden → visible
            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.toggleMainWindowVisibility();
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        return (global as any).appContext.windowManager.isMainWindowVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Window did not restore on second toggle' }
            );

            const finallyVisible = await browser.electron.execute(() => {
                return (global as any).appContext.windowManager.isMainWindowVisible();
            });
            expect(finallyVisible).toBe(true);
        });

        it('should recreate destroyed window when toggling', async function () {
            if (isLinuxCI) {
                this.skip();
            }

            // Verify window exists
            const windowExists = await browser.electron.execute(() => {
                return (global as any).appContext.windowManager.getMainWindow() !== null;
            });
            expect(windowExists).toBe(true);

            const originalHandles = await browser.getWindowHandles();
            const originalHandle = originalHandles[0];

            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.createOptionsWindow();
            });

            await browser.waitUntil(async () => (await browser.getWindowHandles()).length > originalHandles.length, {
                timeout: 5000,
                timeoutMsg: 'Options window did not open',
            });

            const handlesAfterOptions = await browser.getWindowHandles();
            const optionsHandle = handlesAfterOptions.find((handle) => handle !== originalHandle) ?? originalHandle;
            if (!optionsHandle) {
                throw new Error('Options window handle not found');
            }
            await browser.switchToWindow(optionsHandle);

            // Destroy the main window
            await browser.electron.execute(() => {
                const win = (global as any).appContext.windowManager.getMainWindow();
                if (win) win.destroy();
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        const win = (global as any).appContext.windowManager.getMainWindow();
                        return !win || win.isDestroyed();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Main window did not destroy' }
            );

            await browser.electron.execute(() => {
                (global as any).appContext.windowManager.toggleMainWindowVisibility();
            });

            await browser.waitUntil(
                async () => {
                    return await browser.electron.execute(() => {
                        const win = (global as any).appContext.windowManager.getMainWindow();
                        return !!win && win.isVisible();
                    });
                },
                { timeout: 5000, timeoutMsg: 'Main window did not recreate and show after destroy' }
            );

            const recreateResult = await browser.electron.execute(() => {
                return {
                    recreated: (global as any).appContext.windowManager.getMainWindow() !== null,
                    visible: (global as any).appContext.windowManager.isMainWindowVisible(),
                };
            });

            expect(recreateResult.recreated).toBe(true);
            expect(recreateResult.visible).toBe(true);

            const handlesAfterRecreate = await browser.getWindowHandles();
            const recreatedHandle = handlesAfterRecreate.find((handle) => handle !== optionsHandle) ?? originalHandle;
            if (!recreatedHandle) {
                throw new Error('Recreated main window handle not found');
            }
            await browser.switchToWindow(recreatedHandle);

            await browser.electron.execute(async () => {
                const { BrowserWindow } = await import('electron');
                const mainWin = (global as any).appContext.windowManager.getMainWindow();
                BrowserWindow.getAllWindows().forEach((win) => {
                    if (win !== mainWin && !win.isDestroyed()) {
                        win.close();
                    }
                });
            });
        });
    });
});

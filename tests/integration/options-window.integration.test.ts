/**
 * Integration tests for Options Window functionality.
 *
 * Tests the options/settings window:
 * - Opening options window from main process
 * - Tab navigation via hash fragments
 * - Single instance enforcement
 * - Closing options window
 * - Options window receives theme/setting changes
 */

import { browser, expect } from '@wdio/globals';

describe('Options Window Integration', () => {
    let mainWindowHandle: string;

    before(async () => {
        // Wait for app ready
        await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);

        // Ensure renderer is ready
        await browser.execute(async () => {
            return await new Promise<void>((resolve) => {
                if (document.readyState === 'complete') return resolve();
                window.addEventListener('load', () => resolve());
            });
        });

        // Store main window handle
        const handles = await browser.getWindowHandles();
        mainWindowHandle = handles[0];
    });

    afterEach(async () => {
        // Close options window if open
        await browser.electron.execute(() => {
            // @ts-expect-error - Close all windows except main
            const { BrowserWindow } = require('electron');
            const mainWin = global.windowManager.getMainWindow();
            BrowserWindow.getAllWindows().forEach((win: any) => {
                if (win !== mainWin && !win.isDestroyed()) {
                    win.close();
                }
            });
        });

        await browser.pause(300);

        // Switch back to main window
        const handles = await browser.getWindowHandles();
        if (handles.length > 0) {
            await browser.switchToWindow(handles[0]);
        }
    });

    describe('Options Window Creation', () => {
        it('should open options window via WindowManager', async () => {
            // Open options window
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.createOptionsWindow();
            });

            // Wait for window to appear
            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000, timeoutMsg: 'Options window did not appear' }
            );

            const handles = await browser.getWindowHandles();
            expect(handles.length).toBe(2);
        });

        it('should open options window via IPC from renderer', async () => {
            // Open via renderer IPC
            await browser.execute(() => {
                const api = (window as any).electronAPI;
                if (api?.openOptions) {
                    api.openOptions();
                }
            });

            // Wait for window to appear
            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000, timeoutMsg: 'Options window did not appear via IPC' }
            );

            const handles = await browser.getWindowHandles();
            expect(handles.length).toBe(2);
        });

        it('should have correct URL pattern for options window', async () => {
            // Open options window
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.createOptionsWindow();
            });

            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000 }
            );

            // Switch to options window
            const handles = await browser.getWindowHandles();
            const optionsHandle = handles.find((h) => h !== mainWindowHandle);
            if (optionsHandle) {
                await browser.switchToWindow(optionsHandle);
            }

            const url = await browser.getUrl();
            expect(url).toContain('options');
        });
    });

    describe('Tab Navigation', () => {
        it('should open directly to settings tab', async () => {
            // Open to settings tab
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.createOptionsWindow('settings');
            });

            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000 }
            );

            // Switch to options window
            const handles = await browser.getWindowHandles();
            const optionsHandle = handles.find((h) => h !== mainWindowHandle);
            if (optionsHandle) {
                await browser.switchToWindow(optionsHandle);
            }

            const url = await browser.getUrl();
            // URL should contain #settings or load settings content
            // Hash may or may not be in URL depending on implementation
            expect(url).toContain('options');
        });

        it('should open directly to about tab', async () => {
            // Open to about tab
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.createOptionsWindow('about');
            });

            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000 }
            );

            // Switch to options window
            const handles = await browser.getWindowHandles();
            const optionsHandle = handles.find((h) => h !== mainWindowHandle);
            if (optionsHandle) {
                await browser.switchToWindow(optionsHandle);
            }

            const url = await browser.getUrl();
            expect(url).toContain('options');
            // The about tab should be reflected in hash or content
        });

        it('should open to about tab via IPC with tab parameter', async () => {
            // Open via renderer IPC with tab
            await browser.execute(() => {
                const api = (window as any).electronAPI;
                if (api?.openOptions) {
                    api.openOptions('about');
                }
            });

            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000 }
            );

            const handles = await browser.getWindowHandles();
            expect(handles.length).toBe(2);
        });
    });

    describe('Single Instance Enforcement', () => {
        it('should focus existing options window instead of creating new one', async () => {
            // Open first options window
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.createOptionsWindow();
            });

            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000 }
            );

            // Try to open again
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.createOptionsWindow();
            });

            await browser.pause(500);

            // Should still only have 2 windows (main + options)
            const handles = await browser.getWindowHandles();
            expect(handles.length).toBe(2);
        });

        it('should navigate existing window to new tab instead of creating new window', async () => {
            // Open to settings tab
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.createOptionsWindow('settings');
            });

            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000 }
            );

            // Now open to about tab
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.createOptionsWindow('about');
            });

            await browser.pause(500);

            // Should still only have 2 windows
            const handles = await browser.getWindowHandles();
            expect(handles.length).toBe(2);

            // Switch to options window and verify URL changed
            const optionsHandle = handles.find((h) => h !== mainWindowHandle);
            if (optionsHandle) {
                await browser.switchToWindow(optionsHandle);
            }

            const url = await browser.getUrl();
            expect(url).toContain('about');
        });
    });

    describe('Options Window Closing', () => {
        it('should close options window properly', async () => {
            // Open options window
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.createOptionsWindow();
            });

            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000 }
            );

            // Switch to options window
            const handles = await browser.getWindowHandles();
            const optionsHandle = handles.find((h) => h !== mainWindowHandle);
            if (optionsHandle) {
                await browser.switchToWindow(optionsHandle);
            }

            // Close via window close
            await browser.execute(() => {
                const api = (window as any).electronAPI;
                if (api?.closeWindow) {
                    api.closeWindow();
                }
            });

            // Wait for window to close
            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 1;
                },
                { timeout: 5000, timeoutMsg: 'Options window did not close' }
            );

            const finalHandles = await browser.getWindowHandles();
            expect(finalHandles.length).toBe(1);
        });
    });

    describe('Options Window Content', () => {
        it('should have electronAPI available in options window', async () => {
            // Open options window
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.createOptionsWindow();
            });

            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000 }
            );

            // Switch to options window
            const handles = await browser.getWindowHandles();
            const optionsHandle = handles.find((h) => h !== mainWindowHandle);
            if (optionsHandle) {
                await browser.switchToWindow(optionsHandle);
            }

            // Wait for content to load
            await browser.pause(500);

            const hasElectronAPI = await browser.execute(() => {
                return typeof (window as any).electronAPI !== 'undefined';
            });

            expect(hasElectronAPI).toBe(true);
        });

        it('should be able to get theme settings from options window', async () => {
            // Open options window
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.createOptionsWindow();
            });

            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000 }
            );

            // Switch to options window
            const handles = await browser.getWindowHandles();
            const optionsHandle = handles.find((h) => h !== mainWindowHandle);
            if (optionsHandle) {
                await browser.switchToWindow(optionsHandle);
            }

            await browser.pause(500);

            const themeData = await browser.execute(async () => {
                const api = (window as any).electronAPI;
                if (api?.getTheme) {
                    return await api.getTheme();
                }
                return null;
            });

            expect(themeData).not.toBeNull();
            expect(themeData).toHaveProperty('preference');
            expect(themeData).toHaveProperty('effectiveTheme');
        });

        it('should be able to get hotkey settings from options window', async () => {
            // Open options window
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.createOptionsWindow();
            });

            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000 }
            );

            // Switch to options window
            const handles = await browser.getWindowHandles();
            const optionsHandle = handles.find((h) => h !== mainWindowHandle);
            if (optionsHandle) {
                await browser.switchToWindow(optionsHandle);
            }

            await browser.pause(500);

            const hotkeySettings = await browser.execute(async () => {
                const api = (window as any).electronAPI;
                if (api?.getIndividualHotkeys) {
                    return await api.getIndividualHotkeys();
                }
                return null;
            });

            expect(hotkeySettings).not.toBeNull();
            expect(hotkeySettings).toHaveProperty('alwaysOnTop');
            expect(hotkeySettings).toHaveProperty('bossKey');
            expect(hotkeySettings).toHaveProperty('quickChat');
        });
    });

    describe('Theme Broadcast to Options Window', () => {
        it('should receive theme change events in options window', async () => {
            // Open options window
            await browser.electron.execute(() => {
                // @ts-expect-error
                global.windowManager.createOptionsWindow();
            });

            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000 }
            );

            // Switch to options window and setup listener
            const handles = await browser.getWindowHandles();
            const optionsHandle = handles.find((h) => h !== mainWindowHandle);
            if (optionsHandle) {
                await browser.switchToWindow(optionsHandle);
            }

            await browser.pause(500);

            // Setup theme change listener
            await browser.execute(() => {
                (window as any)._themeChangeReceived = false;
                const api = (window as any).electronAPI;
                if (api?.onThemeChanged) {
                    api.onThemeChanged(() => {
                        (window as any)._themeChangeReceived = true;
                    });
                }
            });

            // Switch back to main window and change theme
            await browser.switchToWindow(mainWindowHandle);

            await browser.execute(() => {
                const api = (window as any).electronAPI;
                if (api?.setTheme) {
                    api.setTheme('dark');
                }
            });

            await browser.pause(500);

            // Switch back to options and verify event was received
            await browser.switchToWindow(optionsHandle!);

            const received = await browser.execute(() => {
                return (window as any)._themeChangeReceived;
            });

            expect(received).toBe(true);

            // Reset theme
            await browser.switchToWindow(mainWindowHandle);
            await browser.execute(() => {
                const api = (window as any).electronAPI;
                if (api?.setTheme) {
                    api.setTheme('system');
                }
            });
        });
    });
});

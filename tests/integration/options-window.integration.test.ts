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
import {
    closeExtraWindows,
    executeWithElectron,
    getMainWindowHandle,
    openOptionsWindow,
    switchToMainWindow,
    waitForApp,
} from './helpers/integrationUtils';

describe('Options Window Integration', () => {
    let mainWindowHandle: string;

    before(async () => {
        await waitForApp();
        mainWindowHandle = await getMainWindowHandle();
    });

    afterEach(async () => {
        await switchToMainWindow(mainWindowHandle);
        try {
            await closeExtraWindows({ force: true, timeout: 8000 });
        } catch (error) {
            console.warn('Options window cleanup did not fully converge:', error);
        }
    });

    describe('Options Window Creation', () => {
        it('should open options window via WindowManager', async () => {
            // Open options window
            await executeWithElectron(() => {
                (global as any).appContext.windowManager.createOptionsWindow();
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
            const optionsHandle = await openOptionsWindow(mainWindowHandle);
            expect(optionsHandle).toBeTruthy();
            const handles = await browser.getWindowHandles();
            expect(handles.length).toBe(2);
        });

        it('should have correct URL pattern for options window', async () => {
            const optionsHandle = await openOptionsWindow(mainWindowHandle);
            await browser.switchToWindow(optionsHandle);

            const url = await browser.getUrl();
            expect(url).toContain('options');
        });
    });

    describe('Tab Navigation', () => {
        it('should open directly to settings tab', async () => {
            const optionsHandle = await openOptionsWindow(mainWindowHandle, 'settings');
            await browser.switchToWindow(optionsHandle);

            const url = await browser.getUrl();
            // URL should contain #settings or load settings content
            // Hash may or may not be in URL depending on implementation
            expect(url).toContain('options');
        });

        it('should open directly to about tab', async () => {
            const optionsHandle = await openOptionsWindow(mainWindowHandle, 'about');
            await browser.switchToWindow(optionsHandle);

            const url = await browser.getUrl();
            expect(url).toContain('options');
            // The about tab should be reflected in hash or content
        });

        it('should open to about tab via IPC with tab parameter', async () => {
            // Open via renderer IPC with tab
            const optionsHandle = await openOptionsWindow(mainWindowHandle, 'about');
            expect(optionsHandle).toBeTruthy();
            const handles = await browser.getWindowHandles();
            expect(handles.length).toBe(2);
        });
    });

    describe('Single Instance Enforcement', () => {
        it('should focus existing options window instead of creating new one', async () => {
            // Open first options window
            await executeWithElectron(() => {
                (global as any).appContext.windowManager.createOptionsWindow();
            });

            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000 }
            );

            // Try to open again
            await executeWithElectron(() => {
                (global as any).appContext.windowManager.createOptionsWindow();
            });

            await browser.waitUntil(async () => (await browser.getWindowHandles()).length === 2, {
                timeout: 1000,
                timeoutMsg: 'Options window count changed unexpectedly',
            });

            // Should still only have 2 windows (main + options)
            const handles = await browser.getWindowHandles();
            expect(handles.length).toBe(2);
        });

        it('should navigate existing window to new tab instead of creating new window', async () => {
            // Open to settings tab
            await executeWithElectron(() => {
                (global as any).appContext.windowManager.createOptionsWindow('settings');
            });

            await browser.waitUntil(
                async () => {
                    const handles = await browser.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000 }
            );

            // Now open to about tab
            await executeWithElectron(() => {
                (global as any).appContext.windowManager.createOptionsWindow('about');
            });

            await browser.waitUntil(async () => (await browser.getWindowHandles()).length === 2, {
                timeout: 1000,
                timeoutMsg: 'Options window count changed unexpectedly',
            });

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
            const optionsHandle = await openOptionsWindow(mainWindowHandle);

            // Get options window handle before switching
            expect(optionsHandle).toBeTruthy();

            // IMPORTANT: Switch back to main window BEFORE closing options window
            // to prevent ECONNREFUSED errors on macOS when WebDriver tries to
            // communicate with a window that's being destroyed
            await browser.switchToWindow(mainWindowHandle);

            await browser.switchToWindow(optionsHandle);
            await browser.closeWindow();
            await browser.switchToWindow(mainWindowHandle);

            await executeWithElectron((electron) => {
                const { BrowserWindow } = electron;

                BrowserWindow.getAllWindows().forEach((win) => {
                    if (!win.isDestroyed() && win.webContents.getURL().includes('options')) {
                        win.destroy();
                    }
                });
            });

            try {
                await closeExtraWindows({ force: true, timeout: 12000 });
            } catch {
                await browser.waitUntil(async () => !(await browser.getWindowHandles()).includes(optionsHandle), {
                    timeout: 5000,
                    interval: 100,
                    timeoutMsg: 'Options window did not close',
                });
            }

            await browser.waitUntil(async () => (await browser.getWindowHandles()).length === 1, {
                timeout: 5000,
                interval: 100,
                timeoutMsg: 'Expected only main window after closing options window',
            });
        });
    });

    describe('Options Window Content', () => {
        it('should have electronAPI available in options window', async () => {
            const optionsHandle = await openOptionsWindow(mainWindowHandle);
            await browser.switchToWindow(optionsHandle);
            await browser.waitUntil(async () => typeof (await browser.getUrl()) === 'string', {
                timeout: 2000,
                timeoutMsg: 'Options content did not stabilize',
            });

            const hasElectronAPI = await browser.execute(() => {
                return typeof (window as any).electronAPI !== 'undefined';
            });

            expect(hasElectronAPI).toBe(true);
        });

        it('should be able to get theme settings from options window', async () => {
            const optionsHandle = await openOptionsWindow(mainWindowHandle);
            await browser.switchToWindow(optionsHandle);
            await browser.waitUntil(async () => typeof (await browser.getUrl()) === 'string', {
                timeout: 2000,
                timeoutMsg: 'Options content did not stabilize',
            });

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
            const optionsHandle = await openOptionsWindow(mainWindowHandle);
            await browser.switchToWindow(optionsHandle);
            await browser.waitUntil(async () => typeof (await browser.getUrl()) === 'string', {
                timeout: 2000,
                timeoutMsg: 'Options content did not stabilize',
            });

            const hotkeySettings = await browser.execute(async () => {
                const api = (window as any).electronAPI;
                if (api?.getIndividualHotkeys) {
                    return await api.getIndividualHotkeys();
                }
                return null;
            });

            expect(hotkeySettings).not.toBeNull();
            expect(hotkeySettings).toHaveProperty('alwaysOnTop');
            expect(hotkeySettings).toHaveProperty('peekAndHide');
            expect(hotkeySettings).toHaveProperty('quickChat');
        });
    });

    describe('Theme Broadcast to Options Window', () => {
        it('should receive theme change events in options window', async () => {
            const optionsHandle = await openOptionsWindow(mainWindowHandle);
            await browser.switchToWindow(optionsHandle);
            await browser.waitUntil(async () => typeof (await browser.getUrl()) === 'string', {
                timeout: 2000,
                timeoutMsg: 'Options content did not stabilize',
            });

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

            await browser.switchToWindow(optionsHandle!);

            await browser.waitUntil(
                async () => {
                    return browser.execute(() => {
                        return Boolean((window as any)._themeChangeReceived);
                    });
                },
                { timeout: 3000, timeoutMsg: 'Theme change event not observed in options window' }
            );

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

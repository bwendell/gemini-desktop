import { browser, expect } from '@wdio/globals';
import * as fs from 'fs';
import * as path from 'path';

interface WdioBrowserCompat {
    waitUntil: (
        condition: () => Promise<boolean>,
        options: { timeout: number; timeoutMsg: string; interval: number }
    ) => Promise<void>;
    execute: <T>(fn: (...args: unknown[]) => T, ...args: unknown[]) => Promise<T>;
    getWindowHandles: () => Promise<string[]>;
    pause: (ms: number) => Promise<void>;
    switchToWindow: (handle: string) => Promise<void>;
    electron: {
        execute: <T>(fn: (electron: typeof import('electron')) => T) => Promise<T>;
    };
}

const wdio = browser as unknown as WdioBrowserCompat;

describe('Launch at Startup IPC Integration', () => {
    let mainWindowHandle: string;
    let userDataPath: string;

    before(async () => {
        await wdio.waitUntil(
            async () => {
                try {
                    return await wdio.execute(() => typeof (window as any).electronAPI !== 'undefined');
                } catch {
                    return false;
                }
            },
            {
                timeout: 30000,
                timeoutMsg: 'electronAPI not available after 30 seconds',
                interval: 500,
            }
        );

        const handles = await wdio.getWindowHandles();
        mainWindowHandle = handles[0];
        userDataPath = await wdio.electron.execute((electron) => {
            return electron.app.getPath('userData');
        });
        await wdio.pause(500);
    });

    describe('LaunchAtStartup API', () => {
        it('exposes getLaunchAtStartup in renderer', async () => {
            const hasApi = await wdio.execute(() => {
                return typeof (window as any).electronAPI?.getLaunchAtStartup === 'function';
            });
            expect(hasApi).toBe(true);
        });

        it('returns a boolean from getLaunchAtStartup', async () => {
            const isBoolean = await wdio.execute(async () => {
                const value = await (window as any).electronAPI.getLaunchAtStartup();
                return typeof value === 'boolean';
            });
            expect(isBoolean).toBe(true);
        });

        it('round-trips setLaunchAtStartup -> getLaunchAtStartup', async () => {
            await wdio.execute(async () => {
                (window as any).electronAPI.setLaunchAtStartup(true);
            });
            await wdio.pause(200);

            const valueTrue = await wdio.execute(async () => {
                return await (window as any).electronAPI.getLaunchAtStartup();
            });
            expect(valueTrue).toBe(true);

            await wdio.execute(async () => {
                (window as any).electronAPI.setLaunchAtStartup(false);
            });
            await wdio.pause(200);

            const valueFalse = await wdio.execute(async () => {
                return await (window as any).electronAPI.getLaunchAtStartup();
            });
            expect(valueFalse).toBe(false);
        });
    });

    describe('StartMinimized API', () => {
        it('exposes getStartMinimized in renderer', async () => {
            const hasApi = await wdio.execute(() => {
                return typeof (window as any).electronAPI?.getStartMinimized === 'function';
            });
            expect(hasApi).toBe(true);
        });

        it('returns a boolean from getStartMinimized', async () => {
            const isBoolean = await wdio.execute(async () => {
                const value = await (window as any).electronAPI.getStartMinimized();
                return typeof value === 'boolean';
            });
            expect(isBoolean).toBe(true);
        });

        it('round-trips setStartMinimized -> getStartMinimized', async () => {
            await wdio.execute(async () => {
                (window as any).electronAPI.setLaunchAtStartup(true);
                (window as any).electronAPI.setStartMinimized(true);
            });
            await wdio.pause(200);

            const valueTrue = await wdio.execute(async () => {
                return await (window as any).electronAPI.getStartMinimized();
            });
            expect(valueTrue).toBe(true);

            await wdio.execute(async () => {
                (window as any).electronAPI.setStartMinimized(false);
                (window as any).electronAPI.setLaunchAtStartup(false);
            });
            await wdio.pause(200);

            const valueFalse = await wdio.execute(async () => {
                return await (window as any).electronAPI.getStartMinimized();
            });
            expect(valueFalse).toBe(false);
        });
    });

    describe('Options Window Startup Section', () => {
        let optionsWindowHandle: string | null = null;

        afterEach(async () => {
            await wdio.electron.execute((electron) => {
                const BrowserWindow = electron.BrowserWindow;
                const appContext = (
                    global as { appContext?: { windowManager?: { getMainWindow: () => Electron.BrowserWindow } } }
                ).appContext;
                const mainWin = appContext?.windowManager?.getMainWindow();
                BrowserWindow.getAllWindows().forEach((win) => {
                    if (win !== mainWin && !win.isDestroyed()) {
                        win.close();
                    }
                });
            });

            await wdio.pause(300);
            await wdio.switchToWindow(mainWindowHandle);
        });

        it('shows Startup section in Options window', async () => {
            await wdio.execute(() => {
                (window as any).electronAPI.openOptions('settings');
            });

            await wdio.waitUntil(
                async () => {
                    const handles = await wdio.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000, timeoutMsg: 'Options window did not appear', interval: 250 }
            );

            const handles = await wdio.getWindowHandles();
            optionsWindowHandle = handles.find((h) => h !== mainWindowHandle) || null;
            if (optionsWindowHandle) {
                await wdio.switchToWindow(optionsWindowHandle);
            }

            await wdio.pause(500);

            const hasStartupSection = await wdio.execute(() => {
                return !!document.querySelector('[data-testid="options-startup"]');
            });
            expect(hasStartupSection).toBe(true);
        });

        it('shows two toggles in Startup section', async () => {
            await wdio.execute(() => {
                (window as any).electronAPI.openOptions('settings');
            });

            await wdio.waitUntil(
                async () => {
                    const handles = await wdio.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000, timeoutMsg: 'Options window did not appear', interval: 250 }
            );

            const handles = await wdio.getWindowHandles();
            optionsWindowHandle = handles.find((h) => h !== mainWindowHandle) || null;
            if (optionsWindowHandle) {
                await wdio.switchToWindow(optionsWindowHandle);
            }

            await wdio.pause(500);

            const toggleCount = await wdio.execute(() => {
                const section = document.querySelector('[data-testid="options-startup"]');
                if (!section) {
                    return 0;
                }
                return section.querySelectorAll('[role="switch"]').length;
            });
            expect(toggleCount).toBe(2);
        });

        it('disables Start Minimized toggle when Launch at Startup is OFF', async () => {
            await wdio.execute(() => {
                (window as any).electronAPI.setLaunchAtStartup(false);
            });
            await wdio.pause(250);

            await wdio.execute(() => {
                (window as any).electronAPI.openOptions('settings');
            });

            await wdio.waitUntil(
                async () => {
                    const handles = await wdio.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000, timeoutMsg: 'Options window did not appear', interval: 250 }
            );

            const handles = await wdio.getWindowHandles();
            optionsWindowHandle = handles.find((h) => h !== mainWindowHandle) || null;
            if (optionsWindowHandle) {
                await wdio.switchToWindow(optionsWindowHandle);
            }

            await wdio.pause(500);

            const startMinDisabled = await wdio.execute(() => {
                const toggle = document.querySelector('[data-testid="start-minimized-toggle-switch"]');
                const ariaDisabled = toggle?.getAttribute('aria-disabled');
                const disabled = toggle?.getAttribute('disabled');
                return ariaDisabled === 'true' || disabled !== null;
            });
            expect(startMinDisabled).toBe(true);
        });
    });

    describe('Persistence Across Options Reopen', () => {
        async function openOptionsWindow(): Promise<string> {
            await wdio.execute(() => {
                (window as any).electronAPI.openOptions('settings');
            });

            await wdio.waitUntil(
                async () => {
                    const handles = await wdio.getWindowHandles();
                    return handles.length === 2;
                },
                { timeout: 5000, timeoutMsg: 'Options window did not appear', interval: 250 }
            );

            const handles = await wdio.getWindowHandles();
            const optionsHandle = handles.find((h) => h !== mainWindowHandle);
            if (!optionsHandle) {
                throw new Error('Options window handle not found');
            }

            await wdio.switchToWindow(optionsHandle);
            await wdio.pause(350);
            return optionsHandle;
        }

        async function closeOptionsWindows(): Promise<void> {
            await wdio.electron.execute((electron) => {
                const BrowserWindow = electron.BrowserWindow;
                const appContext = (
                    global as { appContext?: { windowManager?: { getMainWindow: () => Electron.BrowserWindow } } }
                ).appContext;
                const mainWin = appContext?.windowManager?.getMainWindow();
                BrowserWindow.getAllWindows().forEach((win) => {
                    if (win !== mainWin && !win.isDestroyed()) {
                        win.close();
                    }
                });
            });

            await wdio.pause(300);
            await wdio.switchToWindow(mainWindowHandle);
        }

        afterEach(async () => {
            await closeOptionsWindows();
            await wdio.execute(() => {
                (window as any).electronAPI.setStartMinimized(false);
                (window as any).electronAPI.setLaunchAtStartup(false);
            });
            await wdio.pause(250);
        });

        it('persists launch-at-startup state across Options close/reopen', async () => {
            await wdio.execute(() => {
                (window as any).electronAPI.setLaunchAtStartup(true);
            });
            await wdio.pause(250);

            await openOptionsWindow();
            await closeOptionsWindows();

            const persistedValue = await wdio.execute(async () => {
                return await (window as any).electronAPI.getLaunchAtStartup();
            });
            expect(persistedValue).toBe(true);
        });

        it('persists start-minimized state across Options close/reopen', async () => {
            await wdio.execute(() => {
                (window as any).electronAPI.setLaunchAtStartup(true);
                (window as any).electronAPI.setStartMinimized(true);
            });
            await wdio.pause(250);

            await openOptionsWindow();
            await closeOptionsWindows();

            const persistedValue = await wdio.execute(async () => {
                return await (window as any).electronAPI.getStartMinimized();
            });
            expect(persistedValue).toBe(true);
        });
    });

    describe('Settings File Persistence', () => {
        afterEach(async () => {
            await wdio.execute(() => {
                (window as any).electronAPI.setStartMinimized(false);
                (window as any).electronAPI.setLaunchAtStartup(false);
            });
            await wdio.pause(250);
        });

        it('writes launchAtStartup to user-preferences.json', async () => {
            await wdio.execute(() => {
                (window as any).electronAPI.setLaunchAtStartup(true);
            });
            await wdio.pause(1000);

            const settingsPath = path.join(userDataPath, 'user-preferences.json');
            expect(fs.existsSync(settingsPath)).toBe(true);

            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
            expect(settings).toHaveProperty('launchAtStartup', true);
        });

        it('writes startMinimized to user-preferences.json', async () => {
            await wdio.execute(() => {
                (window as any).electronAPI.setLaunchAtStartup(true);
                (window as any).electronAPI.setStartMinimized(true);
            });
            await wdio.pause(1000);

            const settingsPath = path.join(userDataPath, 'user-preferences.json');
            expect(fs.existsSync(settingsPath)).toBe(true);

            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
            expect(settings).toHaveProperty('startMinimized', true);
        });
    });
});

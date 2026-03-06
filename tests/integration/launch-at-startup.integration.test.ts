import { browser, expect } from '@wdio/globals';

interface WdioBrowserCompat {
    waitUntil: (
        condition: () => Promise<boolean>,
        options: { timeout: number; timeoutMsg: string; interval: number }
    ) => Promise<void>;
    execute: <T>(fn: (...args: any[]) => T, ...args: any[]) => Promise<T>;
    getWindowHandles: () => Promise<string[]>;
    pause: (ms: number) => Promise<void>;
    switchToWindow: (handle: string) => Promise<void>;
    electron: {
        execute: <T>(fn: () => T) => Promise<T>;
    };
}

const wdio = browser as unknown as WdioBrowserCompat;

describe('Launch at Startup IPC Integration', () => {
    let mainWindowHandle: string;

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
            await wdio.electron.execute(() => {
                const { BrowserWindow } = require('electron');
                const mainWin = (global as { appContext?: any }).appContext.windowManager.getMainWindow();
                BrowserWindow.getAllWindows().forEach((win: any) => {
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
    });
});

import { browser, expect } from '@wdio/globals';

type WdioBrowser = typeof browser & {
    execute: <T, A extends unknown[]>(fn: (...args: A) => T, ...args: A) => Promise<T>;
    pause: (ms: number) => Promise<void>;
    getWindowHandles: () => Promise<string[]>;
    waitUntil: <T>(condition: () => Promise<T> | T, options?: { timeout?: number; timeoutMsg?: string }) => Promise<T>;
    switchToWindow: (handle: string) => Promise<void>;
    closeWindow: () => Promise<void>;
    electron: {
        execute: <T>(fn: (electron: typeof import('electron')) => T) => Promise<T>;
    };
};

const wdio = browser as unknown as WdioBrowser;

interface LoginItemSettingsSnapshot {
    openAtLogin: boolean;
    platform: NodeJS.Platform;
}

describe('Release Build: Startup Settings API', () => {
    it('exposes startup APIs in release build', async () => {
        const apis = await wdio.execute(() => ({
            getLaunchAtStartup: typeof (window as any).electronAPI?.getLaunchAtStartup === 'function',
            setLaunchAtStartup: typeof (window as any).electronAPI?.setLaunchAtStartup === 'function',
            getStartMinimized: typeof (window as any).electronAPI?.getStartMinimized === 'function',
            setStartMinimized: typeof (window as any).electronAPI?.setStartMinimized === 'function',
        }));

        expect(apis.getLaunchAtStartup).toBe(true);
        expect(apis.setLaunchAtStartup).toBe(true);
        expect(apis.getStartMinimized).toBe(true);
        expect(apis.setStartMinimized).toBe(true);
    });

    it('round-trips launchAtStartup in packaged app', async () => {
        const initial = await wdio.execute(async () => {
            return await (window as any).electronAPI.getLaunchAtStartup();
        });

        const next = !initial;
        await wdio.execute(async (value: boolean) => {
            (window as any).electronAPI.setLaunchAtStartup(value);
        }, next);
        await wdio.pause(350);

        const after = await wdio.execute(async () => {
            return await (window as any).electronAPI.getLaunchAtStartup();
        });
        expect(after).toBe(next);

        await wdio.execute(async (value: boolean) => {
            (window as any).electronAPI.setLaunchAtStartup(value);
        }, initial);
    });

    it('round-trips startMinimized in packaged app', async () => {
        await wdio.execute(() => {
            (window as any).electronAPI.setLaunchAtStartup(true);
        });
        await wdio.pause(200);

        const initial = await wdio.execute(async () => {
            return await (window as any).electronAPI.getStartMinimized();
        });

        const next = !initial;
        await wdio.execute(async (value: boolean) => {
            (window as any).electronAPI.setStartMinimized(value);
        }, next);
        await wdio.pause(350);

        const after = await wdio.execute(async () => {
            return await (window as any).electronAPI.getStartMinimized();
        });
        expect(after).toBe(next);

        await wdio.execute(() => {
            (window as any).electronAPI.setStartMinimized(false);
            (window as any).electronAPI.setLaunchAtStartup(false);
        });
    });
});

describe('Release Build: Startup OS Settings Surface', () => {
    afterEach(async () => {
        await wdio.execute(() => {
            (window as any).electronAPI.setStartMinimized(false);
            (window as any).electronAPI.setLaunchAtStartup(false);
        });
        await wdio.pause(300);
    });

    it('reports login item state after enabling launch at startup', async () => {
        await wdio.execute(() => {
            (window as any).electronAPI.setLaunchAtStartup(true);
        });
        await wdio.pause(400);

        const loginSettings = await wdio.electron.execute((electron): LoginItemSettingsSnapshot => {
            const settings = electron.app.getLoginItemSettings();
            return {
                openAtLogin: settings.openAtLogin,
                platform: process.platform,
            };
        });

        if (loginSettings.platform === 'linux') {
            expect(typeof loginSettings.openAtLogin).toBe('boolean');
            return;
        }

        expect(loginSettings.openAtLogin).toBe(true);
    });

    it('normal launch does not include --hidden flag', async () => {
        const hasHidden = await wdio.electron.execute(() => {
            return process.argv.includes('--hidden');
        });
        expect(hasHidden).toBe(false);
    });

    it('main window is visible for normal launch path', async () => {
        const visible = await wdio.electron.execute((electron) => {
            const windows = electron.BrowserWindow.getAllWindows();
            const mainWindow = windows.find((w) => !w.isDestroyed());
            return mainWindow ? mainWindow.isVisible() : false;
        });

        expect(visible).toBe(true);
    });

    it('renders Startup section in release Options window', async () => {
        const mainHandle = (await wdio.getWindowHandles())[0];

        await wdio.execute(() => {
            (window as any).electronAPI.openOptions('settings');
        });

        await wdio.waitUntil(
            async () => {
                const handles = await wdio.getWindowHandles();
                return handles.length === 2;
            },
            {
                timeout: 5000,
                timeoutMsg: 'Options window did not open in release build',
            }
        );

        const handles = await wdio.getWindowHandles();
        const optionsHandle = handles.find((h: string) => h !== mainHandle);
        if (optionsHandle) {
            await wdio.switchToWindow(optionsHandle);
        }

        await wdio.pause(400);

        const hasStartupSection = await wdio.execute(() => {
            return !!document.querySelector('[data-testid="options-startup"]');
        });
        expect(hasStartupSection).toBe(true);

        const toggleCount = await wdio.execute(() => {
            const section = document.querySelector('[data-testid="options-startup"]');
            if (!section) {
                return 0;
            }
            return section.querySelectorAll('[role="switch"]').length;
        });
        expect(toggleCount).toBe(2);

        await wdio.closeWindow();
        await wdio.switchToWindow(mainHandle);
    });
});

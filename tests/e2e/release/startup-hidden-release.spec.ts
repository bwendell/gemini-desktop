import { browser, expect } from '@wdio/globals';

type WdioBrowser = typeof browser & {
    execute: <T, A extends unknown[]>(fn: (...args: A) => T, ...args: A) => Promise<T>;
    getWindowHandles: () => Promise<string[]>;
    switchToWindow: (handle: string) => Promise<void>;
    closeWindow: () => Promise<void>;
    pause: (ms: number) => Promise<void>;
    waitUntil: <T>(condition: () => Promise<T> | T, options?: { timeout?: number; timeoutMsg?: string }) => Promise<T>;
    electron: {
        execute: <T>(fn: (electron: typeof import('electron')) => T) => Promise<T>;
    };
};

interface HiddenLaunchSnapshot {
    hasHiddenArg: boolean;
    mainWindowVisible: boolean;
    trayExists: boolean;
}

interface StartupToggleSnapshot {
    launchAtStartupEnabled: boolean;
    startMinimizedEnabled: boolean;
}

const wdio = browser as unknown as WdioBrowser;

describe('Release Build: Hidden Startup Path', () => {
    before(async function () {
        const hasHiddenArg = await wdio.electron.execute(() => process.argv.includes('--hidden'));
        if (!hasHiddenArg) {
            this.skip();
        }
    });

    afterEach(async () => {
        try {
            await wdio.execute(() => {
                const api = (window as unknown as { electronAPI?: Record<string, unknown> }).electronAPI;
                const setStartMinimized = api?.setStartMinimized;
                const setLaunchAtStartup = api?.setLaunchAtStartup;

                if (typeof setStartMinimized === 'function') {
                    setStartMinimized(false);
                }
                if (typeof setLaunchAtStartup === 'function') {
                    setLaunchAtStartup(false);
                }
            });
        } catch {
            return;
        }
    });

    it('starts hidden, keeps tray available, restores from tray, and reflects enabled startup settings', async () => {
        const hiddenLaunch = await wdio.electron.execute((electron): HiddenLaunchSnapshot => {
            const windows = electron.BrowserWindow.getAllWindows();
            const mainWindow = windows.find((win) => !win.isDestroyed()) ?? null;
            const appContext = (
                global as typeof globalThis & {
                    appContext?: { trayManager?: { getTray?: () => Electron.Tray | null } };
                }
            ).appContext;
            const tray = appContext?.trayManager?.getTray?.() ?? null;

            return {
                hasHiddenArg: process.argv.includes('--hidden'),
                mainWindowVisible: mainWindow ? mainWindow.isVisible() : false,
                trayExists: !!tray && !tray.isDestroyed(),
            };
        });

        expect(hiddenLaunch.hasHiddenArg).toBe(true);
        expect(hiddenLaunch.mainWindowVisible).toBe(false);
        expect(hiddenLaunch.trayExists).toBe(true);

        await wdio.electron.execute((electron) => {
            const appContext = (
                global as typeof globalThis & {
                    appContext?: { trayManager?: { executeTrayAction?: (action: 'click' | 'show' | 'quit') => void } };
                }
            ).appContext;
            appContext?.trayManager?.executeTrayAction?.('show');
            return electron.BrowserWindow.getAllWindows().length;
        });

        await wdio.waitUntil(
            async () => {
                return await wdio.electron.execute((electron) => {
                    const windows = electron.BrowserWindow.getAllWindows();
                    const mainWindow = windows.find((win) => !win.isDestroyed());
                    return mainWindow ? mainWindow.isVisible() : false;
                });
            },
            {
                timeout: 5000,
                timeoutMsg: 'Main window did not become visible after tray restore',
            }
        );

        await wdio.execute(() => {
            const api = (
                window as unknown as {
                    electronAPI?: {
                        setLaunchAtStartup?: (enabled: boolean) => void;
                        setStartMinimized?: (enabled: boolean) => void;
                        openOptions?: (tab?: 'settings' | 'about') => void;
                    };
                }
            ).electronAPI;

            api?.setLaunchAtStartup?.(true);
            api?.setStartMinimized?.(true);
            api?.openOptions?.('settings');
        });

        await wdio.waitUntil(
            async () => {
                const handles = await wdio.getWindowHandles();
                return handles.length === 2;
            },
            {
                timeout: 5000,
                timeoutMsg: 'Options window did not open from hidden startup flow',
            }
        );

        const handles = await wdio.getWindowHandles();
        const mainHandle = handles[0];
        const optionsHandle = handles.find((handle) => handle !== mainHandle);
        if (!optionsHandle) {
            throw new Error('Expected options window handle for startup toggle verification');
        }

        await wdio.switchToWindow(optionsHandle);
        await wdio.pause(350);

        const startupToggleState = await wdio.execute((): StartupToggleSnapshot => {
            const launchToggle = document.querySelector('[data-testid="launch-at-startup-toggle-switch"]');
            const startMinimizedToggle = document.querySelector('[data-testid="start-minimized-toggle-switch"]');

            return {
                launchAtStartupEnabled: launchToggle?.getAttribute('aria-checked') === 'true',
                startMinimizedEnabled: startMinimizedToggle?.getAttribute('aria-checked') === 'true',
            };
        });

        expect(startupToggleState.launchAtStartupEnabled).toBe(true);
        expect(startupToggleState.startMinimizedEnabled).toBe(true);

        await wdio.closeWindow();
        await wdio.switchToWindow(mainHandle);
    });
});

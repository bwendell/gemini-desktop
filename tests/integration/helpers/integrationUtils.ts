import { browser } from '@wdio/globals';

import { waitForElectronState, waitForRendererState, waitForWindowCount } from './waitAdapters';

type ElectronExecute = {
    execute<R>(fn: (electron: typeof import('electron')) => R): Promise<R>;
    execute<R, A>(fn: (electron: typeof import('electron'), arg: A) => R, arg: A): Promise<R>;
    execute<R, T extends unknown[]>(fn: (...args: T) => R, ...args: T): Promise<R>;
};

type IntegrationBrowser = {
    execute<T>(script: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T>;
    waitUntil<T>(
        condition: () => Promise<T> | T,
        options?: { timeout?: number; timeoutMsg?: string; interval?: number }
    ): Promise<T>;
    getWindowHandles(): Promise<string[]>;
    switchToWindow(handle: string): Promise<void>;
    electron: ElectronExecute;
};

const integrationBrowser = browser as unknown as IntegrationBrowser;

type WindowWithElectronAPI = Window & {
    electronAPI?: Record<string, unknown>;
};

type GlobalWithAppContext = typeof globalThis & {
    appContext?: {
        windowManager?: {
            getMainWindow?: () => {
                isDestroyed: () => boolean;
                webContents: { send: (channel: string, ...args: unknown[]) => void };
            } | null;
            getQuickChatWindow?: () => { isDestroyed: () => boolean; isVisible: () => boolean } | null;
            createMainWindow?: () => void;
            restoreFromTray?: () => void;
            showQuickChat?: () => void;
            hideQuickChat?: () => void;
        };
    };
};

export async function waitForElectronAPI(timeout = 30000): Promise<void> {
    await waitForRendererState(
        async () => {
            try {
                return await integrationBrowser.execute(() => {
                    return typeof (window as WindowWithElectronAPI).electronAPI !== 'undefined';
                });
            } catch {
                return false;
            }
        },
        { timeout, timeoutMsg: `electronAPI not available after ${timeout}ms`, interval: 500 }
    );
}

export async function waitForAppReady(timeout = 30000): Promise<void> {
    await waitForRendererState(async () => (await integrationBrowser.getWindowHandles()).length > 0, {
        timeout,
        timeoutMsg: `App window did not appear after ${timeout}ms`,
    });

    await integrationBrowser.execute(async () => {
        await new Promise<void>((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
                return;
            }
            window.addEventListener('load', () => resolve(), { once: true });
        });
    });
}

export async function waitForApp(options: { waitForAPI?: boolean; timeout?: number } = {}): Promise<void> {
    const { waitForAPI = true, timeout = 30000 } = options;

    await waitForAppReady(timeout);
    if (waitForAPI) {
        await waitForElectronAPI(timeout);
    }
}

export async function getMainWindowHandle(): Promise<string> {
    const handles = await integrationBrowser.getWindowHandles();
    const mainWindowHandle = handles[0];

    if (!mainWindowHandle) {
        throw new Error('Could not resolve main window handle');
    }

    return mainWindowHandle;
}

export async function getSecondaryWindowHandle(mainWindowHandle: string): Promise<string | null> {
    const handles = await integrationBrowser.getWindowHandles();
    return handles.find((handle) => handle !== mainWindowHandle) ?? null;
}

export async function sendToMainWindow(channel: string, ...args: unknown[]): Promise<void> {
    await integrationBrowser.electron.execute(
        (ch: string, payload: unknown[]) => {
            const globalWithApp = global as GlobalWithAppContext;
            const mainWindow = globalWithApp.appContext?.windowManager?.getMainWindow?.();

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send(ch, ...payload);
            }
        },
        channel,
        args
    );
}

export async function closeExtraWindows(
    options: { force?: boolean; timeout?: number; interval?: number } = {}
): Promise<void> {
    const { force = false, timeout = 5000, interval = 100 } = options;

    const closeWithMethod = async (method: 'close' | 'destroy') => {
        await integrationBrowser.electron.execute((electron: typeof import('electron'), m: 'close' | 'destroy') => {
            const { BrowserWindow } = electron;
            const globalWithApp = global as GlobalWithAppContext;
            const mainWindow = globalWithApp.appContext?.windowManager?.getMainWindow?.();

            BrowserWindow.getAllWindows().forEach((win) => {
                if (win !== mainWindow && !win.isDestroyed()) {
                    if (m === 'destroy') {
                        win.destroy();
                    } else {
                        win.close();
                    }
                }
            });
        }, method);
    };

    await closeWithMethod('close');
    try {
        await waitForRendererState(async () => (await integrationBrowser.getWindowHandles()).length <= 1, {
            timeout,
            interval,
            timeoutMsg: 'Extra windows did not close in time',
        });
        return;
    } catch (error) {
        if (!force) {
            throw error;
        }
    }

    await closeWithMethod('destroy');
    await waitForRendererState(async () => (await integrationBrowser.getWindowHandles()).length <= 1, {
        timeout,
        interval,
        timeoutMsg: 'Extra windows remained after force cleanup',
    });
}

export async function openOptionsWindow(mainWindowHandle: string, tab = 'settings'): Promise<string> {
    const beforeHandles = new Set(await integrationBrowser.getWindowHandles());

    await integrationBrowser.execute((tabName) => {
        const win = window as WindowWithElectronAPI;
        const maybeOpenOptions = win.electronAPI?.openOptions;

        if (typeof maybeOpenOptions === 'function' && typeof tabName === 'string') {
            (maybeOpenOptions as (value: string) => void)(tabName);
        }
    }, tab);

    await waitForRendererState(
        async () => {
            const handles = await integrationBrowser.getWindowHandles();
            const hasSecondaryWindow = handles.some((handle) => handle !== mainWindowHandle);
            const hasNewWindow = handles.some((handle) => !beforeHandles.has(handle));
            return hasSecondaryWindow || hasNewWindow;
        },
        { timeout: 5000, timeoutMsg: 'Options window did not open' }
    );

    const handles = await integrationBrowser.getWindowHandles();
    const optionsHandle =
        handles.find((handle) => handle !== mainWindowHandle && !beforeHandles.has(handle)) ??
        handles.find((handle) => handle !== mainWindowHandle);

    if (!optionsHandle) {
        throw new Error('Could not find Options window handle');
    }

    return optionsHandle;
}

export async function switchToMainWindow(mainWindowHandle: string): Promise<void> {
    await integrationBrowser.switchToWindow(mainWindowHandle);
}

type IPCMode = 'last' | 'all';

export async function setupIPCListener(
    channel: string,
    options: { mode?: IPCMode } = {}
): Promise<{ get: () => Promise<unknown>; cleanup: () => Promise<void> }> {
    const { mode = 'last' } = options;
    const uniqueId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const valueName = `__ipc_${channel}_${uniqueId}_value`;
    const cleanupName = `__ipc_${channel}_${uniqueId}_cleanup`;

    await integrationBrowser.execute(
        (ch, valueKey, cleanupKey, listenerMode) => {
            if (
                typeof ch !== 'string' ||
                typeof valueKey !== 'string' ||
                typeof cleanupKey !== 'string' ||
                (listenerMode !== 'last' && listenerMode !== 'all')
            ) {
                throw new Error('Invalid IPC listener setup arguments');
            }

            const win = window as unknown as WindowWithElectronAPI;
            const storage = win as unknown as Record<string, unknown>;
            const api = win.electronAPI;
            const candidate = api?.[ch];

            if (typeof candidate !== 'function') {
                throw new Error(`electronAPI.${ch} is not a function`);
            }

            storage[valueKey] = listenerMode === 'all' ? [] : null;

            const unsubscribe = (candidate as (cb: (payload: unknown) => void) => unknown)((payload: unknown) => {
                if (listenerMode === 'all') {
                    const existing = storage[valueKey];
                    if (Array.isArray(existing)) {
                        existing.push(payload);
                    }
                    return;
                }
                storage[valueKey] = payload;
            });

            storage[cleanupKey] = unsubscribe;
        },
        channel,
        valueName,
        cleanupName,
        mode
    );

    return {
        get: async () => {
            return integrationBrowser.execute((valueKey) => {
                if (typeof valueKey !== 'string') {
                    throw new Error('Invalid value key');
                }

                const storage = window as unknown as Record<string, unknown>;
                return storage[valueKey];
            }, valueName);
        },
        cleanup: async () => {
            await integrationBrowser.execute(
                (valueKey, cleanupKey) => {
                    if (typeof valueKey !== 'string' || typeof cleanupKey !== 'string') {
                        throw new Error('Invalid cleanup keys');
                    }

                    const storage = window as unknown as Record<string, unknown>;
                    const maybeCleanup = storage[cleanupKey];
                    if (typeof maybeCleanup === 'function') {
                        (maybeCleanup as () => void)();
                    }

                    delete storage[valueKey];
                    delete storage[cleanupKey];
                },
                valueName,
                cleanupName
            );
        },
    };
}

export async function waitForIPCValue<T>(
    getter: () => Promise<T>,
    predicate: (value: T) => boolean,
    timeout = 5000
): Promise<T> {
    let lastValue: T | undefined;

    await integrationBrowser.waitUntil(
        async () => {
            lastValue = await getter();
            return predicate(lastValue);
        },
        {
            timeout,
            timeoutMsg: `IPC value did not meet predicate within ${timeout}ms`,
            interval: 100,
        }
    );

    if (typeof lastValue === 'undefined') {
        throw new Error('IPC getter did not return a value');
    }

    return lastValue;
}

export async function waitForMainProcess(
    condition: () => boolean | Promise<boolean>,
    options: { timeout?: number; timeoutMsg?: string } = {}
): Promise<void> {
    const { timeout = 5000, timeoutMsg = 'Main process condition not met' } = options;

    await waitForElectronState(condition, { timeout, timeoutMsg });
}

export async function waitForSecondaryWindow(mainWindowHandle: string, timeout = 5000): Promise<string> {
    await waitForRendererState(
        async () => {
            const secondary = await getSecondaryWindowHandle(mainWindowHandle);
            return Boolean(secondary);
        },
        { timeout, timeoutMsg: 'Secondary window did not appear' }
    );

    const secondary = await getSecondaryWindowHandle(mainWindowHandle);
    if (!secondary) {
        throw new Error('Could not resolve secondary window handle');
    }

    return secondary;
}

export async function waitForSingleWindow(timeout = 5000): Promise<void> {
    await waitForWindowCount(1, { timeout, timeoutMsg: 'Expected only one window handle' });
}

export async function callElectronAPI<T>(method: string, ...args: unknown[]): Promise<T> {
    return integrationBrowser.execute(
        (apiMethod, methodArgs) => {
            if (typeof apiMethod !== 'string' || !Array.isArray(methodArgs)) {
                throw new Error('Invalid electronAPI call arguments');
            }

            const win = window as WindowWithElectronAPI;
            const api = win.electronAPI;
            const candidate = api?.[apiMethod];
            if (typeof candidate !== 'function') {
                throw new Error(`electronAPI.${apiMethod} is not a function`);
            }

            return (candidate as (...innerArgs: unknown[]) => unknown)(...methodArgs);
        },
        method,
        args
    ) as Promise<T>;
}

export async function hasElectronAPI(method: string): Promise<boolean> {
    return integrationBrowser.execute((apiMethod) => {
        if (typeof apiMethod !== 'string') {
            return false;
        }

        const win = window as WindowWithElectronAPI;
        return typeof win.electronAPI?.[apiMethod] === 'function';
    }, method);
}

export async function getElectronAPIValue<T = unknown>(property: string): Promise<T> {
    return integrationBrowser.execute((apiProperty) => {
        if (typeof apiProperty !== 'string') {
            throw new Error('Invalid electronAPI property');
        }

        const win = window as WindowWithElectronAPI;
        return win.electronAPI?.[apiProperty as keyof NonNullable<WindowWithElectronAPI['electronAPI']>];
    }, property) as Promise<T>;
}

export async function getMainProcessPlatform(): Promise<NodeJS.Platform> {
    return integrationBrowser.electron.execute(() => process.platform as NodeJS.Platform);
}

export async function executeWithElectron<T>(fn: (electron: typeof import('electron')) => T): Promise<T> {
    return integrationBrowser.electron.execute(fn);
}

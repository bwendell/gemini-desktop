import { browser } from '@wdio/globals';

import { E2E_TIMING, waitForUIState } from '../../shared';

type ElectronExecute = {
    execute<R>(fn: (electron: typeof import('electron')) => R): Promise<R>;
    execute<R, T extends unknown[]>(fn: (...args: T) => R, ...args: T): Promise<R>;
};

type IntegrationBrowser = {
    execute<T>(script: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T>;
    waitUntil<T>(
        condition: () => Promise<T> | T,
        options?: { timeout?: number; timeoutMsg?: string; interval?: number }
    ): Promise<T>;
    electron: ElectronExecute;
};

const integrationBrowser = browser as unknown as IntegrationBrowser;

export async function waitForStoreValue(key: string, expected: unknown, timeout: number): Promise<void> {
    await integrationBrowser.waitUntil(
        async () => {
            const actual = await integrationBrowser.electron.execute((storeKey: string) => {
                return (global as any).appContext.ipcManager.store.get(storeKey);
            }, key);
            return actual === expected;
        },
        {
            timeout,
            timeoutMsg: `Store value for "${key}" did not become ${String(expected)} within ${timeout}ms`,
            interval: E2E_TIMING.POLLING.IPC,
        }
    );
}

export async function waitForZoomLevel(expected: number, timeout: number): Promise<void> {
    await integrationBrowser.waitUntil(
        async () => {
            const managerZoom = await integrationBrowser.electron.execute(() => {
                return (global as any).appContext.windowManager.getZoomLevel();
            });
            return managerZoom === expected;
        },
        {
            timeout,
            timeoutMsg: `Zoom level did not stabilize at ${expected}% within ${timeout}ms`,
            interval: E2E_TIMING.POLLING.IPC,
        }
    );
}

export async function waitForZoomUIUpdate(timeout: number): Promise<void> {
    const didUpdate = await waitForUIState(
        async () => {
            const uiZoom = await integrationBrowser.execute(() => {
                return (window as any).electronAPI?.getZoomLevel?.() ?? null;
            });

            return typeof uiZoom === 'number';
        },
        {
            timeout,
            interval: E2E_TIMING.POLLING.UI_STATE,
            description: 'zoom UI update',
        }
    );

    if (!didUpdate) {
        throw new Error(`Zoom UI did not synchronize with store within ${timeout}ms`);
    }
}

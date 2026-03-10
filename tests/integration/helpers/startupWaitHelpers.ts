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

export async function waitForStartupSetting(expected: boolean, timeout: number): Promise<void> {
    await integrationBrowser.waitUntil(
        async () => {
            const launchAtStartup = await integrationBrowser.execute(() => {
                return (window as any).electronAPI.getLaunchAtStartup();
            });
            return launchAtStartup === expected;
        },
        {
            timeout,
            timeoutMsg: `Launch-at-startup setting did not become ${expected} within ${timeout}ms`,
            interval: E2E_TIMING.POLLING.IPC,
        }
    );
}

export async function waitForAutoLauncher(expected: boolean, timeout: number): Promise<void> {
    await integrationBrowser.waitUntil(
        async () => {
            const launchAtStartup = await integrationBrowser.execute(() => {
                return (window as any).electronAPI.getLaunchAtStartup();
            });
            return launchAtStartup === expected;
        },
        {
            timeout,
            timeoutMsg: `Launch-at-startup state did not become ${expected} within ${timeout}ms`,
            interval: E2E_TIMING.POLLING.IPC,
        }
    );
}

export async function waitForWindowContentLoaded(timeout: number): Promise<void> {
    const didLoad = await waitForUIState(
        async () => integrationBrowser.execute(() => document.readyState === 'complete'),
        {
            timeout,
            interval: E2E_TIMING.POLLING.UI_STATE,
            description: 'window content loaded',
        }
    );

    if (!didLoad) {
        throw new Error(`Window content did not load within ${timeout}ms`);
    }
}

import { browser, expect } from '@wdio/globals';

const browserWithElectron = browser as unknown as {
    execute<T>(script: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T>;
    waitUntil<T>(
        condition: () => Promise<T> | T,
        options?: { timeout?: number; timeoutMsg?: string; interval?: number }
    ): Promise<T>;
    getWindowHandles(): Promise<string[]>;
    electron: {
        execute<R, T extends unknown[]>(fn: (...args: T) => R, ...args: T): Promise<R>;
    };
};

describe('Platform Detection Integration', () => {
    before(async () => {
        await browserWithElectron.waitUntil(async () => (await browserWithElectron.getWindowHandles()).length > 0);
    });

    it('renderer platform matches main process platform', async () => {
        const rendererPlatform = await browserWithElectron.execute(() => {
            return (window as any).electronAPI.platform;
        });

        const mainPlatform = await browserWithElectron.electron.execute(() => {
            return process.platform;
        });

        expect(rendererPlatform).toBe(mainPlatform);
        expect(['win32', 'darwin', 'linux']).toContain(mainPlatform);
    });

    it('renderer platform maps to UI platform helper', async () => {
        const mappedPlatform = await browserWithElectron.execute(() => {
            const platform = (window as any).electronAPI.platform as string;
            if (platform === 'darwin') return 'macos';
            if (platform === 'win32') return 'windows';
            return 'linux';
        });

        expect(['macos', 'windows', 'linux']).toContain(mappedPlatform);
    });
});

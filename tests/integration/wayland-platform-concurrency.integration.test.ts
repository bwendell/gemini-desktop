import { browser, expect } from '@wdio/globals';

const browserWithElectron = browser as unknown as {
    execute<T>(script: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T>;
    waitUntil<T>(
        condition: () => Promise<T> | T,
        options?: { timeout?: number; timeoutMsg?: string; interval?: number }
    ): Promise<T>;
    getWindowHandles(): Promise<string[]>;
};

describe('Platform Hotkey Status IPC Concurrency', () => {
    before(async function () {
        await browserWithElectron.waitUntil(async () => (await browserWithElectron.getWindowHandles()).length > 0);

        if (process.platform !== 'linux') {
            console.log('[SKIP] Linux-only integration tests');
            this.skip();
        }
    });

    it('handles concurrent getPlatformHotkeyStatus IPC calls', async () => {
        const startTime = Date.now();

        const results = await Promise.all([
            browserWithElectron.execute(async () => {
                return (window as any).electronAPI.getPlatformHotkeyStatus();
            }),
            browserWithElectron.execute(async () => {
                return (window as any).electronAPI.getPlatformHotkeyStatus();
            }),
            browserWithElectron.execute(async () => {
                return (window as any).electronAPI.getPlatformHotkeyStatus();
            }),
        ]);

        const elapsed = Date.now() - startTime;

        expect(results).toHaveLength(3);
        for (const status of results) {
            expect(status).toBeDefined();
            expect(status).not.toBeNull();
            expect(typeof status.globalHotkeysEnabled).toBe('boolean');
            expect(status.waylandStatus).toBeDefined();
            expect(Array.isArray(status.registrationResults)).toBe(true);
        }

        expect(elapsed).toBeLessThan(5000);
    });
});

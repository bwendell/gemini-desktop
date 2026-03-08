import { browser, expect } from '@wdio/globals';

describe('Platform Hotkey Status IPC Concurrency', () => {
    before(async function () {
        await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);

        if (process.platform !== 'linux') {
            console.log('[SKIP] Linux-only integration tests');
            this.skip();
        }
    });

    it('handles concurrent getPlatformHotkeyStatus IPC calls', async () => {
        const startTime = Date.now();

        const results = await Promise.all([
            browser.execute(async () => {
                return (window as any).electronAPI.getPlatformHotkeyStatus();
            }),
            browser.execute(async () => {
                return (window as any).electronAPI.getPlatformHotkeyStatus();
            }),
            browser.execute(async () => {
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

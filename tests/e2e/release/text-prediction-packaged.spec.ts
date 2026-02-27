// @ts-nocheck
import { browser, expect } from '@wdio/globals';

describe('Release Build: Text Prediction', () => {
    it('should be running as a packaged app', async () => {
        const isPackaged = await browser.electron.execute((electron) => electron.app.isPackaged);
        expect(isPackaged).toBe(true);
    });

    it('should expose text prediction IPC API in packaged build', async () => {
        const hasApi = await browser.execute(() => {
            return typeof (window as any).electronAPI?.predictText === 'function';
        });
        expect(hasApi).toBe(true);
    });

    it('should return a prediction result without throwing', async () => {
        const result = await browser.execute(async () => {
            try {
                return await (window as any).electronAPI.predictText('Hello from release');
            } catch (error: any) {
                return { error: error?.message ?? String(error) };
            }
        });

        if (typeof result === 'string') {
            expect(result.length).toBeGreaterThan(0);
            return;
        }

        throw new Error(`Prediction failed: ${result?.error ?? 'unknown error'}`);
    });
});

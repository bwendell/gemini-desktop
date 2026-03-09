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

    it('should have V8 sandbox disabled on Linux when text prediction is configured', async () => {
        const platform = await browser.electron.execute(() => process.platform);
        if (platform !== 'linux') return;

        const hasJsFlags = await browser.electron.execute((electron) => {
            return electron.app.commandLine.hasSwitch('js-flags');
        });
        expect(hasJsFlags).toBe(true);
    });

    it('should not have V8 sandbox crash errors in LlmManager', async () => {
        const probeError = await browser.electron.execute(() => {
            const llmManager = (globalThis as any).llmManager;
            return llmManager?.getNativeProbeError?.() ?? null;
        });
        if (probeError) {
            expect(probeError).not.toContain('V8 Sandbox');
            expect(probeError).not.toContain('v8_ArrayBuffer_NewBackingStore');
            expect(probeError).not.toContain('sandbox address space');
        }
    });

    it('LlmManager should report status without V8 errors', async () => {
        const result = await browser.electron.execute(() => {
            const llmManager = (globalThis as any).llmManager;
            if (!llmManager) return { found: false };
            return {
                found: true,
                status: llmManager.getStatus?.() ?? null,
                error: llmManager.getErrorMessage?.() ?? null,
                probeError: llmManager.getNativeProbeError?.() ?? null,
            };
        });
        if (result.found && result.error) {
            expect(result.error).not.toContain('v8_ArrayBuffer');
        }
    });
});

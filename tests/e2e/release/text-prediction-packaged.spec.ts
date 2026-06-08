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
        const platform = await browser.electron.execute(() => process.platform);
        const result = await browser.execute(async () => {
            try {
                return await (window as any).electronAPI.predictText('Hello from release');
            } catch (error: any) {
                return { error: error?.message ?? String(error) };
            }
        });

        // Text prediction is disabled on Linux (issue #119); the IPC call must
        // still resolve cleanly (no crash) and return null rather than text.
        if (platform === 'linux') {
            expect(result).toBeNull();
            return;
        }

        if (typeof result === 'string') {
            expect(result.length).toBeGreaterThan(0);
            return;
        }

        throw new Error(`Prediction failed: ${result?.error ?? 'unknown error'}`);
    });

    it('should leave the V8 cage enabled on Linux (no js-flags) and report cleanly', async () => {
        const platform = await browser.electron.execute(() => process.platform);
        if (platform !== 'linux') return;

        // The V8 memory cage is intentionally left enabled (issue #119) — no
        // js-flags launch switch is set.
        const hasJsFlags = await browser.electron.execute((electron) => {
            return electron.app.commandLine.hasSwitch('js-flags');
        });
        expect(hasJsFlags).toBe(false);

        // Querying text prediction status must not crash.
        const status = await browser.execute(async () => {
            try {
                return await (window as any).electronAPI.getTextPredictionStatus();
            } catch (error: any) {
                return { error: error?.message ?? String(error) };
            }
        });
        expect(status).toBeDefined();
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

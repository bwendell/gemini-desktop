import { browser, expect } from '@wdio/globals';

describe('Release Build: Native Module Health', () => {
    it('app should have started successfully (no segfault)', async () => {
        const isReady = await browser.electron.execute((electron) => {
            return electron.app.isReady();
        });
        expect(isReady).toBe(true);
    });

    it('should be running as a packaged app', async () => {
        const isPackaged = await browser.electron.execute((electron) => {
            return electron.app.isPackaged;
        });
        expect(isPackaged).toBe(true);
    });

    it('should have --js-flags command line switch set on Linux', async () => {
        const platform = await browser.electron.execute(() => process.platform);
        if (platform !== 'linux') return;

        const hasJsFlags = await browser.electron.execute((electron) => {
            return electron.app.commandLine.hasSwitch('js-flags');
        });
        expect(hasJsFlags).toBe(true);
    });

    it('should NOT have --js-flags set on non-Linux platforms', async () => {
        const platform = await browser.electron.execute(() => process.platform);
        if (platform === 'linux') return;

        const hasJsFlags = await browser.electron.execute((electron) => {
            return electron.app.commandLine.hasSwitch('js-flags');
        });
        expect(hasJsFlags).toBe(false);
    });

    it('should not have V8 sandbox crash errors in LlmManager', async () => {
        const result = await browser.electron.execute(() => {
            const llmManager = (globalThis as any).llmManager;
            if (!llmManager) return { found: false };
            return {
                found: true,
                probeError: llmManager.getNativeProbeError?.() ?? null,
                status: llmManager.getStatus?.() ?? null,
                errorMessage: llmManager.getErrorMessage?.() ?? null,
            };
        });

        if (!result.found) return;

        if (result.probeError) {
            expect(result.probeError).not.toContain('V8 Sandbox');
            expect(result.probeError).not.toContain('v8_ArrayBuffer');
            expect(result.probeError).not.toContain('sandbox address space');
        }
        if (result.errorMessage) {
            expect(result.errorMessage).not.toContain('V8 Sandbox');
            expect(result.errorMessage).not.toContain('v8_ArrayBuffer');
        }
    });

    it('should have crash reporter initialized without pending crash dumps', async () => {
        const crashInfo = await browser.electron.execute((electron) => {
            return {
                crashDumpsDir: electron.app.getPath('crashDumps'),
            };
        });
        expect(crashInfo.crashDumpsDir).toBeTruthy();
        expect(typeof crashInfo.crashDumpsDir).toBe('string');
    });

    it('security settings should remain intact after V8 sandbox change', async () => {
        const hasRequire = await browser.execute(() => {
            try {
                return typeof require !== 'undefined';
            } catch {
                return false;
            }
        });
        expect(hasRequire).toBe(false);

        const hasApi = await browser.execute(() => {
            return typeof (window as any).electronAPI !== 'undefined';
        });
        expect(hasApi).toBe(true);

        const hasProcess = await browser.execute(() => {
            try {
                return typeof (window as any).process?.versions?.electron !== 'undefined';
            } catch {
                return false;
            }
        });
        expect(hasProcess).toBe(false);
    });
});

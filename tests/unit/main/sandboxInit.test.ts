/**
 * Unit tests for sandboxInit side-effect module.
 *
 * Tests that the sandbox initialization correctly sets the no-sandbox
 * command line switch when running on restricted Linux systems.
 *
 * NOTE: The V8 sandbox is no longer disabled via `--js-flags=--no-v8-sandbox`.
 * Instead, sandbox-incompatible native modules (dbus-next, node-llama-cpp) are
 * skipped on affected kernels — see dbusFallback.ts / llmManager.ts and
 * `isV8SandboxIncompatibleKernel` in sandboxDetector. These tests therefore
 * assert that `--no-v8-sandbox` is never appended.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the sandboxDetector module
vi.mock('../../../src/main/utils/sandboxDetector', () => ({
    shouldDisableSandbox: vi.fn(() => false),
}));

// Mock electron app
vi.mock('electron', () => ({
    app: {
        commandLine: {
            appendSwitch: vi.fn(),
        },
        getPath: vi.fn(() => '/mock/userData'),
    },
}));

describe('sandboxInit', () => {
    let originalPlatform: PropertyDescriptor | undefined;

    beforeEach(() => {
        originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
        vi.resetModules();
        vi.clearAllMocks();
    });

    afterEach(() => {
        if (originalPlatform) {
            Object.defineProperty(process, 'platform', originalPlatform);
        }
        vi.resetModules();
    });

    it('calls app.commandLine.appendSwitch("no-sandbox") when shouldDisableSandbox returns true', async () => {
        const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
        vi.mocked(shouldDisableSandbox).mockReturnValue(true);

        await import('../../../src/main/utils/sandboxInit');

        const { app } = await import('electron');
        expect(app.commandLine.appendSwitch).toHaveBeenCalledWith('no-sandbox');
        expect(app.commandLine.appendSwitch).toHaveBeenCalledTimes(1);
    });

    it('does NOT call appendSwitch when shouldDisableSandbox returns false', async () => {
        const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
        vi.mocked(shouldDisableSandbox).mockReturnValue(false);

        await import('../../../src/main/utils/sandboxInit');

        const { app } = await import('electron');
        expect(app.commandLine.appendSwitch).not.toHaveBeenCalled();
    });

    describe('does not disable the V8 sandbox', () => {
        it('never appends --no-v8-sandbox on Linux, even when the OS sandbox is disabled', async () => {
            Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            vi.mocked(shouldDisableSandbox).mockReturnValue(true);

            await import('../../../src/main/utils/sandboxInit');

            const { app } = await import('electron');
            expect(app.commandLine.appendSwitch).toHaveBeenCalledWith('no-sandbox');
            expect(app.commandLine.appendSwitch).not.toHaveBeenCalledWith('js-flags', '--no-v8-sandbox');
        });

        it('never appends --no-v8-sandbox on Linux when the --test-text-prediction flag is set', async () => {
            Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
            const originalArgv = process.argv;
            process.argv = [...originalArgv, '--test-text-prediction'];

            try {
                const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
                vi.mocked(shouldDisableSandbox).mockReturnValue(false);

                await import('../../../src/main/utils/sandboxInit');

                const { app } = await import('electron');
                expect(app.commandLine.appendSwitch).not.toHaveBeenCalledWith('js-flags', '--no-v8-sandbox');
            } finally {
                process.argv = originalArgv;
            }
        });
    });
});

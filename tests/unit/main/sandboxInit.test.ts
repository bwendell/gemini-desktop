/**
 * Unit tests for sandboxInit side-effect module.
 *
 * Tests that the sandbox initialization correctly sets the no-sandbox
 * command line switch when running on restricted Linux systems.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the sandboxDetector module
vi.mock('../../../src/main/utils/sandboxDetector', () => ({
    shouldDisableSandbox: vi.fn(),
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

vi.mock('fs', () => ({
    readFileSync: vi.fn(),
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
        // Setup: mock shouldDisableSandbox to return true
        const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
        vi.mocked(shouldDisableSandbox).mockReturnValue(true);

        // Import to trigger side effects
        await import('../../../src/main/utils/sandboxInit');

        // Verify
        const { app } = await import('electron');
        expect(app.commandLine.appendSwitch).toHaveBeenCalledWith('no-sandbox');
        expect(app.commandLine.appendSwitch).toHaveBeenCalledTimes(1);
    });

    it('does NOT call appendSwitch when shouldDisableSandbox returns false', async () => {
        // Setup: mock shouldDisableSandbox to return false
        const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
        vi.mocked(shouldDisableSandbox).mockReturnValue(false);

        // Import to trigger side effects
        await import('../../../src/main/utils/sandboxInit');

        // Verify
        const { app } = await import('electron');
        expect(app.commandLine.appendSwitch).not.toHaveBeenCalled();
    });

    describe('V8 sandbox mitigation (Linux text prediction)', () => {
        it('applies --no-v8-sandbox on Linux when --test-text-prediction flag is set', async () => {
            Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
            const originalArgv = process.argv;
            process.argv = [...originalArgv, '--test-text-prediction'];

            try {
                const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
                vi.mocked(shouldDisableSandbox).mockReturnValue(false);

                const { readFileSync } = await import('fs');
                vi.mocked(readFileSync).mockImplementation(() => {
                    const error = new Error('ENOENT') as NodeJS.ErrnoException;
                    error.code = 'ENOENT';
                    throw error;
                });

                await import('../../../src/main/utils/sandboxInit');

                const { app } = await import('electron');
                expect(app.commandLine.appendSwitch).toHaveBeenCalledWith('js-flags', '--no-v8-sandbox');
            } finally {
                process.argv = originalArgv;
            }
        });

        it('applies --no-v8-sandbox on Linux when textPredictionEnabled is true in settings', async () => {
            Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            vi.mocked(shouldDisableSandbox).mockReturnValue(false);

            const { readFileSync } = await import('fs');
            vi.mocked(readFileSync).mockReturnValue('{"textPredictionEnabled": true}');

            await import('../../../src/main/utils/sandboxInit');

            const { app } = await import('electron');
            expect(app.commandLine.appendSwitch).toHaveBeenCalledWith('js-flags', '--no-v8-sandbox');
        });

        it('does NOT apply --no-v8-sandbox on macOS even when textPredictionEnabled is true', async () => {
            Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            vi.mocked(shouldDisableSandbox).mockReturnValue(false);

            const { readFileSync } = await import('fs');
            vi.mocked(readFileSync).mockReturnValue('{"textPredictionEnabled": true}');

            await import('../../../src/main/utils/sandboxInit');

            const { app } = await import('electron');
            expect(app.commandLine.appendSwitch).not.toHaveBeenCalledWith('js-flags', '--no-v8-sandbox');
        });

        it('does NOT apply --no-v8-sandbox on Windows even when textPredictionEnabled is true', async () => {
            Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });
            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            vi.mocked(shouldDisableSandbox).mockReturnValue(false);

            const { readFileSync } = await import('fs');
            vi.mocked(readFileSync).mockReturnValue('{"textPredictionEnabled": true}');

            await import('../../../src/main/utils/sandboxInit');

            const { app } = await import('electron');
            expect(app.commandLine.appendSwitch).not.toHaveBeenCalledWith('js-flags', '--no-v8-sandbox');
        });

        it('does NOT apply --no-v8-sandbox when textPredictionEnabled is false', async () => {
            Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            vi.mocked(shouldDisableSandbox).mockReturnValue(false);

            const { readFileSync } = await import('fs');
            vi.mocked(readFileSync).mockReturnValue('{"textPredictionEnabled": false}');

            await import('../../../src/main/utils/sandboxInit');

            const { app } = await import('electron');
            expect(app.commandLine.appendSwitch).not.toHaveBeenCalledWith('js-flags', '--no-v8-sandbox');
        });

        it('does NOT apply --no-v8-sandbox when textPredictionEnabled is missing', async () => {
            Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            vi.mocked(shouldDisableSandbox).mockReturnValue(false);

            const { readFileSync } = await import('fs');
            vi.mocked(readFileSync).mockReturnValue('{"theme": "dark"}');

            await import('../../../src/main/utils/sandboxInit');

            const { app } = await import('electron');
            expect(app.commandLine.appendSwitch).not.toHaveBeenCalledWith('js-flags', '--no-v8-sandbox');
        });

        it('handles missing settings file gracefully (ENOENT)', async () => {
            Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            vi.mocked(shouldDisableSandbox).mockReturnValue(false);

            const { readFileSync } = await import('fs');
            vi.mocked(readFileSync).mockImplementation(() => {
                const error = new Error('ENOENT') as NodeJS.ErrnoException;
                error.code = 'ENOENT';
                throw error;
            });

            await import('../../../src/main/utils/sandboxInit');

            const { app } = await import('electron');
            expect(app.commandLine.appendSwitch).not.toHaveBeenCalledWith('js-flags', '--no-v8-sandbox');
        });

        it('handles corrupt settings file gracefully (invalid JSON)', async () => {
            Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            vi.mocked(shouldDisableSandbox).mockReturnValue(false);

            const { readFileSync } = await import('fs');
            vi.mocked(readFileSync).mockReturnValue('not-json');

            await import('../../../src/main/utils/sandboxInit');

            const { app } = await import('electron');
            expect(app.commandLine.appendSwitch).not.toHaveBeenCalledWith('js-flags', '--no-v8-sandbox');
        });

        it('handles permission error gracefully', async () => {
            Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            vi.mocked(shouldDisableSandbox).mockReturnValue(false);

            const { readFileSync } = await import('fs');
            vi.mocked(readFileSync).mockImplementation(() => {
                const error = new Error('EACCES') as NodeJS.ErrnoException;
                error.code = 'EACCES';
                throw error;
            });

            await import('../../../src/main/utils/sandboxInit');

            const { app } = await import('electron');
            expect(app.commandLine.appendSwitch).not.toHaveBeenCalledWith('js-flags', '--no-v8-sandbox');
        });

        it('applies BOTH Chromium sandbox and V8 sandbox flags when both conditions are met', async () => {
            Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            vi.mocked(shouldDisableSandbox).mockReturnValue(true);

            const { readFileSync } = await import('fs');
            vi.mocked(readFileSync).mockReturnValue('{"textPredictionEnabled": true}');

            await import('../../../src/main/utils/sandboxInit');

            const { app } = await import('electron');
            expect(app.commandLine.appendSwitch).toHaveBeenCalledWith('no-sandbox');
            expect(app.commandLine.appendSwitch).toHaveBeenCalledWith('js-flags', '--no-v8-sandbox');
        });
    });
});

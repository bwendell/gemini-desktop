/**
 * Unit tests for sandboxInit side-effect module.
 *
 * Tests that the sandbox initialization correctly sets the Chromium no-sandbox
 * command line switch when running on restricted Linux systems.
 *
 * NOTE: This module intentionally never touches the V8 sandbox / V8 memory
 * cage. That cage is compile-time and cannot be disabled at runtime, so the
 * old V8 js-flag mitigation has been removed (issue #119). The Linux startup
 * crash is mitigated by not loading the offending native modules (see
 * hotkeyManager/dbusFallback and llmManager), not by a launch flag.
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

    it('never appends a js-flags switch on Linux (V8 cage is not touched, issue #119)', async () => {
        Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });
        const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
        vi.mocked(shouldDisableSandbox).mockReturnValue(true);

        const { readFileSync } = await import('fs');
        // Even if settings.json says text prediction is enabled, no js-flags must be set.
        vi.mocked(readFileSync).mockReturnValue('{"textPredictionEnabled": true}');

        await import('../../../src/main/utils/sandboxInit');

        const { app } = await import('electron');
        const appendCalls = vi.mocked(app.commandLine.appendSwitch).mock.calls;
        // Chromium no-sandbox is still allowed; js-flags must never be appended.
        expect(appendCalls.some(([flag]) => flag === 'js-flags')).toBe(false);
        // settings.json must not even be read anymore.
        expect(readFileSync).not.toHaveBeenCalled();
    });
});

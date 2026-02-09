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
    },
}));

describe('sandboxInit', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    afterEach(() => {
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
});

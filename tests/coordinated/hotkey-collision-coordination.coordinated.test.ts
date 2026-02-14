import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', async () => {
    const mockModule = await import('../unit/main/test/electron-mock');
    return mockModule.default;
});

import { globalShortcut } from 'electron';
import HotkeyManager from '../../src/main/managers/hotkeyManager';
import WindowManager from '../../src/main/managers/windowManager';
import { DEFAULT_ACCELERATORS } from '../../src/shared/types/hotkeys';
import { platformAdapterPresets, useMockPlatformAdapter, resetPlatformAdapterForTests } from '../helpers/mocks';

vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/__mocks__/logger';

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

describe('Hotkey Collision and Coordination Integration', () => {
    let hotkeyManager: HotkeyManager;
    let windowManager: WindowManager;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((globalShortcut as any)._reset) (globalShortcut as any)._reset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests({ resetModules: true });
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(() => {
            useMockPlatformAdapter(adapterForPlatform[platform]());
            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager);
        });

        const expectsGlobalHotkeys = platform !== 'linux';

        describe('Registration Collision Handling', () => {
            it('should handle hotkey registration failure gracefully', () => {
                (globalShortcut.register as any).mockImplementation((accel: string) => {
                    if (accel.includes('Space')) return false;
                    return true;
                });

                hotkeyManager.registerShortcuts();

                if (expectsGlobalHotkeys) {
                    expect(mockLogger.error).toHaveBeenCalledWith(
                        expect.stringContaining('FAILED to register hotkey: quickChat')
                    );

                    expect(globalShortcut.register).toHaveBeenCalledTimes(2);

                    expect(hotkeyManager.isIndividualEnabled('quickChat')).toBe(true);

                    mockLogger.error.mockClear();
                    hotkeyManager.setIndividualEnabled('quickChat', true);

                    expect(globalShortcut.register).toHaveBeenCalledWith(
                        expect.stringContaining('Space'),
                        expect.any(Function)
                    );
                } else {
                    expect(globalShortcut.register).not.toHaveBeenCalled();
                    expect(mockLogger.error).not.toHaveBeenCalledWith(
                        expect.stringContaining('FAILED to register hotkey: quickChat')
                    );
                }
            });
        });

        describe('IPC and Store Coordination', () => {
            it('should synchronize hotkey state through IpcManager to Store', () => {
                hotkeyManager.registerShortcuts();

                hotkeyManager.setIndividualEnabled('bossKey', false);

                if (expectsGlobalHotkeys) {
                    expect(globalShortcut.unregister).toHaveBeenCalledWith(DEFAULT_ACCELERATORS.bossKey);
                } else {
                    expect(globalShortcut.unregister).not.toHaveBeenCalled();
                }

                expect(hotkeyManager.isIndividualEnabled('bossKey')).toBe(false);
            });
        });

        describe('Accelerator Handling', () => {
            it('should register shortcuts with appropriate accelerators', () => {
                hotkeyManager.registerShortcuts();

                if (expectsGlobalHotkeys) {
                    expect(globalShortcut.register).toHaveBeenCalled();
                } else {
                    expect(globalShortcut.register).not.toHaveBeenCalled();
                }
            });
        });
    });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';
import IpcManager from '../../src/main/managers/ipcManager';
import WindowManager from '../../src/main/managers/windowManager';
import HotkeyManager from '../../src/main/managers/hotkeyManager';
import UpdateManager from '../../src/main/managers/updateManager';
import { platformAdapterPresets, useMockPlatformAdapter, resetPlatformAdapterForTests } from '../helpers/mocks';

vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/__mocks__/logger';

vi.mock('electron-updater', () => ({
    autoUpdater: {
        on: vi.fn(),
        removeAllListeners: vi.fn(),
    },
}));

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

describe('IPC Sanitization Integration', () => {
    let ipcManager: IpcManager;
    let windowManager: WindowManager;
    let hotkeyManager: HotkeyManager;
    let updateManager: UpdateManager;
    let mockStore: any;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();

        mockStore = {
            get: vi.fn().mockReturnValue(true),
            set: vi.fn(),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests();
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(() => {
            useMockPlatformAdapter(adapterForPlatform[platform]());

            windowManager = new WindowManager(false);
            hotkeyManager = new HotkeyManager(windowManager);
            updateManager = new UpdateManager(mockStore);

            ipcManager = new IpcManager(
                windowManager,
                hotkeyManager,
                updateManager,
                null,
                null,
                null,
                mockStore,
                mockLogger as any
            );
            ipcManager.setupIpcHandlers();
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        describe('Auto-Update Sanitization', () => {
            it('should block non-boolean input for auto-update:set-enabled', () => {
                const handler = (ipcMain as any)._listeners.get('auto-update:set-enabled');
                expect(handler).toBeDefined();

                handler({}, 'not-a-boolean');

                expect(mockLogger.warn).toHaveBeenCalledWith(
                    expect.stringContaining('Invalid autoUpdateEnabled value: not-a-boolean')
                );

                const setEnabledSpy = vi.spyOn(updateManager, 'setEnabled');
                handler({}, 123);
                expect(setEnabledSpy).not.toHaveBeenCalled();
            });
        });

        describe('Hotkey Sanitization', () => {
            it('should block invalid payload for hotkeys:individual:set', () => {
                const handler = (ipcMain as any)._listeners.get('hotkeys:individual:set');
                expect(handler).toBeDefined();

                handler({}, 'peekAndHide', 'yes');

                expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Invalid enabled value: yes'));

                handler({}, { malicious: 'data' }, true);
                expect(mockLogger.warn).toHaveBeenCalledWith(
                    expect.stringContaining('Invalid hotkey id: [object Object]')
                );
            });
        });

        describe('Window Control Sanitization', () => {
            it('should handle missing main window gracefully on window controls', () => {
                (windowManager as any).mainWindow.window = null;

                const handler = (ipcMain as any)._listeners.get('window-minimize');
                expect(handler).toBeDefined();

                expect(() => handler({})).not.toThrow();
            });
        });
    });
});

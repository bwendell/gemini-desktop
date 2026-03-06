import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';
import { LaunchAtStartupIpcHandler } from '../../../../src/main/managers/ipc/LaunchAtStartupIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import { createMockLogger, createMockStore, createMockWindowManager } from '../../../helpers/mocks';

const { mockIpcMain, mockApp } = vi.hoisted(() => {
    const mockIpcMain = {
        on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
            mockIpcMain._listeners.set(channel, listener);
        }),
        handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
            mockIpcMain._handlers.set(channel, handler);
        }),
        removeHandler: vi.fn(),
        removeAllListeners: vi.fn(),
        _listeners: new Map<string, (...args: unknown[]) => void>(),
        _handlers: new Map<string, (...args: unknown[]) => unknown>(),
        _reset: () => {
            mockIpcMain._listeners.clear();
            mockIpcMain._handlers.clear();
            mockIpcMain.removeHandler.mockReset();
            mockIpcMain.removeAllListeners.mockReset();
        },
    };

    const mockApp = {
        setLoginItemSettings: vi.fn(),
    };

    return { mockIpcMain, mockApp };
});

vi.mock('electron', () => ({
    app: mockApp,
    ipcMain: mockIpcMain,
}));

describe('LaunchAtStartupIpcHandler', () => {
    let handler: LaunchAtStartupIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockStore: ReturnType<typeof createMockStore>;
    let mockLogger: ReturnType<typeof createMockLogger>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();

        mockStore = createMockStore({ launchAtStartup: false, startMinimized: false });
        mockLogger = createMockLogger();

        mockDeps = {
            store: mockStore as unknown as IpcHandlerDependencies['store'],
            logger: mockLogger as unknown as IpcHandlerDependencies['logger'],
            windowManager: createMockWindowManager() as unknown as IpcHandlerDependencies['windowManager'],
        };

        handler = new LaunchAtStartupIpcHandler(mockDeps);
    });

    describe('register', () => {
        it('registers launch-at-startup and start-minimized channels', () => {
            handler.register();

            expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.LAUNCH_AT_STARTUP_GET, expect.any(Function));
            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.LAUNCH_AT_STARTUP_SET, expect.any(Function));
            expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.START_MINIMIZED_GET, expect.any(Function));
            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.START_MINIMIZED_SET, expect.any(Function));
        });
    });

    describe('get handlers', () => {
        beforeEach(() => {
            handler.register();
        });

        it('returns stored launchAtStartup value', () => {
            mockStore.get.mockImplementation((key: string) => (key === 'launchAtStartup' ? true : false));
            const getHandler = mockIpcMain._handlers.get(IPC_CHANNELS.LAUNCH_AT_STARTUP_GET);
            expect(getHandler?.()).toBe(true);
        });

        it('returns stored startMinimized value', () => {
            mockStore.get.mockImplementation((key: string) => (key === 'startMinimized' ? true : false));
            const getHandler = mockIpcMain._handlers.get(IPC_CHANNELS.START_MINIMIZED_GET);
            expect(getHandler?.()).toBe(true);
        });
    });

    describe('set handlers', () => {
        beforeEach(() => {
            handler.register();
        });

        it('sets launchAtStartup and applies login settings with hidden args when minimized', () => {
            mockStore.get.mockImplementation((key: string) => (key === 'startMinimized' ? true : false));
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.LAUNCH_AT_STARTUP_SET);
            listener?.({}, true);

            expect(mockStore.set).toHaveBeenCalledWith('launchAtStartup', true);
            expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith(
                expect.objectContaining({ openAtLogin: true, args: ['--hidden'] })
            );
        });

        it('disabling launchAtStartup also disables startMinimized in store', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.LAUNCH_AT_STARTUP_SET);
            listener?.({}, false);

            expect(mockStore.set).toHaveBeenCalledWith('startMinimized', false);
            expect(mockStore.set).toHaveBeenCalledWith('launchAtStartup', false);
        });

        it('setStartMinimized persists false when launchAtStartup disabled', () => {
            mockStore.get.mockImplementation((key: string) => (key === 'launchAtStartup' ? false : false));
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.START_MINIMIZED_SET);
            listener?.({}, true);

            expect(mockStore.set).toHaveBeenCalledWith('startMinimized', false);
            expect(mockApp.setLoginItemSettings).not.toHaveBeenCalled();
        });

        it('setStartMinimized re-applies login settings when launchAtStartup enabled', () => {
            mockStore.get.mockImplementation((key: string) => (key === 'launchAtStartup' ? true : false));
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.START_MINIMIZED_SET);
            listener?.({}, true);

            expect(mockStore.set).toHaveBeenCalledWith('startMinimized', true);
            expect(mockApp.setLoginItemSettings).toHaveBeenCalledWith(
                expect.objectContaining({ openAtLogin: true, args: ['--hidden'] })
            );
        });
    });

    describe('unregister', () => {
        it('removes all handlers/listeners', () => {
            handler.unregister();

            expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(IPC_CHANNELS.LAUNCH_AT_STARTUP_GET);
            expect(mockIpcMain.removeAllListeners).toHaveBeenCalledWith(IPC_CHANNELS.LAUNCH_AT_STARTUP_SET);
            expect(mockIpcMain.removeHandler).toHaveBeenCalledWith(IPC_CHANNELS.START_MINIMIZED_GET);
            expect(mockIpcMain.removeAllListeners).toHaveBeenCalledWith(IPC_CHANNELS.START_MINIMIZED_SET);
        });
    });
});

/**
 * Unit tests for AlwaysOnTopIpcHandler.
 *
 * Tests the always-on-top:get, always-on-top:set IPC handlers and
 * the always-on-top-changed event handling.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlwaysOnTopIpcHandler } from '../../../../src/main/managers/ipc/AlwaysOnTopIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import { createMockLogger, createMockWindowManager, createMockStore } from '../../../helpers/mocks';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';

// Mock Electron
const { mockIpcMain, mockBrowserWindow } = vi.hoisted(() => {
    const mockIpcMain = {
        on: vi.fn((channel: string, listener: (...args: unknown[]) => void) => {
            mockIpcMain._listeners.set(channel, listener);
        }),
        handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
            mockIpcMain._handlers.set(channel, handler);
        }),
        _listeners: new Map<string, (...args: unknown[]) => void>(),
        _handlers: new Map<string, (...args: unknown[]) => unknown>(),
        _reset: () => {
            mockIpcMain._listeners.clear();
            mockIpcMain._handlers.clear();
        },
    };

    const mockWindow = {
        isDestroyed: vi.fn().mockReturnValue(false),
        id: 1,
        webContents: {
            send: vi.fn(),
        },
    };

    const mockBrowserWindow = {
        getAllWindows: vi.fn().mockReturnValue([mockWindow]),
        fromWebContents: vi.fn().mockReturnValue(mockWindow),
        _mockWindow: mockWindow,
        _reset: () => {
            mockWindow.isDestroyed.mockReturnValue(false);
            mockWindow.webContents.send.mockReset();
            mockBrowserWindow.getAllWindows.mockReturnValue([mockWindow]);
        },
    };

    return { mockIpcMain, mockBrowserWindow };
});

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
    BrowserWindow: mockBrowserWindow,
}));

describe('AlwaysOnTopIpcHandler', () => {
    let handler: AlwaysOnTopIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockStore: ReturnType<typeof createMockStore>;
    let mockWindowManager: ReturnType<typeof createMockWindowManager>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();
        mockBrowserWindow._reset();

        mockLogger = createMockLogger();
        mockStore = createMockStore({ alwaysOnTop: false });
        mockWindowManager = createMockWindowManager();

        mockDeps = {
            store: mockStore as unknown as IpcHandlerDependencies['store'],
            logger: mockLogger as unknown as IpcHandlerDependencies['logger'],
            windowManager: mockWindowManager as unknown as IpcHandlerDependencies['windowManager'],
        };

        handler = new AlwaysOnTopIpcHandler(mockDeps);
    });

    describe('register', () => {
        it('registers always-on-top:get handler', () => {
            handler.register();

            expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.ALWAYS_ON_TOP_GET, expect.any(Function));
            expect(mockIpcMain._handlers.has(IPC_CHANNELS.ALWAYS_ON_TOP_GET)).toBe(true);
        });

        it('registers always-on-top:set listener', () => {
            handler.register();

            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.ALWAYS_ON_TOP_SET, expect.any(Function));
            expect(mockIpcMain._listeners.has(IPC_CHANNELS.ALWAYS_ON_TOP_SET)).toBe(true);
        });

        it('subscribes to windowManager always-on-top-changed event', () => {
            handler.register();

            expect(mockWindowManager.on).toHaveBeenCalledWith('always-on-top-changed', expect.any(Function));
        });
    });

    describe('initialize', () => {
        it('initializes always-on-top from stored preference (true)', () => {
            mockStore.get.mockReturnValue(true);

            handler.initialize();

            expect(mockWindowManager.setAlwaysOnTop).toHaveBeenCalledWith(true);
            expect(mockLogger.log).toHaveBeenCalledWith('Always on top initialized to: true');
        });

        it('does not call setAlwaysOnTop when stored value is false', () => {
            mockStore.get.mockReturnValue(false);

            handler.initialize();

            expect(mockWindowManager.setAlwaysOnTop).not.toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith('Always on top initialized to: false');
        });

        it('handles initialization with undefined value (defaults to false)', () => {
            mockStore.get.mockReturnValue(undefined);

            handler.initialize();

            expect(mockWindowManager.setAlwaysOnTop).not.toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith('Always on top initialized to: false');
        });

        it('handles initialization error', () => {
            const error = new Error('Store read error');
            mockStore.get.mockImplementation(() => {
                throw error;
            });

            handler.initialize();

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error during initializing always on top:',
                expect.objectContaining({
                    error: 'Store read error',
                })
            );
        });
    });

    describe('always-on-top:get handler (2.3.7, 2.3.8)', () => {
        beforeEach(() => {
            handler.register();
        });

        it('returns stored state (2.3.7)', async () => {
            mockStore.get.mockReturnValue(true);

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.ALWAYS_ON_TOP_GET);
            const result = await invokeHandler!();

            expect(result).toEqual({ enabled: true });
        });

        it('defaults to false if not set (2.3.8)', async () => {
            mockStore.get.mockReturnValue(undefined);

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.ALWAYS_ON_TOP_GET);
            const result = await invokeHandler!();

            expect(result).toEqual({ enabled: false });
        });

        it('returns false on error', async () => {
            mockStore.get.mockImplementation(() => {
                throw new Error('Store error');
            });

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.ALWAYS_ON_TOP_GET);
            const result = await invokeHandler!();

            expect(result).toEqual({ enabled: false });
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('always-on-top:set handler (2.3.9, 2.3.10, 2.3.11)', () => {
        beforeEach(() => {
            handler.register();
        });

        it('set with true calls windowManager.setAlwaysOnTop(true) (2.3.9)', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.ALWAYS_ON_TOP_SET);
            listener!({}, true);

            expect(mockWindowManager.setAlwaysOnTop).toHaveBeenCalledWith(true);
            expect(mockLogger.log).toHaveBeenCalledWith('Always on top requested: true');
        });

        it('set with false calls windowManager.setAlwaysOnTop(false) (2.3.10)', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.ALWAYS_ON_TOP_SET);
            listener!({}, false);

            expect(mockWindowManager.setAlwaysOnTop).toHaveBeenCalledWith(false);
            expect(mockLogger.log).toHaveBeenCalledWith('Always on top requested: false');
        });

        it('set with non-boolean is rejected (2.3.11)', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.ALWAYS_ON_TOP_SET);
            listener!({}, 'invalid');

            expect(mockWindowManager.setAlwaysOnTop).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid alwaysOnTop value: invalid');
        });

        it('set with null is rejected', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.ALWAYS_ON_TOP_SET);
            listener!({}, null);

            expect(mockWindowManager.setAlwaysOnTop).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid alwaysOnTop value: null');
        });

        it('set with undefined is rejected', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.ALWAYS_ON_TOP_SET);
            listener!({}, undefined);

            expect(mockWindowManager.setAlwaysOnTop).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid alwaysOnTop value: undefined');
        });

        it('logs error on windowManager failure', () => {
            const error = new Error('WindowManager error');
            mockWindowManager.setAlwaysOnTop.mockImplementation(() => {
                throw error;
            });

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.ALWAYS_ON_TOP_SET);
            listener!({}, true);

            expect(mockLogger.error).toHaveBeenCalledWith('Error setting always on top:', {
                error: 'WindowManager error',
                requestedEnabled: true,
            });
        });
    });

    describe('always-on-top-changed event (2.3.12)', () => {
        beforeEach(() => {
            handler.register();
        });

        it('persists state to store (2.3.12)', () => {
            // Get the always-on-top-changed listener
            const onCall = mockWindowManager.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'always-on-top-changed'
            );
            expect(onCall).toBeDefined();
            const listener = onCall![1] as (enabled: boolean) => void;

            // Trigger state change
            listener(true);

            expect(mockStore.set).toHaveBeenCalledWith('alwaysOnTop', true);
        });

        it('broadcasts state change to all windows', () => {
            const onCall = mockWindowManager.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'always-on-top-changed'
            );
            const listener = onCall![1] as (enabled: boolean) => void;

            listener(true);

            expect(mockBrowserWindow._mockWindow.webContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED,
                { enabled: true }
            );
        });

        it('skips destroyed windows during broadcast', () => {
            mockBrowserWindow._mockWindow.isDestroyed.mockReturnValue(true);

            const onCall = mockWindowManager.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'always-on-top-changed'
            );
            const listener = onCall![1] as (enabled: boolean) => void;

            listener(true);

            expect(mockBrowserWindow._mockWindow.webContents.send).not.toHaveBeenCalled();
        });

        it('logs error on persistence failure', () => {
            const error = new Error('Store write error');
            mockStore.set.mockImplementation(() => {
                throw error;
            });

            const onCall = mockWindowManager.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'always-on-top-changed'
            );
            const listener = onCall![1] as (enabled: boolean) => void;

            listener(true);

            expect(mockLogger.error).toHaveBeenCalledWith('Error handling always on top change:', {
                error: 'Store write error',
                enabled: true,
            });
        });
    });
});

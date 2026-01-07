/**
 * Unit tests for ZoomIpcHandler.
 *
 * Tests the zoom:get-level, zoom:zoom-in, and zoom:zoom-out IPC handlers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZoomIpcHandler } from '../../../../src/main/managers/ipc/ZoomIpcHandler';
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

describe('ZoomIpcHandler', () => {
    let handler: ZoomIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockStore: ReturnType<typeof createMockStore>;
    let mockWindowManager: ReturnType<typeof createMockWindowManager>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();
        mockBrowserWindow._reset();

        mockLogger = createMockLogger();
        mockStore = createMockStore({ zoomLevel: 100 });
        mockWindowManager = createMockWindowManager();

        mockDeps = {
            store: mockStore as unknown as IpcHandlerDependencies['store'],
            logger: mockLogger as unknown as IpcHandlerDependencies['logger'],
            windowManager: mockWindowManager as unknown as IpcHandlerDependencies['windowManager'],
        };

        handler = new ZoomIpcHandler(mockDeps);
    });

    describe('register', () => {
        it('registers zoom:get-level handler', () => {
            handler.register();

            expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.ZOOM_GET_LEVEL, expect.any(Function));
            expect(mockIpcMain._handlers.has(IPC_CHANNELS.ZOOM_GET_LEVEL)).toBe(true);
        });

        it('registers zoom:zoom-in handler', () => {
            handler.register();

            expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.ZOOM_IN, expect.any(Function));
            expect(mockIpcMain._handlers.has(IPC_CHANNELS.ZOOM_IN)).toBe(true);
        });

        it('registers zoom:zoom-out handler', () => {
            handler.register();

            expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.ZOOM_OUT, expect.any(Function));
            expect(mockIpcMain._handlers.has(IPC_CHANNELS.ZOOM_OUT)).toBe(true);
        });

        it('subscribes to windowManager zoom-level-changed event', () => {
            handler.register();

            expect(mockWindowManager.on).toHaveBeenCalledWith('zoom-level-changed', expect.any(Function));
        });
    });

    describe('initialize', () => {
        it('initializes zoom level from stored preference', () => {
            mockStore.get.mockReturnValue(125);

            handler.initialize();

            expect(mockWindowManager.initializeZoomLevel).toHaveBeenCalledWith(125);
            expect(mockLogger.log).toHaveBeenCalledWith('Zoom level initialized');
        });

        it('handles initialization with undefined zoom level', () => {
            mockStore.get.mockReturnValue(undefined);

            handler.initialize();

            expect(mockWindowManager.initializeZoomLevel).toHaveBeenCalledWith(undefined);
        });

        it('handles initialization error', () => {
            const error = new Error('Store read error');
            mockStore.get.mockImplementation(() => {
                throw error;
            });

            handler.initialize();

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error during initializing zoom level:',
                expect.objectContaining({
                    error: 'Store read error',
                })
            );
        });
    });

    describe('zoom:get-level handler (2.2.8, 2.2.9)', () => {
        beforeEach(() => {
            handler.register();
        });

        it('returns windowManager.getZoomLevel() (2.2.8)', async () => {
            mockWindowManager.getZoomLevel.mockReturnValue(150);

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.ZOOM_GET_LEVEL);
            const result = await invokeHandler!();

            expect(result).toBe(150);
            expect(mockWindowManager.getZoomLevel).toHaveBeenCalled();
        });

        it('returns 100 on error (2.2.9)', async () => {
            mockWindowManager.getZoomLevel.mockImplementation(() => {
                throw new Error('WindowManager error');
            });

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.ZOOM_GET_LEVEL);
            const result = await invokeHandler!();

            expect(result).toBe(100);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('zoom:zoom-in handler (2.2.10)', () => {
        beforeEach(() => {
            handler.register();
        });

        it('calls windowManager.zoomIn() and returns new level (2.2.10)', async () => {
            mockWindowManager.getZoomLevel.mockReturnValue(110);

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.ZOOM_IN);
            const result = await invokeHandler!();

            expect(mockWindowManager.zoomIn).toHaveBeenCalled();
            expect(result).toBe(110);
        });

        it('returns current level on error', async () => {
            mockWindowManager.zoomIn.mockImplementation(() => {
                throw new Error('Zoom error');
            });
            mockWindowManager.getZoomLevel.mockReturnValue(100);

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.ZOOM_IN);
            const result = await invokeHandler!();

            expect(result).toBe(100);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('zoom:zoom-out handler (2.2.11)', () => {
        beforeEach(() => {
            handler.register();
        });

        it('calls windowManager.zoomOut() and returns new level (2.2.11)', async () => {
            mockWindowManager.getZoomLevel.mockReturnValue(90);

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.ZOOM_OUT);
            const result = await invokeHandler!();

            expect(mockWindowManager.zoomOut).toHaveBeenCalled();
            expect(result).toBe(90);
        });

        it('returns current level on error', async () => {
            mockWindowManager.zoomOut.mockImplementation(() => {
                throw new Error('Zoom error');
            });
            mockWindowManager.getZoomLevel.mockReturnValue(100);

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.ZOOM_OUT);
            const result = await invokeHandler!();

            expect(result).toBe(100);
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('zoom-level-changed event (2.2.12, 2.2.13)', () => {
        beforeEach(() => {
            handler.register();
        });

        it('persists zoom level to store (2.2.12)', () => {
            // Get the zoom-level-changed listener
            const onCall = mockWindowManager.on.mock.calls.find((call: unknown[]) => call[0] === 'zoom-level-changed');
            expect(onCall).toBeDefined();
            const listener = onCall![1] as (level: number) => void;

            // Trigger zoom level change
            listener(125);

            expect(mockStore.set).toHaveBeenCalledWith('zoomLevel', 125);
        });

        it('broadcasts zoom level to all windows (2.2.13)', () => {
            // Get the zoom-level-changed listener
            const onCall = mockWindowManager.on.mock.calls.find((call: unknown[]) => call[0] === 'zoom-level-changed');
            const listener = onCall![1] as (level: number) => void;

            // Trigger zoom level change
            listener(125);

            expect(mockBrowserWindow._mockWindow.webContents.send).toHaveBeenCalledWith(
                IPC_CHANNELS.ZOOM_LEVEL_CHANGED,
                125
            );
        });

        it('skips destroyed windows during broadcast', () => {
            mockBrowserWindow._mockWindow.isDestroyed.mockReturnValue(true);

            const onCall = mockWindowManager.on.mock.calls.find((call: unknown[]) => call[0] === 'zoom-level-changed');
            const listener = onCall![1] as (level: number) => void;

            listener(125);

            expect(mockBrowserWindow._mockWindow.webContents.send).not.toHaveBeenCalled();
        });

        it('logs error on persistence failure', () => {
            const error = new Error('Store write error');
            mockStore.set.mockImplementation(() => {
                throw error;
            });

            const onCall = mockWindowManager.on.mock.calls.find((call: unknown[]) => call[0] === 'zoom-level-changed');
            const listener = onCall![1] as (level: number) => void;

            listener(125);

            expect(mockLogger.error).toHaveBeenCalledWith('Error handling zoom level change:', {
                error: 'Store write error',
                level: 125,
            });
        });
    });
});

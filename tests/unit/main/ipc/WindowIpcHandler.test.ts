/**
 * Unit tests for WindowIpcHandler.
 *
 * Tests all window control IPC handlers: minimize, maximize, close, show, isMaximized.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WindowIpcHandler } from '../../../../src/main/managers/ipc/WindowIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import { createMockLogger, createMockWindowManager, createMockStore } from '../../../helpers/mocks';

// Mock Electron
const { mockIpcMain, mockBrowserWindow } = vi.hoisted(() => {
    const mockIpcMain = {
        on: vi.fn((channel, listener) => {
            mockIpcMain._listeners.set(channel, listener);
        }),
        handle: vi.fn((channel, handler) => {
            mockIpcMain._handlers.set(channel, handler);
        }),
        _listeners: new Map<string, Function>(),
        _handlers: new Map<string, Function>(),
        _reset: () => {
            mockIpcMain._listeners.clear();
            mockIpcMain._handlers.clear();
        },
    };

    const mockBrowserWindow = {
        fromWebContents: vi.fn(),
        _reset: () => {
            mockBrowserWindow.fromWebContents.mockReset();
        },
    };

    return { mockIpcMain, mockBrowserWindow };
});

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
    BrowserWindow: mockBrowserWindow,
}));

describe('WindowIpcHandler', () => {
    let handler: WindowIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockWindowManager: ReturnType<typeof createMockWindowManager>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();
        mockBrowserWindow._reset();

        mockLogger = createMockLogger();
        mockWindowManager = createMockWindowManager();
        mockDeps = {
            store: createMockStore({}),
            logger: mockLogger,
            windowManager: mockWindowManager,
        };

        handler = new WindowIpcHandler(mockDeps);
    });

    describe('register', () => {
        it('registers all 5 window IPC channels', () => {
            handler.register();

            expect(mockIpcMain.on).toHaveBeenCalledWith('window-minimize', expect.any(Function));
            expect(mockIpcMain.on).toHaveBeenCalledWith('window-maximize', expect.any(Function));
            expect(mockIpcMain.on).toHaveBeenCalledWith('window-close', expect.any(Function));
            expect(mockIpcMain.on).toHaveBeenCalledWith('window-show', expect.any(Function));
            expect(mockIpcMain.handle).toHaveBeenCalledWith('window-is-maximized', expect.any(Function));
        });
    });

    describe('window-minimize handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('minimizes window on null window does not throw (1.3.7)', () => {
            const listener = mockIpcMain._listeners.get('window-minimize');
            mockBrowserWindow.fromWebContents.mockReturnValue(null);

            // Should not throw
            expect(() => listener!({ sender: {} })).not.toThrow();
        });

        it('minimizes window on destroyed window does not throw (1.3.8)', () => {
            const listener = mockIpcMain._listeners.get('window-minimize');
            const destroyedWindow = {
                isDestroyed: () => true,
                minimize: vi.fn(),
            };
            mockBrowserWindow.fromWebContents.mockReturnValue(destroyedWindow);

            // Should not throw
            expect(() => listener!({ sender: {} })).not.toThrow();
            expect(destroyedWindow.minimize).not.toHaveBeenCalled();
        });

        it('calls minimize on valid window', () => {
            const listener = mockIpcMain._listeners.get('window-minimize');
            const mockWindow = {
                id: 1,
                isDestroyed: () => false,
                minimize: vi.fn(),
            };
            mockBrowserWindow.fromWebContents.mockReturnValue(mockWindow);

            listener!({ sender: {} });

            expect(mockWindow.minimize).toHaveBeenCalled();
        });

        it('logs error when minimize throws (1.3.15)', () => {
            const listener = mockIpcMain._listeners.get('window-minimize');
            const mockWindow = {
                id: 1,
                isDestroyed: () => false,
                minimize: vi.fn().mockImplementation(() => {
                    throw new Error('Failed to minimize');
                }),
            };
            mockBrowserWindow.fromWebContents.mockReturnValue(mockWindow);

            listener!({ sender: {} });

            expect(mockLogger.error).toHaveBeenCalledWith('Error minimizing window:', {
                error: 'Failed to minimize',
                windowId: 1,
            });
        });
    });

    describe('window-maximize handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('toggles to unmaximize when maximized (1.3.9)', () => {
            const listener = mockIpcMain._listeners.get('window-maximize');
            const mockWindow = {
                id: 1,
                isDestroyed: () => false,
                isMaximized: vi.fn().mockReturnValue(true),
                maximize: vi.fn(),
                unmaximize: vi.fn(),
            };
            mockBrowserWindow.fromWebContents.mockReturnValue(mockWindow);

            listener!({ sender: {} });

            expect(mockWindow.unmaximize).toHaveBeenCalled();
            expect(mockWindow.maximize).not.toHaveBeenCalled();
        });

        it('maximizes when not maximized (1.3.10)', () => {
            const listener = mockIpcMain._listeners.get('window-maximize');
            const mockWindow = {
                id: 1,
                isDestroyed: () => false,
                isMaximized: vi.fn().mockReturnValue(false),
                maximize: vi.fn(),
                unmaximize: vi.fn(),
            };
            mockBrowserWindow.fromWebContents.mockReturnValue(mockWindow);

            listener!({ sender: {} });

            expect(mockWindow.maximize).toHaveBeenCalled();
            expect(mockWindow.unmaximize).not.toHaveBeenCalled();
        });

        it('does not throw on null window', () => {
            const listener = mockIpcMain._listeners.get('window-maximize');
            mockBrowserWindow.fromWebContents.mockReturnValue(null);

            expect(() => listener!({ sender: {} })).not.toThrow();
        });

        it('logs error when toggle maximize throws', () => {
            const listener = mockIpcMain._listeners.get('window-maximize');
            const mockWindow = {
                id: 2,
                isDestroyed: () => false,
                isMaximized: vi.fn().mockReturnValue(false),
                maximize: vi.fn().mockImplementation(() => {
                    throw new Error('Maximize failed');
                }),
            };
            mockBrowserWindow.fromWebContents.mockReturnValue(mockWindow);

            listener!({ sender: {} });

            expect(mockLogger.error).toHaveBeenCalledWith('Error toggling maximize:', {
                error: 'Maximize failed',
                windowId: 2,
            });
        });
    });

    describe('window-close handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('closes window on destroyed window does not throw (1.3.11)', () => {
            const listener = mockIpcMain._listeners.get('window-close');
            const destroyedWindow = {
                isDestroyed: () => true,
                close: vi.fn(),
            };
            mockBrowserWindow.fromWebContents.mockReturnValue(destroyedWindow);

            expect(() => listener!({ sender: {} })).not.toThrow();
            expect(destroyedWindow.close).not.toHaveBeenCalled();
        });

        it('calls close on valid window', () => {
            const listener = mockIpcMain._listeners.get('window-close');
            const mockWindow = {
                id: 1,
                isDestroyed: () => false,
                close: vi.fn(),
            };
            mockBrowserWindow.fromWebContents.mockReturnValue(mockWindow);

            listener!({ sender: {} });

            expect(mockWindow.close).toHaveBeenCalled();
        });

        it('logs error when close throws', () => {
            const listener = mockIpcMain._listeners.get('window-close');
            const mockWindow = {
                id: 3,
                isDestroyed: () => false,
                close: vi.fn().mockImplementation(() => {
                    throw new Error('Close failed');
                }),
            };
            mockBrowserWindow.fromWebContents.mockReturnValue(mockWindow);

            listener!({ sender: {} });

            expect(mockLogger.error).toHaveBeenCalledWith('Error closing window:', {
                error: 'Close failed',
                windowId: 3,
            });
        });
    });

    describe('window-show handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('calls windowManager.restoreFromTray (1.3.12)', () => {
            const listener = mockIpcMain._listeners.get('window-show');

            listener!({ sender: {} });

            expect(mockWindowManager.restoreFromTray).toHaveBeenCalled();
        });

        it('logs error when restoreFromTray throws', () => {
            const listener = mockIpcMain._listeners.get('window-show');
            mockWindowManager.restoreFromTray.mockImplementation(() => {
                throw new Error('Restore failed');
            });

            listener!({ sender: {} });

            expect(mockLogger.error).toHaveBeenCalledWith('Error showing window:', expect.any(Error));
        });
    });

    describe('window-is-maximized handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('returns false for null window (1.3.13)', async () => {
            const handler = mockIpcMain._handlers.get('window-is-maximized');
            mockBrowserWindow.fromWebContents.mockReturnValue(null);

            const result = await handler!({ sender: {} });

            expect(result).toBe(false);
        });

        it('returns false for destroyed window', async () => {
            const handler = mockIpcMain._handlers.get('window-is-maximized');
            const destroyedWindow = {
                isDestroyed: () => true,
            };
            mockBrowserWindow.fromWebContents.mockReturnValue(destroyedWindow);

            const result = await handler!({ sender: {} });

            expect(result).toBe(false);
        });

        it('returns correct state for valid window (1.3.14)', async () => {
            const windowHandler = mockIpcMain._handlers.get('window-is-maximized');
            const mockWindow = {
                isDestroyed: () => false,
                isMaximized: vi.fn().mockReturnValue(true),
            };
            mockBrowserWindow.fromWebContents.mockReturnValue(mockWindow);

            const result = await windowHandler!({ sender: {} });

            expect(result).toBe(true);
            expect(mockWindow.isMaximized).toHaveBeenCalled();
        });

        it('returns false when not maximized', async () => {
            const windowHandler = mockIpcMain._handlers.get('window-is-maximized');
            const mockWindow = {
                isDestroyed: () => false,
                isMaximized: vi.fn().mockReturnValue(false),
            };
            mockBrowserWindow.fromWebContents.mockReturnValue(mockWindow);

            const result = await windowHandler!({ sender: {} });

            expect(result).toBe(false);
        });

        it('returns false and logs error when isMaximized throws', async () => {
            const windowHandler = mockIpcMain._handlers.get('window-is-maximized');
            const mockWindow = {
                isDestroyed: () => false,
                isMaximized: vi.fn().mockImplementation(() => {
                    throw new Error('Check failed');
                }),
            };
            mockBrowserWindow.fromWebContents.mockReturnValue(mockWindow);

            const result = await windowHandler!({ sender: {} });

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith('Error checking maximized state:', expect.any(Error));
        });
    });
});

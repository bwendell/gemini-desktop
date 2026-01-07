/**
 * Unit tests for ThemeIpcHandler.
 *
 * Tests the theme:get and theme:set IPC handlers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeIpcHandler } from '../../../../src/main/managers/ipc/ThemeIpcHandler';
import type { IpcHandlerDependencies } from '../../../../src/main/managers/ipc/types';
import { createMockLogger, createMockWindowManager, createMockStore } from '../../../helpers/mocks';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';

// Mock Electron
const { mockIpcMain, mockNativeTheme, mockBrowserWindow } = vi.hoisted(() => {
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

    const mockNativeTheme = {
        themeSource: 'system' as 'light' | 'dark' | 'system',
        shouldUseDarkColors: true,
        _reset: () => {
            mockNativeTheme.themeSource = 'system';
            mockNativeTheme.shouldUseDarkColors = true;
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

    return { mockIpcMain, mockNativeTheme, mockBrowserWindow };
});

vi.mock('electron', () => ({
    ipcMain: mockIpcMain,
    nativeTheme: mockNativeTheme,
    BrowserWindow: mockBrowserWindow,
}));

describe('ThemeIpcHandler', () => {
    let handler: ThemeIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockLogger: ReturnType<typeof createMockLogger>;
    let mockStore: ReturnType<typeof createMockStore>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockIpcMain._reset();
        mockNativeTheme._reset();
        mockBrowserWindow._reset();

        mockLogger = createMockLogger();
        mockStore = createMockStore({ theme: 'system' });
        mockDeps = {
            store: mockStore,
            logger: mockLogger,
            windowManager: createMockWindowManager(),
        };

        handler = new ThemeIpcHandler(mockDeps);
    });

    describe('register', () => {
        it('registers theme:get handler', () => {
            handler.register();

            expect(mockIpcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.THEME_GET, expect.any(Function));
            expect(mockIpcMain._handlers.has(IPC_CHANNELS.THEME_GET)).toBe(true);
        });

        it('registers theme:set listener', () => {
            handler.register();

            expect(mockIpcMain.on).toHaveBeenCalledWith(IPC_CHANNELS.THEME_SET, expect.any(Function));
            expect(mockIpcMain._listeners.has(IPC_CHANNELS.THEME_SET)).toBe(true);
        });
    });

    describe('initialize', () => {
        it('sets nativeTheme.themeSource from stored preference', () => {
            mockStore.get.mockReturnValue('dark');

            handler.initialize();

            expect(mockNativeTheme.themeSource).toBe('dark');
            expect(mockLogger.log).toHaveBeenCalledWith('Native theme initialized to: dark');
        });

        it('defaults to system if not set', () => {
            mockStore.get.mockReturnValue(undefined);

            handler.initialize();

            expect(mockNativeTheme.themeSource).toBe('system');
            expect(mockLogger.log).toHaveBeenCalledWith('Native theme initialized to: system');
        });

        it('handles initialization error', () => {
            const error = new Error('Store read error');
            mockStore.get.mockImplementation(() => {
                throw error;
            });

            handler.initialize();

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error during initializing native theme:',
                expect.objectContaining({
                    error: 'Store read error',
                })
            );
        });
    });

    describe('theme:get handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('returns stored preference and effective theme', async () => {
            mockStore.get.mockReturnValue('light');
            mockNativeTheme.shouldUseDarkColors = false;

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.THEME_GET);
            const result = await invokeHandler!();

            expect(result).toEqual({
                preference: 'light',
                effectiveTheme: 'light',
            });
        });

        it('defaults to system if not set', async () => {
            mockStore.get.mockReturnValue(undefined);
            mockNativeTheme.shouldUseDarkColors = true;

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.THEME_GET);
            const result = await invokeHandler!();

            expect(result).toEqual({
                preference: 'system',
                effectiveTheme: 'dark',
            });
        });

        it('returns fallback on error', async () => {
            mockStore.get.mockImplementation(() => {
                throw new Error('Store error');
            });

            const invokeHandler = mockIpcMain._handlers.get(IPC_CHANNELS.THEME_GET);
            const result = await invokeHandler!();

            expect(result).toEqual({
                preference: 'system',
                effectiveTheme: 'dark',
            });
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('theme:set handler', () => {
        beforeEach(() => {
            handler.register();
        });

        it('sets light theme correctly', () => {
            mockNativeTheme.shouldUseDarkColors = false;

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.THEME_SET);
            listener!({}, 'light');

            expect(mockStore.set).toHaveBeenCalledWith('theme', 'light');
            expect(mockNativeTheme.themeSource).toBe('light');
            expect(mockLogger.log).toHaveBeenCalledWith('Theme set to: light (effective: light)');
        });

        it('sets dark theme correctly', () => {
            mockNativeTheme.shouldUseDarkColors = true;

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.THEME_SET);
            listener!({}, 'dark');

            expect(mockStore.set).toHaveBeenCalledWith('theme', 'dark');
            expect(mockNativeTheme.themeSource).toBe('dark');
            expect(mockLogger.log).toHaveBeenCalledWith('Theme set to: dark (effective: dark)');
        });

        it('sets system theme correctly', () => {
            mockNativeTheme.shouldUseDarkColors = true;

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.THEME_SET);
            listener!({}, 'system');

            expect(mockStore.set).toHaveBeenCalledWith('theme', 'system');
            expect(mockNativeTheme.themeSource).toBe('system');
            expect(mockLogger.log).toHaveBeenCalledWith('Theme set to: system (effective: dark)');
        });

        it('rejects invalid theme value', () => {
            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.THEME_SET);
            listener!({}, 'invalid-theme' as any);

            expect(mockStore.set).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid theme value: invalid-theme');
        });

        it('broadcasts theme change to all windows', () => {
            mockNativeTheme.shouldUseDarkColors = false;

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.THEME_SET);
            listener!({}, 'light');

            expect(mockBrowserWindow._mockWindow.webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.THEME_CHANGED, {
                preference: 'light',
                effectiveTheme: 'light',
            });
        });

        it('skips destroyed windows during broadcast', () => {
            mockBrowserWindow._mockWindow.isDestroyed.mockReturnValue(true);
            mockNativeTheme.shouldUseDarkColors = false;

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.THEME_SET);
            listener!({}, 'light');

            expect(mockBrowserWindow._mockWindow.webContents.send).not.toHaveBeenCalled();
        });

        it('logs error on set failure', () => {
            const error = new Error('Store write error');
            mockStore.set.mockImplementation(() => {
                throw error;
            });

            const listener = mockIpcMain._listeners.get(IPC_CHANNELS.THEME_SET);
            listener!({}, 'dark');

            expect(mockLogger.error).toHaveBeenCalledWith('Error setting theme:', {
                error: 'Store write error',
                requestedTheme: 'dark',
            });
        });
    });
});

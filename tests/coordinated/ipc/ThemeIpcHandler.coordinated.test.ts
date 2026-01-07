/**
 * Coordinated tests for ThemeIpcHandler.
 *
 * Tests the coordination between ThemeIpcHandler and the settings store,
 * verifying theme persistence and cross-window broadcasting.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow, nativeTheme } from 'electron';
import { ThemeIpcHandler } from '../../../src/main/managers/ipc/ThemeIpcHandler';
import type { IpcHandlerDependencies } from '../../../src/main/managers/ipc/types';
import { IPC_CHANNELS } from '../../../src/shared/constants/ipc-channels';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../../src/main/utils/logger');
import { mockLogger } from '../../../src/main/utils/logger';

describe('ThemeIpcHandler Coordinated Tests', () => {
    let sharedStoreData: Record<string, any>;
    let mockStore: any;
    let handler: ThemeIpcHandler;
    let mockDeps: IpcHandlerDependencies;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

        // Reset nativeTheme mock
        (nativeTheme as any).themeSource = 'system';
        (nativeTheme as any).shouldUseDarkColors = true;

        // SHARED store data to simulate persistence
        sharedStoreData = {
            theme: 'system',
        };

        mockStore = {
            get: vi.fn((key: string) => sharedStoreData[key]),
            set: vi.fn((key: string, value: any) => {
                sharedStoreData[key] = value;
            }),
        };

        // Create mock dependencies
        mockDeps = {
            store: mockStore,
            logger: mockLogger,
            windowManager: {
                getMainWindow: vi.fn(),
                createMainWindow: vi.fn(),
            } as any,
        };

        handler = new ThemeIpcHandler(mockDeps);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('2.1.13 - Theme persists to store', () => {
        it('should persist light theme to store when set via IPC', () => {
            handler.register();

            // Get the theme:set listener
            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.THEME_SET);
            expect(listener).toBeDefined();

            // Simulate setting theme
            listener!({}, 'light');

            // Verify persistence
            expect(mockStore.set).toHaveBeenCalledWith('theme', 'light');
            expect(sharedStoreData.theme).toBe('light');
        });

        it('should persist dark theme to store when set via IPC', () => {
            handler.register();

            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.THEME_SET);
            listener!({}, 'dark');

            expect(mockStore.set).toHaveBeenCalledWith('theme', 'dark');
            expect(sharedStoreData.theme).toBe('dark');
        });

        it('should persist system theme to store when set via IPC', () => {
            handler.register();

            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.THEME_SET);
            listener!({}, 'system');

            expect(mockStore.set).toHaveBeenCalledWith('theme', 'system');
            expect(sharedStoreData.theme).toBe('system');
        });

        it('should read persisted theme from store on get', async () => {
            sharedStoreData.theme = 'dark';
            handler.register();

            const getHandler = (ipcMain as any)._handlers?.get(IPC_CHANNELS.THEME_GET);
            const result = await getHandler!();

            expect(result.preference).toBe('dark');
        });

        it('should initialize nativeTheme from persisted store value', () => {
            sharedStoreData.theme = 'dark';

            handler.initialize();

            expect((nativeTheme as any).themeSource).toBe('dark');
        });
    });

    describe('2.1.14 - All windows receive broadcast', () => {
        it('should broadcast theme change to all open windows', () => {
            // Create mock windows
            const mockWindow1 = {
                id: 1,
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: { send: vi.fn() },
            };
            const mockWindow2 = {
                id: 2,
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: { send: vi.fn() },
            };

            (BrowserWindow.getAllWindows as any).mockReturnValue([mockWindow1, mockWindow2]);

            handler.register();

            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.THEME_SET);
            (nativeTheme as any).shouldUseDarkColors = false;
            listener!({}, 'light');

            // Both windows should receive the broadcast
            expect(mockWindow1.webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.THEME_CHANGED, {
                preference: 'light',
                effectiveTheme: 'light',
            });
            expect(mockWindow2.webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.THEME_CHANGED, {
                preference: 'light',
                effectiveTheme: 'light',
            });
        });

        it('should skip destroyed windows during broadcast', () => {
            const mockWindow1 = {
                id: 1,
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: { send: vi.fn() },
            };
            const mockDestroyedWindow = {
                id: 2,
                isDestroyed: vi.fn().mockReturnValue(true),
                webContents: { send: vi.fn() },
            };

            (BrowserWindow.getAllWindows as any).mockReturnValue([mockWindow1, mockDestroyedWindow]);

            handler.register();

            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.THEME_SET);
            (nativeTheme as any).shouldUseDarkColors = true;
            listener!({}, 'dark');

            // Only non-destroyed window should receive broadcast
            expect(mockWindow1.webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.THEME_CHANGED, {
                preference: 'dark',
                effectiveTheme: 'dark',
            });
            expect(mockDestroyedWindow.webContents.send).not.toHaveBeenCalled();
        });

        it('should broadcast to no windows if none are open', () => {
            (BrowserWindow.getAllWindows as any).mockReturnValue([]);

            handler.register();

            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.THEME_SET);

            // Should not throw when no windows
            expect(() => listener!({}, 'light')).not.toThrow();
        });

        it('should handle broadcast errors for individual windows gracefully', () => {
            const mockWindow1 = {
                id: 1,
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: {
                    send: vi.fn().mockImplementation(() => {
                        throw new Error('Send failed');
                    }),
                },
            };
            const mockWindow2 = {
                id: 2,
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: { send: vi.fn() },
            };

            (BrowserWindow.getAllWindows as any).mockReturnValue([mockWindow1, mockWindow2]);

            handler.register();

            const listener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.THEME_SET);

            // Should not throw - error for window 1 should not affect window 2
            expect(() => listener!({}, 'dark')).not.toThrow();

            // Window 2 should still receive broadcast despite window 1 error
            expect(mockWindow2.webContents.send).toHaveBeenCalled();
        });
    });

    describe('Full round-trip persistence', () => {
        it('should persist and restore theme across handler instances', async () => {
            // First handler sets theme
            handler.register();
            const setListener = (ipcMain as any)._listeners?.get(IPC_CHANNELS.THEME_SET);
            setListener!({}, 'dark');

            expect(sharedStoreData.theme).toBe('dark');

            // Reset ipcMain for new handler
            (ipcMain as any)._reset();

            // Create new handler with same store
            const handler2 = new ThemeIpcHandler(mockDeps);
            handler2.register();

            // Get theme should return persisted value
            const getHandler = (ipcMain as any)._handlers?.get(IPC_CHANNELS.THEME_GET);
            const result = await getHandler!();

            expect(result.preference).toBe('dark');
        });
    });
});

/**
 * Coordinated tests for AlwaysOnTopIpcHandler.
 *
 * Tests the coordination between AlwaysOnTopIpcHandler and the settings store,
 * verifying state broadcasting to all windows (2.3.13).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import { AlwaysOnTopIpcHandler } from '../../../src/main/managers/ipc/AlwaysOnTopIpcHandler';
import type { IpcHandlerDependencies } from '../../../src/main/managers/ipc/types';
import { IPC_CHANNELS } from '../../../src/shared/constants/ipc-channels';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../../src/main/utils/logger');
import { mockLogger } from '../../../src/main/utils/__mocks__/logger';

describe('AlwaysOnTopIpcHandler Coordinated Tests', () => {
    let sharedStoreData: Record<string, unknown>;
    let mockStore: {
        get: ReturnType<typeof vi.fn>;
        set: ReturnType<typeof vi.fn>;
    };
    let handler: AlwaysOnTopIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockWindowManager: {
        getMainWindow: ReturnType<typeof vi.fn>;
        setAlwaysOnTop: ReturnType<typeof vi.fn>;
        on: ReturnType<typeof vi.fn>;
        emit: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as unknown as { _reset?: () => void })._reset) {
            (ipcMain as unknown as { _reset: () => void })._reset();
        }
        if ((BrowserWindow as unknown as { _reset?: () => void })._reset) {
            (BrowserWindow as unknown as { _reset: () => void })._reset();
        }

        // SHARED store data to simulate persistence
        sharedStoreData = {
            alwaysOnTop: false,
        };

        mockStore = {
            get: vi.fn((key: string) => sharedStoreData[key]),
            set: vi.fn((key: string, value: unknown) => {
                sharedStoreData[key] = value;
            }),
        };

        // Create mock windowManager with setAlwaysOnTop method
        mockWindowManager = {
            getMainWindow: vi.fn(),
            setAlwaysOnTop: vi.fn(),
            on: vi.fn(),
            emit: vi.fn(),
        };

        // Create mock dependencies
        mockDeps = {
            store: mockStore as unknown as IpcHandlerDependencies['store'],
            logger: mockLogger as unknown as IpcHandlerDependencies['logger'],
            windowManager: mockWindowManager as unknown as IpcHandlerDependencies['windowManager'],
        };

        handler = new AlwaysOnTopIpcHandler(mockDeps);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('2.3.13 - State broadcasts to all windows', () => {
        it('should broadcast always-on-top change to all open windows', () => {
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

            (BrowserWindow.getAllWindows as ReturnType<typeof vi.fn>).mockReturnValue([mockWindow1, mockWindow2]);

            handler.register();

            // Get the always-on-top-changed listener
            const onCall = mockWindowManager.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'always-on-top-changed'
            );
            expect(onCall).toBeDefined();
            const listener = onCall![1] as (enabled: boolean) => void;

            // Trigger state change
            listener(true);

            // Both windows should receive the broadcast
            expect(mockWindow1.webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED, {
                enabled: true,
            });
            expect(mockWindow2.webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED, {
                enabled: true,
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

            (BrowserWindow.getAllWindows as ReturnType<typeof vi.fn>).mockReturnValue([
                mockWindow1,
                mockDestroyedWindow,
            ]);

            handler.register();

            const onCall = mockWindowManager.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'always-on-top-changed'
            );
            const listener = onCall![1] as (enabled: boolean) => void;

            listener(true);

            // Only non-destroyed window should receive broadcast
            expect(mockWindow1.webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED, {
                enabled: true,
            });
            expect(mockDestroyedWindow.webContents.send).not.toHaveBeenCalled();
        });
    });

    describe('State persistence round-trip', () => {
        it('should persist and restore always-on-top state across handler instances', () => {
            // First handler sets up and state changes
            handler.register();

            // Get the always-on-top-changed listener
            const onCall = mockWindowManager.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'always-on-top-changed'
            );
            expect(onCall).toBeDefined();
            const listener = onCall![1] as (enabled: boolean) => void;

            // Simulate state change
            listener(true);

            expect(sharedStoreData.alwaysOnTop).toBe(true);

            // Reset ipcMain for new handler
            (ipcMain as { _reset?: () => void })._reset?.();
            mockWindowManager.on.mockClear();
            mockWindowManager.setAlwaysOnTop.mockClear();

            // Create new handler with same store
            const handler2 = new AlwaysOnTopIpcHandler(mockDeps);
            handler2.initialize();

            // Should initialize with persisted value
            expect(mockWindowManager.setAlwaysOnTop).toHaveBeenCalledWith(true);
        });

        it('should persist state through multiple toggles', () => {
            handler.register();

            const onCall = mockWindowManager.on.mock.calls.find(
                (call: unknown[]) => call[0] === 'always-on-top-changed'
            );
            const listener = onCall![1] as (enabled: boolean) => void;

            // Multiple state changes
            listener(true);
            expect(sharedStoreData.alwaysOnTop).toBe(true);

            listener(false);
            expect(sharedStoreData.alwaysOnTop).toBe(false);

            listener(true);
            expect(sharedStoreData.alwaysOnTop).toBe(true);

            // Final value should be last change
            expect(sharedStoreData.alwaysOnTop).toBe(true);
        });
    });

    describe('IPC handler coordination', () => {
        it('should get-always-on-top return current state from store', async () => {
            sharedStoreData.alwaysOnTop = true;
            handler.register();

            const getHandler = (ipcMain as { _handlers?: Map<string, (...args: unknown[]) => unknown> })._handlers?.get(
                IPC_CHANNELS.ALWAYS_ON_TOP_GET
            );
            const result = await getHandler!();

            expect(result).toEqual({ enabled: true });
        });

        it('should set-always-on-top call windowManager.setAlwaysOnTop', () => {
            handler.register();

            const setListener = (ipcMain as { _listeners?: Map<string, (...args: unknown[]) => void> })._listeners?.get(
                IPC_CHANNELS.ALWAYS_ON_TOP_SET
            );
            setListener!({}, true);

            expect(mockWindowManager.setAlwaysOnTop).toHaveBeenCalledWith(true);
        });

        it('should reject non-boolean values for set', () => {
            handler.register();

            const setListener = (ipcMain as { _listeners?: Map<string, (...args: unknown[]) => void> })._listeners?.get(
                IPC_CHANNELS.ALWAYS_ON_TOP_SET
            );
            setListener!({}, 'invalid');

            expect(mockWindowManager.setAlwaysOnTop).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid alwaysOnTop value: invalid');
        });
    });

    describe('Initialization behavior', () => {
        it('should apply stored true state on initialization', () => {
            sharedStoreData.alwaysOnTop = true;

            handler.initialize();

            expect(mockWindowManager.setAlwaysOnTop).toHaveBeenCalledWith(true);
        });

        it('should not call setAlwaysOnTop on initialization when state is false', () => {
            sharedStoreData.alwaysOnTop = false;

            handler.initialize();

            expect(mockWindowManager.setAlwaysOnTop).not.toHaveBeenCalled();
        });

        it('should handle undefined stored value (defaults to false)', () => {
            sharedStoreData.alwaysOnTop = undefined;

            handler.initialize();

            expect(mockWindowManager.setAlwaysOnTop).not.toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith('Always on top initialized to: false');
        });
    });
});

/**
 * Coordinated tests for ZoomIpcHandler.
 *
 * Tests the coordination between ZoomIpcHandler and the settings store,
 * verifying zoom level initialization from stored preference.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import { ZoomIpcHandler } from '../../../src/main/managers/ipc/ZoomIpcHandler';
import type { IpcHandlerDependencies } from '../../../src/main/managers/ipc/types';
import { IPC_CHANNELS } from '../../../src/shared/constants/ipc-channels';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../../src/main/utils/logger');
import { mockLogger } from '../../../src/main/utils/__mocks__/logger';

describe('ZoomIpcHandler Coordinated Tests', () => {
    let sharedStoreData: Record<string, unknown>;
    let mockStore: {
        get: ReturnType<typeof vi.fn>;
        set: ReturnType<typeof vi.fn>;
    };
    let handler: ZoomIpcHandler;
    let mockDeps: IpcHandlerDependencies;
    let mockWindowManager: {
        getMainWindow: ReturnType<typeof vi.fn>;
        createMainWindow: ReturnType<typeof vi.fn>;
        getZoomLevel: ReturnType<typeof vi.fn>;
        zoomIn: ReturnType<typeof vi.fn>;
        zoomOut: ReturnType<typeof vi.fn>;
        initializeZoomLevel: ReturnType<typeof vi.fn>;
        applyZoomLevel: ReturnType<typeof vi.fn>;
        on: ReturnType<typeof vi.fn>;
        emit: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as { _reset?: () => void })._reset) (ipcMain as { _reset: () => void })._reset();
        if ((BrowserWindow as unknown as { _reset?: () => void })._reset) {
            (BrowserWindow as unknown as { _reset: () => void })._reset();
        }

        // SHARED store data to simulate persistence
        sharedStoreData = {
            zoomLevel: 100,
        };

        mockStore = {
            get: vi.fn((key: string) => sharedStoreData[key]),
            set: vi.fn((key: string, value: unknown) => {
                sharedStoreData[key] = value;
            }),
        };

        // Create mock windowManager with zoom methods
        mockWindowManager = {
            getMainWindow: vi.fn(),
            createMainWindow: vi.fn(),
            getZoomLevel: vi.fn().mockReturnValue(100),
            zoomIn: vi.fn(),
            zoomOut: vi.fn(),
            initializeZoomLevel: vi.fn(),
            applyZoomLevel: vi.fn(),
            on: vi.fn(),
            emit: vi.fn(),
        };

        // Create mock dependencies
        mockDeps = {
            store: mockStore as unknown as IpcHandlerDependencies['store'],
            logger: mockLogger as unknown as IpcHandlerDependencies['logger'],
            windowManager: mockWindowManager as unknown as IpcHandlerDependencies['windowManager'],
        };

        handler = new ZoomIpcHandler(mockDeps);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('2.2.14 - Initialization applies stored zoom level', () => {
        it('should initialize zoom level from stored preference', () => {
            sharedStoreData.zoomLevel = 125;

            handler.initialize();

            expect(mockWindowManager.initializeZoomLevel).toHaveBeenCalledWith(125);
            expect(mockLogger.log).toHaveBeenCalledWith('Zoom level initialized');
        });

        it('should handle undefined stored zoom level gracefully', () => {
            sharedStoreData.zoomLevel = undefined;

            handler.initialize();

            expect(mockWindowManager.initializeZoomLevel).toHaveBeenCalledWith(undefined);
        });

        it('should read stored zoom level correctly', () => {
            sharedStoreData.zoomLevel = 150;

            handler.initialize();

            expect(mockStore.get).toHaveBeenCalledWith('zoomLevel');
            expect(mockWindowManager.initializeZoomLevel).toHaveBeenCalledWith(150);
        });
    });

    describe('Zoom level persistence round-trip', () => {
        it('should persist and restore zoom level across handler instances', async () => {
            // First handler sets up and zoom level changes
            handler.register();

            // Get the zoom-level-changed listener
            const onCall = mockWindowManager.on.mock.calls.find((call: unknown[]) => call[0] === 'zoom-level-changed');
            expect(onCall).toBeDefined();
            const listener = onCall![1] as (level: number) => void;

            // Simulate zoom level change
            listener(130);

            expect(sharedStoreData.zoomLevel).toBe(130);

            // Reset ipcMain for new handler
            (ipcMain as { _reset?: () => void })._reset?.();
            mockWindowManager.on.mockClear();

            // Create new handler with same store
            const handler2 = new ZoomIpcHandler(mockDeps);
            handler2.initialize();

            // Should initialize with persisted value
            expect(mockWindowManager.initializeZoomLevel).toHaveBeenCalledWith(130);
        });

        it('should persist zoom level through multiple changes', () => {
            handler.register();

            const onCall = mockWindowManager.on.mock.calls.find((call: unknown[]) => call[0] === 'zoom-level-changed');
            const listener = onCall![1] as (level: number) => void;

            // Multiple zoom changes
            listener(110);
            expect(sharedStoreData.zoomLevel).toBe(110);

            listener(125);
            expect(sharedStoreData.zoomLevel).toBe(125);

            listener(90);
            expect(sharedStoreData.zoomLevel).toBe(90);

            // Final value should be last change
            expect(sharedStoreData.zoomLevel).toBe(90);
        });
    });

    describe('IPC handler coordination', () => {
        it('should get-level return current zoom from windowManager', async () => {
            mockWindowManager.getZoomLevel.mockReturnValue(125);
            handler.register();

            const getHandler = (ipcMain as { _handlers?: Map<string, (...args: unknown[]) => unknown> })._handlers?.get(
                IPC_CHANNELS.ZOOM_GET_LEVEL
            );
            const result = await getHandler!();

            expect(result).toBe(125);
        });

        it('should zoom-in call windowManager and return new level', async () => {
            mockWindowManager.getZoomLevel.mockReturnValue(110);
            handler.register();

            const zoomInHandler = (
                ipcMain as { _handlers?: Map<string, (...args: unknown[]) => unknown> }
            )._handlers?.get(IPC_CHANNELS.ZOOM_IN);
            const result = await zoomInHandler!();

            expect(mockWindowManager.zoomIn).toHaveBeenCalled();
            expect(result).toBe(110);
        });

        it('should zoom-out call windowManager and return new level', async () => {
            mockWindowManager.getZoomLevel.mockReturnValue(90);
            handler.register();

            const zoomOutHandler = (
                ipcMain as { _handlers?: Map<string, (...args: unknown[]) => unknown> }
            )._handlers?.get(IPC_CHANNELS.ZOOM_OUT);
            const result = await zoomOutHandler!();

            expect(mockWindowManager.zoomOut).toHaveBeenCalled();
            expect(result).toBe(90);
        });
    });

    describe('Multi-window broadcast coordination', () => {
        it('should broadcast zoom level change to all open windows', () => {
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

            const onCall = mockWindowManager.on.mock.calls.find((call: unknown[]) => call[0] === 'zoom-level-changed');
            const listener = onCall![1] as (level: number) => void;

            listener(125);

            // Both windows should receive the broadcast
            expect(mockWindow1.webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.ZOOM_LEVEL_CHANGED, 125);
            expect(mockWindow2.webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.ZOOM_LEVEL_CHANGED, 125);
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

            const onCall = mockWindowManager.on.mock.calls.find((call: unknown[]) => call[0] === 'zoom-level-changed');
            const listener = onCall![1] as (level: number) => void;

            listener(125);

            // Only non-destroyed window should receive broadcast
            expect(mockWindow1.webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.ZOOM_LEVEL_CHANGED, 125);
            expect(mockDestroyedWindow.webContents.send).not.toHaveBeenCalled();
        });
    });
});

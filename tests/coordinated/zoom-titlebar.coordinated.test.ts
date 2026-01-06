/**
 * Coordinated tests for zoom titlebar IPC integration.
 * Tests IPC handlers for zoom functionality exposed via custom titlebar menu.
 *
 * Tasks covered: 9.3.1 - 9.3.5
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import IpcManager from '../../src/main/managers/ipcManager';
import WindowManager from '../../src/main/managers/windowManager';
import { IPC_CHANNELS } from '../../src/shared/constants/ipc-channels';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/logger';

// Mock electron-updater
vi.mock('electron-updater', () => ({
    autoUpdater: {
        on: vi.fn(),
        checkForUpdates: vi.fn().mockResolvedValue(undefined),
        quitAndInstall: vi.fn(),
        autoDownload: true,
        autoInstallOnAppQuit: true,
    },
}));

describe('Zoom Titlebar Coordinated Tests', () => {
    let sharedStoreData: Record<string, any>;
    let mockStore: any;
    let registeredHandlers: Record<string, (event: any, ...args: any[]) => any>;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

        // Track registered handlers
        registeredHandlers = {};

        // Capture handlers registered via ipcMain.handle
        vi.spyOn(ipcMain, 'handle').mockImplementation((channel: string, handler: any) => {
            registeredHandlers[channel] = handler;
            return undefined;
        });

        // SHARED store data to simulate persistence
        sharedStoreData = {
            zoomLevel: 100,
            alwaysOnTop: false,
        };

        mockStore = {
            get: vi.fn((key: string) => sharedStoreData[key]),
            set: vi.fn((key: string, value: any) => {
                sharedStoreData[key] = value;
            }),
        };
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    describe('9.3.1 - Test zoom IPC handlers registered on setup', () => {
        it('should register zoom:get-level handler via ipcMain.handle', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.ZOOM_GET_LEVEL, expect.any(Function));
        });

        it('should register zoom:zoom-in handler via ipcMain.handle', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.ZOOM_IN, expect.any(Function));
        });

        it('should register zoom:zoom-out handler via ipcMain.handle', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            expect(ipcMain.handle).toHaveBeenCalledWith(IPC_CHANNELS.ZOOM_OUT, expect.any(Function));
        });

        it('should register all three zoom handlers', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            const handleCalls = (ipcMain.handle as any).mock.calls;
            const registeredChannels = handleCalls.map((call: any[]) => call[0]);

            expect(registeredChannels).toContain(IPC_CHANNELS.ZOOM_GET_LEVEL);
            expect(registeredChannels).toContain(IPC_CHANNELS.ZOOM_IN);
            expect(registeredChannels).toContain(IPC_CHANNELS.ZOOM_OUT);
        });
    });

    describe('9.3.2 - Test zoom:get-level returns current zoom level', () => {
        it('should return windowManager.getZoomLevel() value', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            // Get the registered handler
            const handler = registeredHandlers[IPC_CHANNELS.ZOOM_GET_LEVEL];
            expect(handler).toBeDefined();

            // Handler should return the current zoom level
            const result = handler({});
            expect(result).toBe(100); // Default zoom level
        });

        it('should return updated zoom level after change', () => {
            sharedStoreData.zoomLevel = 150;

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            // Get the registered handler
            const handler = registeredHandlers[IPC_CHANNELS.ZOOM_GET_LEVEL];

            // Handler should return the initialized zoom level
            const result = handler({});
            expect(result).toBe(150);
        });

        it('should return 100 when windowManager has default zoom', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            const handler = registeredHandlers[IPC_CHANNELS.ZOOM_GET_LEVEL];
            expect(handler({})).toBe(100);
        });
    });

    describe('9.3.3 - Test zoom:zoom-in calls windowManager.zoomIn()', () => {
        it('should invoke zoomIn() on windowManager', () => {
            const windowManager = new WindowManager(false);
            const zoomInSpy = vi.spyOn(windowManager, 'zoomIn');

            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            const handler = registeredHandlers[IPC_CHANNELS.ZOOM_IN];
            expect(handler).toBeDefined();

            // Create main window so zoomIn has a target
            windowManager.createMainWindow();
            handler({});

            expect(zoomInSpy).toHaveBeenCalled();
        });

        it('should return new zoom level after zoomIn', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            const handler = registeredHandlers[IPC_CHANNELS.ZOOM_IN];

            // Create main window
            windowManager.createMainWindow();
            const result = handler({});

            // Should return 110% (next step from 100%)
            expect(result).toBe(110);
        });

        it('should update internal zoom level state', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            windowManager.createMainWindow();

            // Call zoom in handler
            const zoomInHandler = registeredHandlers[IPC_CHANNELS.ZOOM_IN];
            zoomInHandler({});

            // Verify via get-level handler
            const getLevelHandler = registeredHandlers[IPC_CHANNELS.ZOOM_GET_LEVEL];
            expect(getLevelHandler({})).toBe(110);
        });
    });

    describe('9.3.4 - Test zoom:zoom-out calls windowManager.zoomOut()', () => {
        it('should invoke zoomOut() on windowManager', () => {
            const windowManager = new WindowManager(false);
            const zoomOutSpy = vi.spyOn(windowManager, 'zoomOut');

            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            const handler = registeredHandlers[IPC_CHANNELS.ZOOM_OUT];
            expect(handler).toBeDefined();

            // Create main window so zoomOut has a target
            windowManager.createMainWindow();
            handler({});

            expect(zoomOutSpy).toHaveBeenCalled();
        });

        it('should return new zoom level after zoomOut', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            const handler = registeredHandlers[IPC_CHANNELS.ZOOM_OUT];

            // Create main window
            windowManager.createMainWindow();
            const result = handler({});

            // Should return 90% (previous step from 100%)
            expect(result).toBe(90);
        });

        it('should update internal zoom level state', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            windowManager.createMainWindow();

            // Call zoom out handler
            const zoomOutHandler = registeredHandlers[IPC_CHANNELS.ZOOM_OUT];
            zoomOutHandler({});

            // Verify via get-level handler
            const getLevelHandler = registeredHandlers[IPC_CHANNELS.ZOOM_GET_LEVEL];
            expect(getLevelHandler({})).toBe(90);
        });
    });

    describe('9.3.5 - Test zoom-level-changed event sent to renderer', () => {
        it('should broadcast zoom-level-changed IPC message when zoom changes', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            // Create a window to receive broadcasts
            windowManager.createMainWindow();
            const mainWindow = windowManager.getMainWindow();
            expect(mainWindow).not.toBeNull();

            // Clear previous calls
            (mainWindow!.webContents.send as any).mockClear();

            // Trigger zoom change via setZoomLevel
            windowManager.setZoomLevel(150);

            // Verify IPC message was sent
            expect(mainWindow!.webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.ZOOM_LEVEL_CHANGED, 150);
        });

        it('should broadcast after zoomIn via IPC handler', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            windowManager.createMainWindow();
            const mainWindow = windowManager.getMainWindow();
            (mainWindow!.webContents.send as any).mockClear();

            // Call zoom in handler
            const zoomInHandler = registeredHandlers[IPC_CHANNELS.ZOOM_IN];
            zoomInHandler({});

            // Verify IPC message was sent with new zoom level (110%)
            expect(mainWindow!.webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.ZOOM_LEVEL_CHANGED, 110);
        });

        it('should broadcast after zoomOut via IPC handler', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            windowManager.createMainWindow();
            const mainWindow = windowManager.getMainWindow();
            (mainWindow!.webContents.send as any).mockClear();

            // Call zoom out handler
            const zoomOutHandler = registeredHandlers[IPC_CHANNELS.ZOOM_OUT];
            zoomOutHandler({});

            // Verify IPC message was sent with new zoom level (90%)
            expect(mainWindow!.webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.ZOOM_LEVEL_CHANGED, 90);
        });

        it('should broadcast to all open windows', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            // Create main window
            windowManager.createMainWindow();

            // Get all windows (BrowserWindow.getAllWindows is mocked)
            const windows = BrowserWindow.getAllWindows();

            // Clear all send mocks
            windows.forEach((win) => {
                (win.webContents.send as any).mockClear();
            });

            // Trigger zoom change
            windowManager.setZoomLevel(125);

            // Verify all windows received the broadcast
            windows.forEach((win) => {
                expect(win.webContents.send).toHaveBeenCalledWith(IPC_CHANNELS.ZOOM_LEVEL_CHANGED, 125);
            });
        });

        it('should not throw when window is destroyed during broadcast', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            windowManager.createMainWindow();
            const mainWindow = windowManager.getMainWindow();

            // Mock window as destroyed
            (mainWindow!.isDestroyed as any).mockReturnValue(true);

            // Should not throw
            expect(() => windowManager.setZoomLevel(150)).not.toThrow();
        });
    });

    describe('Integration: End-to-end IPC flow', () => {
        it('should persist zoom level to store when changed via IPC', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            windowManager.createMainWindow();
            mockStore.set.mockClear();

            // Call zoom in handler
            const zoomInHandler = registeredHandlers[IPC_CHANNELS.ZOOM_IN];
            zoomInHandler({});

            // Verify store was updated
            expect(mockStore.set).toHaveBeenCalledWith('zoomLevel', 110);
        });

        it('should return correct value from get-level after multiple zoom operations', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            windowManager.createMainWindow();

            // Zoom in twice
            const zoomInHandler = registeredHandlers[IPC_CHANNELS.ZOOM_IN];
            zoomInHandler({});
            zoomInHandler({});

            // Get level should show 125%
            const getLevelHandler = registeredHandlers[IPC_CHANNELS.ZOOM_GET_LEVEL];
            expect(getLevelHandler({})).toBe(125);
        });
    });
});

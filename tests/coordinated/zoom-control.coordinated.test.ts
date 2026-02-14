import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import IpcManager from '../../src/main/managers/ipcManager';
import WindowManager from '../../src/main/managers/windowManager';
import { platformAdapterPresets, useMockPlatformAdapter, resetPlatformAdapterForTests } from '../helpers/mocks';

vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/__mocks__/logger';

vi.mock('electron-updater', () => ({
    autoUpdater: {
        on: vi.fn(),
        checkForUpdates: vi.fn().mockResolvedValue(undefined),
        quitAndInstall: vi.fn(),
        autoDownload: true,
        autoInstallOnAppQuit: true,
    },
}));

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

describe('Zoom Control Coordinated Tests', () => {
    let sharedStoreData: Record<string, any>;
    let mockStore: any;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

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

    describe('5.1 - IpcManager initializes zoom from store on setup', () => {
        it('should call windowManager.initializeZoomLevel() with stored value during setupIpcHandlers()', () => {
            sharedStoreData.zoomLevel = 125;

            const windowManager = new WindowManager(false);
            const initSpy = vi.spyOn(windowManager, 'initializeZoomLevel');

            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            expect(mockStore.get).toHaveBeenCalledWith('zoomLevel');
            expect(initSpy).toHaveBeenCalledWith(125);
        });

        it('should call initializeZoomLevel with undefined if zoomLevel not in store', () => {
            delete sharedStoreData.zoomLevel;

            const windowManager = new WindowManager(false);
            const initSpy = vi.spyOn(windowManager, 'initializeZoomLevel');

            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            expect(initSpy).toHaveBeenCalledWith(undefined);
        });

        it('should call applyZoomLevel after setupIpcHandlers', () => {
            sharedStoreData.zoomLevel = 150;

            const windowManager = new WindowManager(false);
            const applySpy = vi.spyOn(windowManager, 'applyZoomLevel');

            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            vi.advanceTimersByTime(200);

            expect(applySpy).toHaveBeenCalled();
        });
    });

    describe('5.2 - zoom-level-changed event triggers store persistence', () => {
        it('should call store.set(zoomLevel) when WindowManager emits zoom-level-changed', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            mockStore.set.mockClear();

            windowManager.createMainWindow();
            windowManager.setZoomLevel(150);

            expect(mockStore.set).toHaveBeenCalledWith('zoomLevel', 150);
        });

        it('should persist zoom level after zoomIn()', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();
            mockStore.set.mockClear();

            windowManager.createMainWindow();
            windowManager.zoomIn();

            expect(mockStore.set).toHaveBeenCalledWith('zoomLevel', 110);
        });

        it('should persist zoom level after zoomOut()', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();
            mockStore.set.mockClear();

            windowManager.createMainWindow();
            windowManager.zoomOut();

            expect(mockStore.set).toHaveBeenCalledWith('zoomLevel', 90);
        });

        it('should update sharedStoreData when zoom changes', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            windowManager.createMainWindow();
            windowManager.setZoomLevel(175);

            expect(sharedStoreData.zoomLevel).toBe(175);
        });
    });

    describe('5.3 - Invalid stored zoom values are sanitized on initialization', () => {
        it('should sanitize NaN stored value to 100%', () => {
            sharedStoreData.zoomLevel = NaN;

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            expect(windowManager.getZoomLevel()).toBe(100);
        });

        it('should sanitize null stored value to 100%', () => {
            sharedStoreData.zoomLevel = null;

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            expect(windowManager.getZoomLevel()).toBe(100);
        });

        it('should sanitize undefined stored value to 100%', () => {
            delete sharedStoreData.zoomLevel;

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            expect(windowManager.getZoomLevel()).toBe(100);
        });

        it('should sanitize negative stored value to 50% (min)', () => {
            sharedStoreData.zoomLevel = -50;

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            expect(windowManager.getZoomLevel()).toBe(50);
        });

        it('should sanitize above-max stored value to 200% (max)', () => {
            sharedStoreData.zoomLevel = 500;

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            expect(windowManager.getZoomLevel()).toBe(200);
        });
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('5.4 - Cross-platform behavior on %s', (platform) => {
        beforeEach(() => {
            useMockPlatformAdapter(adapterForPlatform[platform]());
        });

        afterEach(() => {
            resetPlatformAdapterForTests();
        });

        it('should initialize zoom from store on setup', () => {
            sharedStoreData.zoomLevel = 150;

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            expect(windowManager.getZoomLevel()).toBe(150);
        });

        it('should persist zoom level changes to store', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();
            mockStore.set.mockClear();

            windowManager.createMainWindow();
            windowManager.setZoomLevel(175);

            expect(mockStore.set).toHaveBeenCalledWith('zoomLevel', 175);
            expect(sharedStoreData.zoomLevel).toBe(175);
        });

        it('should sanitize invalid stored values identically', () => {
            sharedStoreData.zoomLevel = NaN;

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            expect(windowManager.getZoomLevel()).toBe(100);
        });
    });

    describe('5.5 - Menu item click triggers zoom change', () => {
        it('should change zoom level when menu zoomIn action is triggered', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            windowManager.createMainWindow();
            const initialZoom = windowManager.getZoomLevel();

            windowManager.zoomIn();

            expect(windowManager.getZoomLevel()).toBe(110);
            expect(windowManager.getZoomLevel()).toBeGreaterThan(initialZoom);
        });

        it('should change zoom level when menu zoomOut action is triggered', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            windowManager.createMainWindow();
            const initialZoom = windowManager.getZoomLevel();

            windowManager.zoomOut();

            expect(windowManager.getZoomLevel()).toBe(90);
            expect(windowManager.getZoomLevel()).toBeLessThan(initialZoom);
        });
    });

    describe('5.6 - Menu label updates after zoom change', () => {
        it('should emit zoom-level-changed event that triggers menu rebuild', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            const zoomChangedListener = vi.fn();
            windowManager.on('zoom-level-changed', zoomChangedListener);

            windowManager.createMainWindow();
            windowManager.setZoomLevel(150);

            expect(zoomChangedListener).toHaveBeenCalledWith(150);
        });

        it('should provide correct zoom level for menu label via getZoomLevel()', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            windowManager.createMainWindow();
            windowManager.setZoomLevel(175);

            expect(windowManager.getZoomLevel()).toBe(175);
        });
    });

    describe('5.7 - Zoom level applied after main window creation', () => {
        it('should call applyZoomLevel() after setupIpcHandlers', () => {
            sharedStoreData.zoomLevel = 150;

            const windowManager = new WindowManager(false);
            const applySpy = vi.spyOn(windowManager, 'applyZoomLevel');

            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            vi.advanceTimersByTime(200);

            expect(applySpy).toHaveBeenCalled();
        });

        it('should have correct zoom level initialized before window creation', () => {
            sharedStoreData.zoomLevel = 125;

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            expect(windowManager.getZoomLevel()).toBe(125);

            windowManager.createMainWindow();

            expect(windowManager.getZoomLevel()).toBe(125);
        });
    });

    describe('5.8 - Store persistence failure is logged but does not throw', () => {
        it('should not throw when store.set is called', () => {
            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            windowManager.createMainWindow();

            expect(() => windowManager.setZoomLevel(150)).not.toThrow();
        });

        it('should continue operation when store.set returns undefined', () => {
            mockStore.set.mockReturnValue(undefined);

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            windowManager.createMainWindow();

            expect(() => windowManager.setZoomLevel(175)).not.toThrow();
            expect(windowManager.getZoomLevel()).toBe(175);
        });

        it('should handle store.set throwing an error gracefully', () => {
            mockStore.set.mockImplementation(() => {
                throw new Error('Store write failed');
            });

            const windowManager = new WindowManager(false);
            const ipcManager = new IpcManager(windowManager, null, null, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            windowManager.createMainWindow();

            windowManager.setZoomLevel(150);
            expect(windowManager.getZoomLevel()).toBe(150);
        });
    });
});

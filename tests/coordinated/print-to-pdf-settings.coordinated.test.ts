/**
 * Integration tests for Print to PDF settings persistence.
 * Verifies that settings are correctly persisted and restored using the SettingsStore.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import IpcManager from '../../src/main/managers/ipcManager';
import WindowManager from '../../src/main/managers/windowManager';
import HotkeyManager from '../../src/main/managers/hotkeyManager';
import MenuManager from '../../src/main/managers/menuManager';
import PrintManager from '../../src/main/managers/printManager';

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

describe('Print to PDF Settings Persistence', () => {
    let sharedStoreData: Record<string, any>;
    let mockStore: any;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

        // SHARED store data to simulate persistence
        sharedStoreData = {
            // Default empty store for fresh install tests
        };

        mockStore = {
            get: vi.fn((key: string) => sharedStoreData[key]),
            set: vi.fn((key: string, value: any) => {
                sharedStoreData[key] = value;
            }),
            getAll: vi.fn(() => ({ ...sharedStoreData })),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Default Values (Fresh Install)', () => {
        it('should use default values when store is empty', () => {
            const windowManager = new WindowManager(false);
            const _menuManager = new MenuManager(windowManager);
            // Initialize HotkeyManager with empty store interaction (defaults)
            const hotkeyManager = new HotkeyManager(windowManager);

            // Verify defaults using correct API
            expect(hotkeyManager.isIndividualEnabled('printToPdf')).toBe(true); // Default enabled
            expect(hotkeyManager.getAccelerator('printToPdf')).toBe('CommandOrControl+Shift+P'); // Default accelerator
        });
    });

    describe('App Restart Simulation', () => {
        it('should restore persisted settings on initialization', () => {
            // Seed store with custom values
            sharedStoreData.hotkeyPrintToPdf = false;
            sharedStoreData.acceleratorPrintToPdf = 'CommandOrControl+Shift+L';

            const windowManager = new WindowManager(false);
            const menuManager = new MenuManager(windowManager);
            const hotkeyManager = new HotkeyManager(windowManager);
            const printManager = new PrintManager(windowManager, hotkeyManager, menuManager);

            // Initialize IpcManager - this is where we expect sync to happen in the real app
            const ipcManager = new IpcManager(
                windowManager,
                hotkeyManager,
                null,
                printManager,
                null,
                mockStore,
                mockLogger
            );
            // Initialization now happens during setupIpcHandlers (via handler.initialize())
            ipcManager.setupIpcHandlers();

            // Verify store was queried
            // We expect IpcManager (or logic we add) to read these
            expect(mockStore.get).toHaveBeenCalledWith('hotkeyPrintToPdf');
            expect(mockStore.get).toHaveBeenCalledWith('acceleratorPrintToPdf');

            // Verify custom values were pushed to HotkeyManager
            expect(hotkeyManager.isIndividualEnabled('printToPdf')).toBe(false);
            expect(hotkeyManager.getAccelerator('printToPdf')).toBe('CommandOrControl+Shift+L');
        });
    });

    describe('IPC Updates', () => {
        it('should persist settings when updated via IPC', () => {
            const windowManager = new WindowManager(false);
            const menuManager = new MenuManager(windowManager);
            const hotkeyManager = new HotkeyManager(windowManager);
            const printManager = new PrintManager(windowManager, hotkeyManager, menuManager);
            const ipcManager = new IpcManager(
                windowManager,
                hotkeyManager,
                null, // updateManager
                printManager,
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();

            // 1. Update Enabled State
            const setIndividualHandler = (ipcMain as any)._listeners.get('hotkeys:individual:set');
            expect(setIndividualHandler).toBeDefined();

            // Disable printToPdf
            setIndividualHandler({}, 'printToPdf', false);

            // Verify store update
            expect(mockStore.set).toHaveBeenCalledWith('hotkeyPrintToPdf', false);
            expect(sharedStoreData.hotkeyPrintToPdf).toBe(false);
            // Verify HotkeyManager update
            expect(hotkeyManager.isIndividualEnabled('printToPdf')).toBe(false);

            // 2. Update Accelerator
            const setAcceleratorHandler = (ipcMain as any)._listeners.get('hotkeys:accelerator:set');
            expect(setAcceleratorHandler).toBeDefined();

            // Change accelerator
            setAcceleratorHandler({}, 'printToPdf', 'CommandOrControl+Alt+P');

            // Verify store update
            expect(mockStore.set).toHaveBeenCalledWith('acceleratorPrintToPdf', 'CommandOrControl+Alt+P');
            expect(sharedStoreData.acceleratorPrintToPdf).toBe('CommandOrControl+Alt+P');
            // Verify HotkeyManager update
            expect(hotkeyManager.getAccelerator('printToPdf')).toBe('CommandOrControl+Alt+P');
        });
    });

    describe('Cross-Window Broadcast', () => {
        it('should broadcast enable/disable state to all windows', () => {
            const windowManager = new WindowManager(false);
            const hotkeyManager = new HotkeyManager(windowManager);
            const ipcManager = new IpcManager(windowManager, hotkeyManager, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            // Mock multiple open windows
            const win1 = { id: 1, isDestroyed: () => false, webContents: { send: vi.fn() } };
            const win2 = { id: 2, isDestroyed: () => false, webContents: { send: vi.fn() } };
            (BrowserWindow.getAllWindows as any).mockReturnValue([win1, win2]);

            // Trigger 'hotkeys:individual:set' for printToPdf
            const setIndividualHandler = (ipcMain as any)._listeners.get('hotkeys:individual:set');
            setIndividualHandler({}, 'printToPdf', false);

            // Verify broadcast to all windows
            const expectedPayload = expect.objectContaining({
                printToPdf: false,
            });

            expect(win1.webContents.send).toHaveBeenCalledWith('hotkeys:individual:changed', expectedPayload);
            expect(win2.webContents.send).toHaveBeenCalledWith('hotkeys:individual:changed', expectedPayload);
        });

        it('should broadcast accelerator changes to all windows', () => {
            const windowManager = new WindowManager(false);
            const hotkeyManager = new HotkeyManager(windowManager);
            const ipcManager = new IpcManager(windowManager, hotkeyManager, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            // Mock multiple open windows
            const win1 = { id: 1, isDestroyed: () => false, webContents: { send: vi.fn() } };
            const win2 = { id: 2, isDestroyed: () => false, webContents: { send: vi.fn() } };
            (BrowserWindow.getAllWindows as any).mockReturnValue([win1, win2]);

            // Trigger 'hotkeys:accelerator:set' for printToPdf
            const setAcceleratorHandler = (ipcMain as any)._listeners.get('hotkeys:accelerator:set');
            const newAccelerator = 'CommandOrControl+Alt+Shift+P';
            setAcceleratorHandler({}, 'printToPdf', newAccelerator);

            // Verify broadcast to all windows
            const expectedPayload = expect.objectContaining({
                printToPdf: newAccelerator,
            });

            expect(win1.webContents.send).toHaveBeenCalledWith('hotkeys:accelerator:changed', expectedPayload);
            expect(win2.webContents.send).toHaveBeenCalledWith('hotkeys:accelerator:changed', expectedPayload);
        });

        it('should skip destroyed windows during broadcast without crashing', () => {
            const windowManager = new WindowManager(false);
            const hotkeyManager = new HotkeyManager(windowManager);
            const ipcManager = new IpcManager(windowManager, hotkeyManager, null, null, null, mockStore, mockLogger);
            ipcManager.setupIpcHandlers();

            // Mock one active and one destroyed window
            const activeWin = { id: 1, isDestroyed: () => false, webContents: { send: vi.fn() } };
            const destroyedWin = { id: 2, isDestroyed: () => true, webContents: { send: vi.fn() } };
            (BrowserWindow.getAllWindows as any).mockReturnValue([activeWin, destroyedWin]);

            // Trigger 'hotkeys:individual:set'
            const setIndividualHandler = (ipcMain as any)._listeners.get('hotkeys:individual:set');
            setIndividualHandler({}, 'printToPdf', true);

            // Verify active window received update
            expect(activeWin.webContents.send).toHaveBeenCalledWith('hotkeys:individual:changed', expect.any(Object));

            // Verify destroyed window was skipped
            expect(destroyedWin.webContents.send).not.toHaveBeenCalled();

            // If we are here, it didn't crash
            expect(true).toBe(true);
        });
    });
});

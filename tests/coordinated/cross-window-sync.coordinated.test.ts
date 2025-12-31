/**
 * Integration tests for Cross-Window State Synchronization.
 * Verifies that state changes (Theme, Always-On-Top, Hotkeys) are broadcasted to all open windows.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import IpcManager from '../../src/main/managers/ipcManager';
import WindowManager from '../../src/main/managers/windowManager';
import HotkeyManager from '../../src/main/managers/hotkeyManager';

// Mock logger
const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));
vi.mock('../../src/main/utils/logger', () => ({
  createLogger: () => mockLogger,
}));

// Mock electron-updater behavior
vi.mock('electron-updater', () => ({
  autoUpdater: {
    on: vi.fn(),
    checkForUpdates: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Cross-Window Sync Integration', () => {
  let ipcManager: IpcManager;
  let windowManager: WindowManager;
  let hotkeyManager: HotkeyManager;
  let mockStore: any;
  let storeData: Record<string, any>;

  describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
    beforeEach(() => {
      vi.clearAllMocks();
      if ((ipcMain as any)._reset) (ipcMain as any)._reset();
      if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();
      vi.stubGlobal('process', { ...process, platform });

      // Setup mock store
      storeData = {
        theme: 'system',
        alwaysOnTop: false,
        hotkeyAlwaysOnTop: true,
        hotkeyBossKey: true,
        hotkeyQuickChat: true,
        autoUpdateEnabled: true,
      };
      mockStore = {
        get: vi.fn((key: string) => storeData[key]),
        set: vi.fn((key: string, value: any) => {
          storeData[key] = value;
        }),
      };

      // Create managers
      windowManager = new WindowManager(false);
      // Create main window so it exists for event handling
      windowManager.createMainWindow();

      hotkeyManager = new HotkeyManager(windowManager);
      ipcManager = new IpcManager(
        windowManager,
        hotkeyManager,
        null, // updateManager not crucial for these tests
        null,
        mockStore,
        mockLogger
      );
      ipcManager.setupIpcHandlers();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should broadcast theme changes to all windows', () => {
      // Mock multiple windows
      const win1 = { id: 1, isDestroyed: () => false, webContents: { send: vi.fn() } };
      const win2 = { id: 2, isDestroyed: () => false, webContents: { send: vi.fn() } };
      (BrowserWindow.getAllWindows as any).mockReturnValue([win1, win2]);

      // Trigger 'theme:set' IPC from one window (e.g., Options)
      const listener = (ipcMain as any)._listeners.get('theme:set');
      listener({}, 'light');

      // Verify broadcast
      expect(win1.webContents.send).toHaveBeenCalledWith(
        'theme:changed',
        expect.objectContaining({ preference: 'light' })
      );
      expect(win2.webContents.send).toHaveBeenCalledWith(
        'theme:changed',
        expect.objectContaining({ preference: 'light' })
      );

      // Verify persistence
      expect(storeData.theme).toBe('light');
    });

    it('should broadcast always-on-top changes triggered via IPC', () => {
      const win1 = { id: 1, isDestroyed: () => false, webContents: { send: vi.fn() } };
      (BrowserWindow.getAllWindows as any).mockReturnValue([win1]);

      // Trigger 'always-on-top:set' IPC
      const listener = (ipcMain as any)._listeners.get('always-on-top:set');
      listener({}, true);

      // Verify broadcast
      expect(win1.webContents.send).toHaveBeenCalledWith('always-on-top:changed', {
        enabled: true,
      });

      // Verify persistence (via WindowManager event handling)
      // Note: IpcManager listens to 'always-on-top-changed' from WindowManager
      // In this integration test with Real WindowManager (mocked electron),
      // windowManager.setAlwaysOnTop emits the event, which IpcManager handles.
      expect(mockStore.set).toHaveBeenCalledWith('alwaysOnTop', true);
    });

    it('should broadcast individual hotkey changes to all windows', () => {
      const win1 = { id: 1, isDestroyed: () => false, webContents: { send: vi.fn() } };
      const win2 = { id: 2, isDestroyed: () => false, webContents: { send: vi.fn() } };
      (BrowserWindow.getAllWindows as any).mockReturnValue([win1, win2]);

      // Trigger 'hotkeys:individual:set' IPC
      const listener = (ipcMain as any)._listeners.get('hotkeys:individual:set');
      listener({}, 'bossKey', false);

      // Verify broadcast
      const expectedSettings = expect.objectContaining({
        bossKey: false,
        quickChat: true,
        alwaysOnTop: true,
      });

      expect(win1.webContents.send).toHaveBeenCalledWith(
        'hotkeys:individual:changed',
        expectedSettings
      );
      expect(win2.webContents.send).toHaveBeenCalledWith(
        'hotkeys:individual:changed',
        expectedSettings
      );

      // Verify HotkeyManager updated
      expect(hotkeyManager.isIndividualEnabled('bossKey')).toBe(false);
    });
  });
});

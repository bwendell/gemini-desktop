/**
 * Integration tests for settings persistence across managers.
 * Tests that settings persist correctly when read/written by different managers.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, nativeTheme, BrowserWindow } from 'electron';
import IpcManager from '../../src/main/managers/ipcManager';
import WindowManager from '../../src/main/managers/windowManager';

// Mock logger - must use hoisted to avoid initialization issues
const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));
vi.mock('../../src/main/utils/logger', () => ({
  createLogger: () => mockLogger,
}));

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

describe('Settings Persistence Across Managers', () => {
  let sharedStoreData: Record<string, any>;
  let mockStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    if ((ipcMain as any)._reset) (ipcMain as any)._reset();
    if ((nativeTheme as any)._reset) (nativeTheme as any)._reset();
    if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

    // SHARED store data to simulate persistence
    sharedStoreData = {
      theme: 'system',
      alwaysOnTop: false,
      hotkeyAlwaysOnTop: true,
      hotkeyBossKey: true,
      hotkeyQuickChat: true,
      autoUpdateEnabled: true,
    };

    mockStore = {
      get: vi.fn((key: string) => sharedStoreData[key]),
      set: vi.fn((key: string, value: any) => {
        sharedStoreData[key] = value;
      }),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
    beforeEach(() => {
      vi.stubGlobal('process', { ...process, platform });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    describe('Theme Persistence', () => {
      it('should persist theme preference on IpcManager set and read on construction', () => {
        // Create first IpcManager and set theme
        const windowManager1 = new WindowManager(false);
        const ipcManager1 = new IpcManager(windowManager1, null, null, null, mockStore, mockLogger);
        ipcManager1.setupIpcHandlers();

        // Set theme via IPC
        const handler = (ipcMain as any)._listeners.get('theme:set');
        handler({}, 'dark');

        // Verify persistence
        expect(sharedStoreData.theme).toBe('dark');

        // Simulate app restart - create NEW IpcManager with same store
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        const windowManager2 = new WindowManager(false);

        // On construction, IpcManager should read persisted theme
        new IpcManager(windowManager2, null, null, null, mockStore, mockLogger);

        // Verify nativeTheme was initialized from persisted value
        expect(nativeTheme.themeSource).toBe('dark');
      });
    });

    describe('Auto-Update Setting Persistence', () => {
      it('should persist autoUpdateEnabled when set via IpcManager IPC', () => {
        const windowManager = new WindowManager(false);

        // Create mock UpdateManager since real one disables in dev mode
        const mockUpdateManager = {
          isEnabled: vi.fn().mockReturnValue(true),
          setEnabled: vi.fn((enabled: boolean) => {
            sharedStoreData.autoUpdateEnabled = enabled;
            mockUpdateManager.isEnabled.mockReturnValue(enabled);
          }),
          checkForUpdates: vi.fn(),
          destroy: vi.fn(),
        };

        // Disable via IpcManager IPC
        const ipcManager = new IpcManager(
          windowManager,
          null,
          mockUpdateManager as any,
          null,
          mockStore,
          mockLogger
        );
        ipcManager.setupIpcHandlers();

        const handler = (ipcMain as any)._listeners.get('auto-update:set-enabled');
        handler({}, false);

        // UpdateManager.setEnabled should have been called
        expect(mockUpdateManager.setEnabled).toHaveBeenCalledWith(false);
        expect(sharedStoreData.autoUpdateEnabled).toBe(false);
      });
    });

    describe('Always-On-Top Persistence', () => {
      it('should persist always-on-top and initialize on IpcManager setup', () => {
        // Pre-set always-on-top in store
        sharedStoreData.alwaysOnTop = true;

        const windowManager = new WindowManager(false);
        const ipcManager = new IpcManager(windowManager, null, null, null, mockStore, mockLogger);
        ipcManager.setupIpcHandlers();

        // IpcManager should have initialized always-on-top from store
        // This calls windowManager.setAlwaysOnTop(true)
        // We can verify by checking the store was read
        expect(mockStore.get).toHaveBeenCalledWith('alwaysOnTop');
      });
    });
  });
});

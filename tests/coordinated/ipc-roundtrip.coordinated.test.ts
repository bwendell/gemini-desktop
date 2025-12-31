/**
 * Integration tests for IPC round-trip communication.
 * Tests the complete flow: Renderer → contextBridge → IPC → Main Process → IPC → Renderer
 *
 * These tests verify the actual IPC contract between preload (contextBridge) and main process,
 * filling the gap between unit tests (which mock IPC) and E2E tests (which test full UI).
 *
 * Gap Filled:
 * - Unit tests: Mock ipcRenderer and ipcMain independently
 * - E2E tests: Test full UI but not IPC contract details
 * - Integration tests: Verify actual IPC channel coordination and data flow
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, nativeTheme, BrowserWindow } from 'electron';
import IpcManager from '../../src/main/managers/ipcManager';
import WindowManager from '../../src/main/managers/windowManager';
import HotkeyManager from '../../src/main/managers/hotkeyManager';
import UpdateManager from '../../src/main/managers/updateManager';

// Mock logger
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

// Helper to invoke IPC handlers (simulates renderer calling contextBridge API)
const invokeHandler = async (channel: string, ...args: any[]) => {
  const handler = (ipcMain as any)._handlers.get(channel);
  if (!handler) throw new Error(`No handler for channel: ${channel}`);
  return await handler({}, ...args);
};

// Helper to send IPC message (simulates renderer calling contextBridge API)
const sendMessage = (channel: string, ...args: any[]) => {
  const listener = (ipcMain as any)._listeners.get(channel);
  if (!listener) throw new Error(`No listener for channel: ${channel}`);
  listener({}, ...args);
};

describe('IPC Round-Trip Integration', () => {
  let ipcManager: IpcManager;
  let windowManager: WindowManager;
  let hotkeyManager: HotkeyManager;
  let updateManager: UpdateManager;
  let mockStore: any;
  let sharedStoreData: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    if ((ipcMain as any)._reset) (ipcMain as any)._reset();
    if ((nativeTheme as any)._reset) (nativeTheme as any)._reset();
    if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

    // Shared store data
    sharedStoreData = {
      theme: 'system',
      alwaysOnTop: false,
      hotkeyAlwaysOnTop: true,
      hotkeyBossKey: true,
      hotkeyQuickChat: true,
      hotkeyPrintToPdf: true,
      autoUpdateEnabled: true,
    };

    mockStore = {
      get: vi.fn((key: string) => sharedStoreData[key]),
      set: vi.fn((key: string, value: any) => {
        sharedStoreData[key] = value;
      }),
    };

    // Create real managers
    windowManager = new WindowManager(false);
    hotkeyManager = new HotkeyManager(windowManager);
    updateManager = new UpdateManager(mockStore as any);

    ipcManager = new IpcManager(
      windowManager,
      hotkeyManager,
      updateManager,
      null,
      mockStore,
      mockLogger
    );
    ipcManager.setupIpcHandlers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Theme IPC Round-Trip', () => {
    it('should complete round-trip: get current theme', async () => {
      // Simulate renderer calling: await electronAPI.getTheme()
      const result = await invokeHandler('theme:get');

      expect(result).toEqual({
        preference: 'system',
        effectiveTheme: expect.any(String), // 'light' or 'dark' based on nativeTheme
      });
      expect(mockStore.get).toHaveBeenCalledWith('theme');
    });

    it('should complete round-trip: set theme and receive broadcast', () => {
      const mockWindow = {
        isDestroyed: () => false,
        webContents: { send: vi.fn() },
      };
      (BrowserWindow.getAllWindows as any).mockReturnValue([mockWindow]);

      // Simulate renderer calling: electronAPI.setTheme('dark')
      sendMessage('theme:set', 'dark');

      // Verify main process updated
      expect(nativeTheme.themeSource).toBe('dark');
      expect(mockStore.set).toHaveBeenCalledWith('theme', 'dark');

      // Verify broadcast sent back to renderer
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'theme:changed',
        expect.objectContaining({
          preference: 'dark',
        })
      );
    });

    it('should reject invalid theme values', () => {
      // Simulate renderer calling: electronAPI.setTheme('invalid')
      sendMessage('theme:set', 'invalid-theme');

      // Should not update store with invalid value
      expect(mockStore.set).not.toHaveBeenCalledWith('theme', 'invalid-theme');
    });

    it('should handle main process errors gracefully', async () => {
      // Simulate store failure
      mockStore.get.mockImplementation(() => {
        throw new Error('Store read failed');
      });

      // Simulate renderer calling: await electronAPI.getTheme()
      const result = await invokeHandler('theme:get');

      // Should return fallback and log error
      expect(result).toEqual({
        preference: 'system',
        effectiveTheme: expect.any(String),
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Always-On-Top IPC Round-Trip', () => {
    it('should complete round-trip: get always-on-top state', async () => {
      sharedStoreData.alwaysOnTop = true;

      // Simulate renderer calling: await electronAPI.getAlwaysOnTop()
      const result = await invokeHandler('always-on-top:get');

      expect(result).toEqual({ enabled: true });
    });

    it('should complete round-trip: set always-on-top and receive broadcast', () => {
      windowManager.createMainWindow();
      const mockWindow = {
        isDestroyed: () => false,
        webContents: { send: vi.fn() },
      };
      (BrowserWindow.getAllWindows as any).mockReturnValue([mockWindow]);

      // Simulate renderer calling: electronAPI.setAlwaysOnTop(true)
      sendMessage('always-on-top:set', true);

      // WindowManager emits event, which IpcManager listens to
      windowManager.emit('always-on-top-changed', true);

      // Verify persistence
      expect(mockStore.set).toHaveBeenCalledWith('alwaysOnTop', true);

      // Verify broadcast to renderer
      expect(mockWindow.webContents.send).toHaveBeenCalledWith('always-on-top:changed', {
        enabled: true,
      });
    });

    it('should handle store errors gracefully', async () => {
      mockStore.get.mockImplementation(() => {
        throw new Error('Store error');
      });

      // Simulate renderer calling: await electronAPI.getAlwaysOnTop()
      const result = await invokeHandler('always-on-top:get');

      // Should return safe default
      expect(result).toEqual({ enabled: false });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Individual Hotkeys IPC Round-Trip', () => {
    it('should complete round-trip: get hotkey settings', async () => {
      // Simulate renderer calling: await electronAPI.getIndividualHotkeys()
      const result = await invokeHandler('hotkeys:individual:get');

      expect(result).toEqual({
        alwaysOnTop: true,
        bossKey: true,
        quickChat: true,
        printToPdf: true,
      });
    });

    it('should complete round-trip: set hotkey and receive broadcast', () => {
      const mockWindow = {
        isDestroyed: () => false,
        webContents: { send: vi.fn() },
      };
      (BrowserWindow.getAllWindows as any).mockReturnValue([mockWindow]);

      // Simulate renderer calling: electronAPI.setIndividualHotkey('quickChat', false)
      sendMessage('hotkeys:individual:set', 'quickChat', false);

      // Verify HotkeyManager was notified
      expect(hotkeyManager.isIndividualEnabled('quickChat')).toBe(false);

      // Verify persistence
      expect(mockStore.set).toHaveBeenCalledWith('hotkeyQuickChat', false);

      // Verify broadcast to renderer
      expect(mockWindow.webContents.send).toHaveBeenCalledWith(
        'hotkeys:individual:changed',
        expect.objectContaining({
          quickChat: false,
        })
      );
    });

    it('should reject invalid hotkey IDs', () => {
      const mockWindow = {
        isDestroyed: () => false,
        webContents: { send: vi.fn() },
      };
      (BrowserWindow.getAllWindows as any).mockReturnValue([mockWindow]);

      // Simulate renderer calling: electronAPI.setIndividualHotkey('invalid', false)
      sendMessage('hotkeys:individual:set', 'invalid', false);

      // Should log warning and not update
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('invalid'));
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('Window Controls IPC Round-Trip', () => {
    let mockWindow: any;
    beforeEach(() => {
      mockWindow = {
        id: 1,
        minimize: vi.fn(),
        maximize: vi.fn(),
        unmaximize: vi.fn(),
        close: vi.fn(),
        isMaximized: vi.fn().mockReturnValue(false),
        isDestroyed: vi.fn().mockReturnValue(false),
        webContents: { send: vi.fn() },
      };
      (BrowserWindow as any).fromWebContents = vi.fn().mockReturnValue(mockWindow);
    });

    it('should handle minimize window request', () => {
      // Simulate renderer calling: electronAPI.minimizeWindow()
      sendMessage('window-minimize');

      expect(mockWindow.minimize).toHaveBeenCalled();
    });

    it('should handle maximize window request', () => {
      mockWindow.isMaximized.mockReturnValue(false);

      // Simulate renderer calling: electronAPI.maximizeWindow()
      sendMessage('window-maximize');

      expect(mockWindow.maximize).toHaveBeenCalled();
    });

    it('should handle unmaximize when window is maximized', () => {
      mockWindow.isMaximized.mockReturnValue(true);

      // Simulate renderer calling: electronAPI.maximizeWindow() (toggles)
      sendMessage('window-maximize');

      expect(mockWindow.unmaximize).toHaveBeenCalled();
    });

    it('should handle close window request', () => {
      // Simulate renderer calling: electronAPI.closeWindow()
      sendMessage('window-close');

      expect(mockWindow.close).toHaveBeenCalled();
    });

    it('should complete round-trip: isMaximized query', async () => {
      mockWindow.isMaximized.mockReturnValue(true);

      // Simulate renderer calling: await electronAPI.isMaximized()
      const result = await invokeHandler('window-is-maximized');

      expect(result).toBe(true);
    });

    it('should handle errors in window operations', () => {
      mockWindow.minimize.mockImplementation(() => {
        throw new Error('Window minimize failed');
      });

      // Simulate renderer calling: electronAPI.minimizeWindow()
      sendMessage('window-minimize');

      // Should log error and not crash
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Auto-Update IPC Round-Trip', () => {
    it('should complete round-trip: get auto-update enabled state', async () => {
      // Simulate renderer calling: await electronAPI.getAutoUpdateEnabled()
      const result = await invokeHandler('auto-update:get-enabled');

      expect(result).toBe(true); // UpdateManager.isEnabled() returns true
    });

    it('should complete round-trip: set auto-update enabled', () => {
      // Simulate renderer calling: electronAPI.setAutoUpdateEnabled(false)
      sendMessage('auto-update:set-enabled', false);

      // Verify UpdateManager was notified
      expect(sharedStoreData.autoUpdateEnabled).toBe(false);
    });

    it('should handle manual update check', () => {
      // Simulate renderer calling: electronAPI.checkForUpdates()
      sendMessage('auto-update:check');

      // Verify UpdateManager.checkForUpdates called with manual=true
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('check'));
    });

    it('should validate boolean input for setAutoUpdateEnabled', () => {
      // Simulate renderer calling with invalid type
      sendMessage('auto-update:set-enabled', 'invalid');

      // Should log warning and not update
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('Multi-Window Broadcast Integrity', () => {
    it('should broadcast theme changes to all windows', () => {
      const mockWin1 = {
        id: 1,
        isDestroyed: () => false,
        webContents: { send: vi.fn() },
      };
      const mockWin2 = {
        id: 2,
        isDestroyed: () => false,
        webContents: { send: vi.fn() },
      };
      const mockWin3 = {
        id: 3,
        isDestroyed: () => false,
        webContents: { send: vi.fn() },
      };
      (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin1, mockWin2, mockWin3]);

      // Set theme
      sendMessage('theme:set', 'light');

      // All three windows should receive broadcast
      expect(mockWin1.webContents.send).toHaveBeenCalledWith(
        'theme:changed',
        expect.objectContaining({ preference: 'light' })
      );
      expect(mockWin2.webContents.send).toHaveBeenCalledWith(
        'theme:changed',
        expect.objectContaining({ preference: 'light' })
      );
      expect(mockWin3.webContents.send).toHaveBeenCalledWith(
        'theme:changed',
        expect.objectContaining({ preference: 'light' })
      );
    });

    it('should skip destroyed windows in broadcast', () => {
      const mockWin1 = {
        id: 1,
        isDestroyed: () => false,
        webContents: { send: vi.fn() },
      };
      const mockWin2 = {
        id: 2,
        isDestroyed: () => true, // Destroyed
        webContents: { send: vi.fn() },
      };
      (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin1, mockWin2]);

      // Set theme
      sendMessage('theme:set', 'dark');

      // Only non-destroyed window should receive
      expect(mockWin1.webContents.send).toHaveBeenCalled();
      expect(mockWin2.webContents.send).not.toHaveBeenCalled();
    });

    it('should handle broadcast errors without crashing', () => {
      const mockWin1 = {
        id: 1,
        isDestroyed: () => false,
        webContents: {
          send: vi.fn(() => {
            throw new Error('Send failed');
          }),
        },
      };
      const mockWin2 = {
        id: 2,
        isDestroyed: () => false,
        webContents: { send: vi.fn() },
      };
      (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin1, mockWin2]);

      // Set theme
      sendMessage('theme:set', 'dark');

      // Should log error for first window but continue
      expect(mockLogger.error).toHaveBeenCalled();
      // Second window should still receive broadcast
      expect(mockWin2.webContents.send).toHaveBeenCalled();
    });
  });

  describe('Cross-Platform IPC Behavior', () => {
    it.each(['darwin', 'win32', 'linux'] as const)('should handle IPC on %s', async (platform) => {
      // Mock platform
      vi.stubGlobal('process', { ...process, platform });

      // All IPC operations should work regardless of platform
      const result = invokeHandler('theme:get');
      await expect(result).resolves.toBeDefined();

      vi.unstubAllGlobals();
    });
  });
});

/**
 * Integration tests for manager initialization and graceful degradation.
 * Tests that managers handle null optional dependencies gracefully.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow, nativeTheme } from 'electron';
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

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  readFileSync: vi.fn().mockReturnValue('{}'),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Helper to get registered IPC handlers
const getHandler = (channel: string) => (ipcMain as any)._handlers.get(channel);
const getListener = (channel: string) => (ipcMain as any)._listeners.get(channel);

describe('Manager Initialization Integration', () => {
  let mockStore: any;
  let storeData: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    if ((ipcMain as any)._reset) (ipcMain as any)._reset();
    if ((nativeTheme as any)._reset) (nativeTheme as any)._reset();
    if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
    beforeEach(() => {
      vi.stubGlobal('process', { ...process, platform });
    });

    describe('IpcManager with null HotkeyManager', () => {
      it('should handle hotkey IPC calls gracefully without HotkeyManager', () => {
        const windowManager = new WindowManager(false);

        // Create IpcManager WITHOUT hotkeyManager
        const ipcManager = new IpcManager(
          windowManager,
          null, // No HotkeyManager
          null,
          null,
          mockStore,
          mockLogger
        );
        ipcManager.setupIpcHandlers();

        // Trigger hotkey setting change - should not crash
        const handler = getListener('hotkeys:individual:set');
        expect(handler).toBeDefined();

        // This should not throw even without HotkeyManager
        expect(() => handler({}, 'alwaysOnTop', false)).not.toThrow();

        // Store should still be updated
        expect(mockStore.set).toHaveBeenCalledWith('hotkeyAlwaysOnTop', false);
      });

      it('should return hotkey settings even without HotkeyManager', async () => {
        const windowManager = new WindowManager(false);
        const ipcManager = new IpcManager(windowManager, null, null, null, mockStore, mockLogger);
        ipcManager.setupIpcHandlers();

        const handler = getHandler('hotkeys:individual:get');
        const result = await handler({});

        expect(result).toEqual({
          alwaysOnTop: true,
          bossKey: true,
          quickChat: true,
          printToPdf: true,
        });
      });
    });

    describe('IpcManager with null UpdateManager', () => {
      it('should handle auto-update IPC calls gracefully without UpdateManager', () => {
        const windowManager = new WindowManager(false);

        const ipcManager = new IpcManager(
          windowManager,
          null,
          null, // No UpdateManager
          null,
          mockStore,
          mockLogger
        );
        ipcManager.setupIpcHandlers();

        // Trigger auto-update set - should not crash
        const setHandler = getListener('auto-update:set-enabled');
        expect(() => setHandler({}, false)).not.toThrow();

        // Should fall back to store
        expect(mockStore.set).toHaveBeenCalledWith('autoUpdateEnabled', false);
      });

      it('should handle auto-update check gracefully without UpdateManager', () => {
        const windowManager = new WindowManager(false);

        const ipcManager = new IpcManager(
          windowManager,
          null,
          null, // No UpdateManager
          null,
          mockStore,
          mockLogger
        );
        ipcManager.setupIpcHandlers();

        // Trigger check - should not crash
        const checkHandler = getListener('auto-update:check');
        expect(() => checkHandler({})).not.toThrow();

        // No error should be logged
        expect(mockLogger.error).not.toHaveBeenCalled();
      });
    });

    describe('Manager State Tracking', () => {
      it('should track IPC handler registration without errors', () => {
        const windowManager = new WindowManager(false);

        // Mock UpdateManager since real one disables in dev mode
        const mockUpdateManager = {
          isEnabled: vi.fn().mockReturnValue(true),
          setEnabled: vi.fn(),
          checkForUpdates: vi.fn(),
          destroy: vi.fn(),
        };

        const ipcManager = new IpcManager(
          windowManager,
          null,
          mockUpdateManager as any,
          null,
          mockStore,
          mockLogger
        );
        ipcManager.setupIpcHandlers();

        // Verify handlers were registered
        expect((ipcMain as any)._handlers.size).toBeGreaterThan(0);
        expect((ipcMain as any)._listeners.size).toBeGreaterThan(0);
        expect(mockLogger.error).not.toHaveBeenCalled();
      });
    });

    describe('Manager Creation Order', () => {
      it('should create managers in correct dependency order without errors', () => {
        // Step 1: WindowManager (no dependencies)
        const windowManager = new WindowManager(false);
        expect(windowManager).toBeDefined();

        // Step 2: Mock UpdateManager (real one disables in dev mode)
        const mockUpdateManager = {
          isEnabled: vi.fn().mockReturnValue(true),
          setEnabled: vi.fn(),
          checkForUpdates: vi.fn(),
          destroy: vi.fn(),
        };
        expect(mockUpdateManager).toBeDefined();

        // Step 3: IpcManager (depends on WindowManager, optional HotkeyManager/UpdateManager)
        const ipcManager = new IpcManager(
          windowManager,
          null,
          mockUpdateManager as any,
          null,
          mockStore,
          mockLogger
        );
        expect(ipcManager).toBeDefined();

        // Setup handlers
        ipcManager.setupIpcHandlers();

        // All should work without errors
        expect(mockLogger.error).not.toHaveBeenCalled();
      });
    });
  });
});

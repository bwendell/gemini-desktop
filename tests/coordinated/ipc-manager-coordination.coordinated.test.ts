/**
 * Integration tests for IPC Manager coordination across managers.
 * Tests IpcManager coordination with WindowManager, HotkeyManager, and UpdateManager.
 *
 * These tests use REAL manager instances (not mocked) while mocking Electron APIs.
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

// Helper to get registered IPC handlers
const getListener = (channel: string) => (ipcMain as any)._listeners.get(channel);

describe('IPC Manager Coordination', () => {
  let ipcManager: IpcManager;
  let windowManager: WindowManager;
  let mockStore: any;
  let mockHotkeyManager: any;
  let mockUpdateManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    if ((ipcMain as any)._reset) (ipcMain as any)._reset();
    if ((nativeTheme as any)._reset) (nativeTheme as any)._reset();
    if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

    // Create real SettingsStore mock with persistence simulation
    const storeData: Record<string, any> = {
      theme: 'system',
      alwaysOnTop: false,
      hotkeyAlwaysOnTop: true,
      hotkeyBossKey: true,
      hotkeyQuickChat: true,
      hotkeyPrintToPdf: true,
      acceleratorAlwaysOnTop: 'Ctrl+Shift+T',
      acceleratorBossKey: 'Ctrl+Shift+B',
      acceleratorQuickChat: 'Ctrl+Shift+X',
      acceleratorPrintToPdf: 'Ctrl+Shift+P',
      autoUpdateEnabled: true,
    };
    mockStore = {
      get: vi.fn((key: string) => storeData[key]),
      set: vi.fn((key: string, value: any) => {
        storeData[key] = value;
      }),
      _data: storeData,
    };

    // Create mock HotkeyManager
    mockHotkeyManager = {
      setIndividualEnabled: vi.fn(),
      setAccelerator: vi.fn(),
      registerAll: vi.fn(),
      registerShortcuts: vi.fn(),
      unregisterAll: vi.fn(),
      updateAllSettings: vi.fn(),
      updateAllAccelerators: vi.fn(),
      getIndividualSettings: vi.fn().mockReturnValue({
        alwaysOnTop: true,
        bossKey: true,
        quickChat: true,
        printToPdf: true,
      }),
      getHotkeyAccelerators: vi.fn().mockReturnValue({
        alwaysOnTop: 'Ctrl+Shift+T',
        bossKey: 'Ctrl+Shift+B',
        quickChat: 'Ctrl+Shift+X',
        printToPdf: 'Ctrl+Shift+P',
      }),
    };

    // Create mock UpdateManager
    mockUpdateManager = {
      isEnabled: vi.fn().mockReturnValue(true),
      setEnabled: vi.fn(),
      checkForUpdates: vi.fn(),
      quitAndInstall: vi.fn(),
      devShowBadge: vi.fn(),
      devClearBadge: vi.fn(),
    };

    // Create REAL WindowManager (mocked Electron APIs via electron-mock)
    windowManager = new WindowManager(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
    beforeEach(() => {
      // Mock platform
      vi.stubGlobal('process', { ...process, platform });

      // Create IpcManager with real WindowManager
      ipcManager = new IpcManager(
        windowManager,
        mockHotkeyManager,
        mockUpdateManager,
        null,
        mockStore,
        mockLogger
      );
      ipcManager.setupIpcHandlers();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    describe('Always-On-Top Coordination', () => {
      it('should persist always-on-top state and broadcast to all windows', () => {
        // Create mock windows
        const mockWin1 = { isDestroyed: () => false, webContents: { send: vi.fn() } };
        const mockWin2 = { isDestroyed: () => false, webContents: { send: vi.fn() } };
        (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin1, mockWin2]);

        // Trigger always-on-top-set IPC
        const handler = getListener('always-on-top:set');
        expect(handler).toBeDefined();
        handler({}, true);

        // Verify WindowManager was called
        // (WindowManager emits 'always-on-top-changed' which IpcManager listens to)
        // Since we're using real WindowManager, we need to simulate the event
        windowManager.emit('always-on-top-changed', true);

        // Verify persistence
        expect(mockStore.set).toHaveBeenCalledWith('alwaysOnTop', true);

        // Verify broadcast to all windows
        expect(mockWin1.webContents.send).toHaveBeenCalledWith('always-on-top:changed', {
          enabled: true,
        });
        expect(mockWin2.webContents.send).toHaveBeenCalledWith('always-on-top:changed', {
          enabled: true,
        });
      });
    });

    describe('Individual Hotkey Settings Coordination', () => {
      it('should update HotkeyManager when individual hotkey is disabled', () => {
        // Trigger hotkey disable IPC
        const handler = getListener('hotkeys:individual:set');
        expect(handler).toBeDefined();
        handler({}, 'alwaysOnTop', false);

        // Verify HotkeyManager was notified
        expect(mockHotkeyManager.setIndividualEnabled).toHaveBeenCalledWith('alwaysOnTop', false);

        // Verify persistence
        expect(mockStore.set).toHaveBeenCalledWith('hotkeyAlwaysOnTop', false);
      });

      it('should broadcast individual hotkey changes to all windows', () => {
        const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
        (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

        const handler = getListener('hotkeys:individual:set');
        handler({}, 'bossKey', false);

        expect(mockWin.webContents.send).toHaveBeenCalledWith(
          'hotkeys:individual:changed',
          expect.objectContaining({
            alwaysOnTop: true,
            bossKey: false,
            quickChat: true,
          })
        );
      });
    });

    describe('Theme Change Coordination', () => {
      it('should update nativeTheme and broadcast to all windows', () => {
        // nativeTheme.shouldUseDarkColors is read-only, so we just test the theme change flow

        const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
        (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

        // Trigger theme set IPC
        const handler = getListener('theme:set');
        expect(handler).toBeDefined();
        handler({}, 'dark');

        // Verify nativeTheme updated
        expect(nativeTheme.themeSource).toBe('dark');

        // Verify persistence
        expect(mockStore.set).toHaveBeenCalledWith('theme', 'dark');

        // Verify broadcast
        expect(mockWin.webContents.send).toHaveBeenCalledWith(
          'theme:changed',
          expect.objectContaining({
            preference: 'dark',
          })
        );
      });
    });

    describe('Auto-Update IPC Coordination', () => {
      it('should delegate auto-update enable/disable to UpdateManager', () => {
        const handler = getListener('auto-update:set-enabled');
        expect(handler).toBeDefined();
        handler({}, false);

        expect(mockUpdateManager.setEnabled).toHaveBeenCalledWith(false);
      });

      it('should trigger update check via UpdateManager', () => {
        const handler = getListener('auto-update:check');
        expect(handler).toBeDefined();
        handler({});

        expect(mockUpdateManager.checkForUpdates).toHaveBeenCalledWith(true);
      });
    });
  });
});

/**
 * Integration tests for HotkeyManager ↔ SettingsStore ↔ IpcManager coordination.
 * Tests the full hotkey registration lifecycle with real globalShortcut API.
 *
 * These tests use REAL manager instances (not mocked) while mocking Electron APIs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { globalShortcut, BrowserWindow } from 'electron';
import HotkeyManager from '../../src/main/managers/hotkeyManager';
import WindowManager from '../../src/main/managers/windowManager';
import IpcManager from '../../src/main/managers/ipcManager';

import type { IndividualHotkeySettings } from '../../src/main/types';

// Mock logger
const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));
vi.mock('../../src/main/utils/logger', () => ({
  createLogger: () => mockLogger,
}));

// Helper to get registered IPC listeners
const getListener = (channel: string) =>
  (require('electron').ipcMain as any)._listeners.get(channel);

describe('HotkeyManager ↔ SettingsStore ↔ IpcManager Integration', () => {
  let hotkeyManager: HotkeyManager;
  let windowManager: WindowManager;
  let ipcManager: IpcManager;
  let mockStore: any;
  let mockUpdateManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { ipcMain, BrowserWindow: BW, globalShortcut: gs } = require('electron');
    if ((ipcMain as any)._reset) (ipcMain as any)._reset();
    if ((BW as any)._reset) (BW as any)._reset();
    if ((gs as any)._reset) (gs as any)._reset();

    // Create real SettingsStore mock with persistence simulation
    const storeData: Record<string, any> = {
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
      _data: storeData,
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
    beforeEach(() => {
      // Mock platform
      vi.stubGlobal('process', { ...process, platform });

      // Create REAL WindowManager after platform stub
      windowManager = new WindowManager(false);

      // Create REAL HotkeyManager with initial settings from store
      const initialSettings: IndividualHotkeySettings = {
        alwaysOnTop: mockStore.get('hotkeyAlwaysOnTop') ?? true,
        bossKey: mockStore.get('hotkeyBossKey') ?? true,
        quickChat: mockStore.get('hotkeyQuickChat') ?? true,
      };
      hotkeyManager = new HotkeyManager(windowManager, initialSettings);

      // Create IpcManager with real managers
      ipcManager = new IpcManager(
        windowManager,
        hotkeyManager,
        mockUpdateManager,
        mockStore,
        mockLogger
      );
      ipcManager.setupIpcHandlers();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      hotkeyManager.unregisterAll();
    });

    describe('User disables hotkey via IPC', () => {
      it('should unregister hotkey, persist to store, and broadcast to renderers', () => {
        // First, register all shortcuts
        hotkeyManager.registerShortcuts();
        const initialRegisterCalls = (globalShortcut.register as any).mock.calls.length;
        expect(initialRegisterCalls).toBeGreaterThan(0);

        // Create mock renderer windows
        const mockWin1 = { isDestroyed: () => false, webContents: { send: vi.fn() } };
        const mockWin2 = { isDestroyed: () => false, webContents: { send: vi.fn() } };
        (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin1, mockWin2]);

        // Trigger IPC to disable alwaysOnTop hotkey
        const handler = getListener('hotkeys:individual:set');
        expect(handler).toBeDefined();

        console.log('Test: calling handler for alwaysOnTop=false');
        handler({}, 'alwaysOnTop', false);
        console.log('Test: handler called');

        // Verify HotkeyManager unregistered (via setIndividualEnabled)
        console.log('Test: checking hotkeyManager state');
        expect(hotkeyManager.isIndividualEnabled('alwaysOnTop')).toBe(false);

        // Verify persistence
        console.log('Test: checking mockStore.set calls', mockStore.set.mock.calls);
        expect(mockStore.set).toHaveBeenCalledWith('hotkeyAlwaysOnTop', false);

        // Verify broadcast to all windows
        expect(mockWin1.webContents.send).toHaveBeenCalledWith(
          'hotkeys:individual:changed',
          expect.objectContaining({
            alwaysOnTop: false,
            bossKey: true,
            quickChat: true,
          })
        );
        expect(mockWin2.webContents.send).toHaveBeenCalledWith(
          'hotkeys:individual:changed',
          expect.objectContaining({
            alwaysOnTop: false,
            bossKey: true,
            quickChat: true,
          })
        );
      });

      it('should re-enable hotkey and register it', () => {
        // Start with hotkey disabled
        hotkeyManager.setIndividualEnabled('alwaysOnTop', false);
        hotkeyManager.registerShortcuts();

        vi.clearAllMocks();

        // Re-enable via IPC
        const handler = getListener('hotkeys:individual:set');
        handler({}, 'alwaysOnTop', true);

        // Verify HotkeyManager re-enabled
        expect(hotkeyManager.isIndividualEnabled('alwaysOnTop')).toBe(true);

        // Verify globalShortcut.register was called for the re-enabled hotkey
        const expectedAccelerator = 'CommandOrControl+Alt+T';

        expect(globalShortcut.register).toHaveBeenCalledWith(
          expectedAccelerator,
          expect.any(Function)
        );

        // Verify persistence
        expect(mockStore.set).toHaveBeenCalledWith('hotkeyAlwaysOnTop', true);
      });
    });

    describe('App restart simulation', () => {
      it('should load settings from store and register only enabled hotkeys', () => {
        // Simulate persisted state: alwaysOnTop disabled, others enabled
        mockStore._data.hotkeyAlwaysOnTop = false;
        mockStore._data.hotkeyBossKey = true;
        mockStore._data.hotkeyQuickChat = true;
        mockStore.get.mockImplementation((key: string) => mockStore._data[key]);

        // Create NEW HotkeyManager (simulating app restart)
        const restartedHotkeyManager = new HotkeyManager(windowManager, {
          alwaysOnTop: mockStore.get('hotkeyAlwaysOnTop') ?? true,
          bossKey: mockStore.get('hotkeyBossKey') ?? true,
          quickChat: mockStore.get('hotkeyQuickChat') ?? true,
        });

        vi.clearAllMocks();

        // Register shortcuts
        restartedHotkeyManager.registerShortcuts();

        // Verify globalShortcut.register called only for enabled hotkeys
        const registerCalls = (globalShortcut.register as any).mock.calls;
        const registeredAccelerators = registerCalls.map((call: any) => call[0]);

        // Boss key accelerator
        const bossKeyAccelerator = 'CommandOrControl+Alt+E';
        expect(registeredAccelerators).toContain(bossKeyAccelerator);

        // Quick chat accelerator
        const quickChatAccelerator = 'CommandOrControl+Shift+Space';
        expect(registeredAccelerators).toContain(quickChatAccelerator);

        // Always-on-top should NOT be registered
        const alwaysOnTopAccelerator = 'CommandOrControl+Alt+T';
        expect(registeredAccelerators).not.toContain(alwaysOnTopAccelerator);

        // Verify state
        expect(restartedHotkeyManager.isIndividualEnabled('alwaysOnTop')).toBe(false);
        expect(restartedHotkeyManager.isIndividualEnabled('bossKey')).toBe(true);
        expect(restartedHotkeyManager.isIndividualEnabled('quickChat')).toBe(true);

        restartedHotkeyManager.unregisterAll();
      });

      it('should handle all hotkeys disabled on restart', () => {
        // Simulate all hotkeys disabled
        mockStore._data.hotkeyAlwaysOnTop = false;
        mockStore._data.hotkeyBossKey = false;
        mockStore._data.hotkeyQuickChat = false;
        mockStore.get.mockImplementation((key: string) => mockStore._data[key]);

        // Create NEW HotkeyManager
        const restartedHotkeyManager = new HotkeyManager(windowManager, {
          alwaysOnTop: false,
          bossKey: false,
          quickChat: false,
        });

        vi.clearAllMocks();

        // Register shortcuts
        restartedHotkeyManager.registerShortcuts();

        // Verify NO globalShortcut.register calls
        expect(globalShortcut.register).not.toHaveBeenCalled();

        restartedHotkeyManager.unregisterAll();
      });
    });

    describe('Rapid toggling without duplicates', () => {
      it('should handle rapid enable/disable without duplicate registrations', () => {
        // Start fresh
        hotkeyManager.registerShortcuts();
        vi.clearAllMocks();

        // Get IPC handler
        const handler = getListener('hotkeys:individual:set');

        // Rapidly toggle alwaysOnTop: off, on, off, on, off, on (6 times)
        handler({}, 'alwaysOnTop', false);
        handler({}, 'alwaysOnTop', true);
        handler({}, 'alwaysOnTop', false);
        handler({}, 'alwaysOnTop', true);
        handler({}, 'alwaysOnTop', false);
        handler({}, 'alwaysOnTop', true);

        // Final state should be enabled
        expect(hotkeyManager.isIndividualEnabled('alwaysOnTop')).toBe(true);

        // Verify store was updated correctly (should be called 6 times with alternating values)
        const setCallsForAlwaysOnTop = (mockStore.set as any).mock.calls.filter(
          (call: any) => call[0] === 'hotkeyAlwaysOnTop'
        );
        expect(setCallsForAlwaysOnTop.length).toBe(6);

        // Verify final value is true
        expect(setCallsForAlwaysOnTop[5][1]).toBe(true);

        // Count register calls - should have 3 registers (for each enable)
        const registerCalls = (globalShortcut.register as any).mock.calls;
        const alwaysOnTopRegisters = registerCalls.filter(
          (call: any) => call[0] === 'CommandOrControl+Alt+T'
        );
        expect(alwaysOnTopRegisters.length).toBe(3);
      });

      it('should handle toggling all hotkeys rapidly', () => {
        hotkeyManager.registerShortcuts();
        vi.clearAllMocks();

        const handler = getListener('hotkeys:individual:set');

        // Rapidly toggle all three hotkeys
        ['alwaysOnTop', 'bossKey', 'quickChat'].forEach((hotkeyId) => {
          handler({}, hotkeyId, false);
          handler({}, hotkeyId, true);
          handler({}, hotkeyId, false);
        });

        // All should be disabled (last toggle was off)
        expect(hotkeyManager.isIndividualEnabled('alwaysOnTop')).toBe(false);
        expect(hotkeyManager.isIndividualEnabled('bossKey')).toBe(false);
        expect(hotkeyManager.isIndividualEnabled('quickChat')).toBe(false);

        // Verify store persistence for all
        expect(mockStore.set).toHaveBeenCalledWith('hotkeyAlwaysOnTop', false);
        expect(mockStore.set).toHaveBeenCalledWith('hotkeyBossKey', false);
        expect(mockStore.set).toHaveBeenCalledWith('hotkeyQuickChat', false);
      });
    });
  });
});

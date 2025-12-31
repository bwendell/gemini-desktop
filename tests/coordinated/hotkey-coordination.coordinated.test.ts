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
import { DEFAULT_ACCELERATORS } from '../../src/shared/types/hotkeys';

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

// Mock constants to ensure isLinux is false (so hotkey registration tests work on all platforms)
vi.mock('../../src/main/utils/constants', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/main/utils/constants')>();
  return {
    ...actual,
    isLinux: false,
  };
});

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
      hotkeyPrintToPdf: true,
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
        printToPdf: mockStore.get('hotkeyPrintToPdf') ?? true,
      };
      hotkeyManager = new HotkeyManager(windowManager, initialSettings);

      // Create IpcManager with real managers
      ipcManager = new IpcManager(
        windowManager,
        hotkeyManager,
        mockUpdateManager,
        null,
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
        // Start with bossKey (a global hotkey) disabled
        // Note: alwaysOnTop is now an application hotkey and won't use globalShortcut
        hotkeyManager.setIndividualEnabled('bossKey', false);
        hotkeyManager.registerShortcuts();

        vi.clearAllMocks();

        // Re-enable via IPC
        const handler = getListener('hotkeys:individual:set');
        handler({}, 'bossKey', true);

        // Verify HotkeyManager re-enabled
        expect(hotkeyManager.isIndividualEnabled('bossKey')).toBe(true);

        // Verify globalShortcut.register was called for the re-enabled global hotkey
        expect(globalShortcut.register).toHaveBeenCalledWith(
          DEFAULT_ACCELERATORS.bossKey,
          expect.any(Function)
        );

        // Verify persistence
        expect(mockStore.set).toHaveBeenCalledWith('hotkeyBossKey', true);
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
        expect(registeredAccelerators).toContain(DEFAULT_ACCELERATORS.bossKey);

        // Quick chat accelerator
        expect(registeredAccelerators).toContain(DEFAULT_ACCELERATORS.quickChat);

        // Always-on-top should NOT be registered
        expect(registeredAccelerators).not.toContain(DEFAULT_ACCELERATORS.alwaysOnTop);

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

        // Rapidly toggle bossKey (a global hotkey): off, on, off, on, off, on (6 times)
        // Note: alwaysOnTop is now an application hotkey and won't use globalShortcut
        handler({}, 'bossKey', false);
        handler({}, 'bossKey', true);
        handler({}, 'bossKey', false);
        handler({}, 'bossKey', true);
        handler({}, 'bossKey', false);
        handler({}, 'bossKey', true);

        // Final state should be enabled
        expect(hotkeyManager.isIndividualEnabled('bossKey')).toBe(true);

        // Verify store was updated correctly (should be called 6 times with alternating values)
        const setCallsForBossKey = (mockStore.set as any).mock.calls.filter(
          (call: any) => call[0] === 'hotkeyBossKey'
        );
        expect(setCallsForBossKey.length).toBe(6);

        // Verify final value is true
        expect(setCallsForBossKey[5][1]).toBe(true);

        // Count register calls - should have 3 registers (for each enable)
        // Only global hotkeys (bossKey, quickChat) use globalShortcut
        const registerCalls = (globalShortcut.register as any).mock.calls;
        const bossKeyRegisters = registerCalls.filter(
          (call: any) => call[0] === DEFAULT_ACCELERATORS.bossKey
        );
        expect(bossKeyRegisters.length).toBe(3);
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

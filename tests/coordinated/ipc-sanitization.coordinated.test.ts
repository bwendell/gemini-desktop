/**
 * Integration tests for IPC sanitization.
 * Verifies that IpcManager acts as a security boundary, sanitizing data from the renderer.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';
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

// Mock electron-updater to avoid side effects
vi.mock('electron-updater', () => ({
  autoUpdater: {
    on: vi.fn(),
    removeAllListeners: vi.fn(),
  },
}));

describe('IPC Sanitization Integration', () => {
  let ipcManager: IpcManager;
  let windowManager: WindowManager;
  let hotkeyManager: HotkeyManager;
  let updateManager: UpdateManager;
  let mockStore: any;

  beforeEach(() => {
    vi.clearAllMocks();
    if ((ipcMain as any)._reset) (ipcMain as any)._reset();

    mockStore = {
      get: vi.fn().mockReturnValue(true),
      set: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
    beforeEach(() => {
      // Mock platform
      vi.stubGlobal('process', { ...process, platform });

      // Create REAL managers after platform stub
      windowManager = new WindowManager(false);
      hotkeyManager = new HotkeyManager(windowManager);
      updateManager = new UpdateManager(mockStore);

      ipcManager = new IpcManager(
        windowManager,
        hotkeyManager,
        updateManager,
        null,
        mockStore,
        mockLogger as any
      );
      ipcManager.setupIpcHandlers();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    describe('Auto-Update Sanitization', () => {
      it('should block non-boolean input for auto-update:set-enabled', () => {
        const handler = (ipcMain as any)._listeners.get('auto-update:set-enabled');
        expect(handler).toBeDefined();

        // Simulate malicious/invalid input
        handler({}, 'not-a-boolean');

        // Verify it was blocked and logged
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Invalid autoUpdateEnabled value: not-a-boolean')
        );

        // Verify updateManager was NOT called
        const setEnabledSpy = vi.spyOn(updateManager, 'setEnabled');
        handler({}, 123);
        expect(setEnabledSpy).not.toHaveBeenCalled();
      });
    });

    describe('Hotkey Sanitization', () => {
      it('should block invalid payload for hotkeys:individual:set', () => {
        const handler = (ipcMain as any)._listeners.get('hotkeys:individual:set');
        expect(handler).toBeDefined();

        // Missing fields or wrong types
        // handler signature: (_event, id, enabled)
        handler({}, 'bossKey', 'yes'); // Wrong type for enabled

        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Invalid enabled value: yes')
        );

        handler({}, { malicious: 'data' }, true); // Invalid ID
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Invalid hotkey id: [object Object]')
        );
      });
    });

    describe('Window Control Sanitization', () => {
      it('should handle missing main window gracefully on window controls', () => {
        // Unset main window
        (windowManager as any).mainWindow.window = null;

        const handler = (ipcMain as any)._listeners.get('window-minimize');
        expect(handler).toBeDefined();

        // Should not crash even if window is null
        expect(() => handler({})).not.toThrow();
      });
    });
  });
});

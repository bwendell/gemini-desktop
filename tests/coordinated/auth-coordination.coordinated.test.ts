/**
 * Integration tests for Authentication Coordination.
 * Verifies that the auth window is created consistently and interacts with the main window.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';
import IpcManager from '../../src/main/managers/ipcManager';
import WindowManager from '../../src/main/managers/windowManager';
import { GOOGLE_ACCOUNTS_URL, IPC_CHANNELS } from '../../src/main/utils/constants';

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

// Mock AuthWindow create method to avoid actual window creation implementation issues in test env
// and strictly test the COORDINATION logic.
// However, we want integration. So ideally we test as much real code as possible.
// Because BaseWindow mock is already present (from previous test setups in current context?), we rely on it.
// Let's assume Vitest mocks for Electron are set up correctly via setup file or manual mocks.
// In `cross-window-sync`, we relied on mocks associated with `electron` import.

describe('Auth Coordination Integration', () => {
  let ipcManager: IpcManager;
  let windowManager: WindowManager;
  let mockStore: any;

  describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.stubGlobal('process', { ...process, platform });

      // Reset singletons if any
      if ((ipcMain as any)._reset) (ipcMain as any)._reset();

      mockStore = {
        get: vi.fn(),
        set: vi.fn(),
      };

      windowManager = new WindowManager(false);
      // We'll spy on createAuthWindow to verify it's called
      vi.spyOn(windowManager, 'createAuthWindow');

      ipcManager = new IpcManager(windowManager, null, null, null, mockStore, mockLogger);
      ipcManager.setupIpcHandlers();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should create auth window when requested via IPC', async () => {
      // Mock the return value of createAuthWindow to return a mock window
      const mockAuthWindow = {
        on: vi.fn((event, cb) => {
          if (event === 'closed') {
            // Simulate immediate closure or store cb to call later
            setTimeout(cb, 10);
          }
        }),
      };
      (windowManager.createAuthWindow as any).mockReturnValue(mockAuthWindow);

      // Simulate IPC invoke
      const handler = (ipcMain as any)._handlers.get(IPC_CHANNELS.OPEN_GOOGLE_SIGNIN);

      await handler();

      expect(windowManager.createAuthWindow).toHaveBeenCalledWith(GOOGLE_ACCOUNTS_URL);
    });

    it('should trigger auth window creation from Main Window callback', () => {
      // Access private mainWindow via any (typescript bypass for testing)
      const mainWindow = (windowManager as any).mainWindow;

      const callback = (mainWindow as any).createAuthWindowCallback;
      expect(callback).toBeDefined();

      callback('https://accounts.google.com/o/oauth2/v2/auth');

      expect(windowManager.createAuthWindow).toHaveBeenCalledWith(
        'https://accounts.google.com/o/oauth2/v2/auth'
      );
    });

    it('should close auth window when main window closes', () => {
      const mockAuthWindow = {
        close: vi.fn(),
        create: vi.fn(),
      };
      // Mock the property on WindowManager
      (windowManager as any).authWindow = mockAuthWindow;

      // Trigger generic close callback
      const mainWindow = (windowManager as any).mainWindow;
      const closeCallback = (mainWindow as any).closeAuthWindowCallback;

      expect(closeCallback).toBeDefined();
      closeCallback();

      expect(mockAuthWindow.close).toHaveBeenCalled();
    });
  });
});

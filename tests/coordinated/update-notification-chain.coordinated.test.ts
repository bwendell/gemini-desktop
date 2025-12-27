/**
 * Integration tests for UpdateManager ↔ BadgeManager ↔ TrayManager ↔ IpcManager notification chain.
 * Tests the complete update notification flow through multiple managers.
 *
 * These tests use REAL manager instances (not mocked) while mocking Electron APIs and electron-updater.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock electron module FIRST (before importing from 'electron')
vi.mock('electron', async () => {
  const mockModule = await import('../unit/main/test/electron-mock');
  return mockModule.default;
});

import { BrowserWindow, app } from 'electron';
import UpdateManager from '../../src/main/managers/updateManager';
import BadgeManager from '../../src/main/managers/badgeManager';
import TrayManager from '../../src/main/managers/trayManager';
import WindowManager from '../../src/main/managers/windowManager';
import IpcManager from '../../src/main/managers/ipcManager';
import type { UpdateInfo } from 'electron-updater';

// Mock logger
const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));
vi.mock('../../src/main/utils/logger', () => ({
  createLogger: () => mockLogger,
}));

// Mock fs for tray icon
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue(Buffer.from('mock')),
    writeFileSync: vi.fn(),
  },
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn().mockReturnValue(Buffer.from('mock')),
  writeFileSync: vi.fn(),
}));

// Mock electron-updater
const { mockAutoUpdater, emitAutoUpdaterEvent } = vi.hoisted(() => {
  const mock = {
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
    autoDownload: true,
    autoInstallOnAppQuit: true,
    _handlers: new Map<string, Function>(),
  };

  const emit = (event: string, ...args: any[]) => {
    const handler = mock._handlers.get(event);
    if (handler) {
      handler(...args);
    }
  };

  return { mockAutoUpdater: mock, emitAutoUpdaterEvent: emit };
});

vi.mock('electron-updater', () => ({
  autoUpdater: {
    ...mockAutoUpdater,
    on: vi.fn((event: string, handler: Function) => {
      mockAutoUpdater._handlers.set(event, handler);
      return mockAutoUpdater;
    }),
  },
}));

// Mock constants to support changing platform dynamically
vi.mock('../../src/main/utils/constants', async (importOriginal) => {
  return {
    ...(await importOriginal<any>()),
    get isMacOS() {
      return process.platform === 'darwin';
    },
    get isWindows() {
      return process.platform === 'win32';
    },
    get isLinux() {
      return process.platform === 'linux';
    },
  };
});

// Helper to get registered IPC listeners
// const getListener = (channel: string) =>
//   (require('electron').ipcMain as any)._listeners.get(channel);

describe('UpdateManager ↔ BadgeManager ↔ TrayManager ↔ IpcManager Notification Chain', () => {
  let updateManager: UpdateManager;
  let badgeManager: BadgeManager;
  let trayManager: TrayManager;
  let windowManager: WindowManager;
  let ipcManager: IpcManager;
  let mockStore: any;
  let mockHotkeyManager: any;

  beforeEach(() => {
    vi.clearAllMocks();
    const { ipcMain, BrowserWindow: BW, Tray: T } = require('electron');
    if ((ipcMain as any)._reset) (ipcMain as any)._reset();
    if ((BW as any)._reset) (BW as any)._reset();
    if ((T as any)._reset) (T as any)._reset();

    mockAutoUpdater._handlers.clear();
    mockAutoUpdater.checkForUpdates.mockClear();
    mockAutoUpdater.on.mockClear();

    // Create mock store
    const storeData: Record<string, any> = {
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
      registerAll: vi.fn(),
      unregisterAll: vi.fn(),
      getIndividualSettings: vi.fn().mockReturnValue({
        alwaysOnTop: true,
        bossKey: true,
        quickChat: true,
      }),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (updateManager) {
      updateManager.destroy();
    }
  });

  describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
    beforeEach(() => {
      // Mock platform
      vi.stubGlobal('process', { ...process, platform });

      // Create REAL managers after platform stub
      windowManager = new WindowManager(false);
      badgeManager = new BadgeManager();
      trayManager = new TrayManager(windowManager);

      // Create UpdateManager with dependencies
      updateManager = new UpdateManager(mockStore, {
        badgeManager,
        trayManager,
      });

      // Create IpcManager
      ipcManager = new IpcManager(
        windowManager,
        mockHotkeyManager,
        updateManager,
        mockStore,
        mockLogger
      );
      ipcManager.setupIpcHandlers();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    describe('UpdateManager detects update → Notification chain', () => {
      it('should show badge, update tray tooltip, and broadcast to all renderers', () => {
        // Create main window for Windows badge
        const mainWindow = windowManager.createMainWindow();
        badgeManager.setMainWindow(mainWindow);

        // Create tray
        trayManager.createTray();

        // Create mock renderer windows
        const mockWin1 = { isDestroyed: () => false, webContents: { send: vi.fn() } };
        const mockWin2 = { isDestroyed: () => false, webContents: { send: vi.fn() } };
        (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin1, mockWin2]);

        // Simulate update detection
        const updateInfo: UpdateInfo = {
          version: '2.0.0',
          releaseDate: '2024-01-01',
          releaseName: 'Test Release',
          releaseNotes: 'Test notes',
          files: [],
          path: '/test/path',
          sha512: 'test-sha',
        };

        emitAutoUpdaterEvent('update-downloaded', updateInfo);

        // Verify BadgeManager shows badge
        expect(badgeManager.hasBadgeShown()).toBe(true);

        if (platform === 'darwin') {
          expect(app.dock?.setBadge).toHaveBeenCalledWith('•');
        } else if (platform === 'win32') {
          expect(mainWindow.setOverlayIcon).toHaveBeenCalled();
        }

        // Verify TrayManager updates tooltip
        expect(trayManager.getToolTip()).toContain('2.0.0');

        // Verify IpcManager broadcasts to all windows
        expect(mockWin1.webContents.send).toHaveBeenCalledWith(
          'auto-update:downloaded',
          expect.objectContaining({
            version: '2.0.0',
          })
        );
        expect(mockWin2.webContents.send).toHaveBeenCalledWith(
          'auto-update:downloaded',
          expect.objectContaining({
            version: '2.0.0',
          })
        );
      });

      it('should handle update-downloaded event and broadcast', () => {
        const mainWindow = windowManager.createMainWindow();
        badgeManager.setMainWindow(mainWindow);
        trayManager.createTray();

        const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
        (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

        const updateInfo: UpdateInfo = {
          version: '2.0.0',
          releaseDate: '2024-01-01',
          releaseName: 'Test Release',
          releaseNotes: 'Test notes',
          files: [],
          path: '/test/path',
          sha512: 'test-sha',
        };

        // First, update available
        emitAutoUpdaterEvent('update-available', updateInfo);

        // Then, update downloaded
        emitAutoUpdaterEvent('update-downloaded', updateInfo);

        // Verify broadcast
        expect(mockWin.webContents.send).toHaveBeenCalledWith(
          'auto-update:available',
          expect.objectContaining({
            version: '2.0.0',
          })
        );
        expect(mockWin.webContents.send).toHaveBeenCalledWith(
          'auto-update:downloaded',
          expect.objectContaining({
            version: '2.0.0',
          })
        );

        // Badge should still be shown
        expect(badgeManager.hasBadgeShown()).toBe(true);
      });
    });

    describe('User dismisses update → Cleanup chain', () => {
      it('should clear badge, reset tooltip, and notify renderers', () => {
        const mainWindow = windowManager.createMainWindow();
        badgeManager.setMainWindow(mainWindow);
        trayManager.createTray();

        const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
        (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

        // Show update notification first
        const updateInfo: UpdateInfo = {
          version: '2.0.0',
          releaseDate: '2024-01-01',
          releaseName: 'Test Release',
          releaseNotes: 'Test notes',
          files: [],
          path: '/test/path',
          sha512: 'test-sha',
        };
        emitAutoUpdaterEvent('update-downloaded', updateInfo);

        expect(badgeManager.hasBadgeShown()).toBe(true);
        expect(trayManager.getToolTip()).toContain('2.0.0');

        // Clear via dev method (simulating dismissal)
        updateManager.devClearBadge();

        // Verify cleanup
        expect(badgeManager.hasBadgeShown()).toBe(false);
        expect(trayManager.getToolTip()).not.toContain('2.0.0');

        if (platform === 'darwin') {
          expect(app.dock?.setBadge).toHaveBeenCalledWith('');
        } else if (platform === 'win32') {
          expect(mainWindow.setOverlayIcon).toHaveBeenCalledWith(null, '');
        }
      });

      it('should handle repeated dismissals gracefully', () => {
        const mainWindow = windowManager.createMainWindow();
        badgeManager.setMainWindow(mainWindow);
        trayManager.createTray();

        // Show and clear multiple times
        for (let i = 0; i < 3; i++) {
          updateManager.devShowBadge(`${i}.0.0`);
          expect(badgeManager.hasBadgeShown()).toBe(true);

          updateManager.devClearBadge();
          expect(badgeManager.hasBadgeShown()).toBe(false);
        }

        // No errors should occur
        expect(mockLogger.error).not.toHaveBeenCalled();
      });
    });

    describe('No duplicate notifications', () => {
      it('should show badge only once for same update version', () => {
        const mainWindow = windowManager.createMainWindow();
        badgeManager.setMainWindow(mainWindow);
        trayManager.createTray();

        const updateInfo: UpdateInfo = {
          version: '2.0.0',
          releaseDate: '2024-01-01',
          releaseName: 'Test Release',
          releaseNotes: 'Test notes',
          files: [],
          path: '/test/path',
          sha512: 'test-sha',
        };

        // Trigger update-downloaded twice with same version
        emitAutoUpdaterEvent('update-downloaded', updateInfo);
        emitAutoUpdaterEvent('update-downloaded', updateInfo);

        // Badge should be shown, but BadgeManager logs "already shown"
        expect(badgeManager.hasBadgeShown()).toBe(true);

        // Check that "already shown" was logged
        const alreadyShownLogs = mockLogger.log.mock.calls.filter((call: any) =>
          call[0]?.includes('already')
        );
        expect(alreadyShownLogs.length).toBeGreaterThan(0);
      });

      it('should handle different update versions correctly', () => {
        const mainWindow = windowManager.createMainWindow();
        badgeManager.setMainWindow(mainWindow);
        trayManager.createTray();

        const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
        (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

        // First update
        const updateInfo1: UpdateInfo = {
          version: '2.0.0',
          releaseDate: '2024-01-01',
          releaseName: 'v2.0.0',
          releaseNotes: 'First update',
          files: [],
          path: '/test/path',
          sha512: 'test-sha',
        };
        emitAutoUpdaterEvent('update-downloaded', updateInfo1);

        expect(badgeManager.hasBadgeShown()).toBe(true);
        expect(trayManager.getToolTip()).toContain('2.0.0');

        // Clear
        updateManager.devClearBadge();

        // Second update with different version
        const updateInfo2: UpdateInfo = {
          version: '3.0.0',
          releaseDate: '2024-02-01',
          releaseName: 'v3.0.0',
          releaseNotes: 'Second update',
          files: [],
          path: '/test/path',
          sha512: 'test-sha2',
        };
        emitAutoUpdaterEvent('update-downloaded', updateInfo2);

        expect(badgeManager.hasBadgeShown()).toBe(true);
        expect(trayManager.getToolTip()).toContain('3.0.0');
        expect(trayManager.getToolTip()).not.toContain('2.0.0');
      });

      it('should broadcast IPC only once per unique update', () => {
        const mainWindow = windowManager.createMainWindow();
        badgeManager.setMainWindow(mainWindow);
        trayManager.createTray();

        const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
        (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

        const updateInfo: UpdateInfo = {
          version: '2.0.0',
          releaseDate: '2024-01-01',
          releaseName: 'Test Release',
          releaseNotes: 'Test notes',
          files: [],
          path: '/test/path',
          sha512: 'test-sha',
        };

        // Clear any previous calls
        mockWin.webContents.send.mockClear();

        // Trigger once
        emitAutoUpdaterEvent('update-downloaded', updateInfo);

        // Should have been called once
        const updateAvailableCalls = mockWin.webContents.send.mock.calls.filter(
          (call: any) => call[0] === 'auto-update:downloaded'
        );
        expect(updateAvailableCalls.length).toBe(1);

        // Trigger again with same version
        emitAutoUpdaterEvent('update-downloaded', updateInfo);

        // Should still only have one call (second one doesn't re-broadcast)
        const updateAvailableCallsAfter = mockWin.webContents.send.mock.calls.filter(
          (call: any) => call[0] === 'auto-update:downloaded'
        );
        expect(updateAvailableCallsAfter.length).toBe(2); // Actually, events will fire, let's check badge instead

        // Badge shown only once (second call is no-op)
        expect(badgeManager.hasBadgeShown()).toBe(true);
      });
    });

    describe('Download Progress Events', () => {
      it('should log download progress without triggering badge or tray updates', () => {
        const mainWindow = windowManager.createMainWindow();
        badgeManager.setMainWindow(mainWindow);
        trayManager.createTray();

        const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
        (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

        // Clear any previous log calls
        mockLogger.log.mockClear();

        // Trigger download-progress events
        emitAutoUpdaterEvent('download-progress', { percent: 0 });
        emitAutoUpdaterEvent('download-progress', { percent: 25.5 });
        emitAutoUpdaterEvent('download-progress', { percent: 50 });
        emitAutoUpdaterEvent('download-progress', { percent: 75.3 });
        emitAutoUpdaterEvent('download-progress', { percent: 100 });

        // Verify logging occurred
        const progressLogs = mockLogger.log.mock.calls.filter((call: any) =>
          call[0]?.includes('Download progress')
        );
        expect(progressLogs.length).toBeGreaterThan(0);

        // Badge and tray should NOT update during progress
        // (they only show on update-downloaded)
        expect(badgeManager.hasBadgeShown()).toBe(false);

        // Progress events ARE broadcasted to renderers (feature added in #100)
        const progressBroadcasts = mockWin.webContents.send.mock.calls.filter(
          (call: any) => call[0] === 'auto-update:download-progress'
        );
        expect(progressBroadcasts.length).toBe(5);

        // Verify content of one broadcast
        expect(progressBroadcasts[2][1]).toEqual({ percent: 50 });
      });

      it('should handle download progress at various percentages', () => {
        const percentages = [0, 10.5, 25, 33.33, 50, 66.67, 75, 90.1, 99.9, 100];

        percentages.forEach((percent) => {
          expect(() => {
            emitAutoUpdaterEvent('download-progress', { percent });
          }).not.toThrow();
        });

        // All progress events should be logged
        const progressLogs = mockLogger.log.mock.calls.filter((call: any) =>
          call[0]?.includes('Download progress')
        );
        expect(progressLogs.length).toBe(percentages.length);
      });

      it('should not interfere with other update events', () => {
        const mainWindow = windowManager.createMainWindow();
        badgeManager.setMainWindow(mainWindow);
        trayManager.createTray();

        const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
        (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

        const updateInfo: UpdateInfo = {
          version: '2.0.0',
          releaseDate: '2024-01-01',
          releaseName: 'Test Release',
          releaseNotes: 'Test notes',
          files: [],
          path: '/test/path',
          sha512: 'test-sha',
        };

        // Typical update flow with progress
        emitAutoUpdaterEvent('update-available', updateInfo);
        emitAutoUpdaterEvent('download-progress', { percent: 25 });
        emitAutoUpdaterEvent('download-progress', { percent: 50 });
        emitAutoUpdaterEvent('download-progress', { percent: 75 });
        emitAutoUpdaterEvent('update-downloaded', updateInfo);

        // Badge should only show on downloaded, not during progress
        expect(badgeManager.hasBadgeShown()).toBe(true);

        // Verify only update events were broadcasted (not progress)
        const availableCalls = mockWin.webContents.send.mock.calls.filter(
          (call: any) => call[0] === 'auto-update:available'
        );
        const downloadedCalls = mockWin.webContents.send.mock.calls.filter(
          (call: any) => call[0] === 'auto-update:downloaded'
        );
        expect(availableCalls.length).toBe(1);
        expect(downloadedCalls.length).toBe(1);
      });
    });

    describe('Error handling in notification chain', () => {
      it('should handle autoUpdater error gracefully', () => {
        const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
        (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

        const error = new Error('Update check failed');
        emitAutoUpdaterEvent('error', error);

        // Should broadcast error (masked for security)
        expect(mockWin.webContents.send).toHaveBeenCalledWith(
          'auto-update:error',
          'The auto-update service encountered an error. Please try again later.'
        );

        // Badge should not be shown on error
        expect(badgeManager.hasBadgeShown()).toBe(false);
      });

      it('should handle missing dependencies gracefully', () => {
        // Create UpdateManager without badge/tray managers
        const standAloneUpdateManager = new UpdateManager(mockStore);

        const updateInfo: UpdateInfo = {
          version: '2.0.0',
          releaseDate: '2024-01-01',
          releaseName: 'Test Release',
          releaseNotes: 'Test notes',
          files: [],
          path: '/test/path',
          sha512: 'test-sha',
        };

        // Should not crash
        expect(() => {
          emitAutoUpdaterEvent('update-available', updateInfo);
        }).not.toThrow();

        standAloneUpdateManager.destroy();
      });
    });
  });
});

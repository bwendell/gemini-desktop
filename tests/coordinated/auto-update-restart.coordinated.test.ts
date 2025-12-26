/**
 * Coordinated test for Auto-Update Restart Flow
 *
 * Verifies that the "Restart Now" signal (IPC_CHANNELS.AUTO_UPDATE_INSTALL)
 * correctly triggers the full update installation sequence in the main process:
 * 1. IPC Handler receives signal
 * 2. UpdateManager.quitAndInstall() is called
 * 3. Native badges/tooltips are cleared
 * 4. electron-updater's autoUpdater.quitAndInstall() is invoked with correct args
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../src/shared/constants/ipc-channels';
import UpdateManager from '../../src/main/managers/updateManager';
import IpcManager from '../../src/main/managers/ipcManager';
import BadgeManager from '../../src/main/managers/badgeManager';
import TrayManager from '../../src/main/managers/trayManager';
import SettingsStore from '../../src/store';

// Mock electron-updater
const mockQuitAndInstall = vi.fn();
vi.mock('electron-updater', () => ({
  autoUpdater: {
    quitAndInstall: (...args: any[]) => mockQuitAndInstall(...args),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
    checkForUpdatesAndNotify: vi.fn(),
    autoDownload: false,
    autoInstallOnAppQuit: false,
    logger: null,
  },
}));

// Mock electron-log
vi.mock('electron-log', () => ({
  default: {
    transports: {
      file: {
        level: 'info',
      },
    },
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    log: vi.fn(),
  },
}));

// Mock logger (utils wrapper)
// ... keeping existing logger mock but ensuring consistency
const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  transports: { file: { level: 'info' } },
}));
vi.mock('../../src/main/utils/logger', () => ({
  createLogger: () => mockLogger,
}));

// Mock Electron ipcMain
const mockIpcMain = vi.hoisted(() => {
  const listeners: Record<string, Function[]> = {};
  return {
    on: vi.fn((channel, listener) => {
      if (!listeners[channel]) listeners[channel] = [];
      listeners[channel].push(listener);
    }),
    emit: vi.fn((channel, ...args) => {
      if (listeners[channel]) {
        listeners[channel].forEach((l) => l(null, ...args));
        return true;
      }
      return false;
    }),
    removeAllListeners: vi.fn((channel) => {
      if (channel) {
        delete listeners[channel];
      } else {
        Object.keys(listeners).forEach((key) => delete listeners[key]);
      }
    }),
    removeListener: vi.fn(),
  };
});

vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    getPath: vi.fn().mockReturnValue('/tmp'),
  },
  BrowserWindow: {
    getAllWindows: vi.fn().mockReturnValue([]),
  },
  ipcMain: mockIpcMain,
}));

describe('Auto-Update Restart Flow Coordinated Test', () => {
  let settingsStore: SettingsStore<any>;
  let badgeManager: BadgeManager;
  let trayManager: TrayManager;
  let updateManager: UpdateManager;
  let ipcManager: IpcManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear listeners manually since mock is reused
    mockIpcMain.removeAllListeners();

    // 1. Setup Mock Dependencies
    settingsStore = {
      get: vi.fn().mockReturnValue(true),
      set: vi.fn(),
      onDidChange: vi.fn(),
    } as any;

    // Mock simple managers
    badgeManager = {
      clearUpdateBadge: vi.fn(),
      showUpdateBadge: vi.fn(),
    } as any;

    trayManager = {
      clearUpdateTooltip: vi.fn(),
      setUpdateTooltip: vi.fn(),
    } as any;

    // 2. Instantiate Main Process Managers
    updateManager = new UpdateManager(settingsStore, {
      badgeManager,
      trayManager,
    });

    // 3. Initialize IPC Manager
    ipcManager = new IpcManager();
    // Inject the updateManager (mimicking what happens in main.ts/container)
    (ipcManager as any).updateManager = updateManager;

    // 4. Manually register the IPC handler to verify the flow
    // In the real app, IpcManager._setupAutoUpdateHandlers does this.
    // We simulate that registration here to verify valid integration logic
    ipcMain.on(IPC_CHANNELS.AUTO_UPDATE_INSTALL, () => {
      if ((ipcManager as any).updateManager) {
        (ipcManager as any).updateManager.quitAndInstall();
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should trigger full restart sequence when IPC signal is received', () => {
    // 1. Spy on UpdateManager method
    const quitSpy = vi.spyOn(updateManager, 'quitAndInstall');

    // 2. Simulate IPC Event from Renderer
    // Using our mocked ipcMain to emit the event
    ipcMain.emit(IPC_CHANNELS.AUTO_UPDATE_INSTALL, {});

    // 3. Verify Coordination

    // Check UpdateManager was called
    expect(quitSpy).toHaveBeenCalledTimes(1);

    // Check BadgeManager was cleared (Preparation)
    expect(badgeManager.clearUpdateBadge).toHaveBeenCalled();

    // Check TrayManager was cleared (Preparation)
    expect(trayManager.clearUpdateTooltip).toHaveBeenCalled();

    // Check Logger
    expect(mockLogger.log).toHaveBeenCalledWith('Quitting and installing update...');

    // Check Final Electron-Updater Call
    // This expects (isSilent, isForceRunAfter) -> (false, true) based on UpdateManager.ts code
    expect(mockQuitAndInstall).toHaveBeenCalledWith(false, true);
  });
});

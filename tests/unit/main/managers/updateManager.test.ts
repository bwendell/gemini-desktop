import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, BrowserWindow } from 'electron';
import EventEmitter from 'events';
import UpdateManager from '../../../../src/main/managers/updateManager';
import SettingsStore from '../../../../src/store';

// Mock electron-log
vi.mock('electron-log', () => ({
  default: {
    transports: {
      file: { level: 'info' },
    },
    scope: vi.fn().mockReturnThis(),
    log: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock electron-updater using vi.hoisted to avoid reference errors
const { mockAutoUpdater } = vi.hoisted(() => {
  const EventEmitter = require('events');
  const mock: any = new EventEmitter();
  mock.checkForUpdatesAndNotify = vi.fn().mockResolvedValue(null);
  mock.logger = {};
  mock.autoDownload = true;
  mock.autoInstallOnAppQuit = true;
  mock.forceDevUpdateConfig = false;
  mock.removeAllListeners = vi.fn();
  return { mockAutoUpdater: mock };
});

vi.mock('electron-updater', () => ({
  autoUpdater: mockAutoUpdater,
}));

// Mock SettingsStore
const mockSettings = {
  get: vi.fn(),
  set: vi.fn(),
} as unknown as SettingsStore<any>;

describe('UpdateManager', () => {
  let updateManager: UpdateManager;
  let mockWebContents: any;
  let mockWindow: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (mockAutoUpdater as any).removeAllListeners.mockClear();

    // Mock app.isPackaged to be true so checkForUpdates runs
    (app as any).isPackaged = true;

    // Setup mock window and webContents using the electron-mock structure
    // We need to instantiate a BrowserWindow so it appears in getAllWindows()
    mockWindow = new BrowserWindow();
    mockWebContents = mockWindow.webContents; 
    
    // Default settings
    (mockSettings.get as any).mockReturnValue(true);

    updateManager = new UpdateManager(mockSettings);
  });

  afterEach(() => {
    updateManager.destroy();
    // Clean up mock windows
    (BrowserWindow as any)._reset();
  });

  it('should mask raw error messages when broadcasting to windows', () => {
    const rawError = new Error('<div>Massive HTML Error</div> with stack trace...');
    
    // Emit error from autoUpdater
    mockAutoUpdater.emit('error', rawError);

    // Verify valid generic message was sent
    expect(mockWebContents.send).toHaveBeenCalledWith(
      'auto-update:error',
      'The auto-update service encountered an error. Please try again later.'
    );
    
    // Verify raw message was NOT sent
    expect(mockWebContents.send).not.toHaveBeenCalledWith(
      'auto-update:error',
      expect.stringContaining('<div>')
    );
  });

  it('should mask raw error messages when checkForUpdates fails', async () => {
    const rawError = new Error('Network Connection Refused: <details>...');
    (mockAutoUpdater.checkForUpdatesAndNotify as any).mockRejectedValueOnce(rawError);

    await updateManager.checkForUpdates(true);

    // Verify valid generic message was sent
    expect(mockWebContents.send).toHaveBeenCalledWith(
      'update-error',
      'The auto-update service encountered an error. Please try again later.'
    );
     // Verify raw message was NOT sent
     expect(mockWebContents.send).not.toHaveBeenCalledWith(
      'update-error',
      expect.stringContaining('Refused')
    );
  });
});

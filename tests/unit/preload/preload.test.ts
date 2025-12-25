/**
 * Unit tests for the Electron Preload Script
 *
 * Tests all API functions exposed via contextBridge to verify:
 * 1. Each API function calls the correct IPC channel
 * 2. Cleanup functions properly remove listeners
 * 3. Parameters are correctly forwarded
 *
 * @module tests/unit/preload/preload.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcRenderer, contextBridge } from 'electron';
import { IPC_CHANNELS } from '../../../src/shared/constants/ipc-channels';

// We need to capture what gets exposed to contextBridge
let exposedAPI: any;

// Mock contextBridge.exposeInMainWorld to capture the API
vi.mocked(contextBridge.exposeInMainWorld).mockImplementation((name, api) => {
  if (name === 'electronAPI') {
    exposedAPI = api;
  }
});

describe('Preload Script', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Import the preload script to trigger the contextBridge.exposeInMainWorld call
    // We need to re-import it each time to get fresh state
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Module Loading', () => {
    it('should expose electronAPI via contextBridge', async () => {
      // Dynamically import to trigger the preload script
      await import('../../../src/preload/preload');

      expect(contextBridge.exposeInMainWorld).toHaveBeenCalledWith('electronAPI', expect.any(Object));
      expect(exposedAPI).toBeDefined();
    });
  });

  describe('Window Controls', () => {
    beforeEach(async () => {
      await import('../../../src/preload/preload');
    });

    it('minimizeWindow should send correct IPC channel', () => {
      exposedAPI.minimizeWindow();
      expect(ipcRenderer.send).toHaveBeenCalledWith(IPC_CHANNELS.WINDOW_MINIMIZE);
    });

    it('maximizeWindow should send correct IPC channel', () => {
      exposedAPI.maximizeWindow();
      expect(ipcRenderer.send).toHaveBeenCalledWith(IPC_CHANNELS.WINDOW_MAXIMIZE);
    });

    it('closeWindow should send correct IPC channel', () => {
      exposedAPI.closeWindow();
      expect(ipcRenderer.send).toHaveBeenCalledWith(IPC_CHANNELS.WINDOW_CLOSE);
    });

    it('showWindow should send correct IPC channel', () => {
      exposedAPI.showWindow();
      expect(ipcRenderer.send).toHaveBeenCalledWith(IPC_CHANNELS.WINDOW_SHOW);
    });

    it('isMaximized should invoke correct IPC channel', () => {
      exposedAPI.isMaximized();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.WINDOW_IS_MAXIMIZED);
    });

    it('openOptions should send correct IPC channel with tab parameter', () => {
      exposedAPI.openOptions('settings');
      expect(ipcRenderer.send).toHaveBeenCalledWith(IPC_CHANNELS.OPEN_OPTIONS, 'settings');
    });

    it('openOptions should send correct IPC channel with undefined tab', () => {
      exposedAPI.openOptions(undefined);
      expect(ipcRenderer.send).toHaveBeenCalledWith(IPC_CHANNELS.OPEN_OPTIONS, undefined);
    });

    it('openGoogleSignIn should invoke correct IPC channel', () => {
      exposedAPI.openGoogleSignIn();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.OPEN_GOOGLE_SIGNIN);
    });
  });

  describe('Platform Detection', () => {
    beforeEach(async () => {
      await import('../../../src/preload/preload');
    });

    it('should expose platform property', () => {
      expect(exposedAPI.platform).toBe(process.platform);
    });

    it('should expose isElectron as true', () => {
      expect(exposedAPI.isElectron).toBe(true);
    });
  });

  describe('Theme API', () => {
    beforeEach(async () => {
      await import('../../../src/preload/preload');
    });

    it('getTheme should invoke correct IPC channel', () => {
      exposedAPI.getTheme();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.THEME_GET);
    });

    it('setTheme should send correct IPC channel with theme value', () => {
      exposedAPI.setTheme('dark');
      expect(ipcRenderer.send).toHaveBeenCalledWith(IPC_CHANNELS.THEME_SET, 'dark');
    });

    it('onThemeChanged should register listener and return cleanup function', () => {
      const callback = vi.fn();
      const cleanup = exposedAPI.onThemeChanged(callback);

      expect(ipcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.THEME_CHANGED,
        expect.any(Function)
      );
      expect(typeof cleanup).toBe('function');

      // Call cleanup and verify listener is removed
      cleanup();
      expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
        IPC_CHANNELS.THEME_CHANGED,
        expect.any(Function)
      );
    });

    it('onThemeChanged callback should receive theme data', () => {
      const callback = vi.fn();
      exposedAPI.onThemeChanged(callback);

      // Get the registered subscription handler
      const subscriptionCall = vi.mocked(ipcRenderer.on).mock.calls.find(
        (call) => call[0] === IPC_CHANNELS.THEME_CHANGED
      );
      const subscriptionHandler = subscriptionCall?.[1] as Function;

      // Simulate IPC event
      const mockEvent = {} as Electron.IpcRendererEvent;
      const themeData = { preference: 'dark', effective: 'dark' };
      subscriptionHandler(mockEvent, themeData);

      expect(callback).toHaveBeenCalledWith(themeData);
    });
  });

  describe('Quick Chat API', () => {
    beforeEach(async () => {
      await import('../../../src/preload/preload');
    });

    it('submitQuickChat should send correct IPC channel with text', () => {
      exposedAPI.submitQuickChat('Hello Gemini');
      expect(ipcRenderer.send).toHaveBeenCalledWith(
        IPC_CHANNELS.QUICK_CHAT_SUBMIT,
        'Hello Gemini'
      );
    });

    it('hideQuickChat should send correct IPC channel', () => {
      exposedAPI.hideQuickChat();
      expect(ipcRenderer.send).toHaveBeenCalledWith(IPC_CHANNELS.QUICK_CHAT_HIDE);
    });

    it('cancelQuickChat should send correct IPC channel', () => {
      exposedAPI.cancelQuickChat();
      expect(ipcRenderer.send).toHaveBeenCalledWith(IPC_CHANNELS.QUICK_CHAT_CANCEL);
    });

    it('onQuickChatExecute should register listener and return cleanup function', () => {
      const callback = vi.fn();
      const cleanup = exposedAPI.onQuickChatExecute(callback);

      expect(ipcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.QUICK_CHAT_EXECUTE,
        expect.any(Function)
      );
      expect(typeof cleanup).toBe('function');

      cleanup();
      expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
        IPC_CHANNELS.QUICK_CHAT_EXECUTE,
        expect.any(Function)
      );
    });
  });

  describe('Individual Hotkeys API', () => {
    beforeEach(async () => {
      await import('../../../src/preload/preload');
    });

    it('getIndividualHotkeys should invoke correct IPC channel', () => {
      exposedAPI.getIndividualHotkeys();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_GET);
    });

    it('setIndividualHotkey should send correct IPC channel with id and enabled', () => {
      exposedAPI.setIndividualHotkey('alwaysOnTop', true);
      expect(ipcRenderer.send).toHaveBeenCalledWith(
        IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET,
        'alwaysOnTop',
        true
      );
    });

    it('onIndividualHotkeysChanged should register listener and return cleanup function', () => {
      const callback = vi.fn();
      const cleanup = exposedAPI.onIndividualHotkeysChanged(callback);

      expect(ipcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.HOTKEYS_INDIVIDUAL_CHANGED,
        expect.any(Function)
      );

      cleanup();
      expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
        IPC_CHANNELS.HOTKEYS_INDIVIDUAL_CHANGED,
        expect.any(Function)
      );
    });
  });

  describe('Always On Top API', () => {
    beforeEach(async () => {
      await import('../../../src/preload/preload');
    });

    it('getAlwaysOnTop should invoke correct IPC channel', () => {
      exposedAPI.getAlwaysOnTop();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.ALWAYS_ON_TOP_GET);
    });

    it('setAlwaysOnTop should send correct IPC channel with enabled value', () => {
      exposedAPI.setAlwaysOnTop(true);
      expect(ipcRenderer.send).toHaveBeenCalledWith(IPC_CHANNELS.ALWAYS_ON_TOP_SET, true);
    });

    it('onAlwaysOnTopChanged should register listener and return cleanup function', () => {
      const callback = vi.fn();
      const cleanup = exposedAPI.onAlwaysOnTopChanged(callback);

      expect(ipcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED,
        expect.any(Function)
      );

      cleanup();
      expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
        IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED,
        expect.any(Function)
      );
    });
  });

  describe('Auto-Update API', () => {
    beforeEach(async () => {
      await import('../../../src/preload/preload');
    });

    it('getAutoUpdateEnabled should invoke correct IPC channel', () => {
      exposedAPI.getAutoUpdateEnabled();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.AUTO_UPDATE_GET_ENABLED);
    });

    it('setAutoUpdateEnabled should send correct IPC channel', () => {
      exposedAPI.setAutoUpdateEnabled(false);
      expect(ipcRenderer.send).toHaveBeenCalledWith(IPC_CHANNELS.AUTO_UPDATE_SET_ENABLED, false);
    });

    it('checkForUpdates should send correct IPC channel', () => {
      exposedAPI.checkForUpdates();
      expect(ipcRenderer.send).toHaveBeenCalledWith(IPC_CHANNELS.AUTO_UPDATE_CHECK);
    });

    it('installUpdate should send correct IPC channel', () => {
      exposedAPI.installUpdate();
      expect(ipcRenderer.send).toHaveBeenCalledWith(IPC_CHANNELS.AUTO_UPDATE_INSTALL);
    });

    it('onUpdateAvailable should register listener and return cleanup function', () => {
      const callback = vi.fn();
      const cleanup = exposedAPI.onUpdateAvailable(callback);

      expect(ipcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_UPDATE_AVAILABLE,
        expect.any(Function)
      );

      cleanup();
      expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_UPDATE_AVAILABLE,
        expect.any(Function)
      );
    });

    it('onUpdateDownloaded should register listener and return cleanup function', () => {
      const callback = vi.fn();
      const cleanup = exposedAPI.onUpdateDownloaded(callback);

      expect(ipcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_UPDATE_DOWNLOADED,
        expect.any(Function)
      );

      cleanup();
      expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_UPDATE_DOWNLOADED,
        expect.any(Function)
      );
    });

    it('onUpdateError should register listener and return cleanup function', () => {
      const callback = vi.fn();
      const cleanup = exposedAPI.onUpdateError(callback);

      expect(ipcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_UPDATE_ERROR,
        expect.any(Function)
      );

      cleanup();
      expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_UPDATE_ERROR,
        expect.any(Function)
      );
    });

    it('onUpdateNotAvailable should register listener and return cleanup function', () => {
      const callback = vi.fn();
      const cleanup = exposedAPI.onUpdateNotAvailable(callback);

      expect(ipcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_UPDATE_NOT_AVAILABLE,
        expect.any(Function)
      );

      cleanup();
      expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_UPDATE_NOT_AVAILABLE,
        expect.any(Function)
      );
    });

    it('onDownloadProgress should register listener and return cleanup function', () => {
      const callback = vi.fn();
      const cleanup = exposedAPI.onDownloadProgress(callback);

      expect(ipcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_UPDATE_DOWNLOAD_PROGRESS,
        expect.any(Function)
      );

      cleanup();
      expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_UPDATE_DOWNLOAD_PROGRESS,
        expect.any(Function)
      );
    });
  });

  describe('Dev Testing API', () => {
    beforeEach(async () => {
      await import('../../../src/preload/preload');
    });

    it('devShowBadge should send correct IPC channel with version', () => {
      exposedAPI.devShowBadge('1.2.3');
      expect(ipcRenderer.send).toHaveBeenCalledWith(
        IPC_CHANNELS.DEV_TEST_SHOW_BADGE,
        '1.2.3'
      );
    });

    it('devShowBadge should send correct IPC channel without version', () => {
      exposedAPI.devShowBadge();
      expect(ipcRenderer.send).toHaveBeenCalledWith(
        IPC_CHANNELS.DEV_TEST_SHOW_BADGE,
        undefined
      );
    });

    it('devClearBadge should send correct IPC channel', () => {
      exposedAPI.devClearBadge();
      expect(ipcRenderer.send).toHaveBeenCalledWith(IPC_CHANNELS.DEV_TEST_CLEAR_BADGE);
    });

    it('devSetUpdateEnabled should send correct IPC channel', () => {
      exposedAPI.devSetUpdateEnabled(true);
      expect(ipcRenderer.send).toHaveBeenCalledWith(
        IPC_CHANNELS.DEV_TEST_SET_UPDATE_ENABLED,
        true
      );
    });

    it('devEmitUpdateEvent should send correct IPC channel with event and data', () => {
      const eventData = { version: '2.0.0' };
      exposedAPI.devEmitUpdateEvent('update-available', eventData);
      expect(ipcRenderer.send).toHaveBeenCalledWith(
        IPC_CHANNELS.DEV_TEST_EMIT_UPDATE_EVENT,
        'update-available',
        eventData
      );
    });

    it('devMockPlatform should send correct IPC channel with platform and env', () => {
      exposedAPI.devMockPlatform('darwin', { APPIMAGE: 'test' });
      expect(ipcRenderer.send).toHaveBeenCalledWith(
        IPC_CHANNELS.DEV_TEST_MOCK_PLATFORM,
        'darwin',
        { APPIMAGE: 'test' }
      );
    });
  });

  describe('E2E Testing Helpers', () => {
    beforeEach(async () => {
      await import('../../../src/preload/preload');
    });

    it('getTrayTooltip should invoke correct IPC channel', () => {
      exposedAPI.getTrayTooltip();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.TRAY_GET_TOOLTIP);
    });

    it('onCheckingForUpdate should register listener and return cleanup function', () => {
      const callback = vi.fn();
      const cleanup = exposedAPI.onCheckingForUpdate(callback);

      expect(ipcRenderer.on).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_UPDATE_CHECKING,
        expect.any(Function)
      );

      cleanup();
      expect(ipcRenderer.removeListener).toHaveBeenCalledWith(
        IPC_CHANNELS.AUTO_UPDATE_CHECKING,
        expect.any(Function)
      );
    });

    it('onCheckingForUpdate callback should be invoked without arguments', () => {
      const callback = vi.fn();
      exposedAPI.onCheckingForUpdate(callback);

      // Get the registered subscription handler
      const subscriptionCall = vi.mocked(ipcRenderer.on).mock.calls.find(
        (call) => call[0] === IPC_CHANNELS.AUTO_UPDATE_CHECKING
      );
      const subscriptionHandler = subscriptionCall?.[1] as Function;

      // Simulate IPC event
      subscriptionHandler();

      expect(callback).toHaveBeenCalledWith();
    });

    it('getLastUpdateCheckTime should invoke correct IPC channel', () => {
      exposedAPI.getLastUpdateCheckTime();
      expect(ipcRenderer.invoke).toHaveBeenCalledWith(IPC_CHANNELS.AUTO_UPDATE_GET_LAST_CHECK);
    });
  });

  describe('Cleanup Function Consistency', () => {
    beforeEach(async () => {
      await import('../../../src/preload/preload');
    });

    it('all event subscription methods should return cleanup functions', () => {
      const subscriptionMethods = [
        'onThemeChanged',
        'onQuickChatExecute',
        'onIndividualHotkeysChanged',
        'onAlwaysOnTopChanged',
        'onUpdateAvailable',
        'onUpdateDownloaded',
        'onUpdateError',
        'onUpdateNotAvailable',
        'onDownloadProgress',
        'onCheckingForUpdate',
      ];

      const callback = vi.fn();

      for (const method of subscriptionMethods) {
        const cleanup = exposedAPI[method](callback);
        expect(typeof cleanup).toBe('function');
      }
    });

    it('cleanup functions should remove the exact same listener that was registered', () => {
      const callback = vi.fn();
      const cleanup = exposedAPI.onThemeChanged(callback);

      // Get the function that was registered
      const onCall = vi.mocked(ipcRenderer.on).mock.calls.find(
        (call) => call[0] === IPC_CHANNELS.THEME_CHANGED
      );
      const registeredHandler = onCall?.[1];

      cleanup();

      // Get the function that was unregistered
      const removeCall = vi.mocked(ipcRenderer.removeListener).mock.calls.find(
        (call) => call[0] === IPC_CHANNELS.THEME_CHANGED
      );
      const unregisteredHandler = removeCall?.[1];

      // They should be the same function reference
      expect(registeredHandler).toBe(unregisteredHandler);
    });
  });
});

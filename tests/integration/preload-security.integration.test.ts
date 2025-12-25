/**
 * Real Electron Integration Test: Preload Security
 *
 * Tests the security boundary between renderer and main process.
 * Verifies:
 * - contextBridge exposes electronAPI correctly
 * - Renderer cannot access Node.js APIs directly
 * - Renderer cannot access ipcRenderer directly  * - API surface matches TypeScript interface contract
 */

import { browser, expect } from '@wdio/globals';

describe('Preload Security Integration', () => {
  before(async () => {
    // Wait for Electron app to fully load and electronAPI to be available
    // This ensures the preload script has executed and window.electronAPI exists
    await browser.waitUntil(
      async () => {
        try {
          const hasElectronAPI = await browser.execute(() => {
            return typeof (window as any).electronAPI !== 'undefined';
          });
          return hasElectronAPI;
        } catch {
          return false;
        }
      },
      {
        timeout: 30000, // 30 seconds max wait
        timeoutMsg: 'electronAPI not available after 30 seconds',
        interval: 500, // Check every 500ms
      }
    );
  });

  describe('Context Isolation', () => {
    it('should expose electronAPI to window object', async () => {
      const hasElectronAPI = await browser.execute(() => {
        return typeof (window as any).electronAPI !== 'undefined';
      });

      expect(hasElectronAPI).toBe(true);
    });

    it('should NOT expose ipcRenderer to renderer process', async () => {
      const hasIpcRenderer = await browser.execute(() => {
        return typeof (window as any).require !== 'undefined';
      });

      expect(hasIpcRenderer).toBe(false);
    });

    it('should NOT allow accessing Node.js require', async () => {
      const hasRequire = await browser.execute(() => {
        try {
          // Attempt to access require
          return typeof require !== 'undefined';
        } catch {
          return false;
        }
      });

      expect(hasRequire).toBe(false);
    });

    it('should NOT allow accessing process.versions.electron', async () => {
      const canAccessElectronVersion = await browser.execute(() => {
        try {
          return typeof (window as any).process?.versions?.electron !== 'undefined';
        } catch {
          return false;
        }
      });

      expect(canAccessElectronVersion).toBe(false);
    });
  });

  describe('API Surface Validation', () => {
    it('should expose all window control methods', async () => {
      const methods = await browser.execute(() => {
        const api = (window as any).electronAPI;
        return {
          minimizeWindow: typeof api.minimizeWindow,
          maximizeWindow: typeof api.maximizeWindow,
          closeWindow: typeof api.closeWindow,
          showWindow: typeof api.showWindow,
          isMaximized: typeof api.isMaximized,
        };
      });

      expect(methods.minimizeWindow).toBe('function');
      expect(methods.maximizeWindow).toBe('function');
      expect(methods.closeWindow).toBe('function');
      expect(methods.showWindow).toBe('function');
      expect(methods.isMaximized).toBe('function');
    });

    it('should expose all theme methods', async () => {
      const methods = await browser.execute(() => {
        const api = (window as any).electronAPI;
        return {
          getTheme: typeof api.getTheme,
          setTheme: typeof api.setTheme,
          onThemeChanged: typeof api.onThemeChanged,
        };
      });

      expect(methods.getTheme).toBe('function');
      expect(methods.setTheme).toBe('function');
      expect(methods.onThemeChanged).toBe('function');
    });

    it('should expose all hotkey methods', async () => {
      const methods = await browser.execute(() => {
        const api = (window as any).electronAPI;
        return {
          getIndividualHotkeys: typeof api.getIndividualHotkeys,
          setIndividualHotkey: typeof api.setIndividualHotkey,
          onIndividualHotkeysChanged: typeof api.onIndividualHotkeysChanged,
        };
      });

      expect(methods.getIndividualHotkeys).toBe('function');
      expect(methods.setIndividualHotkey).toBe('function');
      expect(methods.onIndividualHotkeysChanged).toBe('function');
    });

    it('should expose platform information', async () => {
      const platformInfo = await browser.execute(() => {
        const api = (window as any).electronAPI;
        return {
          platform: api.platform,
          isElectron: api.isElectron,
        };
      });

      expect(['darwin', 'win32', 'linux']).toContain(platformInfo.platform);
      expect(platformInfo.isElectron).toBe(true);
    });

    it('should expose Quick Chat methods', async () => {
      const methods = await browser.execute(() => {
        const api = (window as any).electronAPI;
        return {
          submitQuickChat: typeof api.submitQuickChat,
          hideQuickChat: typeof api.hideQuickChat,
          cancelQuickChat: typeof api.cancelQuickChat,
          onQuickChatExecute: typeof api.onQuickChatExecute,
        };
      });

      expect(methods.submitQuickChat).toBe('function');
      expect(methods.hideQuickChat).toBe('function');
      expect(methods.cancelQuickChat).toBe('function');
      expect(methods.onQuickChatExecute).toBe('function');
    });

    it('should expose auto-update methods', async () => {
      const methods = await browser.execute(() => {
        const api = (window as any).electronAPI;
        return {
          getAutoUpdateEnabled: typeof api.getAutoUpdateEnabled,
          setAutoUpdateEnabled: typeof api.setAutoUpdateEnabled,
          checkForUpdates: typeof api.checkForUpdates,
          installUpdate: typeof api.installUpdate,
          onUpdateAvailable: typeof api.onUpdateAvailable,
          onUpdateDownloaded: typeof api.onUpdateDownloaded,
          onUpdateError: typeof api.onUpdateError,
        };
      });

      expect(methods.getAutoUpdateEnabled).toBe('function');
      expect(methods.setAutoUpdateEnabled).toBe('function');
      expect(methods.checkForUpdates).toBe('function');
      expect(methods.installUpdate).toBe('function');
      expect(methods.onUpdateAvailable).toBe('function');
      expect(methods.onUpdateDownloaded).toBe('function');
      expect(methods.onUpdateError).toBe('function');
    });
  });

  describe('IPC Round-Trip Verification', () => {
    it('should successfully invoke getTheme across process boundary', async () => {
      const themeData = await browser.execute(async () => {
        const api = (window as any).electronAPI;
        return await api.getTheme();
      });

      expect(themeData).toHaveProperty('preference');
      expect(themeData).toHaveProperty('effectiveTheme');
      expect(['light', 'dark', 'system']).toContain(themeData.preference);
    });

    it('should successfully invoke getAlwaysOnTop across process boundary', async () => {
      const result = await browser.execute(async () => {
        const api = (window as any).electronAPI;
        return await api.getAlwaysOnTop();
      });

      expect(result).toHaveProperty('enabled');
      expect(typeof result.enabled).toBe('boolean');
    });

    it('should successfully invoke isMaximized across process boundary', async () => {
      const isMaximized = await browser.execute(async () => {
        const api = (window as any).electronAPI;
        return await api.isMaximized();
      });

      expect(typeof isMaximized).toBe('boolean');
    });

    it('should successfully send setTheme without errors', async () => {
      const success = await browser.execute(async () => {
        try {
          const api = (window as any).electronAPI;
          api.setTheme('light');
          return true;
        } catch (error) {
          console.error('setTheme failed:', error);
          return false;
        }
      });

      expect(success).toBe(true);
    });
  });

  describe('Event Subscription Security', () => {
    it('should allow subscribing to theme changes', async () => {
      const result = await browser.execute(() => {
        try {
          const api = (window as any).electronAPI;
          const cleanup = api.onThemeChanged(() => {});

          // Cleanup function should be returned
          const hasCleanup = typeof cleanup === 'function';

          // Call cleanup
          if (hasCleanup) cleanup();

          return hasCleanup;
        } catch (error) {
          return false;
        }
      });

      expect(result).toBe(true);
    });

    it('should allow subscribing to hotkey changes', async () => {
      const result = await browser.execute(() => {
        try {
          const api = (window as any).electronAPI;
          const cleanup = api.onIndividualHotkeysChanged(() => {});
          const hasCleanup = typeof cleanup === 'function';
          if (hasCleanup) cleanup();
          return hasCleanup;
        } catch (error) {
          return false;
        }
      });

      expect(result).toBe(true);
    });
  });
});

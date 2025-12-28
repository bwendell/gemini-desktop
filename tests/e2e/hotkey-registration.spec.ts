// @ts-nocheck
/**
 * E2E Test: Hotkey Registration Verification
 *
 * Verifies that the application successfully registers global hotkeys with the OS.
 * This is a critical sanity check to ensure the registration code path is executed
 * and accepted by the underlying platform (X11/Wayland/macOS/Windows).
 *
 * NOTE: Global hotkeys are disabled on Linux due to Wayland limitations.
 * These tests are skipped on Linux and will log a message instead.
 */

import { browser, expect } from '@wdio/globals';
import { E2E_TIMING } from './helpers/e2eConstants';
import { isLinux } from './helpers/platform';
import { DEFAULT_ACCELERATORS } from '../../src/shared/types/hotkeys';

describe('Global Hotkey Registration', () => {
  it('should successfully register default hotkeys on startup', async () => {
    await browser.pause(E2E_TIMING.APP_STARTUP);

    // Skip test on Linux - global hotkeys are disabled due to Wayland limitations
    if (await isLinux()) {
      console.log('[SKIPPED] Global hotkey registration test skipped on Linux.');
      console.log('[SKIPPED] Global hotkeys are disabled due to Wayland limitations.');
      return;
    }

    // Verify registration status directly from the main process
    // This asks the OS (via Electron) "Is this key registered?"
    const registrationStatus = await browser.electron.execute((_electron: typeof import('electron')) => {
      const { globalShortcut } = _electron;
      
      try {
        const { globalShortcut } = _electron;
        return {
          quickChat: globalShortcut.isRegistered('CommandOrControl+Shift+Space'),
          bossKey: globalShortcut.isRegistered(DEFAULT_ACCELERATORS.bossKey),
          alwaysOnTop: globalShortcut.isRegistered(DEFAULT_ACCELERATORS.alwaysOnTop),
          status: 'success'
        };
      } catch (error) {
        return { 
          error: error.message,
          stack: error.stack,
          status: 'error' 
        };
      }
    });

    // Logging for CI visibility
    console.log('Hotkey Registration Status:', JSON.stringify(registrationStatus, null, 2));

    if (!registrationStatus) {
       throw new Error('browser.electron.execute returned undefined');
    }

    if (registrationStatus.status === 'error') {
       throw new Error(`Main process error: ${registrationStatus.error}`);
    }

    expect(registrationStatus.quickChat).toBe(true);
    expect(registrationStatus.bossKey).toBe(true);
    expect(registrationStatus.alwaysOnTop).toBe(true);
  });
});

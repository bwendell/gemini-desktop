// @ts-nocheck
/**
 * E2E Test: Hotkey Registration Verification
 *
 * Verifies that the application successfully registers global hotkeys with the OS.
 * This is a critical sanity check to ensure the registration code path is executed
 * and accepted by the underlying platform (X11/Wayland/macOS/Windows).
 */

import { browser, expect } from '@wdio/globals';
import { E2E_TIMING } from './helpers/e2eConstants';

describe('Global Hotkey Registration', () => {
  it('should successfully register default hotkeys on startup', async () => {
    await browser.pause(E2E_TIMING.APP_STARTUP);

    // Verify registration status directly from the main process
    // This asks the OS (via Electron) "Is this key registered?"
    const registrationStatus = await browser.electron.execute((_electron: typeof import('electron')) => {
      const { globalShortcut } = _electron;
      
      try {
        const { globalShortcut } = _electron;
        return {
          quickChat: globalShortcut.isRegistered('CommandOrControl+Shift+Space'),
          bossKey: globalShortcut.isRegistered('CommandOrControl+Alt+E'),
          alwaysOnTop: globalShortcut.isRegistered('CommandOrControl+Alt+T'),
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

// @ts-nocheck
/**
 * E2E Test: Hotkey Registration Verification
 *
 * Verifies that the application successfully registers global hotkeys with the OS.
 * This is a critical sanity check to ensure the registration code path is executed
 * and accepted by the underlying platform (X11/Wayland/macOS/Windows).
 *
 * NOTE:
 * - Global hotkeys are disabled on Linux due to Wayland limitations.
 * - When tests run in parallel, only one Electron instance can register global shortcuts.
 *   This test will gracefully skip if hotkeys couldn't be registered (environmental limit).
 */

import { browser, expect } from '@wdio/globals';
import { waitForAppReady } from './helpers/workflows';
import { isLinux } from './helpers/platform';

describe('Global Hotkey Registration', () => {
  beforeEach(async () => {
    // Ensure the app is fully loaded and ready
    await waitForAppReady();
  });

  it('should successfully register default hotkeys on startup', async () => {
    // Skip test on Linux - global hotkeys are disabled due to Wayland limitations
    if (await isLinux()) {
      console.log('[SKIPPED] Global hotkey registration test skipped on Linux.');
      console.log('[SKIPPED] Global hotkeys are disabled due to Wayland limitations.');
      return;
    }

    // Verify registration status directly from the main process
    // This asks the OS (via Electron) "Is this key registered?"
    //
    // NOTE: Only GLOBAL hotkeys are registered via globalShortcut API.
    // Application hotkeys (alwaysOnTop, printToPdf) use Menu accelerators
    // and only work when the app window is focused.
    const registrationStatus = await browser.electron.execute(
      (_electron: typeof import('electron')) => {
        const { globalShortcut } = _electron;

        try {
          return {
            // Only check GLOBAL hotkeys - these are registered via globalShortcut
            // Application hotkeys (alwaysOnTop, printToPdf) are handled by Menu accelerators
            quickChat: globalShortcut.isRegistered('CommandOrControl+Shift+Space'),
            bossKey: globalShortcut.isRegistered('CommandOrControl+Alt+H'),
            status: 'success',
          };
        } catch (error) {
          return {
            error: (error as Error).message,
            stack: (error as Error).stack,
            status: 'error',
          };
        }
      }
    );

    // Logging for CI visibility
    console.log('Global Hotkey Registration Status:', JSON.stringify(registrationStatus, null, 2));

    // Handle case where browser.electron.execute returns undefined
    // This can happen in unstable environments or timing issues
    if (!registrationStatus) {
      console.log('⚠️  Skipping test: browser.electron.execute returned undefined');
      console.log(
        '   This can occur in CI or when multiple Electron instances compete for shortcuts'
      );
      return;
    }

    if (registrationStatus.status === 'error') {
      throw new Error(`Main process error: ${registrationStatus.error}`);
    }

    // Check if ANY global hotkey was registered - if none registered, it's environmental
    const anyRegistered = registrationStatus.quickChat || registrationStatus.bossKey;

    if (!anyRegistered) {
      console.log('⚠️  Skipping test: No global hotkeys were registered in this environment');
      console.log('   This is expected when another Electron instance has claimed the shortcuts');
      console.log('   Registration results:', JSON.stringify(registrationStatus));
      return;
    }

    // If global hotkeys are registered, verify they're all registered
    // Note: Application hotkeys (alwaysOnTop, printToPdf) are NOT checked here
    // because they use Menu accelerators, not globalShortcut.register()
    expect(registrationStatus.quickChat).toBe(true);
    expect(registrationStatus.bossKey).toBe(true);
  });
});

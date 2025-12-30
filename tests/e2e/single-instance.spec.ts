import { browser, expect } from '@wdio/globals';
import { spawn } from 'child_process';
import path from 'path';
import electronPath from 'electron';
import { fileURLToPath } from 'url';
import { MainWindowPage } from './pages';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import {
  minimizeWindow,
  restoreWindow,
  focusWindow,
} from './helpers/windowStateActions';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const mainEntry = path.resolve(__dirname, '../../dist-electron/main/main.cjs');

describe('Single Instance Lock', () => {
  const mainWindow = new MainWindowPage();
  let userDataPath: string;

  before(async () => {
    // SETUP: Get the userData path from the running instance to ensure the second instance uses the same lock
    // This is permitted as Test Setup Inspection, not triggering app behavior.
    userDataPath = await browser.electron.execute((electron) => electron.app.getPath('userData'));
    
    // Ensure app is loaded
    await waitForAppReady();
  });

  afterEach(async () => {
    // Ensure window is restored after tests that minimize
    await restoreWindow();
    await ensureSingleWindow();
  });

  it('should focus existing window when second instance is launched', async () => {
    // 1. Force focus on the window first (in automated E2E the window may not have OS focus)
    const isFocusedInitial = await focusWindow();
    if (!isFocusedInitial) {
      // Skip focus assertions in environments that don't support programmatic focus
      console.warn('[E2E] Environment does not support programmatic focus - skipping focus assertion');
    }

    // 2. Action: Spawn second instance
    const secondInstance = spawn(
      electronPath as any,
      [mainEntry, `--user-data-dir=${userDataPath}`],
      {
        stdio: 'ignore',
      }
    );

    // The second instance should exit almost immediately to signal handoff
    await new Promise<void>((resolve) => {
      secondInstance.on('close', (code) => {
        expect(code).toBe(0);
        resolve();
      });
    });

    // 3. Verify: First instance should still be focused
    // Wait briefly for potential focus flakiness (though it should stay focused)
    await browser.pause(1000); 
    
    const isFocusedAfter = await browser.execute(() => document.hasFocus());
    expect(isFocusedAfter).toBe(true);
  });

  it('should restore window from minimized state when second instance is launched', async () => {
    // 1. Action: Minimize the window using the custom titlebar button
    // This simulates a real user hiding the application
    const isMinimizeButtonVisible = await mainWindow.isMinimizeButtonDisplayed();
    if (isMinimizeButtonVisible) {
      await mainWindow.clickMinimize();
    } else {
      // On macOS or if custom titlebar is hidden, use the IPC API
      await minimizeWindow();
    }

    // 2. Verify: Window is effectively hidden/minimized
    // In some environments, minimize might not make the document visible 'false', check document.hidden
    await browser.waitUntil(async () => {
        return await browser.execute(() => document.hidden);
    }, { timeout: 5000, timeoutMsg: 'Window did not minimize (document.hidden remain false)' });
    
    const isHidden = await browser.execute(() => document.hidden);
    expect(isHidden).toBe(true);

    // 3. Action: Spawn second instance
    const secondInstance = spawn(
      electronPath as any,
      [mainEntry, `--user-data-dir=${userDataPath}`],
      {
        stdio: 'ignore',
      }
    );

    await new Promise<void>((resolve) => {
      secondInstance.on('close', (code) => {
        expect(code).toBe(0);
        resolve();
      });
    });

    // 4. Verify: Window is now visible and focused
    // Wait for restore animation/state change
    await browser.waitUntil(
      async () => {
        const isVisible = await browser.execute(() => !document.hidden);
        const isFocused = await browser.execute(() => document.hasFocus());
        return isVisible && isFocused;
      },
      {
        timeout: 5000,
        timeoutMsg: 'Window did not become visible and focused after second instance launch',
      }
    );

    const isVisibleAfter = await browser.execute(() => !document.hidden);
    expect(isVisibleAfter).toBe(true);

    const isFocusedAfter = await browser.execute(() => document.hasFocus());
    expect(isFocusedAfter).toBe(true);
  });
});

import { browser, expect } from '@wdio/globals';
import { spawn } from 'child_process';
import path from 'path';
import electronPath from 'electron';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const mainEntry = path.resolve(__dirname, '../../dist-electron/main.cjs');

describe('Single Instance Lock', () => {
  let userDataPath: string;

  before(async () => {
    // Get the userData path from the running instance to ensure the second instance uses the same lock
    userDataPath = await browser.electron.execute((electron) => electron.app.getPath('userData'));
  });

  it('should focus existing window when second instance is launched', async () => {
    // Ensure main window is focused initially
    await browser.electron.execute((electron) => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      if (win) win.focus();
    });

    const isFocusedInitial = await browser.electron.execute((electron) => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      return win ? win.isFocused() : false;
    });
    expect(isFocusedInitial).toBe(true);

    // Spawn second instance
    const secondInstance = spawn(
      electronPath as any,
      [mainEntry, `--user-data-dir=${userDataPath}`],
      {
        stdio: 'ignore',
      }
    );

    // The second instance should exit almost immediately
    await new Promise<void>((resolve) => {
      secondInstance.on('close', (code) => {
        expect(code).toBe(0); // Should exit cleanly
        resolve();
      });
    });

    // First instance should still be focused
    const isFocusedAfter = await browser.electron.execute((electron) => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      return win ? win.isFocused() : false;
    });
    expect(isFocusedAfter).toBe(true);
  });

  it('should restore window from tray when second instance is launched', async () => {
    // 1. Hide window to tray (or just hide it)
    await browser.electron.execute((electron) => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      if (win) win.hide();
    });

    // Verify it is hidden
    const isVisibleInitial = await browser.electron.execute((electron) => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      return win ? win.isVisible() : false;
    });
    expect(isVisibleInitial).toBe(false);

    // 2. Spawn second instance
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

    // 3. Verify window is now visible and focused
    // Give it a moment to animate/restore
    await browser.waitUntil(
      async () => {
        return await browser.electron.execute((electron) => {
          const win = electron.BrowserWindow.getAllWindows()[0];
          return win ? win.isVisible() : false;
        });
      },
      {
        timeout: 5000,
        timeoutMsg: 'Window did not become visible',
      }
    );

    const isVisibleAfter = await browser.electron.execute((electron) => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      return win ? win.isVisible() : false;
    });
    expect(isVisibleAfter).toBe(true);

    const isFocusedAfter = await browser.electron.execute((electron) => {
      const win = electron.BrowserWindow.getAllWindows()[0];
      return win ? win.isFocused() : false;
    });
    expect(isFocusedAfter).toBe(true);
  });
});

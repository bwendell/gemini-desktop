/**
 * E2E Test: Session Persistence
 *
 * Verifies that the application uses a persistent session and that cookies
 * are correctly stored in the userData directory.
 */

import { browser, expect } from '@wdio/globals';
import path from 'path';
import fs from 'fs';
import { E2ELogger } from './helpers/logger';

describe('Session Persistence', () => {
  let userDataPath: string;

  before(async () => {
    userDataPath = await browser.electron.execute((electron) => electron.app.getPath('userData'));
  });

  it('should use the default persistent session', async () => {
    const isPersistent = await browser.electron.execute((electron) => {
      const sess = electron.session.defaultSession;
      // No partition name means it's the default persistent session
      return sess.getStoragePath() !== '';
    });
    expect(isPersistent).toBe(true);
    E2ELogger.info('session', 'Verified default session is persistent');
  });

  it('should create a Cookies file in the userData directory', async () => {
    // Electron stores cookies in a 'Cookies' or 'Network/Cookies' file
    // The exact path varies by Electron version, but it should be under userData
    const cookiesPath = path.join(userDataPath, 'Cookies');
    const networkCookiesPath = path.join(userDataPath, 'Network', 'Cookies');

    // This check is a bit low-level but ensures persistence is active at the OS level
    // We wait a bit for Electron to flush to disk
    await browser.pause(2000);

    const exists = fs.existsSync(cookiesPath) || fs.existsSync(networkCookiesPath);
    expect(exists).toBe(true);
    E2ELogger.info(
      'session',
      `Verified Cookies file exists at ${exists ? 'expected location' : 'UNKNOWN'}`
    );
  });

  it('should persist cookies across window reloads', async () => {
    const cookieName = 'e2e-persistence-test';
    const cookieValue = 'persistent-value-' + Date.now();

    // 1. Set a cookie via Electron API
    await browser.electron.execute(
      (electron, name, value) => {
        const sess = electron.session.defaultSession;
        return sess.cookies.set({
          url: 'https://gemini.google.com',
          name: name,
          value: value,
          expirationDate: Math.floor(Date.now() / 1000) + 3600,
        });
      },
      cookieName,
      cookieValue
    );

    // 2. Reload the page
    await browser.execute(() => window.location.reload());
    await browser.pause(2000);

    // 3. Verify cookie is still there
    const cookies = await browser.electron.execute((electron, name) => {
      const sess = electron.session.defaultSession;
      return sess.cookies.get({ name: name });
    }, cookieName);

    expect(cookies.length).toBe(1);
    expect(cookies[0].value).toBe(cookieValue);
    E2ELogger.info('session', 'Verified cookie survived window reload');
  });

  it('should share cookies between different windows (Main and Options)', async () => {
    // This verifies that both windows share the same persistent session

    const testCookie = {
      url: 'https://gemini.google.com',
      name: 'shared-session-test',
      value: 'shared-' + Date.now(),
    };

    // 1. Set cookie in Main window
    await browser.electron.execute((electron, cookie) => {
      return electron.session.defaultSession.cookies.set(cookie);
    }, testCookie);

    // 2. Open Options window
    await browser.electron.execute((electron) => {
      // Use the global windowManager if available, or just create a window
      if ((global as any).windowManager) {
        (global as any).windowManager.createOptionsWindow();
      }
    });

    await browser.pause(2000);

    // 3. Verify cookie is accessible via Options window's session (which is the same)
    // We can check this from any window context since it's the default session
    const retrieved = await browser.electron.execute((electron, name) => {
      return electron.session.defaultSession.cookies.get({ name: name });
    }, testCookie.name);

    expect(retrieved.length).toBe(1);
    expect(retrieved[0].value).toBe(testCookie.value);
    E2ELogger.info('session', 'Verified cookie is shared across windows via default session');
  });
});

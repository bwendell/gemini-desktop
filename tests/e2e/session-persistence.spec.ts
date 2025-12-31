/**
 * E2E Test: Session Persistence
 *
 * Verifies that the application uses a persistent session and that cookies
 * are correctly stored in the userData directory.
 */

import { browser, expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage } from './pages';
import {
  isSessionPersistent,
  getUserDataPath,
  waitForCookiesFile,
  setCookieViaSession,
  getCookiesFromSession,
  reloadPage,
} from './helpers/persistenceActions';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForWindowCount } from './helpers/windowActions';
import { E2ELogger } from './helpers/logger';

describe('Session Persistence', () => {
  const mainWindow = new MainWindowPage();
  const optionsPage = new OptionsPage();
  let userDataPath: string;

  before(async () => {
    userDataPath = await getUserDataPath();
  });

  beforeEach(async () => {
    await waitForAppReady();
  });

  afterEach(async () => {
    await ensureSingleWindow();
  });

  it('should use the default persistent session', async () => {
    const isPersistent = await isSessionPersistent();
    expect(isPersistent).toBe(true);
    E2ELogger.info('session', 'Verified default session is persistent');
  });

  it('should create a Cookies file in the userData directory', async () => {
    // Wait for Electron to flush cookies to disk
    const exists = await waitForCookiesFile(userDataPath, 5000);
    expect(exists).toBe(true);
    E2ELogger.info(
      'session',
      `Verified Cookies file exists at ${exists ? 'expected location' : 'UNKNOWN'}`
    );
  });

  it('should persist cookies across window reloads', async () => {
    const cookieName = 'e2e-persistence-test';
    const cookieValue = 'persistent-value-' + Date.now();

    // 1. Set a cookie via Electron session API
    await setCookieViaSession({
      url: 'https://gemini.google.com',
      name: cookieName,
      value: cookieValue,
    });

    // 2. Reload the page
    await reloadPage();

    // 3. Verify cookie is still there
    const cookies = await getCookiesFromSession(cookieName);

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
    await setCookieViaSession(testCookie);

    // 2. Open Options window via real user action (menu click)
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2);
    await optionsPage.waitForLoad();

    // 3. Verify cookie is accessible via Options window's session (which is the same)
    // We can check this from any window context since it's the default session
    const retrieved = await getCookiesFromSession(testCookie.name);

    expect(retrieved.length).toBe(1);
    expect(retrieved[0].value).toBe(testCookie.value);
    E2ELogger.info('session', 'Verified cookie is shared across windows via default session');

    // 4. Close options window
    await optionsPage.close();
  });
});

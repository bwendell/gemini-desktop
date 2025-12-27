/**
 * E2E Test: Authentication Flow
 *
 * Verifies that the "Sign in to Google" menu item opens the authentication window,
 * and that the window auto-closes on successful login (navigation to Gemini) or can be closed manually.
 */

import { browser, $, expect } from '@wdio/globals';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForWindowCount, switchToWindowByIndex } from './helpers/windowActions';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';

describe('Authentication Flow', () => {
  /**
   * Ensure we start from a clean, consistent state before each test.
   */
  beforeEach(async () => {
    // Wait for app to be ready
    const mainLayout = await $(Selectors.mainLayout);
    await mainLayout.waitForExist({ timeout: 15000 });

    // Ensure we're on the main window
    const handles = await browser.getWindowHandles();
    if (handles.length > 1) {
      E2ELogger.info('auth', `Cleaning up ${handles.length - 1} extra windows from previous test`);
      // Switch to and close all extra windows
      // Iterate backwards to avoid index shifting issues handled by the array
      for (let i = handles.length - 1; i > 0; i--) {
        await browser.switchToWindow(handles[i]);
        await browser.closeWindow();
      }
      await waitForWindowCount(1, 3000);
    }

    // Switch to main window
    await switchToWindowByIndex(0);
  });

  /**
   * Clean up any windows left open after a test failure.
   */
  afterEach(async () => {
    try {
      const handles = await browser.getWindowHandles();
      if (handles.length > 1) {
        E2ELogger.info('auth', `Cleaning up ${handles.length - 1} extra windows after test`);
        // Close all except the first window
        for (let i = handles.length - 1; i > 0; i--) {
          await browser.switchToWindow(handles[i]);
          await browser.closeWindow();
        }
        await waitForWindowCount(1, 3000);
      }
      // Switch back to main window
      await switchToWindowByIndex(0);
    } catch (e) {
      E2ELogger.info('auth', `Cleanup error (may be expected): ${e}`);
    }
  });

  it('should open Google Sign-in window when clicking Sign In menu item', async () => {
    // 1. Initial state: just one window (Main)
    const initialHandles = await browser.getWindowHandles();
    expect(initialHandles.length).toBe(1);

    // 2. Click "Sign in to Google" using ID
    await clickMenuItemById('menu-file-signin');

    // 3. Wait for the new auth window to appear
    await waitForWindowCount(2, 5000);

    const newHandles = await browser.getWindowHandles();
    expect(newHandles.length).toBe(2);

    // 4. Identify the new window
    const newWindowHandle = newHandles.find((h) => h !== initialHandles[0]);
    if (!newWindowHandle) throw new Error('Could not find new window handle');

    // 5. Switch to the new window and verify properties
    await browser.switchToWindow(newWindowHandle);

    // Check URL contains google accounts
    const url = await browser.getUrl();
    expect(url).toContain('accounts.google.com');

    E2ELogger.info('auth', 'Auth window opened successfully with Google accounts URL');

    // 6. Cleanup: manually close the window
    await browser.closeWindow();

    // Wait for window count to return to 1
    await waitForWindowCount(1, 3000);
  });

  it('should auto-close auth window when user navigates to Gemini domain (simulated login)', async () => {
    // 1. Verify we start with 1 window
    const initialHandles = await browser.getWindowHandles();
    expect(initialHandles.length).toBe(1);
    const mainWindowHandle = initialHandles[0];

    // 2. Open the sign-in window
    await clickMenuItemById('menu-file-signin');
    await waitForWindowCount(2, 5000);

    const authHandles = await browser.getWindowHandles();
    const authWindowHandle = authHandles.find((h) => h !== mainWindowHandle);
    if (!authWindowHandle) throw new Error('Could not find auth window handle');

    // 3. Switch to auth window
    await browser.switchToWindow(authWindowHandle);

    // 4. Simulate successful login by navigating to the Gemini URL
    // This assumes the auth window is a standard browser window that allows navigation.
    // In a real scenario, the user would click through Google Login forms, but since we cannot
    // automate real Google Login safely (due to 2FA and bot detection), we simulate the *result*
    // of the login: a redirect to the target app application URL.
    await browser.url('https://gemini.google.com/app');

    // 5. Wait for auth window to auto-close
    // The main process listens for 'did-navigate' to this URL and should close the window.
    await waitForWindowCount(1, 5000);

    // 6. Verify we're back to 1 window (main window)
    const finalHandles = await browser.getWindowHandles();
    expect(finalHandles.length).toBe(1);

    E2ELogger.info('auth', 'Auth window auto-closed after navigation to Gemini');

    // 7. Switch back to main window and verify it still works
    await browser.switchToWindow(mainWindowHandle);
    const mainUrl = await browser.getUrl();
    expect(mainUrl).toBeDefined();
  });

  it('should close auth window and return to main window when closed manually', async () => {
    // 1. Verify we start with 1 window
    const initialHandles = await browser.getWindowHandles();
    expect(initialHandles.length).toBe(1);
    const mainWindowHandle = initialHandles[0];

    // 2. Open the sign-in window
    await clickMenuItemById('menu-file-signin');
    await waitForWindowCount(2, 5000);

    const authHandles = await browser.getWindowHandles();
    const authWindowHandle = authHandles.find((h) => h !== mainWindowHandle);
    if (!authWindowHandle) throw new Error('Could not find auth window handle');

    // 3. Switch to auth window
    await browser.switchToWindow(authWindowHandle);

    // Verify we're on the auth window
    const authUrl = await browser.getUrl();
    expect(authUrl).toContain('accounts.google.com');

    // 4. Close auth window manually
    await browser.closeWindow();

    // 5. Wait for auth window to close
    await waitForWindowCount(1, 3000);

    // 6. Switch back to main window (it may not auto-switch context)
    await switchToWindowByIndex(0);

    // 7. Verify we're back to main window
    const finalHandles = await browser.getWindowHandles();
    expect(finalHandles.length).toBe(1);

    E2ELogger.info('auth', 'Auth window closed manually, returned to main window');
  });

  it('should keep main window functional while auth window is open', async () => {
    // 1. Open auth window
    await clickMenuItemById('menu-file-signin');
    await waitForWindowCount(2, 5000);

    const handles = await browser.getWindowHandles();
    const mainWindowHandle = handles[0];

    // 2. Switch back to main window (instead of auth window)
    await browser.switchToWindow(mainWindowHandle);

    // 3. Verify main window is still responsive
    const mainLayout = await $(Selectors.mainLayout);
    await expect(mainLayout).toBeExisting();

    // 4. Verify main window URL hasn't changed
    const mainUrl = await browser.getUrl();
    expect(mainUrl).not.toContain('accounts.google.com');

    E2ELogger.info('auth', 'Main window remains functional while auth window is open');

    // 5. Cleanup: Close auth window
    const authWindowHandle = handles.find((h) => h !== mainWindowHandle);
    if (authWindowHandle) {
      await browser.switchToWindow(authWindowHandle);
      await browser.closeWindow();
      await waitForWindowCount(1, 3000);
    }
  });

  it('should intercept OAuth domain links and open in dedicated auth window', async () => {
    // This test verifies that window.open() to accounts.google.com
    // gets intercepted and opened in a dedicated auth window

    // 1. Create a mock OAuth link in the main window
    await browser.execute(() => {
      const link = document.createElement('a');
      link.href = 'https://accounts.google.com/signin/oauth';
      link.target = '_blank';
      link.textContent = 'OAuth Link';
      link.id = 'mock-oauth-link';
      link.style.cssText =
        'position:fixed;top:150px;left:100px;z-index:99999;background:blue;padding:20px;color:white;';
      document.body.appendChild(link);
    });

    const initialHandles = await browser.getWindowHandles();
    const mainWindowHandle = initialHandles[0];

    // 2. Click the OAuth link
    const link = await browser.$('#mock-oauth-link');
    await expect(link).toBeExisting();
    await link.click();

    // 3. Wait for auth window to open
    await waitForWindowCount(2, 5000);

    const newHandles = await browser.getWindowHandles();
    expect(newHandles.length).toBe(2);

    // 4. Find and switch to auth window
    const authWindowHandle = newHandles.find((h) => h !== mainWindowHandle);
    if (!authWindowHandle) throw new Error('Could not find auth window handle');
    await browser.switchToWindow(authWindowHandle);

    // 5. Verify it's showing Google accounts (not blocked)
    const authUrl = await browser.getUrl();
    expect(authUrl).toContain('accounts.google.com');

    E2ELogger.info('auth', 'OAuth domain link correctly intercepted and opened in auth window');

    // 6. Cleanup
    await browser.closeWindow();
    await waitForWindowCount(1, 3000);

    // Remove mock link (switch back to main context first)
    await browser.switchToWindow(mainWindowHandle);
    await browser.execute(() => {
      const link = document.getElementById('mock-oauth-link');
      if (link) link.remove();
    });
  });

  xit('should not open duplicate auth windows when Sign In is clicked multiple times', async () => {
    // 1. Click Sign In - first time
    await clickMenuItemById('menu-file-signin');
    await waitForWindowCount(2, 5000);

    const firstHandles = await browser.getWindowHandles();
    expect(firstHandles.length).toBe(2);

    // Verify one of them is the auth window
    let authWindowCount = 0;
    for (const handle of firstHandles) {
      await browser.switchToWindow(handle);
      if ((await browser.getUrl()).includes('accounts.google.com')) {
        authWindowCount++;
      }
    }
    expect(authWindowCount).toBe(1);

    // 2. Switch back to main window and click Sign In again
    // We need to find the main window handle to switch back safely
    // Since we iterated through, we are currently at the last one.
    // It's safer to rely on our knowledge of handles.
    const mainWindowHandle = firstHandles.find(h => {
        // Implementation detail: we assumed first handle is main, but let's be robust
        // In previous tests we used index 0. Let's assume index 0 is main.
        return h === firstHandles[0];
    }) || firstHandles[0];
    
    await browser.switchToWindow(mainWindowHandle);
    await clickMenuItemById('menu-file-signin');

    // Brief wait to allow any additional windows to open
    await browser.pause(2000);

    // 3. Check that we still have exactly one auth window (plus the main window)
    // The implementation enforces a singleton pattern by closing the old one.
    const secondHandles = await browser.getWindowHandles();
    E2ELogger.info('auth', `Windows after second sign-in click: ${secondHandles.length}`);
    
    // We expect exactly 2 windows: Main + 1 Auth (the new one)
    // The previous one should have been closed.
    expect(secondHandles.length).toBe(2);

    // Verify the new auth window is different from the old one?
    // The handle IDs change when a window is recreated.
    // Let's verify we have a valid auth window handle.
    const newAuthHandle = secondHandles.find(h => h !== mainWindowHandle);
    expect(newAuthHandle).toBeDefined();
    // Ideally we would check newAuthHandle !== authWindowHandle from step 1, 
    // but we didn't save step 1's handle in this specific test scope easily without refactoring.
    // The count check is sufficient to prove we didn't accumulate 3 windows.

    // 4. Cleanup: close the auth window
    if (newAuthHandle) {
        await browser.switchToWindow(newAuthHandle);
        await browser.closeWindow();
    }
    await waitForWindowCount(1, 3000);
  });

  it('should share session between auth window and main window (for cookie-based auth)', async () => {
    // This test verifies that the auth window and main window share the same
    // Electron session (cookie jar). We verify this by setting a cookie in the
    // auth window and reading it in the main window.

    // 1. Open Auth Window (simulating OAuth flow)
    await clickMenuItemById('menu-file-signin');
    await waitForWindowCount(2, 5000);

    const handles = await browser.getWindowHandles();
    const mainWindowHandle = handles[0];
    const authWindowHandle = handles.find((h) => h !== mainWindowHandle);
    if (!authWindowHandle) throw new Error('Auth window not found');

    // 2. Switch to Auth Window to set a cookie
    await browser.switchToWindow(authWindowHandle);
    
    // Ensure we are on a domain that supports the cookie we want to set
    await browser.url('https://accounts.google.com');

    // 3. Set a cookie in the Auth Window session
    await browser.setCookies([
      {
        name: 'e2e-test-cookie',
        value: 'shared-session-verified',
        domain: '.google.com',
        path: '/',
        secure: true,
        httpOnly: false,
      },
    ]);

    E2ELogger.info('auth', 'COOKIE SET: e2e-test-cookie set in AuthWindow');

    // 4. Switch back to Main Window
    await browser.switchToWindow(mainWindowHandle);

    // 5. Navigate Main Window to a URL that can read the cookie (same domain family)
    // IMPORTANT: use accounts.google.com as www.google.com is blocked in the main window
    await browser.url('https://accounts.google.com');

    // 6. Verify cookie is present in Main Window's session
    let testCookie;
    await browser.waitUntil(async () => {
      const cookies = await browser.getCookies(['e2e-test-cookie']);
      testCookie = cookies.find(c => c.name === 'e2e-test-cookie');
      return testCookie !== undefined;
    }, {
      timeout: 5000,
      timeoutMsg: 'Cookie e2e-test-cookie not found in main window session after 5s'
    });

    expect(testCookie).toBeDefined();
    // @ts-ignore
    expect(testCookie.value).toBe('shared-session-verified');
    
    E2ELogger.info('auth', 'Verified cookie set in Auth window is visible in Main window');

    // Cleanup
    await browser.switchToWindow(authWindowHandle);
    await browser.closeWindow();
    await waitForWindowCount(1, 3000);
    await browser.switchToWindow(mainWindowHandle);

    // We might need to reload the app if we navigated away
    // Assuming 'browser.url('/')' loads the app in this setup? 
    // Usually standard WDIO tests for Electron load the app automatically.
    // If we navigated away, we might have lost the app context.
    // Safe bet: The test ends here.
  });
});

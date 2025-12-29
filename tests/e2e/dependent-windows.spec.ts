/**
 * E2E Test: Dependent Windows Behavior
 *
 * Tests that auxiliary windows (options) close when the main window
 * is hidden to the system tray (close-to-tray behavior).
 *
 * This implements the "dependent windows" pattern where child windows
 * have a lifecycle tied to the parent window.
 */

import { browser, expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage, TrayPage, AuthWindowPage } from './pages';
import { waitForWindowCount } from './helpers/windowActions';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { E2ELogger } from './helpers/logger';

describe('Dependent Windows', () => {
  const mainWindow = new MainWindowPage();
  const optionsPage = new OptionsPage();
  const tray = new TrayPage();
  const authWindow = new AuthWindowPage();

  beforeEach(async () => {
    await waitForAppReady();
  });

  afterEach(async () => {
    await ensureSingleWindow();
  });

  it('should close options window when main window hides to tray', async () => {
    // 1. Open Options window via menu
    await mainWindow.openOptionsViaMenu();

    // 2. Wait for options window to appear (2 windows total)
    await waitForWindowCount(2, 5000);
    E2ELogger.info('dependent-windows', 'Options window opened successfully');

    const handles = await browser.getWindowHandles();
    expect(handles.length).toBe(2);

    // 3. Switch to main window and close it (triggers hide-to-tray behavior)
    const mainHandle = handles[0];
    await browser.switchToWindow(mainHandle);

    // 4. Close main window via close button
    await mainWindow.clickClose();
    E2ELogger.info('dependent-windows', 'Closed main window via close button');

    // 5. Wait for both windows to close/hide
    // When main window hides to tray, options window should also close
    await browser.pause(1000); // Allow time for window operations

    // 6. Verify no windows remain visible (both hidden/closed)
    // Note: The main window is hidden (not closed), so window count drops to 0
    await waitForWindowCount(0, 5000);
    E2ELogger.info('dependent-windows', 'Both windows closed/hidden as expected');

    // 7. Restore from tray to verify app is still running
    await tray.clickShowMenuItemAndWait();
  });

  it('should allow reopening options window after restoring from tray', async () => {
    // 1. First, hide the main window to tray with options open
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2, 5000);

    const handles = await browser.getWindowHandles();
    const mainHandle = handles[0];
    await browser.switchToWindow(mainHandle);

    // Close to tray
    await mainWindow.clickClose();
    await browser.pause(1000);

    // 2. Wait for windows to close
    await waitForWindowCount(0, 5000);

    // 3. Restore main window from tray via Show menu
    await tray.clickShowMenuItemAndWait();

    // 4. Wait for main window to reappear
    await waitForWindowCount(1, 5000);
    E2ELogger.info('dependent-windows', 'Main window restored from tray');

    // 5. Open options window again
    await mainWindow.openOptionsViaMenu();

    // 6. Verify options window opens successfully
    await waitForWindowCount(2, 5000);
    const newHandles = await browser.getWindowHandles();
    expect(newHandles.length).toBe(2);

    // 7. Switch to options window and verify it's functional
    await browser.switchToWindow(newHandles[1]);
    await optionsPage.waitForLoad();
    E2ELogger.info('dependent-windows', 'Options window reopened successfully after restore');

    // 8. Clean up - close options window
    await optionsPage.close();
    await waitForWindowCount(1, 5000);
  });

  it('should close all dependent windows (Options + Auth) when main window hides to tray', async () => {
    // 1. Open Options window
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2, 5000);
    E2ELogger.info('dependent-windows', 'Options window opened');

    // 2. Switch to main window and open Auth window via menu
    const handles = await browser.getWindowHandles();
    const mainHandle = handles[0];
    await browser.switchToWindow(mainHandle);
    await authWindow.openViaMenu();

    // Wait for auth window to appear (might already be open from Options)
    await browser.pause(1000);
    const allHandles = await browser.getWindowHandles();
    E2ELogger.info('dependent-windows', `Windows after opening auth: ${allHandles.length}`);

    // Should have at least 2 windows (main + options, auth may merge or not)
    expect(allHandles.length).toBeGreaterThanOrEqual(2);

    // 3. Switch back to main window and close it
    await browser.switchToWindow(mainHandle);
    await mainWindow.clickClose();
    E2ELogger.info('dependent-windows', 'Closed main window');

    // 4. Wait for all windows to close/hide
    await browser.pause(1500);
    await waitForWindowCount(0, 5000);
    E2ELogger.info('dependent-windows', 'All dependent windows closed with main window');

    // 5. Restore from tray for cleanup
    await tray.clickShowMenuItemAndWait();
    await waitForWindowCount(1, 5000);
  });
});

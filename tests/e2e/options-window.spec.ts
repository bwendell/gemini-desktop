/**
 * E2E Test: Options Window Features
 *
 * Tests opening/closing the Options window and verifying controls.
 *
 * Platform-aware: Uses Page Objects and workflow helpers for cross-platform consistency.
 */

import { browser, expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage } from './pages';
import { waitForWindowCount } from './helpers/windowActions';
import { switchToOptionsWindow } from './helpers/optionsWindowActions';
import { E2ELogger } from './helpers/logger';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';

describe('Options Window Features', () => {
  const mainWindow = new MainWindowPage();
  const optionsPage = new OptionsPage();

  beforeEach(async () => {
    await waitForAppReady();
  });

  afterEach(async () => {
    await ensureSingleWindow();
  });

  it('should open options window with correct window controls', async () => {
    // 1. Open Options via menu
    await mainWindow.openOptionsViaMenu();

    // 2. Wait for new window and switch to it
    await waitForWindowCount(2, 5000);
    await optionsPage.waitForLoad();

    // 3. Verify Custom Titlebar exists (present on all platforms for Options window)
    expect(await optionsPage.isTitlebarDisplayed()).toBe(true);

    // 3a. Verify Titlebar Icon is present
    const iconValidation = await optionsPage.isTitlebarIconValid();
    expect(iconValidation.exists).toBe(true);
    expect(iconValidation.hasValidSrc).toBe(true);
    expect(iconValidation.width).toBeGreaterThan(0);

    // 4. Verify window controls - now always present on all platforms
    expect(await optionsPage.isWindowControlsDisplayed()).toBe(true);

    // Should only be Minimize and Close (no maximize for Options window)
    const buttonCount = await optionsPage.getWindowControlButtonCount();
    expect(buttonCount).toBe(2);

    expect(await optionsPage.isMinimizeButtonDisplayed()).toBe(true);
    expect(await optionsPage.isCloseButtonDisplayed()).toBe(true);

    // Double check no maximize button exists
    expect(await optionsPage.isMaximizeButtonExisting()).toBe(false);

    // 5. Close the options window via close button
    await optionsPage.clickCloseButton();

    // 6. Verify correct window closing behavior
    await waitForWindowCount(1, 5000);

    const finalHandles = await browser.getWindowHandles();
    expect(finalHandles.length).toBe(1);

    // Switch back to main window
    await browser.switchToWindow(finalHandles[0]);
    const title = await browser.getTitle();
    expect(title).toBeDefined();
  });

  it('should NOT open multiple Options windows - clicking again focuses existing', async () => {
    // 1. Open Options via menu first time
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2, 5000);

    const handlesAfterFirst = await browser.getWindowHandles();
    expect(handlesAfterFirst.length).toBe(2);

    E2ELogger.info('options-window', 'First Options window opened');

    // 2. Switch back to main window
    await browser.switchToWindow(handlesAfterFirst[0]);
    await browser.pause(500);

    // 3. Try to open Options again
    await mainWindow.openOptionsViaMenu();
    await browser.pause(1000);

    // 4. Should still be only 2 windows (no duplicate)
    const handlesAfterSecond = await browser.getWindowHandles();
    expect(handlesAfterSecond.length).toBe(2);

    E2ELogger.info('options-window', 'No duplicate Options window created');

    // 5. Verify the existing Options window was focused (not a new one)
    // The handles should be the same
    expect(handlesAfterSecond).toEqual(handlesAfterFirst);

    // 6. Cleanup: close Options window (handled by afterEach, but be explicit)
    await switchToOptionsWindow();
    await optionsPage.close();
  });
});

/**
 * E2E Test: Options Window Features
 *
 * Tests opening/closing the Options window and verifying controls.
 *
 * Platform-aware: Uses clickMenuItem helper for cross-platform menu access.
 */

import { browser, $, expect } from '@wdio/globals';
import { Selectors } from './helpers/selectors';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForWindowCount } from './helpers/windowActions';
import { E2ELogger } from './helpers/logger';

declare global {
  interface Window {
    electronAPI: {
      closeWindow: () => void;
    };
  }
}

describe('Options Window Features', () => {
  it('should open options window with correct window controls', async () => {
    // 1. Open Options via menu
    await clickMenuItemById('menu-file-options');

    // 2. Wait for new window
    await waitForWindowCount(2, 5000);
    const handles = await browser.getWindowHandles();
    const optionsWindowHandle = handles[1];

    // Pause briefly to allow window to fully initialize
    await browser.pause(1000);

    // Switch context
    await browser.switchToWindow(optionsWindowHandle);

    // 3. Verify Custom Titlebar exists (present on all platforms for Options window)
    const titlebar = await $(Selectors.optionsTitlebar);
    await expect(titlebar).toExist();

    // 3a. Verify Titlebar Icon is present
    const icon = await titlebar.$(Selectors.titlebarIcon);
    await expect(icon).toExist();
    const iconSrc = await icon.getAttribute('src');
    expect(iconSrc).toMatch(/icon(-.*)?\.png/);
    const width = await icon.getProperty('naturalWidth');
    expect(width).toBeGreaterThan(0);

    // 4. Verify window controls - now always present on all platforms
    const controlsContainer = await $('.options-window-controls');
    await expect(controlsContainer).toBeDisplayed();

    const buttons = await controlsContainer.$$('button');
    // Should only be Minimize and Close (no maximize for Options window)
    expect(buttons.length).toBe(2);

    const minimizeBtn = await $('[data-testid="options-minimize-button"]');
    const closeBtn = await $(Selectors.optionsCloseButton);

    await expect(minimizeBtn).toBeDisplayed();
    await expect(closeBtn).toBeDisplayed();

    // Double check no maximize button exists
    const maximizeBtn = await $('[data-testid="options-maximize-button"]');
    await expect(maximizeBtn).not.toExist();

    // 5. Close the options window via close button
    await closeBtn.click();

    // 6. Verify correct window closing behavior
    await waitForWindowCount(1, 5000);

    const finalHandles = await browser.getWindowHandles();
    expect(finalHandles.length).toBe(1);

    // Verify the remaining window is the main window
    expect(finalHandles[0]).toBe(handles[0]);

    // Switch back just to be safe
    await browser.switchToWindow(finalHandles[0]);
    const title = await browser.getTitle();
    expect(title).toBeDefined();
  });

  it('should NOT open multiple Options windows - clicking again focuses existing', async () => {
    // 1. Open Options via menu first time
    await clickMenuItemById('menu-file-options');
    await waitForWindowCount(2, 5000);

    const handlesAfterFirst = await browser.getWindowHandles();
    expect(handlesAfterFirst.length).toBe(2);

    E2ELogger.info('options-window', 'First Options window opened');

    // 2. Switch back to main window
    await browser.switchToWindow(handlesAfterFirst[0]);
    await browser.pause(500);

    // 3. Try to open Options again
    await clickMenuItemById('menu-file-options');
    await browser.pause(1000);

    // 4. Should still be only 2 windows (no duplicate)
    const handlesAfterSecond = await browser.getWindowHandles();
    expect(handlesAfterSecond.length).toBe(2);

    E2ELogger.info('options-window', 'No duplicate Options window created');

    // 5. Verify the existing Options window was focused (not a new one)
    // The handles should be the same
    expect(handlesAfterSecond).toEqual(handlesAfterFirst);

    // 6. Cleanup: close Options window
    await browser.switchToWindow(handlesAfterSecond[1]);
    const closeBtn = await $(Selectors.optionsCloseButton);
    await closeBtn.click();
    await waitForWindowCount(1, 5000);

    // Switch back to main
    const finalHandles = await browser.getWindowHandles();
    await browser.switchToWindow(finalHandles[0]);
  });
});

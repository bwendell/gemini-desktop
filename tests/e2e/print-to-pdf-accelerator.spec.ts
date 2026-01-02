/**
 * E2E Test: Print to PDF Accelerator Customization (Task 5.5.3)
 *
 * Verifies the full workflow for customizing the "Print to PDF" keyboard shortcut.
 * This includes checking visibility, editing, persistence, and menu integration.
 *
 * @see docs/E2E_TESTING_GUIDELINES.md
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, $, expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage } from './pages';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForWindowCount } from './helpers/windowActions';
import { getPlatform, E2EPlatform } from './helpers/platform';
import { E2ELogger } from './helpers/logger';
import { E2E_TIMING } from './helpers/e2eConstants';
import { Selectors } from './helpers/selectors';

describe('Print to PDF Accelerator Customization', () => {
  const mainWindow = new MainWindowPage();
  const optionsPage = new OptionsPage();
  let platform: E2EPlatform;
  const hotkeyId = 'printToPdf';

  before(async () => {
    platform = await getPlatform();
    E2ELogger.info('print-to-pdf-accelerator', `Platform: ${platform.toUpperCase()}`);
    await waitForAppReady();
  });

  after(async () => {
    await ensureSingleWindow();
  });

  it('should support the full customization workflow', async () => {
    E2ELogger.info('print-to-pdf-accelerator', 'Starting full customization workflow test');

    // 1. Open Options window
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2);
    await optionsPage.waitForLoad();
    await optionsPage.navigateToSettings();
    E2ELogger.info('print-to-pdf-accelerator', '1. Options window opened');

    // 2. Verify visibility and default value
    const row = await optionsPage.getHotkeyRow(hotkeyId);
    await expect(row).toBeDisplayed();

    const defaultText = await optionsPage.getCurrentAccelerator(hotkeyId);
    if (platform === 'macos') {
      expect(defaultText).toContain('⌘');
      expect(defaultText).toContain('⇧');
    } else {
      expect(defaultText).toContain('Ctrl');
      expect(defaultText).toContain('Shift');
    }
    expect(defaultText).toContain('P');
    E2ELogger.info('print-to-pdf-accelerator', `2. Default value verified: ${defaultText}`);

    // 3. Change accelerator
    await optionsPage.clickAcceleratorInput(hotkeyId);
    await browser.waitUntil(async () => await optionsPage.isRecordingModeActive(hotkeyId), {
      timeout: 2000,
      timeoutMsg: 'Recording mode did not activate',
    });

    const modifiers = platform === 'macos' ? ['Meta', 'Alt'] : ['Control', 'Alt'];
    await browser.keys([...modifiers, 'p']);
    await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

    const changedText = await optionsPage.getCurrentAccelerator(hotkeyId);
    expect(changedText).toContain(platform === 'macos' ? '⌥' : 'Alt');
    expect(changedText).toContain('P');
    E2ELogger.info('print-to-pdf-accelerator', `3. Changed accelerator to: ${changedText}`);

    // 4. Verify persistence across window close
    await optionsPage.close();
    await waitForWindowCount(1);

    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2);
    await optionsPage.waitForLoad();
    await optionsPage.navigateToSettings();

    const persistedText = await optionsPage.getCurrentAccelerator(hotkeyId);
    expect(persistedText).toBe(changedText);
    E2ELogger.info('print-to-pdf-accelerator', '4. Persistence verified');

    // 5. Verify menu item hint update
    await optionsPage.close();
    await waitForWindowCount(1);

    if (platform !== 'macos') {
      await mainWindow.openMenu('File');
      await mainWindow.waitForDropdownOpen();
      const menuItem = await $(Selectors.menuItem('Print to PDF'));
      await expect(menuItem).toBeDisplayed();
      const itemText = await menuItem.getText();
      expect(itemText).toContain('Ctrl+Alt+P');
      await mainWindow.closeDropdownByClickingTitlebar();
    } else {
      const menuHint = await browser.electron.execute((electron: typeof import('electron')) => {
        const { Menu } = electron;
        const menu = Menu.getApplicationMenu();
        const fileMenu = menu?.items.find((item) => item.label === 'File');
        const printItem = fileMenu?.submenu?.items.find((item) => item.label === 'Print to PDF');
        return printItem ? printItem.accelerator : null;
      });
      expect(menuHint).toContain('Alt');
      expect(menuHint).toContain('P');
    }
    E2ELogger.info('print-to-pdf-accelerator', '5. Menu integration verified');

    // 6. Test reset to default
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2);
    await optionsPage.waitForLoad();
    await optionsPage.navigateToSettings();

    const resetButton = await $(optionsPage.resetButtonSelector(hotkeyId));
    await resetButton.waitForDisplayed({ timeout: 5000 });
    await optionsPage.clickResetButton(hotkeyId);
    await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

    const resetText = await optionsPage.getCurrentAccelerator(hotkeyId);
    expect(resetText).toBe(defaultText);
    E2ELogger.info('print-to-pdf-accelerator', '6. Reset functionality verified');

    // 7. Final cleanup
    await optionsPage.close();
    await waitForWindowCount(1);
    E2ELogger.info('print-to-pdf-accelerator', 'Test completed successfully');
  });

  it('should reject invalid accelerator (single key without modifiers)', async () => {
    // This test verifies that the accelerator input rejects invalid key combinations
    // Golden Rule: If validation was broken, test would pass invalid accelerator
    E2ELogger.info('print-to-pdf-accelerator', 'Testing invalid accelerator rejection');

    // 1. Open Options and navigate to settings
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2);
    await optionsPage.waitForLoad();
    await optionsPage.navigateToSettings();

    // 2. Record the current valid accelerator
    const originalAccelerator = await optionsPage.getCurrentAccelerator(hotkeyId);
    E2ELogger.info('print-to-pdf-accelerator', `Original accelerator: ${originalAccelerator}`);

    // 3. Click accelerator input and enter recording mode
    await optionsPage.clickAcceleratorInput(hotkeyId);
    await browser.waitUntil(async () => await optionsPage.isRecordingModeActive(hotkeyId), {
      timeout: 2000,
      timeoutMsg: 'Recording mode did not activate',
    });

    // 4. Press invalid key (single letter without modifiers)
    await browser.keys(['p']); // Just 'p' without Ctrl/Cmd/Alt
    await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

    // 5. Click elsewhere to exit recording mode
    const row = await optionsPage.getHotkeyRow(hotkeyId);
    await row.click();
    await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

    // 6. Verify accelerator was NOT changed to invalid value
    const currentAccelerator = await optionsPage.getCurrentAccelerator(hotkeyId);

    // Should either keep original or show empty (not just 'P')
    expect(currentAccelerator).not.toBe('P');
    expect(currentAccelerator).not.toBe('p');

    E2ELogger.info(
      'print-to-pdf-accelerator',
      `After invalid input: ${currentAccelerator} (original: ${originalAccelerator})`
    );

    // 7. Cleanup
    await optionsPage.close();
    await waitForWindowCount(1);
    E2ELogger.info('print-to-pdf-accelerator', 'Invalid accelerator test completed');
  });
});

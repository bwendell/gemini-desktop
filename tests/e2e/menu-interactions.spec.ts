/**
 * E2E Test: Menu Interactions (Sequential)
 *
 * Validates clicking through menus opens and closes dropdowns correctly.
 *
 * Platform-aware: Skips on macOS since custom menu bar is not rendered.
 */

import { expect } from '@wdio/globals';
import { usesCustomControls } from './helpers/platform';
import { MainWindowPage } from './pages';
import { E2ELogger } from './helpers/logger';
import { waitForAppReady } from './helpers/workflows';

describe('Menu Interactions (Sequential)', () => {
  const mainWindow = new MainWindowPage();

  beforeEach(async () => {
    if (!(await usesCustomControls())) {
      E2ELogger.info('menu-interactions', 'Skipping - macOS uses native menu bar');
      return;
    }
    await waitForAppReady();
  });

  it('should open the main window if not already present', async () => {
    // Verify main window is loaded using Page Object
    await mainWindow.waitForTitlebar();
    expect(await mainWindow.isTitlebarDisplayed()).toBe(true);
  });

  it('should verify File menu interactions', async () => {
    if (!(await usesCustomControls())) {
      return; // Skip on macOS
    }

    // 1. Click File Menu using Page Object
    await mainWindow.openMenu('File');

    // 2. Verify Dropdown is visible
    await mainWindow.waitForDropdownOpen();
    expect(await mainWindow.isDropdownVisible()).toBe(true);

    // 3. Verify "Options..." item exists
    expect(await mainWindow.isMenuItemExisting('Options')).toBe(true);

    // 4. Click titlebar to close dropdown
    await mainWindow.closeDropdownByClickingTitlebar();

    // 5. Verify dropdown closes
    await mainWindow.waitForDropdownClose();
    expect(await mainWindow.isDropdownVisible()).toBe(false);
  });

  it('should verify View menu interactions', async () => {
    if (!(await usesCustomControls())) {
      return; // Skip on macOS
    }

    // 1. Click View Menu
    await mainWindow.openMenu('View');

    // 2. Verify Dropdown is visible
    await mainWindow.waitForDropdownOpen();
    expect(await mainWindow.isDropdownVisible()).toBe(true);

    // 3. Click titlebar to close dropdown
    await mainWindow.closeDropdownByClickingTitlebar();

    // 4. Verify dropdown closes
    await mainWindow.waitForDropdownClose();
    expect(await mainWindow.isDropdownVisible()).toBe(false);
  });

  it('should verify About (Help) menu interactions', async () => {
    if (!(await usesCustomControls())) {
      return; // Skip on macOS
    }

    // 1. Click Help Menu
    await mainWindow.openMenu('Help');

    // 2. Verify Dropdown is visible
    await mainWindow.waitForDropdownOpen();
    expect(await mainWindow.isDropdownVisible()).toBe(true);

    // 3. Verify "About Gemini Desktop" item exists
    expect(await mainWindow.isMenuItemExisting('About Gemini Desktop')).toBe(true);

    // 4. Click titlebar to close dropdown
    await mainWindow.closeDropdownByClickingTitlebar();

    // 5. Verify dropdown closes
    await mainWindow.waitForDropdownClose();
    expect(await mainWindow.isDropdownVisible()).toBe(false);
  });
});

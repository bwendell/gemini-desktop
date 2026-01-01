/**
 * Cross-platform menu actions for E2E testing.
 *
 * This module provides extensible, industry-standard menu testing utilities.
 *
 * ## Architecture
 * - **macOS**: Uses native Electron Menu API via `Menu.getMenuItemById(id).click()`
 * - **Windows/Linux**: Uses custom HTML menu via DOM selectors with `data-menu-id` attributes
 *
 * ## Extensibility
 * To add a new menu item to tests:
 * 1. Add an `id` to the menu item in `MenuManager.ts` (e.g., `id: 'menu-file-newfeature'`)
 * 2. Add `data-menu-id` attribute to the custom UI menu item in `useMenuDefinitions.ts`
 * 3. Call `clickMenuItemById('menu-file-newfeature')` in your test
 *
 * No hardcoded mappings required!
 *
 * @module menuActions
 */
import { browser, $ } from '@wdio/globals';
import { isMacOS } from './platform';
import { E2ELogger } from './logger';

// ============================================================================
// Types
// ============================================================================

/**
 * Legacy interface for label-based menu references.
 * @deprecated Use `clickMenuItemById` instead for better reliability.
 */
export interface MenuItemRef {
  menuLabel: string;
  itemLabel: string;
}

// ============================================================================
// Primary API (Recommended)
// ============================================================================

/**
 * Clicks a menu item by its unique ID.
 *
 * This is the **recommended** approach for menu testing, following industry
 * best practices used by VS Code and electron-playwright-helpers.
 *
 * @param id - The unique menu item ID (defined in MenuManager.ts)
 * @throws Error if menu item with given ID is not found
 *
 * @example
 * // Click the "Options" menu item
 * await clickMenuItemById('menu-file-options');
 *
 * // Click "About Gemini Desktop"
 * await clickMenuItemById('menu-help-about');
 */
export async function clickMenuItemById(id: string): Promise<void> {
  const mac = await isMacOS();

  if (mac) {
    await clickNativeMenuItemById(id);
  } else {
    await clickCustomMenuItemById(id);
  }

  E2ELogger.info('menuActions', `Clicked menu item: ${id}`);
}

/**
 * Clicks a native Electron menu item by ID (macOS).
 * Uses the Electron Menu API directly.
 * @private
 */
async function clickNativeMenuItemById(id: string): Promise<void> {
  const result = await browser.electron.execute((electron, itemId) => {
    const menu = electron.Menu.getApplicationMenu();
    if (!menu) {
      return { success: false, error: 'Application menu not found' };
    }

    const item = menu.getMenuItemById(itemId);
    if (!item) {
      return { success: false, error: `Menu item with id "${itemId}" not found` };
    }

    item.click();
    return { success: true };
  }, id);

  if (!result.success) {
    throw new Error(`[E2E] ${result.error}`);
  }
}

/**
 * Clicks a custom HTML menu item by ID (Windows/Linux).
 * Finds element by `data-menu-id` attribute.
 * @private
 */
async function clickCustomMenuItemById(id: string): Promise<void> {
  // First, we need to open the correct menu dropdown
  // Extract menu category from ID (e.g., 'menu-file-options' -> 'file')
  const parts = id.split('-');
  if (parts.length < 3) {
    throw new Error(
      `[E2E] Invalid menu ID format: ${id}. Expected format: menu-{category}-{action}`
    );
  }

  const menuCategory = parts[1]; // 'file', 'view', 'help', etc.
  const menuLabel = menuCategory.charAt(0).toUpperCase() + menuCategory.slice(1); // 'File', 'View', 'Help'

  // Click the menu button to open dropdown
  const menuBtn = await $(`[data-testid="menu-button-${menuLabel}"]`);
  await menuBtn.waitForClickable({ timeout: 5000 });
  await menuBtn.click();

  // Wait for dropdown (uses class selector as TitlebarMenu doesn't have data-testid on dropdown)
  const dropdown = await $('.titlebar-menu-dropdown');
  await dropdown.waitForDisplayed({ timeout: 2000 });

  // Click the menu item by data-menu-id
  const menuItem = await $(`[data-menu-id="${id}"]`);
  await menuItem.waitForClickable({ timeout: 2000 });
  await menuItem.click();
}

// ============================================================================
// Legacy API (Deprecated - for backwards compatibility)
// ============================================================================

/**
 * Clicks a menu item using label-based lookup.
 *
 * @deprecated Use `clickMenuItemById` instead. This function requires
 * hardcoded mappings and is less reliable.
 *
 * @param ref Object containing menuLabel and itemLabel
 */
export async function clickMenuItem(ref: MenuItemRef): Promise<void> {
  E2ELogger.info(
    'menuActions',
    `[DEPRECATED] clickMenuItem() called. Use clickMenuItemById() instead.`
  );

  const mac = await isMacOS();

  if (mac) {
    await triggerMenuItemViaMacOS(ref);
  } else {
    await triggerMenuItemViaCustomUI(ref);
  }
}

/**
 * Legacy macOS menu trigger using label lookup.
 * @deprecated
 * @private
 */
async function triggerMenuItemViaMacOS(ref: MenuItemRef): Promise<void> {
  // Search for menu item by label property
  const result = await browser.electron.execute(
    (electron: typeof import('electron'), label: string) => {
      const menu = electron.Menu.getApplicationMenu();
      if (!menu) {
        return { success: false, error: 'Application menu not found' };
      }

      // Recursive search for menu item by label
      function findItemByLabel(
        items: Electron.MenuItem[],
        targetLabel: string
      ): Electron.MenuItem | null {
        for (const item of items) {
          if (item.label === targetLabel) {
            return item;
          }
          if (item.submenu) {
            const found = findItemByLabel(item.submenu.items, targetLabel);
            if (found) return found;
          }
        }
        return null;
      }

      const item = findItemByLabel(menu.items, label);
      if (!item) {
        return { success: false, error: `Menu item with label "${label}" not found` };
      }

      item.click();
      return { success: true };
    },
    ref.itemLabel
  );

  if (!result.success) {
    throw new Error(`[E2E] ${result.error}`);
  }

  E2ELogger.info(
    'menuActions',
    `Triggered macOS menu action: ${ref.menuLabel} -> ${ref.itemLabel}`
  );
}

/**
 * Legacy custom UI menu trigger using selectors.
 * @deprecated
 * @private
 */
async function triggerMenuItemViaCustomUI(ref: MenuItemRef): Promise<void> {
  E2ELogger.info('menuActions', `Clicking custom UI menu: ${ref.menuLabel} -> ${ref.itemLabel}`);

  // 1. Click top-level menu button
  const menuBtn = await $(`[data-testid="menu-button-${ref.menuLabel}"]`);
  await menuBtn.waitForClickable();
  await menuBtn.click();

  // 2. Wait for dropdown
  const dropdown = await $('[data-testid="menu-dropdown"]');
  await dropdown.waitForDisplayed();

  // 3. Click item by text content
  const item = await $(`[data-testid="menu-dropdown"] >> text=${ref.itemLabel}`);
  await item.waitForClickable();
  await item.click();
}

/**
 * Waits for a menu item to become enabled.
 * Useful for testing dynamic menu state.
 *
 * @param id - The menu item ID
 * @param timeoutMs - Maximum wait time in milliseconds
 */
export async function waitForMenuItemEnabled(id: string, timeoutMs = 5000): Promise<void> {
  const mac = await isMacOS();

  if (mac) {
    // For macOS, poll the menu item state
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const result = await browser.electron.execute(
        (electron: typeof import('electron'), itemId: string) => {
          const menu = electron.Menu.getApplicationMenu();
          const item = menu?.getMenuItemById(itemId);
          return item?.enabled ?? false;
        },
        id
      );
      if (result === true) return;
      await browser.pause(100);
    }
    throw new Error(`[E2E] Menu item ${id} did not become enabled within ${timeoutMs}ms`);
  } else {
    const menuItem = await $(`[data-menu-id="${id}"]`);
    await menuItem.waitForEnabled({ timeout: timeoutMs });
  }
}

/**
 * Checks if a menu item exists.
 *
 * @param id - The menu item ID
 * @returns true if menu item exists
 */
export async function menuItemExists(id: string): Promise<boolean> {
  const mac = await isMacOS();

  if (mac) {
    return await browser.electron.execute((electron: typeof import('electron'), itemId: string) => {
      const menu = electron.Menu.getApplicationMenu();
      return menu?.getMenuItemById(itemId) !== null;
    }, id);
  } else {
    const menuItem = await $(`[data-menu-id="${id}"]`);
    return await menuItem.isExisting();
  }
}

/**
 * Menu item state information.
 */
export interface MenuItemState {
  /** Whether the menu item exists */
  exists: boolean;
  /** Whether the menu item is enabled */
  enabled: boolean;
  /** The accelerator string (e.g., 'CommandOrControl+Shift+P') */
  accelerator: string | undefined;
}

/**
 * Gets the state of a menu item including enabled and accelerator properties.
 * Useful for verifying menu item behavior in E2E tests.
 *
 * @param id - The menu item ID
 * @returns MenuItemState object with exists, enabled, and accelerator properties
 *
 * @example
 * const state = await getMenuItemState('menu-file-print-to-pdf');
 * expect(state.enabled).toBe(true);
 * expect(state.accelerator).toContain('Shift+P');
 */
export async function getMenuItemState(id: string): Promise<MenuItemState> {
  const mac = await isMacOS();

  if (mac) {
    return await browser.electron.execute((electron: typeof import('electron'), itemId: string) => {
      const menu = electron.Menu.getApplicationMenu();
      const item = menu?.getMenuItemById(itemId);

      if (!item) {
        return { exists: false, enabled: false, accelerator: undefined };
      }

      return {
        exists: true,
        enabled: item.enabled,
        accelerator: item.accelerator,
      };
    }, id);
  } else {
    // For Windows/Linux, we need to open the menu and check the item's DOM state
    // First check if item exists by querying the menu structure
    const result = await browser.electron.execute(
      (electron: typeof import('electron'), itemId: string) => {
        const menu = electron.Menu.getApplicationMenu();
        const item = menu?.getMenuItemById(itemId);

        if (!item) {
          return { exists: false, enabled: false, accelerator: undefined };
        }

        return {
          exists: true,
          enabled: item.enabled,
          accelerator: item.accelerator,
        };
      },
      id
    );

    return result;
  }
}

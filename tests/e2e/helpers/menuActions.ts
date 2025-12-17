/**
 * Cross-platform menu actions.
 * 
 * On Windows/Linux: Uses custom HTML menu via selectors.
 * On macOS: Triggers menu actions via IPC or keyboard shortcuts.
 */
import { browser, $ } from '@wdio/globals';
import { isMacOS } from './platform';
import { Selectors } from './selectors';
import { E2ELogger } from './logger';

export interface MenuItemRef {
    menuLabel: string;
    itemLabel: string;
}

/**
 * Clicks a menu item in a cross-platform way.
 * @param ref Object containing menuLabel and itemLabel
 */
export async function clickMenuItem(ref: MenuItemRef): Promise<void> {
    const mac = await isMacOS();

    if (mac) {
        await triggerMenuItemViaMacOS(ref);
    } else {
        await triggerMenuItemViaCustomUI(ref);
    }
}

/**
 * Triggers a menu item on macOS using IPC.
 * Since macOS uses native menus which are not in the DOM, we must use IPC.
 * @private
 */
async function triggerMenuItemViaMacOS(ref: MenuItemRef): Promise<void> {
    await browser.electron.execute((electron, menuLabel, itemLabel) => {
        // Map menu items to IPC actions
        if (menuLabel === 'File' && itemLabel === 'Options') {
            electron.ipcRenderer.send('open-options-window');
            return;
        }

        // Add more mappings here as needed...

        // Log warning if no mapping found (will appear in browser console)
        console.warn(`[E2E] No macOS IPC mapping found for menu item: ${menuLabel} -> ${itemLabel}`);

    }, ref.menuLabel, ref.itemLabel);

    // Log info in test output
    E2ELogger.info('menuActions', `Triggered macOS menu action: ${ref.menuLabel} -> ${ref.itemLabel}`);
}

/**
 * Clicks a menu item via the custom HTML UI (Windows/Linux).
 * @private
 */
async function triggerMenuItemViaCustomUI(ref: MenuItemRef): Promise<void> {
    E2ELogger.info('menuActions', `Clicking custom UI menu: ${ref.menuLabel} -> ${ref.itemLabel}`);

    // 1. Click top-level menu button
    const menuBtn = await $(Selectors.menuButton(ref.menuLabel));
    await menuBtn.waitForClickable();
    await menuBtn.click();

    // 2. Wait for dropdown
    const dropdown = await $(Selectors.menuDropdown);
    await dropdown.waitForDisplayed();

    // 3. Click item
    const item = await $(Selectors.menuItem(ref.itemLabel));
    await item.waitForClickable();
    await item.click();
}

/**
 * E2E Workflow Helpers.
 *
 * Provides reusable multi-step workflow utilities for common test scenarios.
 * These helpers encapsulate sequences of actions that are frequently repeated.
 *
 * @module workflows
 */

/// <reference path="./wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import { E2ELogger } from './logger';
import { E2E_TIMING } from './e2eConstants';
import { Selectors } from './selectors';
import { clickMenuItemById } from './menuActions';
import { waitForWindowCount, closeCurrentWindow } from './windowActions';
import { waitForUIState } from './waitUtilities';
import {
    waitForOptionsWindow,
    closeOptionsWindow,
    switchToOptionsWindow,
    navigateToOptionsTab,
    openOptionsWindowViaHotkey,
} from './optionsWindowActions';
import { isMacOS } from './platform';

// =============================================================================
// Options Window Workflows
// =============================================================================

/**
 * Opens the options window via menu, executes an action, then closes it.
 * Automatically handles window switching and cleanup.
 *
 * @param action - Async function to execute while options window is open
 * @returns The result of the action function
 *
 * @example
 * await withOptionsWindowViaMenu(async () => {
 *   await navigateToOptionsTab('about');
 *   // ... assertions
 * });
 */
export async function withOptionsWindowViaMenu<T>(action: () => Promise<T>): Promise<T> {
    E2ELogger.info('workflows', 'Opening Options window via menu');

    await clickMenuItemById('menu-file-options');
    await waitForWindowCount(2);
    await switchToOptionsWindow();

    // Wait for the options window content to be ready
    await waitForUIState(
        async () => {
            const title = await browser.$(Selectors.optionsTitlebarTitle);
            return await title.isDisplayed().catch(() => false);
        },
        { description: 'Options window content ready' }
    );

    try {
        return await action();
    } finally {
        E2ELogger.info('workflows', 'Closing Options window');
        await closeOptionsWindow();
    }
}

/**
 * Opens the options window via hotkey, executes an action, then closes it.
 * Automatically handles window switching and cleanup.
 *
 * @param action - Async function to execute while options window is open
 * @returns The result of the action function
 *
 * @example
 * await withOptionsWindowViaHotkey(async () => {
 *   const toggle = await $('[data-testid="some-toggle"]');
 *   await toggle.click();
 * });
 */
export async function withOptionsWindowViaHotkey<T>(action: () => Promise<T>): Promise<T> {
    E2ELogger.info('workflows', 'Opening Options window via hotkey');

    await openOptionsWindowViaHotkey();
    await waitForOptionsWindow();

    try {
        return await action();
    } finally {
        E2ELogger.info('workflows', 'Closing Options window');
        await closeOptionsWindow();
    }
}

/**
 * Opens the options window to a specific tab and executes an action.
 *
 * @param tabName - The tab to navigate to ('settings' or 'about')
 * @param action - Async function to execute
 * @returns The result of the action function
 *
 * @example
 * await withOptionsTab('about', async () => {
 *   const version = await $('[data-testid="about-version"]');
 *   expect(await version.getText()).toMatch(/\d+\.\d+/);
 * });
 */
export async function withOptionsTab<T>(tabName: 'settings' | 'about', action: () => Promise<T>): Promise<T> {
    return withOptionsWindowViaMenu(async () => {
        await navigateToOptionsTab(tabName);
        // Wait for the tab content to settle
        await waitForUIState(
            async () => {
                const tabContent = await browser.$(Selectors.optionsTab(tabName));
                return await tabContent.isDisplayed().catch(() => false);
            },
            { description: `Tab navigation to ${tabName}` }
        );
        return await action();
    });
}

// =============================================================================
// Theme Workflows
// =============================================================================

/**
 * Changes the theme via the options window.
 * Opens options, selects theme, and closes.
 *
 * @param theme - The theme to select ('light', 'dark', or 'system')
 *
 * @example
 * await changeTheme('dark');
 * // Theme is now applied
 */
export async function changeTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    E2ELogger.info('workflows', `Changing theme to: ${theme}`);

    await withOptionsWindowViaMenu(async () => {
        const themeCard = await browser.$(Selectors.themeCard(theme));
        await themeCard.waitForDisplayed({ timeout: 5000 });
        await themeCard.click();

        // Wait for the theme to be applied to the document
        await waitForUIState(
            async () => {
                const currentTheme = await browser.execute(() => document.documentElement.getAttribute('data-theme'));
                // For 'system', theme resolves to either 'light' or 'dark'
                return theme === 'system' ? currentTheme !== null : currentTheme === theme;
            },
            { description: `Theme change to ${theme}` }
        );
    });

    E2ELogger.info('workflows', `✓ Theme changed to: ${theme}`);
}

/**
 * Gets the current theme and changes it, returning the original for later restoration.
 *
 * @param newTheme - The theme to apply
 * @returns The original theme value for restoration
 *
 * @example
 * const original = await changeThemeWithRestore('light');
 * // ... do test stuff
 * await changeTheme(original); // Restore
 */
export async function changeThemeWithRestore(newTheme: 'light' | 'dark' | 'system'): Promise<'light' | 'dark'> {
    const originalTheme = (await browser.execute(() => {
        return document.documentElement.getAttribute('data-theme');
    })) as 'light' | 'dark';

    await changeTheme(newTheme);

    return originalTheme;
}

// =============================================================================
// Hotkey Recording Workflows
// =============================================================================

/**
 * Records a new hotkey accelerator in the options window.
 *
 * @param hotkeyId - The hotkey identifier (e.g., 'alwaysOnTop', 'bossKey', 'quickChat')
 * @param keys - Array of keys to press (e.g., ['Control', 'Shift', 'F'])
 *
 * @example
 * await recordHotkey('alwaysOnTop', ['Control', 'Alt', 'T']);
 */
export async function recordHotkey(hotkeyId: string, keys: string[]): Promise<void> {
    E2ELogger.info('workflows', `Recording hotkey for ${hotkeyId}: ${keys.join('+')}`);

    // Find the hotkey row and click the accelerator display
    const row = await browser.$(`[data-testid="hotkey-toggle-${hotkeyId}"]`);
    const parentRow = await row.parentElement();
    const acceleratorDisplay = await parentRow.$('.keycap-container');

    await acceleratorDisplay.click();

    // Wait for recording mode to activate
    await browser.waitUntil(
        async () => {
            const prompt = await browser.$('.recording-prompt');
            return await prompt.isDisplayed();
        },
        { timeout: 2000, timeoutMsg: 'Recording mode did not activate' }
    );

    // Press the new key combination
    await browser.keys(keys);

    // Wait for recording mode to deactivate (prompt disappears)
    await waitForUIState(
        async () => {
            const prompt = await browser.$('.recording-prompt');
            return !(await prompt.isDisplayed().catch(() => false));
        },
        { description: 'Hotkey recording complete' }
    );

    E2ELogger.info('workflows', `✓ Recorded hotkey: ${keys.join('+')}`);
}

/**
 * Records a hotkey and waits for the UI to update.
 * Opens options window, records the hotkey, and closes.
 *
 * @param hotkeyId - The hotkey identifier
 * @param keys - Array of keys to press
 *
 * @example
 * await recordHotkeyViaOptions('bossKey', ['Control', 'Shift', 'H']);
 */
export async function recordHotkeyViaOptions(hotkeyId: string, keys: string[]): Promise<void> {
    await withOptionsWindowViaHotkey(async () => {
        await recordHotkey(hotkeyId, keys);
    });
}

/**
 * Resets a hotkey to its default value.
 *
 * @param hotkeyId - The hotkey identifier
 */
export async function resetHotkeyToDefault(hotkeyId: string): Promise<void> {
    E2ELogger.info('workflows', `Resetting hotkey: ${hotkeyId}`);

    const row = await browser.$(`[data-testid="hotkey-toggle-${hotkeyId}"]`);
    const parentRow = await row.parentElement();
    const resetButton = await parentRow.$('.reset-button');

    if (await resetButton.isExisting()) {
        if (await resetButton.isDisplayed()) {
            await resetButton.click();

            // Wait for UI to reflect the reset
            await waitForUIState(async () => !(await resetButton.isDisplayed().catch(() => false)), {
                description: `Hotkey reset: ${hotkeyId}`,
            });
            E2ELogger.info('workflows', `✓ Reset hotkey: ${hotkeyId}`);
        } else {
            E2ELogger.info('workflows', `Hotkey ${hotkeyId} already at default`);
        }
    } else {
        E2ELogger.info('workflows', `Hotkey ${hotkeyId} already at default (no reset button)`);
    }
}

// =============================================================================
// Toggle Workflows
// =============================================================================

/**
 * Toggles a switch/checkbox element and waits for state change.
 *
 * @param toggleSelector - Selector for the toggle element
 *
 * @example
 * await toggleSwitch('[data-testid="auto-update-toggle"]');
 */
export async function toggleSwitch(toggleSelector: string): Promise<void> {
    const toggle = await browser.$(toggleSelector);
    await toggle.waitForDisplayed({ timeout: 5000 });

    const wasChecked = (await toggle.getAttribute('aria-checked')) === 'true';
    await toggle.click();

    // Wait for the toggle state to actually change
    const targetState = !wasChecked;
    await waitForUIState(async () => (await toggle.getAttribute('aria-checked')) === String(targetState), {
        description: `Toggle ${toggleSelector}: ${wasChecked} → ${targetState}`,
    });

    E2ELogger.info('workflows', `Toggled ${toggleSelector}: ${wasChecked} → ${targetState}`);
}

/**
 * Sets a toggle to a specific state.
 *
 * @param toggleSelector - Selector for the toggle element
 * @param enabled - The desired state
 */
export async function setToggleState(toggleSelector: string, enabled: boolean): Promise<void> {
    const toggle = await browser.$(toggleSelector);
    await toggle.waitForDisplayed({ timeout: 5000 });

    const isCurrentlyEnabled = (await toggle.getAttribute('aria-checked')) === 'true';

    if (isCurrentlyEnabled !== enabled) {
        await toggle.click();

        // Wait for the toggle state to match the target
        await waitForUIState(async () => (await toggle.getAttribute('aria-checked')) === String(enabled), {
            description: `Set toggle ${toggleSelector} to ${enabled}`,
        });
        E2ELogger.info('workflows', `Set toggle ${toggleSelector} to: ${enabled}`);
    } else {
        E2ELogger.info('workflows', `Toggle ${toggleSelector} already in state: ${enabled}`);
    }
}

// =============================================================================
// Window State Workflows
// =============================================================================

/**
 * Ensures only the main window is open by closing all secondary windows.
 * Useful for test cleanup.
 */
export async function ensureSingleWindow(): Promise<void> {
    const handles = await browser.getWindowHandles();

    if (handles.length > 1) {
        E2ELogger.info('workflows', `Closing ${handles.length - 1} extra window(s)`);

        // Close all windows except the first (main window)
        for (let i = handles.length - 1; i > 0; i--) {
            await browser.switchToWindow(handles[i]);
            await browser.closeWindow();
        }

        // Switch back to main window
        await browser.switchToWindow(handles[0]);
    }

    E2ELogger.info('workflows', '✓ Single window state ensured');
}

/**
 * Switches to the main window (first window handle).
 */
export async function switchToMainWindow(): Promise<void> {
    const handles = await browser.getWindowHandles();
    if (handles.length > 0) {
        await browser.switchToWindow(handles[0]);
        E2ELogger.info('workflows', 'Switched to main window');
    }
}

/**
 * Gets the current window count.
 *
 * @returns The number of open windows
 */
export async function getWindowCount(): Promise<number> {
    const handles = await browser.getWindowHandles();
    return handles.length;
}

// =============================================================================
// Menu Navigation Workflows
// =============================================================================

/**
 * Opens a menu item by its ID and waits for a new window to appear.
 * Useful for menu items that open new windows (like Options, About).
 *
 * @param menuItemId - The data-testid of the menu item
 * @returns The new window handle
 *
 * @example
 * const optionsHandle = await openWindowViaMenu('menu-file-options');
 */
export async function openWindowViaMenu(menuItemId: string): Promise<string> {
    const initialHandles = await browser.getWindowHandles();
    const initialCount = initialHandles.length;

    await clickMenuItemById(menuItemId);

    // Wait for new window
    await browser.waitUntil(
        async () => {
            const handles = await browser.getWindowHandles();
            return handles.length > initialCount;
        },
        { timeout: 5000, timeoutMsg: `No new window opened after clicking ${menuItemId}` }
    );

    const newHandles = await browser.getWindowHandles();
    const newWindowHandle = newHandles.find((h) => !initialHandles.includes(h));

    E2ELogger.info('workflows', `✓ Opened window via menu: ${menuItemId}`);
    return newWindowHandle || newHandles[newHandles.length - 1];
}

// =============================================================================
// Keyboard Shortcut Workflows
// =============================================================================

/**
 * Presses a keyboard shortcut with platform-aware modifier key.
 *
 * @param modifierType - 'primary' for Cmd/Ctrl, 'alt' for Alt/Option
 * @param key - The key to press with the modifier
 *
 * @example
 * await pressShortcut('primary', ','); // Cmd+, or Ctrl+,
 */
export async function pressShortcut(modifierType: 'primary' | 'alt', ...keys: string[]): Promise<void> {
    const isMac = await isMacOS();

    let modifier: string;
    if (modifierType === 'primary') {
        modifier = isMac ? 'Meta' : 'Control';
    } else {
        modifier = 'Alt';
    }

    await browser.keys([modifier, ...keys]);
    // Brief settle after keyboard shortcut - no verifiable side-effect at this level
    await waitForUIState(async () => true, { description: `Shortcut: ${modifier}+${keys.join('+')}`, timeout: 200 });

    E2ELogger.info('workflows', `Pressed shortcut: ${modifier}+${keys.join('+')}`);
}

/**
 * Presses a keyboard shortcut with multiple modifiers.
 *
 * @param modifiers - Array of modifier types
 * @param key - The key to press
 *
 * @example
 * await pressComplexShortcut(['primary', 'shift'], 'T'); // Cmd+Shift+T or Ctrl+Shift+T
 */
export async function pressComplexShortcut(modifiers: Array<'primary' | 'shift' | 'alt'>, key: string): Promise<void> {
    const isMac = await isMacOS();

    const modifierKeys: string[] = modifiers.map((m) => {
        switch (m) {
            case 'primary':
                return isMac ? 'Meta' : 'Control';
            case 'shift':
                return 'Shift';
            case 'alt':
                return 'Alt';
            default:
                return m;
        }
    });

    await browser.keys([...modifierKeys, key]);
    // Brief settle after keyboard shortcut - no verifiable side-effect at this level
    await waitForUIState(async () => true, { description: `Shortcut: ${modifierKeys.join('+')}+${key}`, timeout: 200 });

    E2ELogger.info('workflows', `Pressed shortcut: ${modifierKeys.join('+')}+${key}`);
}

// =============================================================================
// Wait Helpers
// =============================================================================

/**
 * Waits for the app to be fully loaded with the main layout visible.
 *
 * @param timeout - Timeout in ms (default: 15000)
 */
export async function waitForAppReady(timeout = 15000): Promise<void> {
    const mainLayout = await browser.$(Selectors.mainLayout);
    await mainLayout.waitForExist({ timeout });
    E2ELogger.info('workflows', '✓ App is ready');
}

/**
 * Waits for any pending IPC operations to complete.
 * Use after actions that trigger IPC calls.
 */
export async function waitForIpcSettle(): Promise<void> {
    await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
}

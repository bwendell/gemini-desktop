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
import { testLogger } from './testLogger';
import { E2E_TIMING } from './e2eConstants';
import { Selectors } from './selectors';
import { clickMenuItemById } from './menuActions';
import { waitForWindowCount, closeCurrentWindow as _closeCurrentWindow } from './windowActions';
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
    testLogger.breadcrumb('workflow', 'Opening Options window via menu');

    await clickMenuItemById('menu-file-options');
    await waitForWindowCount(2);
    await switchToOptionsWindow();
    await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);

    testLogger.breadcrumb('workflow', 'Options window opened and ready');

    try {
        return await action();
    } finally {
        E2ELogger.info('workflows', 'Closing Options window');
        testLogger.breadcrumb('workflow', 'Closing Options window');
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
        await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
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
        await browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
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
 * @param hotkeyId - The hotkey identifier (e.g., 'alwaysOnTop', 'peekAndHide', 'quickChat')
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
    await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

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
 * await recordHotkeyViaOptions('peekAndHide', ['Control', 'Shift', 'H']);
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
            await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
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
    await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

    E2ELogger.info('workflows', `Toggled ${toggleSelector}: ${wasChecked} → ${!wasChecked}`);
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
        await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
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
    testLogger.breadcrumb('workflow', 'Ensuring single window state');
    const handles = await browser.getWindowHandles();

    if (handles.length > 1) {
        E2ELogger.info('workflows', `Closing ${handles.length - 1} extra window(s)`);
        testLogger.breadcrumb('workflow', `Closing ${handles.length - 1} extra window(s)`);

        // Close all windows except the first (main window)
        for (let i = handles.length - 1; i > 0; i--) {
            await browser.switchToWindow(handles[i]);
            await browser.closeWindow();
        }

        // Switch back to main window
        await browser.switchToWindow(handles[0]);
    }

    testLogger.breadcrumb('workflow', 'Single window state confirmed');
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
    await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

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
    await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);

    E2ELogger.info('workflows', `Pressed shortcut: ${modifierKeys.join('+')}+${key}`);
}

export async function pressNativeShortcut(modifiers: Array<'primary' | 'shift' | 'alt'>, key: string): Promise<void> {
    const isMac = await isMacOS();
    const modifierKeys: Array<'shift' | 'alt' | 'control' | 'meta'> = modifiers.map((m) => {
        switch (m) {
            case 'primary':
                return isMac ? 'meta' : 'control';
            case 'shift':
                return 'shift';
            case 'alt':
                return 'alt';
            default:
                return m;
        }
    });

    const keyCode = key.length === 1 ? key.toUpperCase() : key;

    await browser.electron.execute(
        (electron, payload) => {
            const wm = (global as { windowManager?: { getMainWindow?: () => Electron.BrowserWindow | null } })
                .windowManager;
            if (!wm?.getMainWindow) throw new Error('WindowManager not found on global');
            const win = wm.getMainWindow();
            if (!win) throw new Error('MainWindow not found');

            win.webContents.sendInputEvent({
                type: 'keyDown',
                keyCode: payload.keyCode,
                modifiers: payload.modifiers,
            });
            win.webContents.sendInputEvent({
                type: 'keyUp',
                keyCode: payload.keyCode,
                modifiers: payload.modifiers,
            });
        },
        { keyCode, modifiers: modifierKeys }
    );

    await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
    E2ELogger.info('workflows', `Pressed native shortcut: ${modifierKeys.join('+')}+${key}`);
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

/**
 * Waits for window animation/transition to complete.
 * Use after maximize, minimize, restore, show/hide, etc.
 *
 * When called with a condition function, uses condition-based polling
 * instead of static timeouts to handle timing variability on slower CI runners.
 *
 * @param condition - Optional async function that returns true when transition is complete
 * @param timeout - Max wait time in ms (default: E2E_TIMING.TIMEOUTS.WINDOW_TRANSITION)
 * @returns true if condition was met within timeout, false otherwise (or void if no condition)
 *
 * @example
 * // Static pause (backwards compatible)
 * await waitForWindowTransition();
 *
 * // Condition-based polling (recommended for CI reliability)
 * await waitForWindowTransition(async () => !(await quickChatPage.isVisible()));
 */
export async function waitForWindowTransition(
    condition?: () => Promise<boolean>,
    timeout = E2E_TIMING.TIMEOUTS?.WINDOW_TRANSITION ?? 3000
): Promise<boolean | void> {
    if (!condition) {
        // Backwards-compatible: static pause when no condition provided
        await browser.pause(E2E_TIMING.WINDOW_TRANSITION);
        return;
    }

    // Condition-based polling for CI reliability
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            E2ELogger.info('workflows', `Window transition condition met after ${Date.now() - startTime}ms`);
            return true;
        }
        await browser.pause(100); // Poll every 100ms
    }

    E2ELogger.info('workflows', `Timeout waiting for window transition condition after ${timeout}ms`);
    return false;
}

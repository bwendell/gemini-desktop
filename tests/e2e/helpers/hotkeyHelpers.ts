/**
 * E2E Hotkey Test Helpers.
 * 
 * Provides utilities for testing global keyboard shortcuts across platforms.
 * Uses Electron's globalShortcut API via browser.electron.execute().
 * 
 * @module hotkeyHelpers
 */

import { browser } from '@wdio/globals';
import type { E2EPlatform } from './platform';

/**
 * Hotkey definition for cross-platform testing.
 */
export interface HotkeyDefinition {
    /** The Electron accelerator string (e.g., 'CommandOrControl+Alt+E') */
    accelerator: string;
    /** Human-readable description */
    description: string;
    /** Platform-specific display format */
    displayFormat: {
        windows: string;
        macos: string;
        linux: string;
    };
}

/**
 * Registered hotkeys in the application.
 * Add new hotkeys here as they are implemented.
 */
export const REGISTERED_HOTKEYS: Record<string, HotkeyDefinition> = {
    MINIMIZE_WINDOW: {
        accelerator: 'CommandOrControl+Alt+E',
        description: 'Minimize the main window',
        displayFormat: {
            windows: 'Ctrl+Alt+E',
            macos: 'Cmd+Alt+E',
            linux: 'Ctrl+Alt+E',
        },
    },
};

/**
 * Gets the expected accelerator string for the current platform.
 * Electron uses 'CommandOrControl' which maps to Ctrl on Windows/Linux and Cmd on macOS.
 * 
 * @param platform - The current platform
 * @param hotkeyId - The hotkey identifier from REGISTERED_HOTKEYS
 * @returns The Electron accelerator string (always 'CommandOrControl+...')
 */
export function getExpectedAccelerator(hotkeyId: keyof typeof REGISTERED_HOTKEYS): string {
    return REGISTERED_HOTKEYS[hotkeyId].accelerator;
}

/**
 * Gets the human-readable hotkey display string for the current platform.
 * 
 * @param platform - The current platform ('windows', 'macos', 'linux')
 * @param hotkeyId - The hotkey identifier from REGISTERED_HOTKEYS
 * @returns Platform-specific display string (e.g., 'Ctrl+Alt+E' or 'Cmd+Alt+E')
 */
export function getHotkeyDisplayString(
    platform: E2EPlatform,
    hotkeyId: keyof typeof REGISTERED_HOTKEYS
): string {
    return REGISTERED_HOTKEYS[hotkeyId].displayFormat[platform];
}

/**
 * Checks if a global shortcut is registered in Electron.
 * 
 * @param accelerator - The Electron accelerator string to check
 * @returns Promise<boolean> - True if the shortcut is registered
 */
export async function isHotkeyRegistered(accelerator: string): Promise<boolean> {
    return browser.electron.execute(
        (electron: typeof import('electron'), acc: string) => electron.globalShortcut.isRegistered(acc),
        accelerator
    );
}

/**
 * Gets all registered global shortcuts (for debugging purposes).
 * Note: Electron doesn't provide a direct API for this, so we check known hotkeys.
 * 
 * @returns Promise<string[]> - Array of registered accelerator strings
 */
export async function getRegisteredHotkeys(): Promise<string[]> {
    const registered: string[] = [];

    for (const [, hotkey] of Object.entries(REGISTERED_HOTKEYS)) {
        const isRegistered = await isHotkeyRegistered(hotkey.accelerator);
        if (isRegistered) {
            registered.push(hotkey.accelerator);
        }
    }

    return registered;
}

/**
 * Verifies that a hotkey is registered and logs platform-specific information.
 * Useful for CI logs to confirm cross-platform compatibility.
 * 
 * @param platform - The current platform
 * @param hotkeyId - The hotkey identifier from REGISTERED_HOTKEYS
 * @returns Promise<boolean> - True if the hotkey is registered
 */
export async function verifyHotkeyRegistration(
    platform: E2EPlatform,
    hotkeyId: keyof typeof REGISTERED_HOTKEYS
): Promise<boolean> {
    const hotkey = REGISTERED_HOTKEYS[hotkeyId];
    const displayString = getHotkeyDisplayString(platform, hotkeyId);
    const isRegistered = await isHotkeyRegistered(hotkey.accelerator);

    console.log(`[${platform.toUpperCase()}] Hotkey "${hotkey.description}"`);
    console.log(`  Accelerator: ${hotkey.accelerator}`);
    console.log(`  Display: ${displayString}`);
    console.log(`  Registered: ${isRegistered ? '✓ Yes' : '✗ No'}`);

    return isRegistered;
}

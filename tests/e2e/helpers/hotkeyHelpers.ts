/**
 * E2E Hotkey Test Helpers.
 * 
 * Provides utilities for testing global keyboard shortcuts across platforms.
 * Uses Electron's globalShortcut API via browser.electron.execute().
 * 
 * @module hotkeyHelpers
 */

/// <reference path="./wdio-electron.d.ts" />

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
    // TODO: Refactor this to use configurable hotkeys
    MINIMIZE_WINDOW: {
        accelerator: 'CommandOrControl+Alt+E',
        description: 'Minimize the main window',
        displayFormat: {
            windows: 'Ctrl+Alt+E',
            macos: 'Cmd+Alt+E',
            linux: 'Ctrl+Alt+E',
        },
    },
    // TODO: Refactor this to use configurable hotkeys
    QUICK_CHAT: {
        accelerator: 'CommandOrControl+Shift+Space',
        description: 'Toggle Quick Chat floating window',
        displayFormat: {
            windows: 'Ctrl+Shift+Space',
            macos: 'Cmd+Shift+Space',
            linux: 'Ctrl+Shift+Space',
        },
    },
    // TODO: Refactor this to use configurable hotkeys
    ZEN_MODE: {
        accelerator: 'CommandOrControl+Shift+/',
        description: 'Toggle Zen Mode (distraction-free)',
        displayFormat: {
            windows: 'Ctrl+Shift+/',
            macos: 'Cmd+Shift+/',
            linux: 'Ctrl+Shift+/',
        },
    },
};

/**
 * Gets the expected accelerator string for the current platform.
 * Electron uses 'CommandOrControl' which maps to Ctrl on Windows/Linux and Cmd on macOS.
 * 
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

// =============================================================================
// Hotkey Action Testing Infrastructure
// Extensible patterns for testing hotkey-triggered features
// =============================================================================

/**
 * State returned by hotkey action handlers.
 * Each hotkey can extend this with feature-specific properties.
 */
export interface HotkeyActionState {
    /** Whether the associated window is visible */
    windowVisible?: boolean;
    /** Whether the associated window is focused */
    windowFocused?: boolean;
    /** Last submitted text (for input-based hotkeys like Quick Chat) */
    lastSubmittedText?: string;
    /** Allow feature-specific extensions */
    [key: string]: unknown;
}

/**
 * Handler for testing hotkey-triggered actions.
 * Implement this interface for each hotkey that needs action testing.
 */
export interface HotkeyActionHandler {
    /** The hotkey ID this handler is for */
    hotkeyId: keyof typeof REGISTERED_HOTKEYS;

    /** Execute the action programmatically (bypassing OS-level hotkey) */
    execute: () => Promise<void>;

    /** Verify the action was executed successfully */
    verify: () => Promise<boolean>;

    /** Get current state related to this hotkey's feature */
    getState: () => Promise<HotkeyActionState>;
}

/**
 * Registry of action handlers for each hotkey.
 * Modules should call registerHotkeyActionHandler to add their handler.
 */
const hotkeyActionHandlers: Map<string, HotkeyActionHandler> = new Map();

/**
 * Register a hotkey action handler for testing.
 * 
 * @param handler - The action handler to register
 */
export function registerHotkeyActionHandler(handler: HotkeyActionHandler): void {
    hotkeyActionHandlers.set(handler.hotkeyId, handler);
}

/**
 * Get a registered hotkey action handler.
 * 
 * @param hotkeyId - The hotkey identifier
 * @returns The handler or undefined if not registered
 */
export function getHotkeyActionHandler(hotkeyId: string): HotkeyActionHandler | undefined {
    return hotkeyActionHandlers.get(hotkeyId);
}

/**
 * Execute a hotkey action programmatically.
 * 
 * @param hotkeyId - The hotkey identifier
 * @throws Error if no handler is registered for the hotkey
 */
export async function executeHotkeyAction(hotkeyId: string): Promise<void> {
    const handler = hotkeyActionHandlers.get(hotkeyId);
    if (!handler) {
        throw new Error(`No action handler registered for hotkey: ${hotkeyId}`);
    }
    await handler.execute();
}

/**
 * Verify a hotkey action was executed successfully.
 * 
 * @param hotkeyId - The hotkey identifier
 * @returns Promise<boolean> - True if verification passed
 * @throws Error if no handler is registered for the hotkey
 */
export async function verifyHotkeyAction(hotkeyId: string): Promise<boolean> {
    const handler = hotkeyActionHandlers.get(hotkeyId);
    if (!handler) {
        throw new Error(`No action handler registered for hotkey: ${hotkeyId}`);
    }
    return handler.verify();
}

/**
 * Get the current state of a hotkey's associated feature.
 * 
 * @param hotkeyId - The hotkey identifier
 * @returns Promise<HotkeyActionState> - The current state
 * @throws Error if no handler is registered for the hotkey
 */
export async function getHotkeyActionState(hotkeyId: string): Promise<HotkeyActionState> {
    const handler = hotkeyActionHandlers.get(hotkeyId);
    if (!handler) {
        throw new Error(`No action handler registered for hotkey: ${hotkeyId}`);
    }
    return handler.getState();
}


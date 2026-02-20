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
import { DEFAULT_ACCELERATORS } from '../../../src/shared/types/hotkeys';

/**
 * Hotkey definition for cross-platform testing.
 */
export interface HotkeyDefinition {
    /** The Electron accelerator string (e.g., 'CommandOrControl+Alt+H') */
    accelerator: string;
    /** Human-readable description */
    description: string;
    /** Platform-specific display format (derived from accelerator) */
    displayFormat: {
        windows: string;
        macos: string;
        linux: string;
    };
}

/**
 * Helper to convert an Electron accelerator to platform-specific display format.
 */
function acceleratorToDisplayFormat(accelerator: string): HotkeyDefinition['displayFormat'] {
    const windowsLinux = accelerator.replace('CommandOrControl', 'Ctrl').replace('Option', 'Alt');
    const macos = accelerator.replace('CommandOrControl', 'Cmd').replace('Option', 'Alt');
    return {
        windows: windowsLinux,
        macos: macos,
        linux: windowsLinux,
    };
}

/**
 * Registered hotkeys in the application.
 * Uses DEFAULT_ACCELERATORS from shared types to ensure consistency.
 */
export const REGISTERED_HOTKEYS: Record<string, HotkeyDefinition> = {
    MINIMIZE_WINDOW: {
        accelerator: DEFAULT_ACCELERATORS.peekAndHide,
        description: 'Hide the main window to tray (Peek and Hide) [Global]',
        displayFormat: acceleratorToDisplayFormat(DEFAULT_ACCELERATORS.peekAndHide),
    },
    QUICK_CHAT: {
        accelerator: DEFAULT_ACCELERATORS.quickChat,
        description: 'Toggle Quick Chat floating window [Global]',
        displayFormat: acceleratorToDisplayFormat(DEFAULT_ACCELERATORS.quickChat),
    },
    ALWAYS_ON_TOP: {
        accelerator: DEFAULT_ACCELERATORS.alwaysOnTop,
        description: 'Toggle Always on Top [Application]',
        displayFormat: acceleratorToDisplayFormat(DEFAULT_ACCELERATORS.alwaysOnTop),
    },
    PRINT_TO_PDF: {
        accelerator: DEFAULT_ACCELERATORS.printToPdf,
        description: 'Print conversation to PDF [Application]',
        displayFormat: acceleratorToDisplayFormat(DEFAULT_ACCELERATORS.printToPdf),
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
 * @returns Platform-specific display string (e.g., 'Ctrl+Alt+H' or 'Cmd+Alt+H')
 */
export function getHotkeyDisplayString(platform: E2EPlatform, hotkeyId: keyof typeof REGISTERED_HOTKEYS): string {
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

// =============================================================================
// Wayland Platform Status Helpers
// Provides utilities for testing Wayland/Linux hotkey registration status
// =============================================================================

/**
 * Wayland platform status returned from main process IPC.
 */
export interface WaylandStatus {
    isWayland: boolean;
    desktopEnvironment: string;
    deVersion: string | null;
    portalAvailable: boolean;
    portalMethod: string;
}

/**
 * Hotkey registration result for individual hotkeys.
 */
export interface HotkeyRegistrationResult {
    hotkeyId: string;
    success: boolean;
    error?: string;
}

/**
 * Full platform hotkey status returned from main process.
 */
export interface PlatformHotkeyStatus {
    waylandStatus: WaylandStatus;
    registrationResults: HotkeyRegistrationResult[];
    globalHotkeysEnabled: boolean;
}

/**
 * Result of checking globalShortcut registration.
 */
export interface GlobalShortcutRegistrationStatus {
    quickChat: boolean;
    peekAndHide: boolean;
    status: string;
    error?: string;
}

/**
 * Query platform hotkey status from main process via IPC.
 * Uses the production getPlatformHotkeyStatus() API exposed via preload.
 *
 * @returns Promise with platform status or null if IPC not available
 */
export async function getPlatformHotkeyStatus(): Promise<PlatformHotkeyStatus | null> {
    return browser.execute(() => {
        // Access the preload API from renderer context
        const api = (window as any).electronAPI;
        if (!api?.getPlatformHotkeyStatus) {
            console.log('[E2E] getPlatformHotkeyStatus not available on electronAPI');
            return null;
        }
        return api.getPlatformHotkeyStatus();
    });
}

/**
 * Check if hotkeys are registered via globalShortcut API.
 * Executes in the main process to check registration status.
 *
 * @returns Promise with registration status or null if execution fails
 */
export async function checkGlobalShortcutRegistration(): Promise<GlobalShortcutRegistrationStatus | null> {
    return browser.electron.execute((_electron: typeof import('electron')) => {
        const { globalShortcut } = _electron;
        try {
            return {
                quickChat: globalShortcut.isRegistered('CommandOrControl+Shift+Space'),
                peekAndHide: globalShortcut.isRegistered('CommandOrControl+Alt+H'),
                status: 'success',
            };
        } catch (error) {
            return {
                quickChat: false,
                peekAndHide: false,
                status: 'error',
                error: (error as Error).message,
            };
        }
    });
}

// =============================================================================
// D-Bus Activation Signal Tracking Helpers (Test-Only)
// Provides utilities for testing D-Bus signal tracking on Wayland+KDE
// =============================================================================

/**
 * D-Bus activation signal statistics returned from test-only IPC API.
 */
export interface DbusActivationSignalStats {
    /** Whether signal tracking is enabled (NODE_ENV=test or DEBUG_DBUS=1) */
    trackingEnabled: boolean;
    /** Total number of signals recorded */
    totalSignals: number;
    /** Signal counts aggregated by shortcut ID */
    signalsByShortcut: Record<string, number>;
    /** Timestamp of the most recent signal (null if no signals) */
    lastSignalTime: number | null;
    /** Array of recorded signal records */
    signals: ReadonlyArray<{
        shortcutId: string;
        timestamp: number;
        sessionPath: string;
    }>;
}

/**
 * Get D-Bus activation signal statistics via test-only IPC API.
 * Only populated when NODE_ENV=test or DEBUG_DBUS=1.
 *
 * @returns Promise with signal stats or null if IPC not available
 */
export async function getDbusActivationSignalStats(): Promise<DbusActivationSignalStats | null> {
    return browser.execute(() => {
        const api = (window as any).electronAPI;
        if (!api?.getDbusActivationSignalStats) {
            console.log('[E2E] getDbusActivationSignalStats not available on electronAPI');
            return null;
        }
        return api.getDbusActivationSignalStats();
    });
}

/**
 * Clear D-Bus activation signal history via test-only IPC API.
 * Useful for test isolation between test cases.
 */
export async function clearDbusActivationSignalHistory(): Promise<void> {
    await browser.execute(() => {
        const api = (window as any).electronAPI;
        if (api?.clearDbusActivationSignalHistory) {
            api.clearDbusActivationSignalHistory();
        }
    });
}

/**
 * Get Wayland platform status for conditional test skipping.
 * Used to determine if D-Bus signal tracking tests should run.
 *
 * @returns Promise with wayland status information
 */
export async function getWaylandStatusForSkipping(): Promise<{
    isLinux: boolean;
    isWayland: boolean;
    portalAvailable: boolean;
    desktopEnvironment: string;
}> {
    const status = await browser.electron.execute(() => {
        // @ts-expect-error - accessing global manager
        return global.hotkeyManager?.getPlatformHotkeyStatus?.() ?? null;
    });

    const isLinux = await browser.electron.execute(() => process.platform === 'linux');

    if (!status) {
        return {
            isLinux,
            isWayland: false,
            portalAvailable: false,
            desktopEnvironment: 'unknown',
        };
    }

    return {
        isLinux,
        isWayland: status.waylandStatus?.isWayland ?? false,
        portalAvailable: status.waylandStatus?.portalAvailable ?? false,
        desktopEnvironment: status.waylandStatus?.desktopEnvironment ?? 'unknown',
    };
}

/**
 * Hotkey Manager for the Electron main process.
 * 
 * This module handles global keyboard shortcuts (hotkeys) registration and management.
 * It provides a centralized way to:
 * - Register/unregister individual global keyboard shortcuts
 * - Enable/disable each shortcut independently
 * - Integrate with the WindowManager for shortcut actions
 * 
 * ## Architecture
 * 
 * The HotkeyManager uses Electron's `globalShortcut` API to register shortcuts that
 * work system-wide, even when the application is not focused. The shortcuts are defined
 * using Electron's accelerator format (e.g., 'CommandOrControl+Alt+E').
 * 
 * ## Platform Support
 * 
 * - **Windows/Linux**: `CommandOrControl` maps to `Ctrl`
 * - **macOS**: `CommandOrControl` maps to `Cmd`
 * 
 * ## Individual Enable/Disable Feature
 * 
 * Each hotkey can be individually enabled/disabled via `setIndividualEnabled()`.
 * Settings are persisted and synced via IpcManager.
 * 
 * @module HotkeyManager
 * @see {@link WindowManager} - Used for shortcut actions
 * @see {@link IpcManager} - Manages IPC for hotkey state synchronization
 */

import { globalShortcut } from 'electron';
import type WindowManager from './windowManager';
import { createLogger } from '../utils/logger';
import type { HotkeyId, IndividualHotkeySettings } from '../types';

const logger = createLogger('[HotkeyManager]');

// ============================================================================
// Types
// ============================================================================

/**
 * Defines a keyboard shortcut configuration.
 * 
 * @property id - Unique identifier for the shortcut
 * @property accelerator - The Electron accelerator string (e.g., 'CommandOrControl+Alt+E')
 * @property action - The callback function to execute when the shortcut is triggered
 */
interface Shortcut {
    id: HotkeyId;
    accelerator: string;
    action: () => void;
}

// ============================================================================
// HotkeyManager Class
// ============================================================================

/**
 * Manages global keyboard shortcuts for the Gemini Desktop application.
 * 
 * ## Features
 * - Registers global shortcuts that work system-wide
 * - Supports individual enable/disable per hotkey
 * - Prevents duplicate registrations
 * - Logs all shortcut events for debugging
 * 
 * ## Usage
 * ```typescript
 * const hotkeyManager = new HotkeyManager(windowManager);
 * hotkeyManager.registerShortcuts(); // Register enabled shortcuts
 * hotkeyManager.setIndividualEnabled('quickChat', false); // Disable Quick Chat hotkey
 * ```
 * 
 * @class HotkeyManager
 */
export default class HotkeyManager {
    /** Reference to the window manager for shortcut actions */
    private windowManager: WindowManager;

    /** Array of shortcut configurations */
    private shortcuts: Shortcut[];

    /** 
     * Individual enabled state for each hotkey.
     * When a hotkey is disabled, it will not be registered.
     */
    private _individualSettings: IndividualHotkeySettings = {
        alwaysOnTop: true,
        bossKey: true,
        quickChat: true,
    };

    /** 
     * Tracks which shortcuts are currently registered with the system.
     * Prevents duplicate registration calls.
     */
    private _registeredShortcuts: Set<HotkeyId> = new Set();

    /**
     * Creates a new HotkeyManager instance.
     * 
     * Initializes the shortcut configuration array with all available shortcuts.
     * Shortcuts are not registered until `registerShortcuts()` is called.
     * 
     * @param windowManager - The WindowManager instance for executing shortcut actions
     * @param initialSettings - Optional initial settings for individual hotkeys
     * 
     * @example
     * ```typescript
     * const windowManager = new WindowManager();
     * const hotkeyManager = new HotkeyManager(windowManager);
     * ```
     */
    constructor(windowManager: WindowManager, initialSettings?: Partial<IndividualHotkeySettings>) {
        this.windowManager = windowManager;

        // Apply initial settings if provided
        if (initialSettings) {
            this._individualSettings = { ...this._individualSettings, ...initialSettings };
        }

        // Define shortcuts configuration
        // Each shortcut has an id, accelerator string and an action callback
        this.shortcuts = [
            {
                id: 'bossKey',
                // Minimize Window Shortcut
                // Ctrl+Alt+E (Windows/Linux) or Cmd+Alt+E (macOS)
                accelerator: 'CommandOrControl+Alt+E',
                action: () => {
                    logger.log('Hotkey pressed: CommandOrControl+Alt+E (Boss Key)');
                    this.windowManager.minimizeMainWindow();
                }
            },
            {
                id: 'quickChat',
                // Quick Chat Shortcut - toggles the floating prompt window
                // Ctrl+Shift+Space (Windows/Linux) or Cmd+Shift+Space (macOS)
                accelerator: 'CommandOrControl+Shift+Space',
                action: () => {
                    logger.log('Hotkey pressed: CommandOrControl+Shift+Space (Quick Chat)');
                    this.windowManager.toggleQuickChat();
                }
            },
            {
                id: 'alwaysOnTop',
                // Always On Top Toggle
                // Ctrl+Shift+T (Windows/Linux) or Cmd+Shift+T (macOS)
                accelerator: 'CommandOrControl+Shift+T',
                action: () => {
                    logger.log('Hotkey pressed: CommandOrControl+Shift+T (Always On Top)');
                    const current = this.windowManager.isAlwaysOnTop();
                    logger.log(`Current always-on-top state: ${current}, toggling to: ${!current}`);
                    this.windowManager.setAlwaysOnTop(!current);
                }
            }
        ];
    }

    /**
     * Get the current individual hotkey settings.
     * 
     * @returns Copy of the current settings object
     */
    getIndividualSettings(): IndividualHotkeySettings {
        return { ...this._individualSettings };
    }

    /**
     * Check if a specific hotkey is enabled.
     * 
     * @param id - The hotkey identifier
     * @returns True if the hotkey is enabled, false otherwise
     */
    isIndividualEnabled(id: HotkeyId): boolean {
        return this._individualSettings[id];
    }

    /**
     * Enable or disable a specific hotkey.
     * 
     * When disabling:
     * - The shortcut is unregistered immediately
     * - The setting is preserved for future reference
     * 
     * When enabling:
     * - The shortcut is registered if not already
     * 
     * @param id - The hotkey identifier
     * @param enabled - Whether to enable (true) or disable (false) the hotkey
     */
    setIndividualEnabled(id: HotkeyId, enabled: boolean): void {
        if (this._individualSettings[id] === enabled) {
            return; // No change needed - idempotent behavior
        }

        this._individualSettings[id] = enabled;

        const shortcut = this.shortcuts.find(s => s.id === id);
        if (!shortcut) {
            logger.warn(`Unknown hotkey id: ${id}`);
            return;
        }

        if (enabled) {
            this._registerShortcut(shortcut);
            logger.log(`Hotkey enabled: ${id}`);
        } else {
            this._unregisterShortcut(shortcut);
            logger.log(`Hotkey disabled: ${id}`);
        }
    }

    /**
     * Update all individual hotkey settings at once.
     * 
     * @param settings - New settings to apply
     */
    updateAllSettings(settings: IndividualHotkeySettings): void {
        for (const id of Object.keys(settings) as HotkeyId[]) {
            this.setIndividualEnabled(id, settings[id]);
        }
    }

    /**
     * Register all enabled global shortcuts with the system.
     * 
     * This method is called:
     * - On application startup (via main.ts)
     * - When the app is ready
     * 
     * Only shortcuts that are individually enabled will be registered.
     * 
     * @see setIndividualEnabled - For enabling/disabling individual hotkeys
     */
    registerShortcuts(): void {
        this.shortcuts.forEach(shortcut => {
            if (this._individualSettings[shortcut.id]) {
                this._registerShortcut(shortcut);
            }
        });
    }

    /**
     * Register a single shortcut with the system.
     * 
     * @param shortcut - The shortcut to register
     * @private
     */
    private _registerShortcut(shortcut: Shortcut): void {
        // Guard: Don't register if already registered
        if (this._registeredShortcuts.has(shortcut.id)) {
            logger.log(`Hotkey already registered: ${shortcut.id}`);
            return;
        }

        const success = globalShortcut.register(shortcut.accelerator, shortcut.action);

        if (!success) {
            // Registration can fail if another app has claimed the shortcut
            logger.error(`Registration failed for hotkey: ${shortcut.id} (${shortcut.accelerator})`);
        } else {
            this._registeredShortcuts.add(shortcut.id);
            logger.log(`Hotkey registered: ${shortcut.id} (${shortcut.accelerator})`);
        }
    }

    /**
     * Unregister a single shortcut from the system.
     * 
     * @param shortcut - The shortcut to unregister
     * @private
     */
    private _unregisterShortcut(shortcut: Shortcut): void {
        if (!this._registeredShortcuts.has(shortcut.id)) {
            return; // Not registered, nothing to do
        }

        globalShortcut.unregister(shortcut.accelerator);
        this._registeredShortcuts.delete(shortcut.id);
        logger.log(`Hotkey unregistered: ${shortcut.id} (${shortcut.accelerator})`);
    }

    /**
     * Unregister all global shortcuts from the system.
     * 
     * This method is called:
     * - When the application is shutting down
     */
    unregisterAll(): void {
        globalShortcut.unregisterAll();
        this._registeredShortcuts.clear();
        logger.log('All hotkeys unregistered');
    }

    // =========================================================================
    // Deprecated methods (for backwards compatibility during transition)
    // =========================================================================

    /**
     * @deprecated Use getIndividualSettings() instead
     */
    isEnabled(): boolean {
        // Returns true if any hotkey is enabled
        return Object.values(this._individualSettings).some(v => v);
    }

    /**
     * @deprecated Use setIndividualEnabled() for each hotkey instead
     */
    setEnabled(enabled: boolean): void {
        logger.warn('setEnabled() is deprecated. Use setIndividualEnabled() instead.');
        for (const id of Object.keys(this._individualSettings) as HotkeyId[]) {
            this.setIndividualEnabled(id, enabled);
        }
    }
}

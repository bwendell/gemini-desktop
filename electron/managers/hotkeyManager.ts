/**
 * Hotkey Manager for the Electron main process.
 * 
 * This module handles global keyboard shortcuts (hotkeys) registration and management.
 * It provides a centralized way to:
 * - Register/unregister global keyboard shortcuts
 * - Enable/disable all shortcuts without losing their configuration
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
 * ## Enable/Disable Feature
 * 
 * The manager supports toggling all shortcuts on/off via `setEnabled()`. When disabled:
 * - All shortcuts are unregistered from the system
 * - The shortcut configurations are preserved in memory
 * - Re-enabling will re-register the same shortcuts
 * 
 * This allows users to temporarily disable hotkeys without losing their settings.
 * 
 * @module HotkeyManager
 * @see {@link WindowManager} - Used for shortcut actions
 * @see {@link IpcManager} - Manages IPC for hotkey state synchronization
 */

import { globalShortcut } from 'electron';
import type WindowManager from './windowManager';
import { createLogger } from '../utils/logger';

const logger = createLogger('[HotkeyManager]');

// ============================================================================
// Types
// ============================================================================

/**
 * Defines a keyboard shortcut configuration.
 * 
 * @property accelerator - The Electron accelerator string (e.g., 'CommandOrControl+Alt+E')
 * @property action - The callback function to execute when the shortcut is triggered
 */
interface Shortcut {
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
 * - Supports enable/disable toggle without losing configuration
 * - Prevents duplicate registrations
 * - Logs all shortcut events for debugging
 * 
 * ## Usage
 * ```typescript
 * const hotkeyManager = new HotkeyManager(windowManager);
 * hotkeyManager.registerShortcuts(); // Register all shortcuts
 * hotkeyManager.setEnabled(false);   // Disable all shortcuts
 * hotkeyManager.setEnabled(true);    // Re-enable shortcuts
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
     * Whether hotkeys are currently enabled.
     * When false, shortcuts will not be registered even if registerShortcuts() is called.
     * @default true
     */
    private _enabled: boolean = true;

    /** 
     * Whether shortcuts are currently registered with the system.
     * Prevents duplicate registration calls.
     * @default false
     */
    private _registered: boolean = false;

    /**
     * Creates a new HotkeyManager instance.
     * 
     * Initializes the shortcut configuration array with all available shortcuts.
     * Shortcuts are not registered until `registerShortcuts()` is called.
     * 
     * @param windowManager - The WindowManager instance for executing shortcut actions
     * 
     * @example
     * ```typescript
     * const windowManager = new WindowManager();
     * const hotkeyManager = new HotkeyManager(windowManager);
     * ```
     */
    constructor(windowManager: WindowManager) {
        this.windowManager = windowManager;

        // Define shortcuts configuration
        // Each shortcut has an accelerator string and an action callback
        // This structure allows for easy extension and platform-specific overrides
        this.shortcuts = [
            {
                // Minimize Window Shortcut
                // Ctrl+Alt+E (Windows/Linux) or Cmd+Alt+E (macOS)
                accelerator: 'CommandOrControl+Alt+E',
                action: () => {
                    logger.log('Hotkey pressed: CommandOrControl+Alt+E (Minimize)');
                    this.windowManager.minimizeMainWindow();
                }
            },
            {
                // Quick Chat Shortcut - toggles the floating prompt window
                // Ctrl+Shift+Space (Windows/Linux) or Cmd+Shift+Space (macOS)
                accelerator: 'CommandOrControl+Shift+Space',
                action: () => {
                    logger.log('Hotkey pressed: CommandOrControl+Shift+Space (Quick Chat)');
                    this.windowManager.toggleQuickChat();
                }
            }
        ];
    }

    /**
     * Check if hotkeys are currently enabled.
     * 
     * This is a read-only accessor for the enabled state.
     * Use `setEnabled()` to change the state.
     * 
     * @returns True if hotkeys are enabled, false otherwise
     * 
     * @example
     * ```typescript
     * if (hotkeyManager.isEnabled()) {
     *     console.log('Hotkeys are active');
     * }
     * ```
     */
    isEnabled(): boolean {
        return this._enabled;
    }

    /**
     * Enable or disable all hotkeys.
     * 
     * This method provides the core toggle functionality for the hotkey toggle switch.
     * When disabled:
     * - All shortcuts are unregistered immediately
     * - The shortcut configurations remain in memory
     * - The `_registered` flag is reset to allow re-registration
     * 
     * When enabled:
     * - All configured shortcuts are re-registered
     * - No duplicate registration occurs (idempotent)
     * 
     * @param enabled - Whether to enable (true) or disable (false) hotkeys
     * 
     * @example
     * ```typescript
     * // Disable all hotkeys (user toggles switch OFF)
     * hotkeyManager.setEnabled(false);
     * 
     * // Re-enable all hotkeys (user toggles switch ON)
     * hotkeyManager.setEnabled(true);
     * ```
     */
    setEnabled(enabled: boolean): void {
        if (this._enabled === enabled) {
            return; // No change needed - idempotent behavior
        }

        this._enabled = enabled;

        if (enabled) {
            this.registerShortcuts();
            logger.log('Hotkeys enabled');
        } else {
            this.unregisterAll();
            logger.log('Hotkeys disabled');
        }
    }

    /**
     * Register all configured global shortcuts with the system.
     * 
     * This method is called:
     * - On application startup (via main.ts)
     * - When hotkeys are re-enabled via `setEnabled(true)`
     * 
     * ## Guards
     * - Returns early if hotkeys are disabled (`_enabled === false`)
     * - Returns early if already registered (`_registered === true`)
     * 
     * ## Error Handling
     * Registration failures are logged but do not throw exceptions,
     * allowing other shortcuts to still be registered.
     * 
     * @see setEnabled - For enabling/disabling hotkeys
     */
    registerShortcuts(): void {
        // Guard: Don't register if hotkeys are disabled
        if (!this._enabled) {
            logger.log('Hotkeys disabled, skipping registration');
            return;
        }

        // Guard: Don't register if already registered (prevent duplicates)
        if (this._registered) {
            logger.log('Hotkeys already registered');
            return;
        }

        // Register each shortcut with the global shortcut API
        this.shortcuts.forEach(shortcut => {
            const success = globalShortcut.register(shortcut.accelerator, shortcut.action);

            if (!success) {
                // Registration can fail if another app has claimed the shortcut
                logger.error(`Registration failed for hotkey: ${shortcut.accelerator}`);
            } else {
                logger.log(`Hotkey registered: ${shortcut.accelerator}`);
            }
        });

        this._registered = true;
    }

    /**
     * Unregister all global shortcuts from the system.
     * 
     * This method is called:
     * - When hotkeys are disabled via `setEnabled(false)`
     * - When the application is shutting down
     * 
     * After calling this method, shortcuts can be re-registered by calling
     * `registerShortcuts()` (assuming `_enabled` is true).
     */
    unregisterAll(): void {
        globalShortcut.unregisterAll();
        this._registered = false;
        logger.log('All hotkeys unregistered');
    }
}

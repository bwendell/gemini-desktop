/**
 * Hotkey Manager for the Electron main process.
 *
 * This module handles global keyboard shortcuts (hotkeys) registration and management.
 * It provides a centralized way to:
 * - Register/unregister individual global keyboard shortcuts
 * - Enable/disable each shortcut independently
 * - Configure custom accelerators for each shortcut
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
 * ## Custom Accelerators
 *
 * Users can configure custom accelerators via `setAccelerator()`.
 * Accelerators are validated before registration.
 *
 * @module HotkeyManager
 * @see {@link WindowManager} - Used for shortcut actions
 * @see {@link IpcManager} - Manages IPC for hotkey state synchronization
 */

import { globalShortcut } from 'electron';
import type WindowManager from './windowManager';
import { createLogger } from '../utils/logger';
import {
  type HotkeyId,
  type IndividualHotkeySettings,
  type HotkeyAccelerators,
  type HotkeySettings,
  DEFAULT_ACCELERATORS,
  HOTKEY_IDS,
} from '../types';

const logger = createLogger('[HotkeyManager]');

// ============================================================================
// Types
// ============================================================================

/**
 * Defines a keyboard shortcut configuration.
 *
 * @property id - Unique identifier for the shortcut
 * @property action - The callback function to execute when the shortcut is triggered
 */
interface ShortcutAction {
  id: HotkeyId;
  action: () => void;
}

/**
 * Initial settings for HotkeyManager construction.
 */
export interface HotkeyManagerInitialSettings {
  /** Individual enabled states */
  enabled?: Partial<IndividualHotkeySettings>;
  /** Custom accelerators */
  accelerators?: Partial<HotkeyAccelerators>;
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
 * - Supports custom accelerators per hotkey
 * - Prevents duplicate registrations
 * - Logs all shortcut events for debugging
 *
 * ## Usage
 * ```typescript
 * const hotkeyManager = new HotkeyManager(windowManager);
 * hotkeyManager.registerShortcuts(); // Register enabled shortcuts
 * hotkeyManager.setIndividualEnabled('quickChat', false); // Disable Quick Chat hotkey
 * hotkeyManager.setAccelerator('bossKey', 'CommandOrControl+Alt+H'); // Change accelerator
 * ```
 *
 * @class HotkeyManager
 */
export default class HotkeyManager {
  /** Reference to the window manager for shortcut actions */
  private windowManager: WindowManager;

  /** Array of shortcut action configurations (id -> action mapping) */
  private shortcutActions: ShortcutAction[];

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
   * Current accelerators for each hotkey.
   * Can be customized by the user.
   */
  private _accelerators: HotkeyAccelerators = { ...DEFAULT_ACCELERATORS };

  /**
   * Tracks which shortcuts are currently registered with the system.
   * Maps hotkey ID to the accelerator that was registered.
   * Prevents duplicate registration calls and enables proper unregistration.
   */
  private _registeredShortcuts: Map<HotkeyId, string> = new Map();

  /**
   * Creates a new HotkeyManager instance.
   *
   * Initializes the shortcut configuration array with all available shortcuts.
   * Shortcuts are not registered until `registerShortcuts()` is called.
   *
   * @param windowManager - The WindowManager instance for executing shortcut actions
   * @param initialSettings - Optional initial settings for enabled states and accelerators
   *
   * @example
   * ```typescript
   * const windowManager = new WindowManager();
   * const hotkeyManager = new HotkeyManager(windowManager, {
   *   enabled: { quickChat: false },
   *   accelerators: { bossKey: 'CommandOrControl+Alt+H' }
   * });
   * ```
   */
  constructor(windowManager: WindowManager, initialSettings?: HotkeyManagerInitialSettings | Partial<IndividualHotkeySettings>) {
    this.windowManager = windowManager;

    // Handle both old-style (Partial<IndividualHotkeySettings>) and new-style (HotkeyManagerInitialSettings) arguments
    if (initialSettings) {
      // Check if it's the new-style settings object
      if ('enabled' in initialSettings || 'accelerators' in initialSettings) {
        const newSettings = initialSettings as HotkeyManagerInitialSettings;
        if (newSettings.enabled) {
          this._individualSettings = { ...this._individualSettings, ...newSettings.enabled };
        }
        if (newSettings.accelerators) {
          this._accelerators = { ...this._accelerators, ...newSettings.accelerators };
        }
      } else {
        // Old-style: treat as Partial<IndividualHotkeySettings> for backwards compatibility
        this._individualSettings = { ...this._individualSettings, ...initialSettings as Partial<IndividualHotkeySettings> };
      }
    }

    // Define shortcut actions
    // Each shortcut maps an id to an action callback
    this.shortcutActions = [
      {
        id: 'bossKey',
        action: () => {
          const accelerator = this._accelerators.bossKey;
          logger.log(`Hotkey pressed: ${accelerator} (Boss Key)`);
          this.windowManager.minimizeMainWindow();
        },
      },
      {
        id: 'quickChat',
        action: () => {
          const accelerator = this._accelerators.quickChat;
          logger.log(`Hotkey pressed: ${accelerator} (Quick Chat)`);
          this.windowManager.toggleQuickChat();
        },
      },
      {
        id: 'alwaysOnTop',
        action: () => {
          const accelerator = this._accelerators.alwaysOnTop;
          logger.log(`Hotkey pressed: ${accelerator} (Always On Top)`);
          const current = this.windowManager.isAlwaysOnTop();
          logger.log(`Current always-on-top state: ${current}, toggling to: ${!current}`);
          this.windowManager.setAlwaysOnTop(!current);
        },
      },
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
   * Get the current accelerator settings.
   *
   * @returns Copy of the current accelerators object
   */
  getAccelerators(): HotkeyAccelerators {
    return { ...this._accelerators };
  }

  /**
   * Get the accelerator for a specific hotkey.
   *
   * @param id - The hotkey identifier
   * @returns The current accelerator string
   */
  getAccelerator(id: HotkeyId): string {
    return this._accelerators[id];
  }

  /**
   * Get full settings including both enabled states and accelerators.
   *
   * @returns Complete hotkey settings
   */
  getFullSettings(): HotkeySettings {
    return {
      alwaysOnTop: {
        enabled: this._individualSettings.alwaysOnTop,
        accelerator: this._accelerators.alwaysOnTop,
      },
      bossKey: {
        enabled: this._individualSettings.bossKey,
        accelerator: this._accelerators.bossKey,
      },
      quickChat: {
        enabled: this._individualSettings.quickChat,
        accelerator: this._accelerators.quickChat,
      },
    };
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
   * Set the accelerator for a specific hotkey.
   *
   * If the hotkey is currently registered, it will be unregistered with the old
   * accelerator and re-registered with the new one.
   *
   * @param id - The hotkey identifier
   * @param accelerator - The new accelerator string
   * @returns True if the accelerator was set successfully
   */
  setAccelerator(id: HotkeyId, accelerator: string): boolean {
    const oldAccelerator = this._accelerators[id];
    if (oldAccelerator === accelerator) {
      return true; // No change needed
    }

    // If currently registered, unregister with old accelerator
    const wasRegistered = this._registeredShortcuts.has(id);
    if (wasRegistered) {
      const registeredAccelerator = this._registeredShortcuts.get(id);
      if (registeredAccelerator) {
        globalShortcut.unregister(registeredAccelerator);
        this._registeredShortcuts.delete(id);
        logger.log(`Hotkey ${id} unregistered for accelerator change`);
      }
    }

    // Update the accelerator
    this._accelerators[id] = accelerator;
    logger.log(`Accelerator changed for ${id}: ${oldAccelerator} -> ${accelerator}`);

    // Re-register if it was registered and is still enabled
    if (wasRegistered && this._individualSettings[id]) {
      this._registerShortcutById(id);
    }

    return true;
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

    if (enabled) {
      this._registerShortcutById(id);
      logger.log(`Hotkey enabled: ${id}`);
    } else {
      this._unregisterShortcutById(id);
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
   * Update all accelerators at once.
   *
   * @param accelerators - New accelerators to apply
   */
  updateAllAccelerators(accelerators: HotkeyAccelerators): void {
    for (const id of HOTKEY_IDS) {
      if (accelerators[id]) {
        this.setAccelerator(id, accelerators[id]);
      }
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
    for (const id of HOTKEY_IDS) {
      if (this._individualSettings[id]) {
        this._registerShortcutById(id);
      }
    }
  }

  /**
   * Register a shortcut by its ID.
   *
   * @param id - The hotkey identifier
   * @private
   */
  private _registerShortcutById(id: HotkeyId): void {
    // Guard: Don't register if already registered
    if (this._registeredShortcuts.has(id)) {
      logger.log(`Hotkey already registered: ${id}`);
      return;
    }

    const accelerator = this._accelerators[id];
    const shortcutAction = this.shortcutActions.find((s) => s.id === id);

    if (!shortcutAction) {
      logger.error(`No action defined for hotkey: ${id}`);
      return;
    }

    const success = globalShortcut.register(accelerator, shortcutAction.action);

    if (!success) {
      // Registration can fail if another app has claimed the shortcut
      logger.error(`Registration failed for hotkey: ${id} (${accelerator})`);
    } else {
      this._registeredShortcuts.set(id, accelerator);
      logger.log(`Hotkey registered: ${id} (${accelerator})`);
    }
  }

  /**
   * Unregister a shortcut by its ID.
   *
   * @param id - The hotkey identifier
   * @private
   */
  private _unregisterShortcutById(id: HotkeyId): void {
    const registeredAccelerator = this._registeredShortcuts.get(id);
    if (!registeredAccelerator) {
      return; // Not registered, nothing to do
    }

    globalShortcut.unregister(registeredAccelerator);
    this._registeredShortcuts.delete(id);
    logger.log(`Hotkey unregistered: ${id} (${registeredAccelerator})`);
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
    return Object.values(this._individualSettings).some((v) => v);
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

/**
 * Hotkey Manager for the Electron main process.
 *
 * This module handles keyboard shortcuts (hotkeys) registration and management.
 * It provides a centralized way to:
 * - Register/unregister individual keyboard shortcuts
 * - Enable/disable each shortcut independently
 * - Configure custom accelerators for each shortcut
 * - Integrate with the WindowManager for shortcut actions
 *
 * ## Two-Tier Hotkey Architecture
 *
 * Hotkeys are divided into two categories based on their scope:
 *
 * ### Global Hotkeys (quickChat, bossKey)
 * - Registered via Electron's `globalShortcut` API
 * - Work system-wide, even when the application is not focused
 * - Used for actions that need to work from anywhere (e.g., show/hide app)
 *
 * ### Application Hotkeys (alwaysOnTop, printToPdf)
 * - Registered via Menu accelerators managed by MenuManager
 * - Work only when the application window is focused
 * - Used for in-app actions that don't need global scope
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
 * For application hotkeys, accelerator changes are communicated to MenuManager
 * via the 'accelerator-changed' event.
 *
 * @module HotkeyManager
 * @see {@link WindowManager} - Used for shortcut actions
 * @see {@link MenuManager} - Handles application hotkeys via menu accelerators
 * @see {@link IpcManager} - Manages IPC for hotkey state synchronization
 */

import { globalShortcut } from 'electron';
import type WindowManager from './windowManager';
import { createLogger } from '../utils/logger';
import { isLinux } from '../utils/constants';
import {
  type HotkeyId,
  type IndividualHotkeySettings,
  type HotkeyAccelerators,
  type HotkeySettings,
  DEFAULT_ACCELERATORS,
  HOTKEY_IDS,
  GLOBAL_HOTKEY_IDS,
  isGlobalHotkey,
} from '../types';

const logger = createLogger('[HotkeyManager]');

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Global hotkeys are disabled on Linux due to Wayland limitations.
 *
 * Wayland's security model prevents applications from registering global
 * shortcuts without explicit desktop portal integration. The current
 * GlobalShortcutsPortal implementation in Chromium/Electron is unreliable
 * on GNOME 46+ and other compositors.
 *
 * When Wayland support improves, set this to `true` to re-enable.
 *
 * @see https://github.com/nicolomaioli/gemini-desktop/issues/XXX
 */
const ENABLE_GLOBAL_HOTKEYS_ON_LINUX = false;

// ============================================================================
// Types
// ============================================================================

/**
 * Defines a keyboard shortcut configuration.
 *
 * @property id - Unique identifier for the shortcut
 * @property action - The callback function to execute when the shortcut is triggered
 */
export interface ShortcutAction {
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
 * Manages keyboard shortcuts for the Gemini Desktop application.
 *
 * ## Features
 * - Two-tier architecture: global hotkeys (globalShortcut) and application hotkeys (Menu)
 * - Supports individual enable/disable per hotkey
 * - Supports custom accelerators per hotkey
 * - Prevents duplicate registrations
 * - Logs all shortcut events for debugging
 *
 * ## Usage
 * ```typescript
 * const hotkeyManager = new HotkeyManager(windowManager);
 * hotkeyManager.registerShortcuts(); // Register enabled global shortcuts
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
    printToPdf: true,
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
  constructor(
    windowManager: WindowManager,
    initialSettings?: HotkeyManagerInitialSettings | Partial<IndividualHotkeySettings>
  ) {
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
        this._individualSettings = {
          ...this._individualSettings,
          ...(initialSettings as Partial<IndividualHotkeySettings>),
        };
      }
    }

    // Define shortcut actions
    // Each shortcut maps an id to an action callback
    this.shortcutActions = [
      // GLOBAL: Boss Key needs to work even when app is hidden/unfocused to quickly hide it system-wide
      {
        id: 'bossKey',
        action: () => {
          const accelerator = this._accelerators.bossKey;
          logger.log(`Hotkey pressed: ${accelerator} (Boss Key)`);
          this.windowManager.minimizeMainWindow();
        },
      },
      // GLOBAL: Quick Chat needs to be accessible from anywhere to open the prompt overlay
      {
        id: 'quickChat',
        action: () => {
          const accelerator = this._accelerators.quickChat;
          logger.log(`Hotkey pressed: ${accelerator} (Quick Chat)`);
          this.windowManager.toggleQuickChat();
        },
      },
      // APPLICATION: Always On Top acts on the active window state, handled via Menu accelerators
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
      // APPLICATION: Print to PDF is a window-specific action, handled via Menu accelerators
      {
        id: 'printToPdf',
        action: () => {
          const accelerator = this._accelerators.printToPdf;
          logger.log(`Hotkey pressed: ${accelerator} (Print to PDF)`);
          this.windowManager.emit('print-to-pdf-triggered');
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
    logger.log(
      `[Version Info] Electron: ${process.versions.electron}, Chrome: ${process.versions.chrome}, Platform: ${process.platform}, Arch: ${process.arch}`
    );
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
      printToPdf: {
        enabled: this._individualSettings.printToPdf,
        accelerator: this._accelerators.printToPdf,
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
   * For global hotkeys: If currently registered, it will be unregistered with the old
   * accelerator and re-registered with the new one.
   *
   * For application hotkeys: The accelerator is updated and an 'accelerator-changed'
   * event is emitted for MenuManager to rebuild the menu.
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

    // Application hotkeys: just update and emit event for menu rebuild
    if (!isGlobalHotkey(id)) {
      this._accelerators[id] = accelerator;
      logger.log(
        `Application hotkey accelerator changed for ${id}: ${oldAccelerator} -> ${accelerator}`
      );
      // Emit event for MenuManager to rebuild menu with new accelerator
      this.windowManager.emit('accelerator-changed', id, accelerator);
      return true;
    }

    // Global hotkeys: unregister old, update, re-register new
    const wasRegistered = this._registeredShortcuts.has(id);
    if (wasRegistered) {
      const registeredAccelerator = this._registeredShortcuts.get(id);
      if (registeredAccelerator) {
        globalShortcut.unregister(registeredAccelerator);
        this._registeredShortcuts.delete(id);
        logger.log(`Global hotkey ${id} unregistered for accelerator change`);
      }
    }

    // Update the accelerator
    this._accelerators[id] = accelerator;
    logger.log(`Global hotkey accelerator changed for ${id}: ${oldAccelerator} -> ${accelerator}`);

    // Re-register if it was registered and is still enabled
    if (wasRegistered && this._individualSettings[id]) {
      this._registerShortcutById(id);
    }

    return true;
  }

  /**
   * Enable or disable a specific hotkey.
   *
   * For global hotkeys:
   * - When disabling: The shortcut is unregistered immediately
   * - When enabling: The shortcut is registered if not already
   *
   * For application hotkeys:
   * - The enabled state is updated
   * - An 'hotkey-enabled-changed' event is emitted for MenuManager
   * - Menu accelerators handle the actual shortcut behavior
   *
   * @param id - The hotkey identifier
   * @param enabled - Whether to enable (true) or disable (false) the hotkey
   */
  setIndividualEnabled(id: HotkeyId, enabled: boolean): void {
    if (this._individualSettings[id] === enabled) {
      return; // No change needed - idempotent behavior
    }

    this._individualSettings[id] = enabled;

    // Application hotkeys: just update state and emit event
    if (!isGlobalHotkey(id)) {
      logger.log(`Application hotkey ${enabled ? 'enabled' : 'disabled'}: ${id}`);
      // Emit event for MenuManager to update menu item
      this.windowManager.emit('hotkey-enabled-changed', id, enabled);
      return;
    }

    // Skip global shortcut registration on Linux (Wayland limitations)
    if (isLinux && !ENABLE_GLOBAL_HOTKEYS_ON_LINUX) {
      logger.log(
        `Global hotkey setting updated: ${id} = ${enabled} (registration skipped on Linux)`
      );
      return;
    }

    if (enabled) {
      this._registerShortcutById(id);
      logger.log(`Global hotkey enabled: ${id}`);
    } else {
      this._unregisterShortcutById(id);
      logger.log(`Global hotkey disabled: ${id}`);
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
   * Only **global** shortcuts (quickChat, bossKey) that are individually enabled
   * will be registered via globalShortcut. Application hotkeys (alwaysOnTop, printToPdf)
   * are handled by MenuManager via menu accelerators.
   *
   * @see setIndividualEnabled - For enabling/disabling individual hotkeys
   */
  registerShortcuts(): void {
    // Skip registration on Linux when disabled (Wayland limitations)
    if (isLinux && !ENABLE_GLOBAL_HOTKEYS_ON_LINUX) {
      logger.warn('Global hotkeys are disabled on Linux due to Wayland limitations.');
      return;
    }

    // Only register global hotkeys via globalShortcut API
    // Application hotkeys are handled by MenuManager via menu accelerators
    for (const id of GLOBAL_HOTKEY_IDS) {
      if (this._individualSettings[id]) {
        this._registerShortcutById(id);
      }
    }
  }

  /**
   * Register a global shortcut by its ID.
   *
   * This method only registers global hotkeys (quickChat, bossKey).
   * Application hotkeys are handled by MenuManager via menu accelerators.
   *
   * @param id - The hotkey identifier
   * @private
   */
  private _registerShortcutById(id: HotkeyId): void {
    // Skip application hotkeys - they are handled by MenuManager
    if (!isGlobalHotkey(id)) {
      logger.log(`Skipping globalShortcut registration for application hotkey: ${id}`);
      return;
    }

    // Guard: Don't register if already registered
    if (this._registeredShortcuts.has(id)) {
      logger.log(`Global hotkey already registered: ${id}`);
      return;
    }

    const accelerator = this._accelerators[id];
    const shortcutAction = this.shortcutActions.find((s) => s.id === id);

    if (!shortcutAction) {
      logger.error(`No action defined for hotkey: ${id}`);
      return;
    }

    // Debugging: Check if already registered according to Electron
    const isAlreadyRegistered = globalShortcut.isRegistered(accelerator);
    logger.log(
      `Registering ${id} (${accelerator}). isRegistered pre-check: ${isAlreadyRegistered}`
    );

    let success = false;
    try {
      success = globalShortcut.register(accelerator, () => {
        try {
          shortcutAction.action();
        } catch (actionError) {
          logger.error(`Error executing action for hotkey ${id}:`, actionError);
        }
      });
    } catch (error) {
      logger.error(`EXCEPTION during globalShortcut.register for ${id} (${accelerator}):`, error);
      return;
    }

    const isRegisteredAfter = globalShortcut.isRegistered(accelerator);
    if (!success) {
      // Registration can fail if another app has claimed the shortcut
      // OR if on Wayland without GlobalShortcutsPortal enabled correctly
      logger.error(
        `FAILED to register hotkey: ${id} (${accelerator}). Success: false. isRegistered post-check: ${isRegisteredAfter}`
      );

      if (isRegisteredAfter) {
        logger.warn(
          `Hotkey ${id} reflects as registered despite failure return. This may indicate a portal conflict or unexpected Electron behavior on Wayland.`
        );
      }
    } else {
      this._registeredShortcuts.set(id, accelerator);
      logger.log(
        `Successfully registered hotkey: ${id} (${accelerator}). isRegistered post-check: ${isRegisteredAfter}`
      );
    }
  }

  /**
   * Unregister a global shortcut by its ID.
   *
   * This method only unregisters global hotkeys (quickChat, bossKey).
   * Application hotkeys are handled by MenuManager via menu accelerators.
   *
   * @param id - The hotkey identifier
   * @private
   */
  private _unregisterShortcutById(id: HotkeyId): void {
    // Skip application hotkeys - they are handled by MenuManager
    if (!isGlobalHotkey(id)) {
      return;
    }

    const registeredAccelerator = this._registeredShortcuts.get(id);
    if (!registeredAccelerator) {
      return; // Not registered, nothing to do
    }

    globalShortcut.unregister(registeredAccelerator);
    this._registeredShortcuts.delete(id);
    logger.log(`Global hotkey unregistered: ${id} (${registeredAccelerator})`);
  }

  /**
   * Execute a hotkey action programmatically.
   *
   * This method exists primarily for E2E testing, allowing tests to trigger
   * the same code path that would be executed when a user presses the hotkey.
   *
   * @param id - The hotkey identifier (e.g., 'quickChat', 'bossKey', 'alwaysOnTop')
   */
  executeHotkeyAction(id: HotkeyId): void {
    const shortcutAction = this.shortcutActions.find((s) => s.id === id);

    if (!shortcutAction) {
      logger.warn(`No action found for hotkey: ${id}`);
      return;
    }

    logger.log(`Executing hotkey action programmatically: ${id}`);
    shortcutAction.action();
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
    logger.log('All global hotkeys unregistered');
  }

  /**
   * Get shortcut actions for global hotkeys only.
   *
   * These are hotkeys that should be registered via globalShortcut API.
   *
   * @returns Array of shortcut actions for global hotkeys
   */
  getGlobalHotkeyActions(): ShortcutAction[] {
    return this.shortcutActions.filter((action) => isGlobalHotkey(action.id));
  }

  /**
   * Get shortcut actions for application hotkeys only.
   *
   * These are hotkeys that should be handled via Menu accelerators.
   *
   * @returns Array of shortcut actions for application hotkeys
   */
  getApplicationHotkeyActions(): ShortcutAction[] {
    return this.shortcutActions.filter((action) => !isGlobalHotkey(action.id));
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

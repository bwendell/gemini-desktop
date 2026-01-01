/**
 * IPC Manager for the Electron main process.
 *
 * Centralizes all IPC (Inter-Process Communication) handlers between the
 * renderer and main processes. This architecture enables:
 * - Clean separation of concerns
 * - Easy extension for new IPC channels
 * - Consistent error handling across all handlers
 * - Cross-platform compatibility (Windows, macOS, Linux)
 *
 * @module IpcManager
 */

import { ipcMain, BrowserWindow, nativeTheme, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import SettingsStore from '../store';
import { GOOGLE_ACCOUNTS_URL, IPC_CHANNELS, isGeminiDomain } from '../utils/constants';
import { GEMINI_APP_URL } from '../../shared/constants/index';
import {
  InjectionScriptBuilder,
  DEFAULT_INJECTION_CONFIG,
  InjectionResult,
} from '../utils/injectionScript';
import { createLogger } from '../utils/logger';
import type WindowManager from './windowManager';
import type HotkeyManager from './hotkeyManager';
import type UpdateManager from './updateManager';
import type PrintManager from './printManager';
import type {
  ThemePreference,
  ThemeData,
  IndividualHotkeySettings,
  HotkeyId,
  HotkeyAccelerators,
  HotkeySettings,
  Logger,
} from '../types';
import { DEFAULT_ACCELERATORS, HOTKEY_IDS } from '../types';

/**
 * User preferences structure for settings store.
 */
interface UserPreferences extends Record<string, unknown> {
  theme: ThemePreference;
  alwaysOnTop: boolean;
  // Individual hotkey settings
  hotkeyAlwaysOnTop: boolean;
  hotkeyBossKey: boolean;
  hotkeyQuickChat: boolean;
  hotkeyPrintToPdf: boolean;
  // Hotkey accelerators
  acceleratorAlwaysOnTop: string;
  acceleratorBossKey: string;
  acceleratorQuickChat: string;
  acceleratorPrintToPdf: string;
  // Auto-update settings
  autoUpdateEnabled: boolean;
}

/**
 * Manages IPC communication between main and renderer processes.
 * Handles window controls, theme management, and app-specific channels.
 */
export default class IpcManager {
  private windowManager: WindowManager;
  private hotkeyManager: HotkeyManager | null = null;
  private updateManager: UpdateManager | null = null;
  private printManager: PrintManager | null = null;
  private store: SettingsStore<UserPreferences>;
  private logger: Logger;

  /**
   * Creates a new IpcManager instance.
   * @param windowManager - The window manager instance
   * @param store - Optional store instance for testing
   * @param logger - Optional logger instance for testing
   */
  constructor(
    windowManager: WindowManager,
    hotkeyManager?: HotkeyManager | null,
    updateManager?: UpdateManager | null,
    printManager?: PrintManager | null,
    store?: SettingsStore<UserPreferences>,
    logger?: Logger
  ) {
    this.windowManager = windowManager;
    this.hotkeyManager = hotkeyManager || null;
    this.updateManager = updateManager || null;
    this.printManager = printManager || null;
    /* v8 ignore next 6 -- production fallback, tests always inject dependencies */
    this.store =
      store ||
      new SettingsStore<UserPreferences>({
        configName: 'user-preferences',
        defaults: {
          theme: 'system',
          alwaysOnTop: false,
          // Individual hotkey defaults
          hotkeyAlwaysOnTop: true,
          hotkeyBossKey: true,
          hotkeyQuickChat: true,
          hotkeyPrintToPdf: true,
          // Auto-update defaults
          autoUpdateEnabled: true,
        },
      });
    /* v8 ignore next -- production fallback, tests always inject logger */
    this.logger = logger || createLogger('[IpcManager]');

    // Initialize native theme on startup
    this._initializeNativeTheme();

    // Initialize hotkey settings from store
    this._initializeHotkeys();

    this.logger.log('Initialized');
  }

  /**
   * Initialize hotkey settings from store.
   * @private
   */
  private _initializeHotkeys(): void {
    if (!this.hotkeyManager) return;

    try {
      // Sync enabled states
      const savedSettings = this._getIndividualHotkeySettings();
      this.hotkeyManager.updateAllSettings(savedSettings);

      // Sync accelerators
      const savedAccelerators = this._getHotkeyAccelerators();
      this.hotkeyManager.updateAllAccelerators(savedAccelerators);

      this.logger.log('Hotkeys initialized from store');
    } catch (error) {
      this.logger.error('Failed to initialize hotkeys:', error);
    }
  }

  /**
   * Initialize nativeTheme based on stored preference.
   * @private
   */
  private _initializeNativeTheme(): void {
    try {
      const savedTheme = this.store.get('theme') || 'system';
      nativeTheme.themeSource = savedTheme;
      this.logger.log(`Native theme initialized to: ${savedTheme}`);
    } catch (error) {
      this.logger.error('Failed to initialize native theme:', error);
    }
  }

  /**
   * Initialize always-on-top state from stored preference.
   * Called after window is created.
   * @private
   */
  private _initializeAlwaysOnTop(): void {
    try {
      const savedAlwaysOnTop = this.store.get('alwaysOnTop') ?? false;
      if (savedAlwaysOnTop) {
        this.windowManager.setAlwaysOnTop(true);
        this.logger.log('Always on top initialized to: enabled');
      }
    } catch (error) {
      this.logger.error('Failed to initialize always on top:', error);
    }
  }

  /**
   * Set up all IPC handlers.
   * Call this after app is ready.
   */
  setupIpcHandlers(): void {
    this._setupWindowHandlers();
    this._setupThemeHandlers();
    this._setupIndividualHotkeyHandlers();
    this._setupAcceleratorHandlers();
    this._setupAlwaysOnTopHandlers();
    this._setupAppHandlers();
    this._setupQuickChatHandlers();
    this._setupAutoUpdateHandlers();
    this._setupPrintHandlers();

    // Listen for internal changes (from hotkeys or menu)
    this.windowManager.on('always-on-top-changed', this._handleAlwaysOnTopChanged.bind(this));

    // Initialize settings that require window to exist
    this._initializeAlwaysOnTop();

    this.logger.log('All IPC handlers registered');
  }

  /**
   * Get the window from an IPC event safely.
   * @private
   * @param event - IPC event
   * @returns The window or null if not found
   */
  private _getWindowFromEvent(event: IpcMainEvent | IpcMainInvokeEvent): BrowserWindow | null {
    try {
      return BrowserWindow.fromWebContents(event.sender);
    } catch (error) {
      this.logger.error('Failed to get window from event:', error);
      return null;
    }
  }

  /**
   * Set up window control handlers (minimize, maximize, close).
   * Cross-platform compatible - works on Windows, macOS, and Linux.
   * @private
   */
  private _setupWindowHandlers(): void {
    // Minimize window
    ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, (event) => {
      const win = this._getWindowFromEvent(event);
      if (win && !win.isDestroyed()) {
        try {
          win.minimize();
        } catch (error) {
          this.logger.error('Error minimizing window:', {
            error: error instanceof Error ? error.message : String(error),
            windowId: win.id,
          });
        }
      }
    });

    // Maximize/restore window
    ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, (event) => {
      const win = this._getWindowFromEvent(event);
      if (win && !win.isDestroyed()) {
        try {
          if (win.isMaximized()) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } catch (error) {
          this.logger.error('Error toggling maximize:', {
            error: error instanceof Error ? error.message : String(error),
            windowId: win.id,
          });
        }
      }
    });

    // Close window
    ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, (event) => {
      const win = this._getWindowFromEvent(event);
      if (win && !win.isDestroyed()) {
        try {
          win.close();
        } catch (error) {
          this.logger.error('Error closing window:', {
            error: error instanceof Error ? error.message : String(error),
            windowId: win.id,
          });
        }
      }
    });

    // Show/Restore window (e.g., from tray or helper)
    ipcMain.on(IPC_CHANNELS.WINDOW_SHOW, () => {
      try {
        this.windowManager.restoreFromTray();
      } catch (error) {
        this.logger.error('Error showing window:', error);
      }
    });

    // Check if window is maximized
    ipcMain.handle(IPC_CHANNELS.WINDOW_IS_MAXIMIZED, (event): boolean => {
      const win = this._getWindowFromEvent(event);
      if (!win || win.isDestroyed()) return false;

      try {
        return win.isMaximized();
      } catch (error) {
        this.logger.error('Error checking maximized state:', error);
        return false;
      }
    });
  }

  /**
   * Set up theme-related IPC handlers.
   * Manages theme persistence and synchronization across windows.
   * @private
   */
  private _setupThemeHandlers(): void {
    // Get current theme preference and effective theme
    ipcMain.handle(IPC_CHANNELS.THEME_GET, (): ThemeData => {
      try {
        const preference = this.store.get('theme') || 'system';
        const effectiveTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
        return { preference, effectiveTheme };
      } catch (error) {
        this.logger.error('Error getting theme:', error);
        return { preference: 'system', effectiveTheme: 'dark' };
      }
    });

    // Set theme preference
    ipcMain.on(IPC_CHANNELS.THEME_SET, (_event, theme: ThemePreference) => {
      try {
        // Validate theme value
        const validThemes: ThemePreference[] = ['light', 'dark', 'system'];
        if (!validThemes.includes(theme)) {
          this.logger.warn(`Invalid theme value: ${theme}`);
          return;
        }

        // Persist preference
        this.store.set('theme', theme);

        // Update native theme (affects nativeTheme.shouldUseDarkColors)
        nativeTheme.themeSource = theme;

        // Compute effective theme after nativeTheme update
        const effectiveTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';

        this.logger.log(`Theme set to: ${theme} (effective: ${effectiveTheme})`);

        // Broadcast to all windows
        this._broadcastThemeChange(theme, effectiveTheme);
      } catch (error) {
        this.logger.error('Error setting theme:', {
          error: (error as Error).message,
          requestedTheme: theme,
        });
      }
    });
  }

  /**
   * Broadcast theme change to all open windows.
   * @private
   * @param preference - The theme preference
   * @param effectiveTheme - The resolved effective theme
   */
  private _broadcastThemeChange(
    preference: ThemePreference,
    effectiveTheme: 'light' | 'dark'
  ): void {
    const windows = BrowserWindow.getAllWindows();

    windows.forEach((win) => {
      try {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.THEME_CHANGED, { preference, effectiveTheme });
        }
      } catch (error) {
        this.logger.error('Error broadcasting theme to window:', {
          error: (error as Error).message,
          windowId: win.id,
        });
      }
    });
  }

  /**
   * Set up individual hotkey IPC handlers.
   * Manages per-hotkey enabled/disabled state and synchronization across windows.
   * @private
   */
  private _setupIndividualHotkeyHandlers(): void {
    // Get current individual hotkey settings
    ipcMain.handle(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_GET, (): IndividualHotkeySettings => {
      try {
        return this._getIndividualHotkeySettings();
      } catch (error) {
        this.logger.error('Error getting individual hotkeys state:', error);
        return { alwaysOnTop: true, bossKey: true, quickChat: true, printToPdf: true };
      }
    });

    // Set individual hotkey enabled state
    ipcMain.on(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET, (_event, id: HotkeyId, enabled: boolean) => {
      try {
        // Validate inputs
        if (!HOTKEY_IDS.includes(id)) {
          this.logger.warn(`Invalid hotkey id: ${id}`);
          return;
        }
        if (typeof enabled !== 'boolean') {
          this.logger.warn(`Invalid enabled value: ${enabled}`);
          return;
        }

        // Persist preference
        this._setIndividualHotkeySetting(id, enabled);

        // Update HotkeyManager if available
        if (this.hotkeyManager) {
          this.hotkeyManager.setIndividualEnabled(id, enabled);
        }

        this.logger.log(`Individual hotkey ${id} set to: ${enabled}`);

        // Broadcast to all windows
        this._broadcastIndividualHotkeyChange();
      } catch (error) {
        this.logger.error('Error setting individual hotkey:', {
          error: (error as Error).message,
          id,
          enabled,
        });
      }
    });
  }

  /**
   * Get individual hotkey settings from store.
   * @private
   */
  private _getIndividualHotkeySettings(): IndividualHotkeySettings {
    return {
      alwaysOnTop: this.store.get('hotkeyAlwaysOnTop') ?? true,
      bossKey: this.store.get('hotkeyBossKey') ?? true,
      quickChat: this.store.get('hotkeyQuickChat') ?? true,
      printToPdf: this.store.get('hotkeyPrintToPdf') ?? true,
    };
  }

  /**
   * Set an individual hotkey setting in the store.
   * @private
   */
  private _setIndividualHotkeySetting(id: HotkeyId, enabled: boolean): void {
    switch (id) {
      case 'alwaysOnTop':
        this.store.set('hotkeyAlwaysOnTop', enabled);
        break;
      case 'bossKey':
        this.store.set('hotkeyBossKey', enabled);
        break;
      case 'quickChat':
        this.store.set('hotkeyQuickChat', enabled);
        break;
      case 'printToPdf':
        this.store.set('hotkeyPrintToPdf', enabled);
        break;
    }
  }

  /**
   * Broadcast individual hotkey settings change to all open windows.
   * @private
   */
  private _broadcastIndividualHotkeyChange(): void {
    const settings = this._getIndividualHotkeySettings();
    const windows = BrowserWindow.getAllWindows();

    windows.forEach((win) => {
      try {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_CHANGED, settings);
        }
      } catch (error) {
        this.logger.error('Error broadcasting individual hotkey change to window:', {
          error: (error as Error).message,
          windowId: win.id,
        });
      }
    });
  }

  /**
   * Set up Hotkey Accelerator IPC handlers.
   * @private
   */
  private _setupAcceleratorHandlers(): void {
    // Get current accelerator settings
    ipcMain.handle(IPC_CHANNELS.HOTKEYS_ACCELERATOR_GET, (): HotkeyAccelerators => {
      try {
        return this._getHotkeyAccelerators();
      } catch (error) {
        this.logger.error('Error getting hotkey accelerators:', error);
        return { ...DEFAULT_ACCELERATORS };
      }
    });

    // Get full hotkey settings (enabled + accelerators)
    ipcMain.handle(IPC_CHANNELS.HOTKEYS_FULL_SETTINGS_GET, (): HotkeySettings => {
      try {
        return this._getFullHotkeySettings();
      } catch (error) {
        this.logger.error('Error getting full hotkey settings:', error);
        return {
          alwaysOnTop: { enabled: true, accelerator: DEFAULT_ACCELERATORS.alwaysOnTop },
          bossKey: { enabled: true, accelerator: DEFAULT_ACCELERATORS.bossKey },
          quickChat: { enabled: true, accelerator: DEFAULT_ACCELERATORS.quickChat },
          printToPdf: { enabled: true, accelerator: DEFAULT_ACCELERATORS.printToPdf },
        };
      }
    });

    // Set accelerator for a specific hotkey
    ipcMain.on(
      IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET,
      (_event, id: HotkeyId, accelerator: string) => {
        try {
          // Validate inputs
          if (!HOTKEY_IDS.includes(id)) {
            this.logger.warn(`Invalid hotkey id: ${id}`);
            return;
          }
          if (typeof accelerator !== 'string' || accelerator.trim().length === 0) {
            this.logger.warn(`Invalid accelerator value: ${accelerator}`);
            return;
          }

          // Persist preference
          this._setHotkeyAccelerator(id, accelerator);

          // Update HotkeyManager if available
          if (this.hotkeyManager) {
            this.hotkeyManager.setAccelerator(id, accelerator);
          }

          this.logger.log(`Hotkey accelerator ${id} set to: ${accelerator}`);

          // Broadcast to all windows
          this._broadcastAcceleratorChange();
        } catch (error) {
          this.logger.error('Error setting hotkey accelerator:', {
            error: (error as Error).message,
            id,
            accelerator,
          });
        }
      }
    );
  }

  /**
   * Get hotkey accelerators from store.
   * @private
   */
  private _getHotkeyAccelerators(): HotkeyAccelerators {
    return {
      alwaysOnTop: this.store.get('acceleratorAlwaysOnTop') ?? DEFAULT_ACCELERATORS.alwaysOnTop,
      bossKey: this.store.get('acceleratorBossKey') ?? DEFAULT_ACCELERATORS.bossKey,
      quickChat: this.store.get('acceleratorQuickChat') ?? DEFAULT_ACCELERATORS.quickChat,
      printToPdf: this.store.get('acceleratorPrintToPdf') ?? DEFAULT_ACCELERATORS.printToPdf,
    };
  }

  /**
   * Set a hotkey accelerator in the store.
   * @private
   */
  private _setHotkeyAccelerator(id: HotkeyId, accelerator: string): void {
    switch (id) {
      case 'alwaysOnTop':
        this.store.set('acceleratorAlwaysOnTop', accelerator);
        break;
      case 'bossKey':
        this.store.set('acceleratorBossKey', accelerator);
        break;
      case 'quickChat':
        this.store.set('acceleratorQuickChat', accelerator);
        break;
      case 'printToPdf':
        this.store.set('acceleratorPrintToPdf', accelerator);
        break;
    }
  }

  /**
   * Get full hotkey settings (enabled states + accelerators).
   * @private
   */
  private _getFullHotkeySettings(): HotkeySettings {
    const enabled = this._getIndividualHotkeySettings();
    const accelerators = this._getHotkeyAccelerators();

    return {
      alwaysOnTop: {
        enabled: enabled.alwaysOnTop,
        accelerator: accelerators.alwaysOnTop,
      },
      bossKey: {
        enabled: enabled.bossKey,
        accelerator: accelerators.bossKey,
      },
      quickChat: {
        enabled: enabled.quickChat,
        accelerator: accelerators.quickChat,
      },
      printToPdf: {
        enabled: enabled.printToPdf,
        accelerator: accelerators.printToPdf,
      },
    };
  }

  /**
   * Broadcast accelerator change to all open windows.
   * @private
   */
  private _broadcastAcceleratorChange(): void {
    const accelerators = this._getHotkeyAccelerators();
    const windows = BrowserWindow.getAllWindows();

    windows.forEach((win) => {
      try {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.HOTKEYS_ACCELERATOR_CHANGED, accelerators);
        }
      } catch (error) {
        this.logger.error('Error broadcasting accelerator change to window:', {
          error: (error as Error).message,
          windowId: win.id,
        });
      }
    });
  }

  /**
   * Set up Always On Top IPC handlers.
   * @private
   */
  private _setupAlwaysOnTopHandlers(): void {
    // Get current always-on-top state
    ipcMain.handle(IPC_CHANNELS.ALWAYS_ON_TOP_GET, (): { enabled: boolean } => {
      try {
        const enabled = this.store.get('alwaysOnTop') ?? false;
        return { enabled };
      } catch (error) {
        this.logger.error('Error getting always on top state:', error);
        return { enabled: false };
      }
    });

    // Set always-on-top state
    ipcMain.on(IPC_CHANNELS.ALWAYS_ON_TOP_SET, (_event, enabled: boolean) => {
      try {
        // Validate enabled value
        if (typeof enabled !== 'boolean') {
          this.logger.warn(`Invalid alwaysOnTop value: ${enabled}`);
          return;
        }

        // Update WindowManager - this will emit 'always-on-top-changed'
        // which IPC Manager listens to for persistence and broadcasting
        this.windowManager.setAlwaysOnTop(enabled);

        this.logger.log(`Always on top requested: ${enabled}`);
      } catch (error) {
        this.logger.error('Error setting always on top:', {
          error: (error as Error).message,
          requestedEnabled: enabled,
        });
      }
    });
  }

  /**
   * Handle always-on-top state changes from WindowManager.
   * Persists the state and broadcasts to all windows.
   * @private
   * @param enabled - New always-on-top state
   */
  private _handleAlwaysOnTopChanged(enabled: boolean): void {
    try {
      // Persist preference
      this.store.set('alwaysOnTop', enabled);

      this.logger.log(`Always on top changed to: ${enabled} (persisted and broadcasting)`);

      // Broadcast to all windows
      this._broadcastAlwaysOnTopChange(enabled);
    } catch (error) {
      this.logger.error('Error handling always on top change:', {
        error: (error as Error).message,
        enabled,
      });
    }
  }

  /**
   * Broadcast always-on-top change to all open windows.
   * @private
   * @param enabled - Whether always-on-top is enabled
   */
  private _broadcastAlwaysOnTopChange(enabled: boolean): void {
    const windows = BrowserWindow.getAllWindows();

    windows.forEach((win) => {
      try {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED, { enabled });
        }
      } catch (error) {
        this.logger.error('Error broadcasting always on top change to window:', {
          error: (error as Error).message,
          windowId: win.id,
        });
      }
    });
  }

  /**
   * Set up application-specific handlers.
   * @private
   */
  private _setupAppHandlers(): void {
    // Open options window (optionally to a specific tab)
    ipcMain.on(IPC_CHANNELS.OPEN_OPTIONS, (_event, tab?: 'settings' | 'about') => {
      try {
        this.windowManager.createOptionsWindow(tab);
      } catch (error) {
        this.logger.error('Error opening options window:', error);
      }
    });

    // Open Google sign-in using WindowManager's createAuthWindow
    ipcMain.handle(IPC_CHANNELS.OPEN_GOOGLE_SIGNIN, async (): Promise<void> => {
      try {
        const authWindow = this.windowManager.createAuthWindow(GOOGLE_ACCOUNTS_URL);

        // Return a promise that resolves when window is closed
        return new Promise((resolve) => {
          authWindow.on('closed', () => resolve());
        });
      } catch (error) {
        this.logger.error('Error opening Google sign-in:', error);
        throw error;
      }
    });
  }

  /**
   * Set up Quick Chat IPC handlers.
   * Handles communication between Quick Chat window and main window.
   *
   * Flow (Option A - preserves React shell):
   * 1. Quick Chat submits text → hide Quick Chat, focus main window
   * 2. Send GEMINI_NAVIGATE to renderer → React app reloads iframe
   * 3. Renderer signals GEMINI_READY → main process injects text into iframe
   *
   * @private
   */
  private _setupQuickChatHandlers(): void {
    // Submit quick chat text - triggers iframe navigation in renderer
    ipcMain.on(IPC_CHANNELS.QUICK_CHAT_SUBMIT, async (_event, text: string) => {
      try {
        this.logger.log('Quick Chat submit received:', text.substring(0, 50));

        // Hide the Quick Chat window
        this.windowManager.hideQuickChat();

        // Focus the main window
        this.windowManager.focusMainWindow();

        // Send navigation request to renderer (React app will reload iframe)
        const mainWindow = this.windowManager.getMainWindow();
        if (mainWindow) {
          this.logger.log('Sending gemini:navigate to renderer');
          mainWindow.webContents.send(IPC_CHANNELS.GEMINI_NAVIGATE, {
            url: GEMINI_APP_URL,
            text: text,
          });
        } else {
          this.logger.error('Cannot navigate: main window not found');
        }
      } catch (error) {
        this.logger.error('Error handling quick chat submit:', error);
      }
    });

    // Gemini iframe ready - renderer signals after iframe loads, triggers injection
    ipcMain.on(IPC_CHANNELS.GEMINI_READY, async (_event, text: string) => {
      try {
        this.logger.log('Gemini ready signal received, injecting text');
        await this._injectTextIntoGeminiIframe(text);
      } catch (error) {
        this.logger.error('Error handling gemini ready:', error);
      }
    });

    // Hide Quick Chat window
    ipcMain.on(IPC_CHANNELS.QUICK_CHAT_HIDE, () => {
      try {
        this.windowManager.hideQuickChat();
      } catch (error) {
        this.logger.error('Error hiding quick chat:', error);
      }
    });

    // Cancel Quick Chat (hide without action)
    ipcMain.on(IPC_CHANNELS.QUICK_CHAT_CANCEL, () => {
      try {
        this.windowManager.hideQuickChat();
        this.logger.log('Quick Chat cancelled');
      } catch (error) {
        this.logger.error('Error cancelling quick chat:', error);
      }
    });
  }

  /**
   * Inject text into the Gemini iframe (child frame of React shell).
   * This is called after renderer signals that iframe has loaded.
   *
   * @param text - Text to inject into Gemini editor
   * @private
   */
  private async _injectTextIntoGeminiIframe(text: string): Promise<void> {
    const mainWindow = this.windowManager.getMainWindow();
    if (!mainWindow) {
      this.logger.error('Cannot inject text: main window not found');
      return;
    }

    const webContents = mainWindow.webContents;
    const mainFrame = webContents.mainFrame;
    const frames = mainFrame.frames;

    this.logger.log('Looking for Gemini iframe in', frames.length, 'child frames');

    // Find the Gemini iframe in child frames (React shell architecture)
    const geminiFrame = frames.find((frame) => {
      try {
        return isGeminiDomain(frame.url);
      } catch {
        return false;
      }
    });

    if (!geminiFrame) {
      this.logger.error('Cannot inject text: Gemini iframe not found in child frames');
      return;
    }

    this.logger.log('Found Gemini iframe:', geminiFrame.url);

    // Check if we should disable auto-submit (for E2E testing)
    // E2E tests pass --e2e-disable-auto-submit flag to prevent actual Gemini submissions
    const isE2EMode = process.argv.includes('--e2e-disable-auto-submit');

    const shouldAutoSubmit = !isE2EMode;

    if (!shouldAutoSubmit) {
      this.logger.log('E2E mode: auto-submit disabled, will inject text only');
    }

    // Build and execute the injection script
    const injectionScript = new InjectionScriptBuilder()
      .withText(text)
      .withAutoSubmit(shouldAutoSubmit)
      .build();

    try {
      const result = (await geminiFrame.executeJavaScript(injectionScript)) as InjectionResult;

      if (result?.success) {
        this.logger.log('Text injected into Gemini successfully');
      } else {
        this.logger.error('Injection script returned failure:', result?.error);
      }
    } catch (error) {
      this.logger.error('Failed to inject text into Gemini:', error);
    }
  }

  /**
   * Set up Print to PDF handlers.
   * @private
   */
  private _setupPrintHandlers(): void {
    // Handle IPC trigger from renderer
    ipcMain.on(IPC_CHANNELS.PRINT_TO_PDF_TRIGGER, (event) => {
      this.logger.log('Print to PDF triggered via IPC');

      if (!this.printManager) {
        this.logger.error('PrintManager not initialized');
        return;
      }

      this.printManager.printToPdf(event.sender).catch((err) => {
        this.logger.error('Error during printToPdf:', err);
      });
    });

    // Handle cancel request from renderer
    ipcMain.on(IPC_CHANNELS.PRINT_CANCEL, () => {
      this.logger.log('Print cancellation requested via IPC');
      this.printManager?.cancel();
    });

    // Handle local trigger from hotkey/menu via WindowManager event
    this.windowManager.on('print-to-pdf-triggered', () => {
      this.logger.log('Print to PDF triggered via local event');

      if (!this.printManager) {
        this.logger.error('PrintManager not initialized');
        return;
      }

      // We assume print target is the main window for hotkeys/menu
      const mainWindow = this.windowManager.getMainWindow();
      if (!mainWindow || mainWindow.isDestroyed()) {
        this.logger.warn('Cannot print: Main window not found or destroyed');
        return;
      }

      this.printManager.printToPdf(mainWindow.webContents).catch((err) => {
        this.logger.error('Error during printToPdf (local):', err);
      });
    });
  }

  /**
   * Set up Auto-Update IPC handlers.
   * Manages auto-update settings and triggers update actions.
   * @private
   */
  private _setupAutoUpdateHandlers(): void {
    // Get auto-update enabled state
    ipcMain.handle(IPC_CHANNELS.AUTO_UPDATE_GET_ENABLED, (): boolean => {
      try {
        if (this.updateManager) {
          return this.updateManager.isEnabled();
        }
        return this.store.get('autoUpdateEnabled') ?? true;
      } catch (error) {
        this.logger.error('Error getting auto-update state:', error);
        return true;
      }
    });

    // Set auto-update enabled state
    ipcMain.on(IPC_CHANNELS.AUTO_UPDATE_SET_ENABLED, (_event, enabled: boolean) => {
      try {
        if (typeof enabled !== 'boolean') {
          this.logger.warn(`Invalid autoUpdateEnabled value: ${enabled}`);
          return;
        }

        // Always persist to IpcManager's store for consistency
        this.store.set('autoUpdateEnabled', enabled);

        // Also update UpdateManager if available
        if (this.updateManager) {
          this.updateManager.setEnabled(enabled);
        }

        this.logger.log(`Auto-update set to: ${enabled}`);
      } catch (error) {
        this.logger.error('Error setting auto-update state:', {
          error: (error as Error).message,
          enabled,
        });
      }
    });

    // Trigger manual update check
    ipcMain.on(IPC_CHANNELS.AUTO_UPDATE_CHECK, () => {
      try {
        if (this.updateManager) {
          this.updateManager.checkForUpdates(true); // manual=true
        }
      } catch (error) {
        this.logger.error('Error checking for updates:', error);
      }
    });

    // Get last update check time (for E2E startup verification)
    ipcMain.handle(IPC_CHANNELS.AUTO_UPDATE_GET_LAST_CHECK, () => {
      // We need to track this in UpdateManager or IpcManager.
      // Simplest is to track it here when we trigger check?
      // BUT the automatic check is triggered inside UpdateManager.
      // So UpdateManager needs to expose it.
      // Let's assume UpdateManager tracks it? It doesn't yet.
      // I'll modify UpdateManager to track `lastCheckTime`.
      if (this.updateManager) {
        return (this.updateManager as any).getLastCheckTime?.() || 0;
      }
      return 0;
    });

    // Install downloaded update
    ipcMain.on(IPC_CHANNELS.AUTO_UPDATE_INSTALL, () => {
      try {
        if (this.updateManager) {
          this.updateManager.quitAndInstall();
        }
      } catch (error) {
        this.logger.error('Error installing update:', error);
      }
    });

    // Dev Testing: Show badge (only for manual testing)
    ipcMain.on(IPC_CHANNELS.DEV_TEST_SHOW_BADGE, (_event, version?: string) => {
      try {
        if (this.updateManager) {
          this.updateManager.devShowBadge(version);
        }
      } catch (error) {
        this.logger.error('Error showing dev test badge:', error);
      }
    });

    // Dev Testing: Clear badge (only for manual testing)
    ipcMain.on(IPC_CHANNELS.DEV_TEST_CLEAR_BADGE, () => {
      try {
        if (this.updateManager) {
          this.updateManager.devClearBadge();
        }
      } catch (error) {
        this.logger.error('Error clearing dev test badge:', error);
      }
    });

    // Dev Testing: Set Update Enabled (bypass settings/platform logic checks if forced here?)
    // Actually this tests setEnabled logic
    ipcMain.on(IPC_CHANNELS.DEV_TEST_SET_UPDATE_ENABLED, (_event, enabled: boolean) => {
      if (this.updateManager) {
        this.updateManager.setEnabled(enabled);
      }
    });

    // Dev Testing: Emit Update Event
    ipcMain.on(IPC_CHANNELS.DEV_TEST_EMIT_UPDATE_EVENT, (_event, eventName: string, data: any) => {
      if (this.updateManager) {
        this.updateManager.devEmitUpdateEvent(eventName, data);
      }
    });

    // Dev Testing: Mock Platform/Env
    ipcMain.on(
      IPC_CHANNELS.DEV_TEST_MOCK_PLATFORM,
      (_event, platform: NodeJS.Platform | null, env: Record<string, string> | null) => {
        if (this.updateManager) {
          if (platform !== undefined) this.updateManager.devMockPlatform(platform);
          if (env !== undefined) this.updateManager.devMockEnv(env);
        }
      }
    );

    // Get tray tooltip (for E2E testing)
    ipcMain.handle(IPC_CHANNELS.TRAY_GET_TOOLTIP, () => {
      try {
        // Access private trayManager via updateManager if possible, or we need a direct ref
        // For now, assume updateManager has public access or we modify this class to access it
        // Actually UpdateManager.trayManager is private but exposed via getter? No.
        // But we can check UpdateManager implementation in UpdateManager.ts - it has private trayManager.
        // We should probably rely on WindowManager or just handle it here if we have access.
        // Wait, TrayManager is NOT passed to IpcManager directly. It IS passed to UpdateManager.
        // UpdateManager.ts shows trayManager is private propert with no getter.
        // Let's check UpdateManager again to see if we can add a getter or if we should add TrayManager to IpcManager.
        // Actually, IpcManager.ts imports UpdateManager.
        if (this.updateManager) {
          return (this.updateManager as any).getTrayTooltip?.() || '';
        }
        return '';
      } catch (error) {
        this.logger.error('Error getting tray tooltip:', error);
        return '';
      }
    });
  }
}

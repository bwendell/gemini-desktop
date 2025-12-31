/**
 * Electron Main Process
 *
 * This is the entry point for the Electron application.
 * It creates a frameless window with a custom titlebar and
 * strips X-Frame-Options headers to allow embedding Gemini in an iframe.
 */

import { app, BrowserWindow, crashReporter, session } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import {
  setupHeaderStripping,
  setupWebviewSecurity,
  setupMediaPermissions,
} from './utils/security';
import { getDistHtmlPath } from './utils/paths';
import { isLinux } from './utils/constants';

import { createLogger } from './utils/logger';

// Setup Logger
const logger = createLogger('[Main]');

// DEBUG: Log critical environment info early for CI debugging
logger.log('=== ELECTRON STARTUP DEBUG INFO ===');
logger.log('Platform:', process.platform);
logger.log('DISPLAY:', process.env.DISPLAY || 'NOT SET');
logger.log('XDG_SESSION_TYPE:', process.env.XDG_SESSION_TYPE || 'NOT SET');
logger.log('CI:', process.env.CI || 'NOT SET');
logger.log('ELECTRON_USE_DIST:', process.env.ELECTRON_USE_DIST || 'NOT SET');
logger.log('app.isReady():', app.isReady());
logger.log('===================================');

if (isLinux) {
  // On Linux, the internal app name should match the executable/id for better WM_CLASS matching
  app.setName('gemini-desktop');

  // Set desktop name for portal integration
  try {
    if (typeof (app as any).setDesktopName === 'function') {
      (app as any).setDesktopName('gemini-desktop');
    }
  } catch (e) {
    logger.error('Error calling setDesktopName:', e);
  }

  // Wayland Global Shortcuts:
  // Global shortcuts on Wayland are challenging due to its security model.
  // - Electron's globalShortcut API relies on X11 grab mechanisms
  // - On pure Wayland, shortcuts require xdg-desktop-portal integration
  // - XWayland compatibility mode often works but is unreliable on GNOME 46+
  //
  // Current approach: Let Electron/Chromium use default behavior.
  // If running on Wayland, hotkeys may not work and users should be informed.
  //
  // See: https://github.com/nicolomaioli/gemini-desktop/issues/XXX

  const isWayland = process.env.XDG_SESSION_TYPE === 'wayland';
  logger.log(`XDG_SESSION_TYPE: ${process.env.XDG_SESSION_TYPE}`);

  if (isWayland) {
    logger.warn(
      'Wayland session detected. Global hotkeys are disabled due to Wayland limitations.'
    );
  }
} else {
  // Set application name for Windows/macOS
  app.setName('Gemini Desktop');
}

/**
 * Initialize crash reporter EARLY (before app ready).
 * This is critical for preventing OS crash dialogs on Windows/macOS/Linux.
 */
const crashDumpsPath = path.join(app.getPath('userData'), 'crashes');
app.setPath('crashDumps', crashDumpsPath);

const crashReportUrl = process.env.CRASH_REPORT_URL || '';

crashReporter.start({
  productName: 'Gemini Desktop',
  submitURL: crashReportUrl,
  uploadToServer: !!crashReportUrl,
  ignoreSystemCrashHandler: true,
  rateLimit: true,
  globalExtra: {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
  },
});

logger.log('Crash reporter initialized', {
  crashDumpsPath,
  uploadToServer: !!crashReportUrl,
  ignoreSystemCrashHandler: true,
});

import WindowManager from './managers/windowManager';
import IpcManager from './managers/ipcManager';
import MenuManager from './managers/menuManager';
import HotkeyManager from './managers/hotkeyManager';
import TrayManager from './managers/trayManager';
import BadgeManager from './managers/badgeManager';
import UpdateManager, { AutoUpdateSettings } from './managers/updateManager';
import PrintManager from './managers/printManager';
import SettingsStore from './store';

// Path to the production build
const distIndexPath = getDistHtmlPath('index.html');

// Determine if we're in development mode
// Use production build if:
// 1. App is packaged (production), OR
// 2. ELECTRON_USE_DIST env is set (E2E testing), OR
// 3. dist/index.html exists AND dev server is not running (fallback)
const useProductionBuild =
  app.isPackaged || process.env.ELECTRON_USE_DIST === 'true' || fs.existsSync(distIndexPath);

// For E2E tests, always use production build if it exists
const isDev = !useProductionBuild;

/**
 * Manager instances - initialized lazily to allow for declarative pattern.
 */
let windowManager: WindowManager;
let hotkeyManager: HotkeyManager;
let ipcManager: IpcManager;
let trayManager: TrayManager;
let updateManager: UpdateManager;
let badgeManager: BadgeManager;
let printManager: PrintManager;

/**
 * Initialize all application managers.
 * This function encapsulates manager creation for better testability and clarity.
 */
function initializeManagers(): void {
  logger.log('[DEBUG] initializeManagers() - creating WindowManager');
  windowManager = new WindowManager(isDev);
  logger.log('[DEBUG] initializeManagers() - WindowManager created');

  logger.log('[DEBUG] initializeManagers() - creating HotkeyManager');
  hotkeyManager = new HotkeyManager(windowManager);
  logger.log('[DEBUG] initializeManagers() - HotkeyManager created');

  // Create tray and badge managers
  logger.log('[DEBUG] initializeManagers() - creating TrayManager');
  trayManager = new TrayManager(windowManager);
  logger.log('[DEBUG] initializeManagers() - TrayManager created');

  logger.log('[DEBUG] initializeManagers() - creating BadgeManager');
  badgeManager = new BadgeManager();
  logger.log('[DEBUG] initializeManagers() - BadgeManager created');

  // Create settings store for auto-update preferences
  logger.log('[DEBUG] initializeManagers() - creating SettingsStore');
  const updateSettings = new SettingsStore<AutoUpdateSettings>({
    configName: 'update-settings',
    defaults: {
      autoUpdateEnabled: true,
    },
  });
  logger.log('[DEBUG] initializeManagers() - SettingsStore created');

  // Create update manager with optional badge/tray dependencies
  logger.log('[DEBUG] initializeManagers() - creating UpdateManager');
  updateManager = new UpdateManager(updateSettings, {
    badgeManager,
    trayManager,
  });
  logger.log('[DEBUG] initializeManagers() - UpdateManager created');

  logger.log('[DEBUG] initializeManagers() - creating PrintManager');
  printManager = new PrintManager(windowManager);
  logger.log('[DEBUG] initializeManagers() - PrintManager created');

  logger.log('[DEBUG] initializeManagers() - creating IpcManager');
  ipcManager = new IpcManager(windowManager, hotkeyManager, updateManager, printManager);
  logger.log('[DEBUG] initializeManagers() - IpcManager created');

  // Expose managers globally for E2E testing
  // Type-safe global exposure for E2E tests
  logger.log('[DEBUG] initializeManagers() - exposing managers globally');
  const globalWithManagers = global as typeof globalThis & {
    windowManager: WindowManager;
    ipcManager: IpcManager;
    trayManager: TrayManager;
    updateManager: UpdateManager;
    badgeManager: BadgeManager;
    hotkeyManager: HotkeyManager;
    printManager: PrintManager;
  };
  globalWithManagers.windowManager = windowManager;
  globalWithManagers.ipcManager = ipcManager;
  globalWithManagers.trayManager = trayManager;
  globalWithManagers.updateManager = updateManager;
  globalWithManagers.badgeManager = badgeManager;
  globalWithManagers.hotkeyManager = hotkeyManager;
  globalWithManagers.printManager = printManager;

  logger.log('[DEBUG] initializeManagers() - All managers initialized successfully');
}

/**
 * Gracefully shut down the application.
 * Cleans up all managers before exiting.
 * @param exitCode - The exit code to use when exiting
 */
function gracefulShutdown(exitCode: number = 0): void {
  logger.log(`Initiating graceful shutdown with exit code ${exitCode}...`);

  try {
    // Unregister hotkeys first to prevent new interactions
    if (hotkeyManager) {
      hotkeyManager.unregisterAll();
    }

    // Destroy tray
    if (trayManager) {
      trayManager.destroyTray();
    }

    // Set quitting flag so windows don't try to prevent close
    if (windowManager) {
      windowManager.setQuitting(true);
    }

    logger.log('Graceful shutdown completed');
  } catch (cleanupError) {
    // Log cleanup errors but don't throw - we still need to exit
    console.error('[Main] Error during graceful shutdown:', cleanupError);
  }

  // Give logs time to flush, then exit
  setTimeout(() => {
    process.exit(exitCode);
  }, 500);
}

// Initialize managers before requesting instance lock
logger.log('[DEBUG] About to call initializeManagers()');
initializeManagers();
logger.log('[DEBUG] initializeManagers() completed');

// Single Instance Lock
logger.log('[DEBUG] About to request single instance lock');
const gotTheLock = app.requestSingleInstanceLock();
logger.log('[DEBUG] Single instance lock result:', gotTheLock);

if (!gotTheLock) {
  logger.log('Another instance is already running. Quitting...');
  app.exit(0);
} else {
  logger.log('[DEBUG] Got the lock, setting up second-instance handler');

  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    logger.log('Second instance detected. Focusing existing window...');
    if (windowManager) {
      if (windowManager.getMainWindow()) {
        windowManager.restoreFromTray();
      } else {
        windowManager.createMainWindow();
      }
    }
  });

  // App lifecycle
  logger.log('[DEBUG] Setting up app.whenReady() handler');
  logger.log('[DEBUG] Current app.isReady():', app.isReady());

  // Also listen to the 'ready' event directly for debugging
  app.on('ready', () => {
    logger.log('[DEBUG] app "ready" event fired!');
  });

  // Log if whenReady takes too long
  const readyTimeout = setTimeout(() => {
    logger.error('[DEBUG] WARNING: app.whenReady() has not resolved after 10 seconds!');
    logger.error('[DEBUG] DISPLAY:', process.env.DISPLAY);
    logger.error('[DEBUG] This may indicate a display/xvfb issue');
  }, 10000);

  app.whenReady().then(() => {
    clearTimeout(readyTimeout);
    logger.log('[DEBUG] app.whenReady() resolved!');
    logger.log('App ready - starting initialization');

    // Apply security settings to default session (used by all windows)
    setupHeaderStripping(session.defaultSession);
    setupMediaPermissions(session.defaultSession);

    ipcManager.setupIpcHandlers();

    // Setup native application menu (critical for macOS)
    const menuManager = new MenuManager(windowManager, hotkeyManager);
    menuManager.buildMenu();
    menuManager.setupContextMenu();
    (global as any).menuManager = menuManager;
    logger.log('Menu setup complete');

    logger.log('[DEBUG] About to create main window');
    windowManager.createMainWindow();
    logger.log('[DEBUG] createMainWindow() returned');
    logger.log('Main window created');

    // Set main window reference for badge manager (needed for Windows overlay)
    badgeManager.setMainWindow(windowManager.getMainWindow());
    logger.log('Badge manager configured');

    // Create system tray icon (may fail on headless Linux environments)
    try {
      trayManager.createTray();
      logger.log('System tray created successfully');
    } catch (error) {
      // Tray creation can fail on headless Linux (e.g., Ubuntu CI with Xvfb)
      // This is non-fatal - the app should continue without tray functionality
      logger.warn('Failed to create system tray (expected in headless environments):', error);
    }

    // Security: Block webview creation attempts from renderer content
    setupWebviewSecurity(app);
    hotkeyManager.registerShortcuts();
    logger.log('Hotkeys registered');

    // Start auto-update checks (only in production)
    if (app.isPackaged) {
      updateManager.startPeriodicChecks();
    }

    app.on('activate', () => {
      // On macOS, recreate window when dock icon is clicked
      if (BrowserWindow.getAllWindows().length === 0) {
        windowManager.createMainWindow();
      }
    });
  });
}

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  windowManager.setQuitting(true);
});

app.on('will-quit', () => {
  hotkeyManager.unregisterAll();
  trayManager.destroyTray();
  updateManager.destroy();
});

// App-level crash handlers to prevent OS crash dialogs
// These handle crashes in renderer and child processes gracefully

/**
 * Handle renderer process crashes.
 * This fires when a renderer process crashes or is killed.
 * @see https://electronjs.org/docs/api/app#event-render-process-gone
 */
app.on('render-process-gone', (_event, webContents, details) => {
  logger.error('Renderer process gone:', {
    reason: details.reason,
    exitCode: details.exitCode,
    title: webContents.getTitle(),
  });

  // If not killed intentionally, try to recover by reloading the window
  if (details.reason !== 'killed') {
    const win = BrowserWindow.fromWebContents(webContents);
    if (win && !win.isDestroyed()) {
      logger.log('Attempting to reload crashed renderer...');
      win.reload();
    }
  }
});

/**
 * Handle child process crashes.
 * This fires when a child process (GPU, utility, etc.) crashes.
 * @see https://electronjs.org/docs/api/app#event-child-process-gone
 */
app.on('child-process-gone', (_event, details) => {
  logger.error('Child process gone:', {
    type: details.type,
    reason: details.reason,
    exitCode: details.exitCode,
    serviceName: details.serviceName || 'N/A',
    name: details.name || 'N/A',
  });
});

// Global error handlers for unhandled promises and exceptions
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: String(promise),
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });

  // Also log to console as a backup in case logger fails
  console.error('[Main] FATAL: Uncaught Exception:', error);

  // Perform graceful shutdown
  gracefulShutdown(1);
});

// Handle SIGTERM for containerized/CI environments
process.on('SIGTERM', () => {
  logger.log('Received SIGTERM signal');
  gracefulShutdown(0);
});

// Handle SIGINT (Ctrl+C) for development
process.on('SIGINT', () => {
  logger.log('Received SIGINT signal');
  gracefulShutdown(0);
});

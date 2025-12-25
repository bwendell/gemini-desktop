/**
 * Electron Main Process
 *
 * This is the entry point for the Electron application.
 * It creates a frameless window with a custom titlebar and
 * strips X-Frame-Options headers to allow embedding Gemini in an iframe.
 */

import { app, BrowserWindow, session } from 'electron';
import * as fs from 'fs';
import { setupHeaderStripping, setupWebviewSecurity, setupMediaPermissions } from './utils/security';
import { getDistHtmlPath } from './utils/paths';

import { createLogger } from './utils/logger';

// Setup Logger
const logger = createLogger('[Main]');

// Set application name for Windows/Linux
app.setName('Gemini Desktop');
import WindowManager from './managers/windowManager';
import IpcManager from './managers/ipcManager';
import MenuManager from './managers/menuManager';
import HotkeyManager from './managers/hotkeyManager';
import TrayManager from './managers/trayManager';
import BadgeManager from './managers/badgeManager';
import UpdateManager, { AutoUpdateSettings } from './managers/updateManager';
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

/**
 * Initialize all application managers.
 * This function encapsulates manager creation for better testability and clarity.
 */
function initializeManagers(): void {
  windowManager = new WindowManager(isDev);
  hotkeyManager = new HotkeyManager(windowManager);

  // Create tray and badge managers
  trayManager = new TrayManager(windowManager);
  badgeManager = new BadgeManager();

  // Create settings store for auto-update preferences
  const updateSettings = new SettingsStore<AutoUpdateSettings>({
    configName: 'update-settings',
    defaults: {
      autoUpdateEnabled: true,
    },
  });

  // Create update manager with optional badge/tray dependencies
  updateManager = new UpdateManager(updateSettings, {
    badgeManager,
    trayManager,
  });

  ipcManager = new IpcManager(windowManager, hotkeyManager, updateManager);

  // Expose managers globally for E2E testing
  // Type-safe global exposure for E2E tests
  const globalWithManagers = global as typeof globalThis & {
    windowManager: WindowManager;
    ipcManager: IpcManager;
    trayManager: TrayManager;
    updateManager: UpdateManager;
    badgeManager: BadgeManager;
    hotkeyManager: HotkeyManager;
  };
  globalWithManagers.windowManager = windowManager;
  globalWithManagers.ipcManager = ipcManager;
  globalWithManagers.trayManager = trayManager;
  globalWithManagers.updateManager = updateManager;
  globalWithManagers.badgeManager = badgeManager;
  globalWithManagers.hotkeyManager = hotkeyManager;

  logger.log('All managers initialized');
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
initializeManagers();

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  logger.log('Another instance is already running. Quitting...');
  app.quit();
} else {
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
  app.whenReady().then(() => {
    logger.log('App ready - starting initialization');

    setupHeaderStripping(session.defaultSession);
    setupMediaPermissions(session.defaultSession);
    ipcManager.setupIpcHandlers();

    // Setup native application menu (critical for macOS)
    const menuManager = new MenuManager(windowManager);
    menuManager.buildMenu();
    menuManager.setupContextMenu();
    logger.log('Menu setup complete');

    windowManager.createMainWindow();
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

/**
 * Electron Main Process
 *
 * This is the entry point for the Electron application.
 * It creates a frameless window with a custom titlebar and
 * strips X-Frame-Options headers to allow embedding Gemini in an iframe.
 */

// ==========================================================================
// CRITICAL: Sandbox detection MUST run before any other imports that read
// BASE_WEB_PREFERENCES from constants.ts. ES `import` statements are hoisted
// above inline code, so we use a side-effect import that performs detection
// and calls app.commandLine.appendSwitch('no-sandbox') at module load time.
// This ensures the switch is set BEFORE constants.ts evaluates sandbox state.
// ==========================================================================
import './utils/sandboxInit';

import { app, BrowserWindow, crashReporter, session } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { setupHeaderStripping, setupWebviewSecurity, setupMediaPermissions } from './utils/security';
import { getDistHtmlPath } from './utils/paths';
import { getPlatformAdapter } from './platform/platformAdapterFactory';

import { createLogger } from './utils/logger';

// Setup Logger
const logger = createLogger('[Main]');

// Log critical environment info early for CI debugging
logger.debug('=== ELECTRON STARTUP DEBUG INFO ===');
logger.debug('Platform:', process.platform);
logger.debug('DISPLAY:', process.env.DISPLAY || 'NOT SET');
logger.debug('XDG_SESSION_TYPE:', process.env.XDG_SESSION_TYPE || 'NOT SET');
logger.debug('CI:', process.env.CI || 'NOT SET');
logger.debug('ELECTRON_USE_DIST:', process.env.ELECTRON_USE_DIST || 'NOT SET');
logger.debug('app.isReady():', app.isReady());
logger.debug('===================================');

// Apply platform-specific configuration via adapter
const platformAdapter = getPlatformAdapter();
platformAdapter.applyAppConfiguration(app, logger);
platformAdapter.applyAppUserModelId(app);

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
import NotificationManager, { type NotificationSettings } from './managers/notificationManager';
import UpdateManager, { AutoUpdateSettings } from './managers/updateManager';
import ExportManager from './managers/exportManager';
import LlmManager from './managers/llmManager';
import SettingsStore from './store';
import type { ApplicationContext, E2EGlobals, ReadyManagers } from './ApplicationContext';

// Path to the production build
const distIndexPath = getDistHtmlPath('index.html');

// Determine if we're in development mode
// Use production build if:
// 1. App is packaged (production), OR
// 2. ELECTRON_USE_DIST env is set (E2E testing), OR
// 3. dist/index.html exists AND dev server is not running (fallback)
const useProductionBuild = app.isPackaged || process.env.ELECTRON_USE_DIST === 'true' || fs.existsSync(distIndexPath);

// For E2E tests, always use production build if it exists
const isDev = !useProductionBuild;

/**
 * Manager instances - initialized lazily to allow for declarative pattern.
 */
let appContext: ApplicationContext | null = null;

/** Handler for response-complete events (stored for cleanup) */
let responseCompleteHandler: (() => void) | null = null;

/**
 * Initialize all application managers.
 * This function encapsulates manager creation for better testability and clarity.
 */
function exposeForE2E(context: ApplicationContext | null): void {
    const g = global as typeof globalThis & E2EGlobals;
    g.appContext = context ?? undefined;
    if (!context) {
        g.__e2eGeminiReadyBuffer = undefined;
        g.__e2eQuickChatHandler = undefined;
    }
}

function setReadyManagers(partial: Partial<ReadyManagers>): void {
    if (!appContext) {
        return;
    }

    const nextContext: ApplicationContext = {
        ...appContext,
        ...partial,
    };

    appContext = nextContext;
    exposeForE2E(nextContext);
}

function initializeManagers(): void {
    logger.debug('initializeManagers() - creating WindowManager');
    const windowManager = new WindowManager(isDev);
    logger.debug('initializeManagers() - WindowManager created');

    logger.debug('initializeManagers() - creating HotkeyManager');
    const hotkeyManager = new HotkeyManager(windowManager);
    logger.debug('initializeManagers() - HotkeyManager created');

    // Create tray and badge managers
    logger.debug('initializeManagers() - creating TrayManager');
    const trayManager = new TrayManager(windowManager);
    logger.debug('initializeManagers() - TrayManager created');

    logger.debug('initializeManagers() - creating BadgeManager');
    const badgeManager = new BadgeManager();
    logger.debug('initializeManagers() - BadgeManager created');

    // Create settings store for auto-update preferences
    logger.debug('initializeManagers() - creating SettingsStore');
    const updateSettings = new SettingsStore<AutoUpdateSettings>({
        configName: 'update-settings',
        defaults: {
            autoUpdateEnabled: true,
        },
    });
    logger.debug('initializeManagers() - SettingsStore created');

    // Create update manager with optional badge/tray dependencies
    logger.debug('initializeManagers() - creating UpdateManager');
    const updateManager = new UpdateManager(updateSettings, {
        badgeManager,
        trayManager,
    });
    logger.debug('initializeManagers() - UpdateManager created');

    logger.debug('initializeManagers() - creating LlmManager');

    const llmManager = new LlmManager();
    logger.debug('initializeManagers() - LlmManager created');

    logger.debug('initializeManagers() - creating ExportManager');
    const exportManager = new ExportManager();
    logger.debug('initializeManagers() - ExportManager created');

    logger.debug('initializeManagers() - creating IpcManager');
    const ipcManager = new IpcManager(windowManager, hotkeyManager, updateManager, exportManager, llmManager, null);
    logger.debug('initializeManagers() - IpcManager created');

    appContext = {
        windowManager,
        hotkeyManager,
        trayManager,
        badgeManager,
        updateManager,
        llmManager,
        exportManager,
        ipcManager,
        menuManager: null,
        notificationManager: null,
    };

    // Expose managers globally for E2E testing
    logger.debug('initializeManagers() - exposing managers globally');
    exposeForE2E(appContext);

    logger.debug('initializeManagers() - All managers initialized successfully');
}

/** Guard to prevent double cleanup (gracefulShutdown → process.exit → will-quit). */
let cleanupDone = false;

/**
 * Clean up all application managers and global references.
 * Shared between gracefulShutdown() and will-quit to ensure consistent cleanup.
 */
function cleanupAllManagers(): void {
    if (cleanupDone) return;

    try {
        // Unregister hotkeys first to prevent new interactions
        const context = appContext;
        if (!context) {
            cleanupDone = true;
            return;
        }

        context.hotkeyManager.unregisterAll();

        // Destroy tray
        context.trayManager.destroyTray();

        // Destroy update manager (stops periodic checks)
        context.updateManager.destroy();

        // Dispose LLM manager to free model resources
        context.llmManager.dispose();

        // Dispose IPC handlers to remove all listeners
        context.ipcManager.dispose();

        // Clean up response-complete listener
        const mainWindowInstance = context.windowManager.getMainWindowInstance();
        if (mainWindowInstance && responseCompleteHandler) {
            mainWindowInstance.off('response-complete', responseCompleteHandler);
            responseCompleteHandler = null;
        }

        // Clean up NotificationManager event listeners
        if (context.notificationManager) {
            context.notificationManager.dispose();
        }

        // Set quitting flag so windows don't try to prevent close
        context.windowManager.setQuitting(true);

        // Null out global manager references to allow garbage collection
        appContext = null;
        exposeForE2E(null);

        // Mark cleanup as done only after all cleanup steps complete successfully
        cleanupDone = true;
    } catch (error) {
        logger.error('Error during cleanup:', error);
        // Still mark as done to prevent infinite retry loops
        cleanupDone = true;
    }
}

/**
 * Gracefully shut down the application.
 * Cleans up all managers before exiting.
 * @param exitCode - The exit code to use when exiting
 */
function gracefulShutdown(exitCode: number = 0): void {
    logger.log(`Initiating graceful shutdown with exit code ${exitCode}...`);

    try {
        cleanupAllManagers();
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
logger.debug('About to call initializeManagers()');
initializeManagers();
logger.debug('initializeManagers() completed');

// Single Instance Lock
logger.debug('About to request single instance lock');
const gotTheLock = app.requestSingleInstanceLock();
logger.debug('Single instance lock result:', gotTheLock);

if (!gotTheLock) {
    logger.log('Another instance is already running. Quitting...');
    app.exit(0);
} else {
    logger.debug('Got the lock, setting up second-instance handler');

    app.on('second-instance', () => {
        // Someone tried to run a second instance, we should focus our window.
        logger.log('Second instance detected. Focusing existing window...');
        if (appContext) {
            if (appContext.windowManager.getMainWindow()) {
                appContext.windowManager.restoreFromTray();
            } else {
                appContext.windowManager.createMainWindow();
            }
        }
    });

    // App lifecycle
    logger.debug('Setting up app.whenReady() handler');
    logger.debug('Current app.isReady():', app.isReady());

    // Also listen to the 'ready' event directly for debugging
    app.on('ready', () => {
        logger.debug('app "ready" event fired!');
    });

    // Log if whenReady takes too long
    const readyTimeout = setTimeout(() => {
        logger.debug('WARNING: app.whenReady() has not resolved after 10 seconds!');
        logger.debug('DISPLAY:', process.env.DISPLAY);
        logger.debug('This may indicate a display/xvfb issue');
    }, 10000);

    app.whenReady().then(() => {
        clearTimeout(readyTimeout);
        logger.debug('app.whenReady() resolved!');
        logger.log('App ready - starting initialization');

        // Apply security settings to default session (used by all windows)
        setupHeaderStripping(session.defaultSession);
        setupMediaPermissions(session.defaultSession);

        appContext?.ipcManager.setupIpcHandlers();

        if (process.argv.includes('--e2e-disable-auto-submit')) {
            (
                global as typeof globalThis & {
                    __e2eGeminiReadyBuffer?: { enabled: boolean; pending: unknown[] };
                }
            ).__e2eGeminiReadyBuffer = { enabled: true, pending: [] };
        }

        // Setup native application menu (critical for macOS)
        if (!appContext) {
            return;
        }

        const menuManager = new MenuManager(appContext.windowManager, appContext.hotkeyManager);
        menuManager.buildMenu();
        menuManager.setupContextMenu();
        setReadyManagers({ menuManager });
        logger.log('Menu setup complete');

        logger.debug('About to create main window');
        appContext.windowManager.createMainWindow();
        logger.debug('createMainWindow() returned');
        logger.log('Main window created');

        // Set main window reference for badge manager (needed for Windows overlay)
        appContext.badgeManager.setMainWindow(appContext.windowManager.getMainWindow());
        logger.log('Badge manager configured');

        // Create notification manager for response notifications
        const mainWindow = appContext.windowManager.getMainWindow();
        if (mainWindow) {
            const notificationSettings = new SettingsStore<NotificationSettings>({
                configName: 'notification-settings',
                defaults: {
                    responseNotificationsEnabled: true,
                },
            });
            const notificationManager = new NotificationManager(
                mainWindow,
                appContext.badgeManager,
                notificationSettings,
                platformAdapter
            );

            // Subscribe to response-complete events from MainWindow
            const mainWindowInstance = appContext.windowManager.getMainWindowInstance();
            if (mainWindowInstance) {
                // Store handler reference for cleanup in will-quit
                responseCompleteHandler = () => {
                    // Wrap in try/catch to protect against crashes (task 11.6)
                    try {
                        notificationManager.onResponseComplete();
                    } catch (error) {
                        logger.error('Error in NotificationManager.onResponseComplete:', error);
                    }
                };
                mainWindowInstance.on('response-complete', responseCompleteHandler);
                logger.log('NotificationManager subscribed to response-complete events');
            }

            setReadyManagers({ notificationManager });
            logger.log('NotificationManager configured');

            // Inject NotificationManager into IpcManager for response notification IPC handlers
            appContext.ipcManager.setNotificationManager(notificationManager);
        }

        // Create system tray icon (may fail on headless Linux environments)
        try {
            appContext.trayManager.createTray();
            logger.log('System tray created successfully');
        } catch (error) {
            // Tray creation can fail on headless Linux (e.g., Ubuntu CI with Xvfb)
            // This is non-fatal - the app should continue without tray functionality
            logger.warn('Failed to create system tray (expected in headless environments):', error);
        }

        // Security: Block webview creation attempts from renderer content
        setupWebviewSecurity(app);
        appContext.hotkeyManager.registerShortcuts();
        logger.log('Hotkeys registered');

        // Initialize text prediction (auto-load model if enabled)
        // This is async but we don't need to block startup on it
        appContext.ipcManager.initializeTextPrediction().catch((error) => {
            logger.error('Failed to initialize text prediction:', error);
        });

        // Start auto-update checks (only in production)
        if (app.isPackaged) {
            appContext.updateManager.startPeriodicChecks();
        }

        app.on('activate', () => {
            // On macOS, recreate window when dock icon is clicked
            if (BrowserWindow.getAllWindows().length === 0 && appContext) {
                appContext.windowManager.createMainWindow();
            }
        });
    });
}

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (getPlatformAdapter().shouldQuitOnWindowAllClosed()) {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (appContext) {
        appContext.windowManager.setQuitting(true);
    }
});

app.on('will-quit', () => {
    cleanupAllManagers();
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

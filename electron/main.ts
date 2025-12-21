/**
 * Electron Main Process
 * 
 * This is the entry point for the Electron application.
 * It creates a frameless window with a custom titlebar and
 * strips X-Frame-Options headers to allow embedding Gemini in an iframe.
 */

import { app, BrowserWindow, session } from 'electron';
import * as fs from 'fs';
import { setupHeaderStripping } from './utils/security';
import { getDistHtmlPath } from './utils/paths';

// Set application name for Windows/Linux
app.setName('Gemini Desktop');
import WindowManager from './managers/windowManager';
import IpcManager from './managers/ipcManager';
import MenuManager from './managers/menuManager';
import HotkeyManager from './managers/hotkeyManager';
import TrayManager from './managers/trayManager';


// Path to the production build
const distIndexPath = getDistHtmlPath('index.html');

// Determine if we're in development mode
// Use production build if:
// 1. App is packaged (production), OR
// 2. ELECTRON_USE_DIST env is set (E2E testing), OR  
// 3. dist/index.html exists AND dev server is not running (fallback)
const useProductionBuild = app.isPackaged ||
    process.env.ELECTRON_USE_DIST === 'true' ||
    fs.existsSync(distIndexPath);

// For E2E tests, always use production build if it exists
const isDev = !useProductionBuild;

// Initialize Managers
const windowManager = new WindowManager(isDev);
const hotkeyManager = new HotkeyManager(windowManager);
const ipcManager = new IpcManager(windowManager, hotkeyManager);
const trayManager = new TrayManager(windowManager);

// Expose managers globally for E2E testing
// Using global instead of app to avoid side effects (extra window creation)
(global as any).windowManager = windowManager;
(global as any).ipcManager = ipcManager;
(global as any).trayManager = trayManager;

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        // Someone tried to run a second instance, we should focus our window.
        if (windowManager) {
            windowManager.restoreFromTray();
        }
    });

    // App lifecycle
    app.whenReady().then(() => {
        setupHeaderStripping(session.defaultSession);
        ipcManager.setupIpcHandlers();

        // Setup native application menu (critical for macOS)
        const menuManager = new MenuManager(windowManager);
        menuManager.buildMenu();
        menuManager.setupContextMenu();

        windowManager.createMainWindow();

        // Create system tray icon
        trayManager.createTray();

        // Security: Block webview creation attempts from renderer content
        app.on('web-contents-created', (_, contents) => {
            contents.on('will-attach-webview', (event) => {
                event.preventDefault();
                console.warn('[Security] Blocked webview creation attempt');
            });
        });
        hotkeyManager.registerShortcuts();

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
});

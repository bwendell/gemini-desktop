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
import WindowManager from './managers/windowManager';
import IpcManager from './managers/ipcManager';

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
const ipcManager = new IpcManager(windowManager);

// App lifecycle
app.whenReady().then(() => {
    setupHeaderStripping(session.defaultSession);
    ipcManager.setupIpcHandlers();
    windowManager.createMainWindow();

    app.on('activate', () => {
        // On macOS, recreate window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            windowManager.createMainWindow();
        }
    });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

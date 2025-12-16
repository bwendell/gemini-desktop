/**
 * Electron Main Process
 * 
 * This is the entry point for the Electron application.
 * It creates a frameless window with a custom titlebar and
 * strips X-Frame-Options headers to allow embedding Gemini in an iframe.
 */

const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');

// Determine if we're in development mode
const isDev = !app.isPackaged;

let mainWindow = null;

/**
 * Strip security headers that prevent iframe embedding.
 * This is the key to making custom HTML menus work over external content.
 */
function setupHeaderStripping() {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const responseHeaders = { ...details.responseHeaders };

        // Remove X-Frame-Options header (case-insensitive)
        delete responseHeaders['x-frame-options'];
        delete responseHeaders['X-Frame-Options'];

        // Remove frame-ancestors from CSP if present
        if (responseHeaders['content-security-policy']) {
            responseHeaders['content-security-policy'] = responseHeaders['content-security-policy']
                .map(csp => csp.replace(/frame-ancestors[^;]*(;|$)/gi, ''));
        }
        if (responseHeaders['Content-Security-Policy']) {
            responseHeaders['Content-Security-Policy'] = responseHeaders['Content-Security-Policy']
                .map(csp => csp.replace(/frame-ancestors[^;]*(;|$)/gi, ''));
        }

        callback({ responseHeaders });
    });
}

/**
 * Set up IPC handlers for window controls.
 * Provides minimize, maximize, and close functionality from the renderer.
 */
function setupIpcHandlers() {
    ipcMain.on('window-minimize', () => {
        try {
            if (mainWindow) mainWindow.minimize();
        } catch (error) {
            console.error('Error minimizing window:', error);
        }
    });

    ipcMain.on('window-maximize', () => {
        try {
            if (mainWindow) {
                if (mainWindow.isMaximized()) {
                    mainWindow.unmaximize();
                } else {
                    mainWindow.maximize();
                }
            }
        } catch (error) {
            console.error('Error maximizing window:', error);
        }
    });

    ipcMain.on('window-close', () => {
        try {
            if (mainWindow) mainWindow.close();
        } catch (error) {
            console.error('Error closing window:', error);
        }
    });

    ipcMain.handle('window-is-maximized', () => {
        try {
            return mainWindow ? mainWindow.isMaximized() : false;
        } catch (error) {
            console.error('Error checking window state:', error);
            return false;
        }
    });
}

/**
 * Create the main application window.
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        frame: false, // Frameless for custom titlebar
        titleBarStyle: process.platform === 'darwin' ? 'hidden' : undefined, // Native traffic lights on macOS
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            // Sandbox is enabled by default in recent Electron versions
        },
        backgroundColor: '#1a1a1a',
        show: false, // Don't show until ready
        icon: path.join(__dirname, '../build/icon.png'),
    });

    // Load the app
    if (isDev) {
        mainWindow.loadURL('http://localhost:1420');
        // Open DevTools in development
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App lifecycle
app.whenReady().then(() => {
    setupHeaderStripping();
    setupIpcHandlers();
    createWindow();

    app.on('activate', () => {
        // On macOS, recreate window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

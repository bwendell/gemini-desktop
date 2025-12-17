/**
 * Window Manager for the Electron main process.
 * Handles creation and management of application windows.
 */
const { BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

class WindowManager {
    constructor(isDev) {
        this.isDev = isDev;
        this.mainWindow = null;
        this.optionsWindow = null;
    }

    /**
     * Create the main application window.
     */
    createMainWindow() {
        if (this.mainWindow) {
            this.mainWindow.focus();
            return;
        }

        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            frame: false, // Frameless for custom titlebar
            titleBarStyle: process.platform === 'darwin' ? 'hidden' : undefined,
            webPreferences: {
                preload: path.join(__dirname, '../preload.cjs'),
                contextIsolation: true,
                nodeIntegration: false,
            },
            backgroundColor: '#1a1a1a',
            show: false,
            icon: path.join(__dirname, '../../build/icon.png'),
        });

        const distIndexPath = path.join(__dirname, '../../dist/index.html');

        // Load the app
        if (this.isDev) {
            this.mainWindow.loadURL('http://localhost:1420');
            this.mainWindow.webContents.openDevTools();
        } else {
            this.mainWindow.loadFile(distIndexPath);
        }

        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
        });

        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            if (url.startsWith('http:') || url.startsWith('https:')) {
                shell.openExternal(url);
                return { action: 'deny' };
            }
            return { action: 'allow' };
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
            // Close options window if it exists to ensure app quits
            if (this.optionsWindow) {
                this.optionsWindow.close();
            }
        });

        return this.mainWindow;
    }

    /**
     * Create or focus the options window.
     */
    createOptionsWindow() {
        if (this.optionsWindow) {
            this.optionsWindow.focus();
            return;
        }

        this.optionsWindow = new BrowserWindow({
            width: 600,
            height: 400,
            resizable: true,
            minimizable: true,
            maximizable: false,
            frame: false,
            titleBarStyle: process.platform === 'darwin' ? 'hidden' : undefined,
            webPreferences: {
                preload: path.join(__dirname, '../preload.cjs'),
                contextIsolation: true,
                nodeIntegration: false,
            },
            backgroundColor: '#1a1a1a',
            show: true,
        });

        const distOptionsPath = path.join(__dirname, '../../dist/options.html');

        if (this.isDev) {
            this.optionsWindow.loadURL('http://localhost:1420/options.html');
        } else {
            this.optionsWindow.loadFile(distOptionsPath);
        }

        this.optionsWindow.once('ready-to-show', () => {
            this.optionsWindow.show();
        });

        this.optionsWindow.on('closed', () => {
            this.optionsWindow = null;
        });

        return this.optionsWindow;
    }

    getMainWindow() {
        return this.mainWindow;
    }
}

module.exports = WindowManager;

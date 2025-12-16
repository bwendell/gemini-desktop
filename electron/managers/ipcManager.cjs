/**
 * IPC Manager for the Electron main process.
 * Handles communication between renderer and main process.
 */
const { ipcMain, BrowserWindow } = require('electron');

class IpcManager {
    /**
     * @param {import('./windowManager.cjs')} windowManager 
     */
    constructor(windowManager) {
        this.windowManager = windowManager;
    }

    setupIpcHandlers() {
        // Window Control handlers - FIX: Use event.sender to identify the calling window
        ipcMain.on('window-minimize', (event) => {
            try {
                const win = BrowserWindow.fromWebContents(event.sender);
                if (win) win.minimize();
            } catch (error) {
                console.error('Error minimizing window:', error);
            }
        });

        ipcMain.on('window-maximize', (event) => {
            try {
                const win = BrowserWindow.fromWebContents(event.sender);
                if (win) {
                    if (win.isMaximized()) {
                        win.unmaximize();
                    } else {
                        win.maximize();
                    }
                }
            } catch (error) {
                console.error('Error maximizing window:', error);
            }
        });

        ipcMain.on('window-close', (event) => {
            try {
                const win = BrowserWindow.fromWebContents(event.sender);
                if (win) win.close();
            } catch (error) {
                console.error('Error closing window:', error);
            }
        });

        ipcMain.handle('window-is-maximized', (event) => {
            try {
                const win = BrowserWindow.fromWebContents(event.sender);
                return win ? win.isMaximized() : false;
            } catch (error) {
                console.error('Error checking window state:', error);
                return false;
            }
        });

        // App specific handlers
        ipcMain.on('open-options-window', () => {
            this.windowManager.createOptionsWindow();
        });
    }
}

module.exports = IpcManager;

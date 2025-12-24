/**
 * Window Manager for the Electron main process.
 * Facade/coordinator for all application windows.
 *
 * This class delegates window-specific logic to dedicated window classes
 * and provides a unified interface for window management.
 *
 * @module WindowManager
 */

import { BrowserWindow } from 'electron';
import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger';
import MainWindow from '../windows/mainWindow';
import AuthWindow from '../windows/authWindow';
import OptionsWindow from '../windows/optionsWindow';
import QuickChatWindow from '../windows/quickChatWindow';
import SettingsStore from '../store';
import { WindowState } from '../types';

const logger = createLogger('[WindowManager]');

export default class WindowManager extends EventEmitter {
    readonly isDev: boolean;
    private mainWindow: MainWindow;
    private optionsWindow: OptionsWindow;
    private authWindow: AuthWindow;
    private quickChatWindow: QuickChatWindow;
    private windowStateStore: SettingsStore<WindowState>;

    /**
     * Creates a new WindowManager instance.
     * @param isDev - Whether running in development mode
     * @param windowStateStore - Store for persisting window state
     */
    constructor(isDev: boolean, windowStateStore: SettingsStore<WindowState>) {
        super();
        this.isDev = isDev;
        this.windowStateStore = windowStateStore;

        // Initialize window instances
        this.mainWindow = new MainWindow(isDev, this.windowStateStore);
        this.optionsWindow = new OptionsWindow(isDev);
        this.authWindow = new AuthWindow(isDev);
        this.quickChatWindow = new QuickChatWindow(isDev);

        // Wire up callbacks between windows
        this.mainWindow.setAuthWindowCallback((url) => this.createAuthWindow(url));
        this.mainWindow.setCloseOptionsCallback(() => this.optionsWindow.close());
        this.mainWindow.setCloseAuthCallback(() => this.authWindow.close());

        // Forward always-on-top events from MainWindow
        this.mainWindow.on('always-on-top-changed', (enabled: boolean) => {
            this.emit('always-on-top-changed', enabled);
        });
    }

    /**
     * Create an authentication window for Google sign-in.
     * @param url - The URL to load in the auth window
     * @returns The created auth window
     */
    createAuthWindow(url: string): BrowserWindow {
        try {
            return this.authWindow.create(url);
        } catch (error) {
            logger.error('Failed to create auth window:', error);
            throw error; // Re-throw as auth is critical for sign-in
        }
    }

    /**
     * Create the main application window.
     * @returns The main window
     */
    createMainWindow(): BrowserWindow {
        try {
            return this.mainWindow.create();
        } catch (error) {
            logger.error('CRITICAL: Failed to create main window:', error);
            throw error; // Re-throw as main window is essential
        }
    }

    /**
     * Create or focus the options window.
     * @param tab - Optional tab to open ('settings' or 'about')
     * @returns The options window
     */
    createOptionsWindow(tab?: 'settings' | 'about'): BrowserWindow {
        try {
            return this.optionsWindow.create(tab);
        } catch (error) {
            logger.error('Failed to create options window:', error);
            throw error;
        }
    }

    /**
     * Get the main window instance.
     * @returns The main window or null
     */
    getMainWindow(): BrowserWindow | null {
        return this.mainWindow.getWindow();
    }

    /**
     * Minimize the main window.
     */
    minimizeMainWindow(): void {
        this.mainWindow.minimize();
    }

    /**
     * Hide the main window to tray.
     */
    hideToTray(): void {
        this.mainWindow.hideToTray();
    }

    /**
     * Restore the main window from tray.
     */
    restoreFromTray(): void {
        this.mainWindow.restoreFromTray();
    }

    /**
     * Create the Quick Chat floating window.
     * @returns The Quick Chat window
     */
    createQuickChatWindow(): BrowserWindow {
        try {
            return this.quickChatWindow.create();
        } catch (error) {
            logger.error('Failed to create Quick Chat window:', error);
            throw error;
        }
    }

    /**
     * Show and focus the Quick Chat window.
     */
    showQuickChat(): void {
        this.quickChatWindow.showAndFocus();
    }

    /**
     * Hide the Quick Chat window.
     */
    hideQuickChat(): void {
        this.quickChatWindow.hide();
    }

    /**
     * Toggle Quick Chat window visibility.
     */
    toggleQuickChat(): void {
        this.quickChatWindow.toggle();
    }

    /**
     * Get the Quick Chat window instance.
     * @returns The Quick Chat window or null
     */
    getQuickChatWindow(): BrowserWindow | null {
        return this.quickChatWindow.getWindow();
    }

    /**
     * Focus the main window and bring to front.
     */
    focusMainWindow(): void {
        this.mainWindow.show();
        this.mainWindow.focus();
        logger.log('Main window focused');
    }

    /**
     * Set the quitting state.
     * @param state - Whether the app is quitting
     */
    setQuitting(state: boolean): void {
        this.mainWindow.setQuitting(state);
    }

    /**
     * Set the always-on-top state for the main window.
     * @param enabled - Whether to enable always-on-top
     */
    setAlwaysOnTop(enabled: boolean): void {
        this.mainWindow.setAlwaysOnTop(enabled);
    }

    /**
     * Get the current always-on-top state.
     * @returns True if always-on-top is enabled
     */
    isAlwaysOnTop(): boolean {
        return this.mainWindow.isAlwaysOnTop();
    }

    /**
     * Force save of window state.
     * Called during graceful shutdown.
     */
    saveState(): void {
        this.mainWindow.saveState(true);
    }
}

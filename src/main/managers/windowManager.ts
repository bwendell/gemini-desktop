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

const logger = createLogger('[WindowManager]');

/**
 * Standard zoom level steps matching Chrome/Firefox behavior.
 * Range: 50% to 200% inclusive.
 */
export const ZOOM_LEVEL_STEPS = [50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200] as const;

export default class WindowManager extends EventEmitter {
    readonly isDev: boolean;
    private mainWindow: MainWindow;
    private optionsWindow: OptionsWindow;
    private authWindow: AuthWindow;
    private quickChatWindow: QuickChatWindow;
    private _zoomLevel: number = 100;

    /**
     * Creates a new WindowManager instance.
     * @param isDev - Whether running in development mode
     */
    constructor(isDev: boolean) {
        super();
        this.isDev = isDev;

        // Initialize window instances
        this.mainWindow = new MainWindow(isDev);
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
        logger.log('[DEBUG] createMainWindow() called');
        try {
            logger.log('[DEBUG] About to call mainWindow.create()');
            const win = this.mainWindow.create();
            logger.log('[DEBUG] mainWindow.create() returned, window:', win ? 'exists' : 'null');
            return win;
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
     * Get the current zoom level percentage.
     * @returns The zoom level as a percentage (e.g., 100 for 100%)
     */
    getZoomLevel(): number {
        return this._zoomLevel;
    }

    /**
     * Validate and sanitize a zoom level value.
     * Returns the closest valid zoom step if the value is invalid or out of range.
     * @param level - The zoom level to validate (percentage)
     * @returns A valid zoom level percentage
     */
    private _sanitizeZoomLevel(level: unknown): number {
        // Handle invalid types
        if (typeof level !== 'number' || isNaN(level) || !isFinite(level)) {
            return 100; // Default to 100%
        }

        // Clamp to valid range
        const minZoom = ZOOM_LEVEL_STEPS[0];
        const maxZoom = ZOOM_LEVEL_STEPS[ZOOM_LEVEL_STEPS.length - 1];
        if (level <= minZoom) return minZoom;
        if (level >= maxZoom) return maxZoom;

        // Find the nearest valid step
        return this._findNearestZoomStep(level);
    }

    /**
     * Find the nearest valid zoom step for a given level.
     * @param level - The zoom level to find nearest step for
     * @returns The nearest valid zoom step
     */
    private _findNearestZoomStep(level: number): number {
        let nearestStep: number = ZOOM_LEVEL_STEPS[0];
        let minDistance = Math.abs(level - nearestStep);

        for (const step of ZOOM_LEVEL_STEPS) {
            const distance = Math.abs(level - step);
            if (distance < minDistance) {
                minDistance = distance;
                nearestStep = step;
            }
        }

        return nearestStep;
    }

    /**
     * Apply the current zoom level to the main window's webContents.
     * Silently returns if window is unavailable.
     * @private
     */
    private _applyZoomToWindow(): void {
        const win = this.getMainWindow();
        if (!win || win.isDestroyed()) {
            logger.warn('Cannot apply zoom: main window unavailable');
            return;
        }

        try {
            // WebContents.setZoomFactor uses a multiplier (1.0 = 100%)
            const zoomFactor = this._zoomLevel / 100;
            win.webContents.setZoomFactor(zoomFactor);
            logger.log(`Zoom applied: ${this._zoomLevel}% (factor: ${zoomFactor})`);
        } catch (error) {
            logger.error('Failed to apply zoom to window:', error);
        }
    }

    /**
     * Set the zoom level for the main window.
     * Validates the level and persists/broadcasts the change.
     * @param level - The zoom level percentage (50-200)
     */
    setZoomLevel(level: number): void {
        const sanitizedLevel = this._sanitizeZoomLevel(level);

        // Avoid unnecessary updates
        if (sanitizedLevel === this._zoomLevel) {
            return;
        }

        this._zoomLevel = sanitizedLevel;
        this._applyZoomToWindow();
        this.emit('zoom-level-changed', sanitizedLevel);
        logger.log(`Zoom level set to: ${sanitizedLevel}%`);
    }

    /**
     * Zoom in to the next zoom step.
     * Capped at 200%.
     */
    zoomIn(): void {
        const steps = ZOOM_LEVEL_STEPS as readonly number[];
        const currentIndex = steps.indexOf(this._zoomLevel);

        if (currentIndex === -1) {
            // Current zoom is not a standard step, snap to next higher step
            const nextStep = ZOOM_LEVEL_STEPS.find((step) => step > this._zoomLevel);
            if (nextStep !== undefined) {
                this.setZoomLevel(nextStep);
            } else {
                // Already at or above max, set to max
                this.setZoomLevel(ZOOM_LEVEL_STEPS[ZOOM_LEVEL_STEPS.length - 1]);
            }
        } else if (currentIndex < ZOOM_LEVEL_STEPS.length - 1) {
            // Move to next step
            this.setZoomLevel(ZOOM_LEVEL_STEPS[currentIndex + 1]);
        }
        // else: already at max, do nothing
    }

    /**
     * Zoom out to the previous zoom step.
     * Capped at 50%.
     */
    zoomOut(): void {
        const steps = ZOOM_LEVEL_STEPS as readonly number[];
        const currentIndex = steps.indexOf(this._zoomLevel);

        if (currentIndex === -1) {
            // Current zoom is not a standard step, snap to next lower step
            const reversedSteps = [...ZOOM_LEVEL_STEPS].reverse();
            const nextStep = reversedSteps.find((step) => step < this._zoomLevel);
            if (nextStep !== undefined) {
                this.setZoomLevel(nextStep);
            } else {
                // Already at or below min, set to min
                this.setZoomLevel(ZOOM_LEVEL_STEPS[0]);
            }
        } else if (currentIndex > 0) {
            // Move to previous step
            this.setZoomLevel(ZOOM_LEVEL_STEPS[currentIndex - 1]);
        }
        // else: already at min, do nothing
    }

    /**
     * Initialize zoom level from a stored value.
     * Called during app initialization to restore persisted zoom.
     * @param level - The stored zoom level (may be invalid)
     */
    initializeZoomLevel(level: unknown): void {
        this._zoomLevel = this._sanitizeZoomLevel(level);
        logger.log(`Zoom level initialized to: ${this._zoomLevel}%`);
    }

    /**
     * Apply the current zoom level to the main window.
     * Called after main window is created to restore persisted zoom.
     */
    applyZoomLevel(): void {
        this._applyZoomToWindow();
    }
}

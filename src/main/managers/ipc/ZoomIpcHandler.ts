/**
 * Zoom IPC Handler.
 *
 * Handles IPC channels for zoom level management:
 * - zoom:get-level - Returns current zoom level from windowManager
 * - zoom:zoom-in - Increases zoom level
 * - zoom:zoom-out - Decreases zoom level
 *
 * Also subscribes to windowManager zoom-level-changed events for
 * persistence and broadcasting to all windows.
 *
 * @module ipc/ZoomIpcHandler
 */

import { ipcMain } from 'electron';
import { BaseIpcHandler } from './BaseIpcHandler';
import { IPC_CHANNELS } from '../../utils/constants';

/**
 * Handler for zoom-related IPC channels.
 *
 * Manages zoom level persistence, windowManager delegation, and broadcasting
 * zoom level changes to all windows.
 */
export class ZoomIpcHandler extends BaseIpcHandler {
    /**
     * Register zoom IPC handlers with ipcMain.
     */
    register(): void {
        // Get current zoom level
        ipcMain.handle(IPC_CHANNELS.ZOOM_GET_LEVEL, (): number => {
            return this._handleGetZoomLevel();
        });

        // Zoom in
        ipcMain.handle(IPC_CHANNELS.ZOOM_IN, (): number => {
            return this._handleZoomIn();
        });

        // Zoom out
        ipcMain.handle(IPC_CHANNELS.ZOOM_OUT, (): number => {
            return this._handleZoomOut();
        });

        // Subscribe to windowManager zoom level changes
        this.deps.windowManager.on('zoom-level-changed', (level: number) => {
            this._handleZoomLevelChanged(level);
        });
    }

    /**
     * Initialize zoom level from stored preference.
     * Called during handler initialization.
     */
    initialize(): void {
        try {
            const savedZoomLevel = this.deps.store.get('zoomLevel');
            this.deps.windowManager.initializeZoomLevel(savedZoomLevel);
            // Apply zoom after a short delay to ensure window is fully ready
            setTimeout(() => {
                this.deps.windowManager.applyZoomLevel();
            }, 100);
            this.logger.log('Zoom level initialized');
        } catch (error) {
            this.handleError('initializing zoom level', error);
        }
    }

    /**
     * Handle zoom:get-level request.
     * @returns Current zoom level percentage
     */
    private _handleGetZoomLevel(): number {
        try {
            return this.deps.windowManager.getZoomLevel();
        } catch (error) {
            this.logger.error('Error getting zoom level:', error);
            return 100; // Default
        }
    }

    /**
     * Handle zoom:zoom-in request.
     * @returns New zoom level after zooming in
     */
    private _handleZoomIn(): number {
        try {
            this.deps.windowManager.zoomIn();
            return this.deps.windowManager.getZoomLevel();
        } catch (error) {
            this.logger.error('Error zooming in:', error);
            return this.deps.windowManager.getZoomLevel();
        }
    }

    /**
     * Handle zoom:zoom-out request.
     * @returns New zoom level after zooming out
     */
    private _handleZoomOut(): number {
        try {
            this.deps.windowManager.zoomOut();
            return this.deps.windowManager.getZoomLevel();
        } catch (error) {
            this.logger.error('Error zooming out:', error);
            return this.deps.windowManager.getZoomLevel();
        }
    }

    /**
     * Handle zoom level changes from WindowManager.
     * Persists the zoom level to store and broadcasts to all windows.
     * @param level - New zoom level percentage
     */
    private _handleZoomLevelChanged(level: number): void {
        try {
            // Persist preference
            this.deps.store.set('zoomLevel', level);

            // Broadcast to all windows
            this.broadcastToAllWindows(IPC_CHANNELS.ZOOM_LEVEL_CHANGED, level);

            this.logger.log(`Zoom level changed to: ${level}% (persisted and broadcast)`);
        } catch (error) {
            this.logger.error('Error handling zoom level change:', {
                error: (error as Error).message,
                level,
            });
        }
    }
}

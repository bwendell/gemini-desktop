/**
 * Always On Top IPC Handler.
 *
 * Handles IPC channels for always-on-top management:
 * - always-on-top:get - Returns current always-on-top state from store
 * - always-on-top:set - Sets the always-on-top state
 *
 * Also subscribes to windowManager always-on-top-changed events for
 * persistence and broadcasting to all windows.
 *
 * @module ipc/AlwaysOnTopIpcHandler
 */

import { ipcMain } from 'electron';
import { BaseIpcHandler } from './BaseIpcHandler';
import { IPC_CHANNELS } from '../../utils/constants';

/**
 * Handler for always-on-top-related IPC channels.
 *
 * Manages always-on-top persistence, windowManager delegation, and broadcasting
 * state changes to all windows.
 */
export class AlwaysOnTopIpcHandler extends BaseIpcHandler {
    /**
     * Register always-on-top IPC handlers with ipcMain.
     */
    register(): void {
        // Get current always-on-top state
        ipcMain.handle(IPC_CHANNELS.ALWAYS_ON_TOP_GET, (): { enabled: boolean } => {
            return this._handleGetAlwaysOnTop();
        });

        // Set always-on-top state
        ipcMain.on(IPC_CHANNELS.ALWAYS_ON_TOP_SET, (_event, enabled: boolean) => {
            this._handleSetAlwaysOnTop(enabled);
        });

        // Subscribe to windowManager always-on-top changes
        this.deps.windowManager.on('always-on-top-changed', (enabled: boolean) => {
            this._handleAlwaysOnTopChanged(enabled);
        });
    }

    /**
     * Initialize always-on-top state from stored preference.
     * Called during handler initialization.
     */
    initialize(): void {
        try {
            const savedEnabled = this.deps.store.get('alwaysOnTop') ?? false;
            if (savedEnabled) {
                this.deps.windowManager.setAlwaysOnTop(savedEnabled);
            }
            this.logger.log(`Always on top initialized to: ${savedEnabled}`);
        } catch (error) {
            this.handleError('initializing always on top', error);
        }
    }

    /**
     * Handle always-on-top:get request.
     * @returns Current always-on-top state
     */
    private _handleGetAlwaysOnTop(): { enabled: boolean } {
        try {
            const enabled = this.deps.store.get('alwaysOnTop') ?? false;
            return { enabled };
        } catch (error) {
            this.logger.error('Error getting always on top state:', error);
            return { enabled: false };
        }
    }

    /**
     * Handle always-on-top:set request.
     * @param enabled - The always-on-top state to set
     */
    private _handleSetAlwaysOnTop(enabled: boolean): void {
        try {
            // Validate enabled value
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid alwaysOnTop value: ${enabled}`);
                return;
            }

            // Update WindowManager - this will emit 'always-on-top-changed'
            // which this handler listens to for persistence and broadcasting
            this.deps.windowManager.setAlwaysOnTop(enabled);

            this.logger.log(`Always on top requested: ${enabled}`);
        } catch (error) {
            this.logger.error('Error setting always on top:', {
                error: (error as Error).message,
                requestedEnabled: enabled,
            });
        }
    }

    /**
     * Handle always-on-top state changes from WindowManager.
     * Persists the state and broadcasts to all windows.
     * @param enabled - New always-on-top state
     */
    private _handleAlwaysOnTopChanged(enabled: boolean): void {
        try {
            // Persist preference
            this.deps.store.set('alwaysOnTop', enabled);

            this.logger.log(`Always on top changed to: ${enabled} (persisted and broadcasting)`);

            // Broadcast to all windows
            this.broadcastToAllWindows(IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED, { enabled });
        } catch (error) {
            this.logger.error('Error handling always on top change:', {
                error: (error as Error).message,
                enabled,
            });
        }
    }
}

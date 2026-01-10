/**
 * Response Notification IPC Handler.
 *
 * Handles IPC channels for response notification settings:
 * - response-notifications:get-enabled - Returns whether notifications are enabled
 * - response-notifications:set-enabled - Sets the notification enabled state
 *
 * @module ipc/ResponseNotificationIpcHandler
 */

import { ipcMain } from 'electron';
import { BaseIpcHandler } from './BaseIpcHandler';
import { IPC_CHANNELS } from '../../utils/constants';
import type NotificationManager from '../notificationManager';

/**
 * Handler for response notification IPC channels.
 *
 * Manages notification settings persistence and NotificationManager synchronization.
 */
export class ResponseNotificationIpcHandler extends BaseIpcHandler {
    /** NotificationManager for managing notification state (can be set after construction) */
    private notificationManager: NotificationManager | null;

    /**
     * Creates a new ResponseNotificationIpcHandler instance.
     * @param deps - Handler dependencies including notificationManager
     */
    constructor(
        deps: ConstructorParameters<typeof BaseIpcHandler>[0] & { notificationManager?: NotificationManager | null }
    ) {
        super(deps);
        this.notificationManager = deps.notificationManager ?? null;
    }

    /**
     * Set the NotificationManager instance.
     * This is used for late injection when NotificationManager is created after IpcManager.
     * @param manager - The NotificationManager instance to use
     */
    setNotificationManager(manager: NotificationManager | null): void {
        this.notificationManager = manager;
        this.logger.log(`NotificationManager ${manager ? 'set' : 'cleared'}`);
    }

    /**
     * Register response notification IPC handlers with ipcMain.
     */
    register(): void {
        // Get whether response notifications are enabled
        ipcMain.handle(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED, (): boolean => {
            return this._handleGetEnabled();
        });

        // Set response notification enabled state
        ipcMain.on(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED, (_event, enabled: boolean) => {
            this._handleSetEnabled(enabled);
        });

        // Dev Testing: Trigger response notification (for manual testing with main window unfocused)
        ipcMain.on(IPC_CHANNELS.DEV_TEST_TRIGGER_RESPONSE_NOTIFICATION, () => {
            this._handleDevTriggerNotification();
        });
    }

    /**
     * Handle response-notifications:get-enabled request.
     * @returns Whether response notifications are enabled
     */
    private _handleGetEnabled(): boolean {
        try {
            if (!this.notificationManager) {
                this.logger.warn('NotificationManager not available');
                return true; // Default to enabled
            }
            return this.notificationManager.isEnabled();
        } catch (error) {
            this.logger.error('Error getting response notifications enabled:', error);
            return true; // Default to enabled
        }
    }

    /**
     * Handle response-notifications:set-enabled request.
     * @param enabled - Whether to enable response notifications
     */
    private _handleSetEnabled(enabled: boolean): void {
        try {
            // Validate input type
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid enabled value: ${enabled}`);
                return;
            }

            if (!this.notificationManager) {
                this.logger.warn('NotificationManager not available');
                return;
            }

            // Update NotificationManager (which also persists to store)
            this.notificationManager.setEnabled(enabled);

            this.logger.log(`Response notifications ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            this.logger.error('Error setting response notifications enabled:', {
                error: (error as Error).message,
                requestedEnabled: enabled,
            });
        }
    }

    /**
     * Handle dev:test:trigger-response-notification request.
     * Manually trigger a response notification for development testing.
     * Call this from Options window DevTools to test notification with main window unfocused.
     */
    private _handleDevTriggerNotification(): void {
        try {
            if (!this.notificationManager) {
                this.logger.warn('NotificationManager not available for dev trigger');
                return;
            }

            this.logger.log('DEV: Manually triggering response notification');
            this.notificationManager.onResponseComplete();
        } catch (error) {
            this.logger.error('Error triggering dev response notification:', error);
        }
    }
}

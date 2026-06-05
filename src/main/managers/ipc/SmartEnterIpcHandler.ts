/**
 * Smart Enter and Chat Scroll IPC Handler.
 *
 * Handles IPC channels for smart enter and scroll-to-bottom button preferences:
 * - smart-enter:get-enabled - Returns whether Smart Enter is enabled
 * - smart-enter:set-enabled - Sets the Smart Enter enabled state
 * - scroll-to-bottom:get-enabled - Returns whether Scroll-to-Bottom button is enabled
 * - scroll-to-bottom:set-enabled - Sets the Scroll-to-Bottom button enabled state
 *
 * @module ipc/SmartEnterIpcHandler
 */

import { ipcMain } from 'electron';
import { BaseIpcHandler } from './BaseIpcHandler';
import { IPC_CHANNELS } from '../../utils/constants';

export class SmartEnterIpcHandler extends BaseIpcHandler {
    /**
     * Register Smart Enter and Scroll-to-Bottom IPC handlers with ipcMain.
     */
    register(): void {
        // Smart Enter
        ipcMain.handle(IPC_CHANNELS.SMART_ENTER_GET_ENABLED, (): boolean => {
            return this._handleGetSmartEnterEnabled();
        });

        ipcMain.on(IPC_CHANNELS.SMART_ENTER_SET_ENABLED, (_event, enabled: boolean) => {
            this._handleSetSmartEnterEnabled(enabled);
        });

        // Scroll to Bottom
        ipcMain.handle(IPC_CHANNELS.SCROLL_TO_BOTTOM_GET_ENABLED, (): boolean => {
            return this._handleGetScrollToBottomEnabled();
        });

        ipcMain.on(IPC_CHANNELS.SCROLL_TO_BOTTOM_SET_ENABLED, (_event, enabled: boolean) => {
            this._handleSetScrollToBottomEnabled(enabled);
        });
    }

    /**
     * Handle smart-enter:get-enabled request.
     * @returns Whether Smart Enter is enabled
     */
    private _handleGetSmartEnterEnabled(): boolean {
        try {
            return this.deps.store.get('smartEnterEnabled') !== false;
        } catch (error) {
            this.logger.error('Error getting smartEnterEnabled:', error);
            return true; // Default to enabled
        }
    }

    /**
     * Handle smart-enter:set-enabled request.
     * @param enabled - Whether to enable Smart Enter
     */
    private _handleSetSmartEnterEnabled(enabled: boolean): void {
        try {
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid smartEnterEnabled value: ${enabled}`);
                return;
            }
            this.deps.store.set('smartEnterEnabled', enabled);
            this.logger.log(`Smart Enter set to: ${enabled}`);
        } catch (error) {
            this.logger.error('Error setting smartEnterEnabled:', error);
        }
    }

    /**
     * Handle scroll-to-bottom:get-enabled request.
     * @returns Whether Scroll-to-Bottom button is enabled
     */
    private _handleGetScrollToBottomEnabled(): boolean {
        try {
            return this.deps.store.get('scrollToBottomButtonEnabled') !== false;
        } catch (error) {
            this.logger.error('Error getting scrollToBottomButtonEnabled:', error);
            return true; // Default to enabled
        }
    }

    /**
     * Handle scroll-to-bottom:set-enabled request.
     * @param enabled - Whether to enable Scroll-to-Bottom button
     */
    private _handleSetScrollToBottomEnabled(enabled: boolean): void {
        try {
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid scrollToBottomButtonEnabled value: ${enabled}`);
                return;
            }
            this.deps.store.set('scrollToBottomButtonEnabled', enabled);
            this.logger.log(`Scroll-to-Bottom button set to: ${enabled}`);
        } catch (error) {
            this.logger.error('Error setting scrollToBottomButtonEnabled:', error);
        }
    }

    /**
     * Unregister all IPC handlers.
     */
    unregister(): void {
        ipcMain.removeHandler(IPC_CHANNELS.SMART_ENTER_GET_ENABLED);
        ipcMain.removeAllListeners(IPC_CHANNELS.SMART_ENTER_SET_ENABLED);
        ipcMain.removeHandler(IPC_CHANNELS.SCROLL_TO_BOTTOM_GET_ENABLED);
        ipcMain.removeAllListeners(IPC_CHANNELS.SCROLL_TO_BOTTOM_SET_ENABLED);
    }
}

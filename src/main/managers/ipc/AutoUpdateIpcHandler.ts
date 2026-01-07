/**
 * Auto-Update IPC Handler.
 *
 * Handles IPC channels for auto-update operations:
 * - auto-update:get-enabled - Get enabled state
 * - auto-update:set-enabled - Set enabled state with validation
 * - auto-update:check - Trigger manual update check
 * - auto-update:get-last-check - Get last check timestamp
 * - auto-update:install - Install downloaded update
 * - dev:test:* channels - Development testing utilities
 * - tray:get-tooltip - Get tray tooltip text
 *
 * @module ipc/AutoUpdateIpcHandler
 */

import { ipcMain } from 'electron';
import { BaseIpcHandler } from './BaseIpcHandler';
import { IPC_CHANNELS } from '../../utils/constants';

/**
 * Handler for auto-update related IPC channels.
 *
 * Manages auto-update settings, triggers update actions,
 * and provides dev testing utilities.
 */
export class AutoUpdateIpcHandler extends BaseIpcHandler {
    /**
     * Register auto-update IPC handlers with ipcMain.
     */
    register(): void {
        // Get auto-update enabled state
        ipcMain.handle(IPC_CHANNELS.AUTO_UPDATE_GET_ENABLED, (): boolean => {
            return this._handleGetEnabled();
        });

        // Set auto-update enabled state
        ipcMain.on(IPC_CHANNELS.AUTO_UPDATE_SET_ENABLED, (_event, enabled: boolean) => {
            this._handleSetEnabled(enabled);
        });

        // Trigger manual update check
        ipcMain.on(IPC_CHANNELS.AUTO_UPDATE_CHECK, () => {
            this._handleCheck();
        });

        // Get last update check time
        ipcMain.handle(IPC_CHANNELS.AUTO_UPDATE_GET_LAST_CHECK, () => {
            return this._handleGetLastCheck();
        });

        // Install downloaded update
        ipcMain.on(IPC_CHANNELS.AUTO_UPDATE_INSTALL, () => {
            this._handleInstall();
        });

        // Dev Testing: Show badge
        ipcMain.on(IPC_CHANNELS.DEV_TEST_SHOW_BADGE, (_event, version?: string) => {
            this._handleDevShowBadge(version);
        });

        // Dev Testing: Clear badge
        ipcMain.on(IPC_CHANNELS.DEV_TEST_CLEAR_BADGE, () => {
            this._handleDevClearBadge();
        });

        // Dev Testing: Set Update Enabled
        ipcMain.on(IPC_CHANNELS.DEV_TEST_SET_UPDATE_ENABLED, (_event, enabled: boolean) => {
            this._handleDevSetUpdateEnabled(enabled);
        });

        // Dev Testing: Emit Update Event
        ipcMain.on(IPC_CHANNELS.DEV_TEST_EMIT_UPDATE_EVENT, (_event, eventName: string, data: unknown) => {
            this._handleDevEmitUpdateEvent(eventName, data);
        });

        // Dev Testing: Mock Platform/Env
        ipcMain.on(
            IPC_CHANNELS.DEV_TEST_MOCK_PLATFORM,
            (_event, platform: NodeJS.Platform | null, env: Record<string, string> | null) => {
                this._handleDevMockPlatform(platform, env);
            }
        );

        // Get tray tooltip
        ipcMain.handle(IPC_CHANNELS.TRAY_GET_TOOLTIP, () => {
            return this._handleGetTrayTooltip();
        });
    }

    /**
     * Handle auto-update:get-enabled request.
     * @returns Current enabled state
     */
    private _handleGetEnabled(): boolean {
        try {
            if (this.deps.updateManager) {
                return this.deps.updateManager.isEnabled();
            }
            return this.deps.store.get('autoUpdateEnabled') ?? true;
        } catch (error) {
            this.handleError('getting auto-update state', error);
            return true;
        }
    }

    /**
     * Handle auto-update:set-enabled request.
     * @param enabled - New enabled state
     */
    private _handleSetEnabled(enabled: boolean): void {
        try {
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid autoUpdateEnabled value: ${enabled}`);
                return;
            }

            // Always persist to store for consistency
            this.deps.store.set('autoUpdateEnabled', enabled);

            // Also update UpdateManager if available
            if (this.deps.updateManager) {
                this.deps.updateManager.setEnabled(enabled);
            }

            this.logger.log(`Auto-update set to: ${enabled}`);
        } catch (error) {
            this.handleError('setting auto-update state', error, { enabled });
        }
    }

    /**
     * Handle auto-update:check request.
     */
    private _handleCheck(): void {
        try {
            if (this.deps.updateManager) {
                this.deps.updateManager.checkForUpdates(true); // manual=true
            }
        } catch (error) {
            this.handleError('checking for updates', error);
        }
    }

    /**
     * Handle auto-update:get-last-check request.
     * @returns Last check timestamp or 0
     */
    private _handleGetLastCheck(): number {
        if (this.deps.updateManager) {
            return (this.deps.updateManager as any).getLastCheckTime?.() || 0;
        }
        return 0;
    }

    /**
     * Handle auto-update:install request.
     */
    private _handleInstall(): void {
        try {
            if (this.deps.updateManager) {
                this.deps.updateManager.quitAndInstall();
            }
        } catch (error) {
            this.handleError('installing update', error);
        }
    }

    /**
     * Handle dev:test:show-badge request.
     * @param version - Optional version to display
     */
    private _handleDevShowBadge(version?: string): void {
        try {
            if (this.deps.updateManager) {
                this.deps.updateManager.devShowBadge(version);
            }
        } catch (error) {
            this.handleError('showing dev test badge', error);
        }
    }

    /**
     * Handle dev:test:clear-badge request.
     */
    private _handleDevClearBadge(): void {
        try {
            if (this.deps.updateManager) {
                this.deps.updateManager.devClearBadge();
            }
        } catch (error) {
            this.handleError('clearing dev test badge', error);
        }
    }

    /**
     * Handle dev:test:set-update-enabled request.
     * @param enabled - New enabled state
     */
    private _handleDevSetUpdateEnabled(enabled: boolean): void {
        if (this.deps.updateManager) {
            this.deps.updateManager.setEnabled(enabled);
        }
    }

    /**
     * Handle dev:test:emit-update-event request.
     * @param eventName - Event name to emit
     * @param data - Event data
     */
    private _handleDevEmitUpdateEvent(eventName: string, data: unknown): void {
        if (this.deps.updateManager) {
            this.deps.updateManager.devEmitUpdateEvent(eventName, data);
        }
    }

    /**
     * Handle dev:test:mock-platform request.
     * @param platform - Platform to mock (or null to reset)
     * @param env - Environment variables to mock (or null to reset)
     */
    private _handleDevMockPlatform(platform: NodeJS.Platform | null, env: Record<string, string> | null): void {
        if (this.deps.updateManager) {
            if (platform !== undefined) this.deps.updateManager.devMockPlatform(platform);
            if (env !== undefined) this.deps.updateManager.devMockEnv(env);
        }
    }

    /**
     * Handle tray:get-tooltip request.
     * @returns Tray tooltip text
     */
    private _handleGetTrayTooltip(): string {
        try {
            if (this.deps.updateManager) {
                return (this.deps.updateManager as any).getTrayTooltip?.() || '';
            }
            return '';
        } catch (error) {
            this.handleError('getting tray tooltip', error);
            return '';
        }
    }
}

import { app, ipcMain } from 'electron';

import { IPC_CHANNELS } from '../../utils/constants';
import { BaseIpcHandler } from './BaseIpcHandler';

export class LaunchAtStartupIpcHandler extends BaseIpcHandler {
    register(): void {
        ipcMain.handle(IPC_CHANNELS.LAUNCH_AT_STARTUP_GET, (): boolean => {
            return this._handleGetLaunchAtStartup();
        });

        ipcMain.on(IPC_CHANNELS.LAUNCH_AT_STARTUP_SET, (_event, enabled: boolean) => {
            this._handleSetLaunchAtStartup(enabled);
        });

        ipcMain.handle(IPC_CHANNELS.START_MINIMIZED_GET, (): boolean => {
            return this._handleGetStartMinimized();
        });

        ipcMain.on(IPC_CHANNELS.START_MINIMIZED_SET, (_event, enabled: boolean) => {
            this._handleSetStartMinimized(enabled);
        });
    }

    private _handleGetLaunchAtStartup(): boolean {
        try {
            const stored = this.deps.store.get('launchAtStartup');
            return stored === true;
        } catch (error) {
            this.handleError('getting launch at startup', error);
            return false;
        }
    }

    private _handleSetLaunchAtStartup(enabled: boolean): void {
        try {
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid enabled value: ${enabled}`);
                return;
            }

            if (!enabled) {
                this.deps.store.set('startMinimized', false);
            }

            const startMinimized = enabled && this.deps.store.get('startMinimized') === true;
            this._applyLoginItemSettings(enabled, startMinimized);

            this.deps.store.set('launchAtStartup', enabled);
            this.logger.log(`Launch at startup ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            this.handleError('setting launch at startup', error, {
                requestedEnabled: enabled,
            });
        }
    }

    private _handleGetStartMinimized(): boolean {
        try {
            const stored = this.deps.store.get('startMinimized');
            return stored === true;
        } catch (error) {
            this.handleError('getting start minimized', error);
            return false;
        }
    }

    private _handleSetStartMinimized(enabled: boolean): void {
        try {
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid enabled value: ${enabled}`);
                return;
            }

            const launchAtStartup = this.deps.store.get('launchAtStartup') === true;
            const nextStartMinimized = launchAtStartup && enabled;

            this.deps.store.set('startMinimized', nextStartMinimized);

            if (launchAtStartup) {
                this._applyLoginItemSettings(true, nextStartMinimized);
            }

            this.logger.log(`Start minimized ${nextStartMinimized ? 'enabled' : 'disabled'}`);
        } catch (error) {
            this.handleError('setting start minimized', error, {
                requestedEnabled: enabled,
            });
        }
    }

    private _applyLoginItemSettings(openAtLogin: boolean, startMinimized: boolean): void {
        const args = startMinimized ? ['--hidden'] : [];
        const settings: Electron.Settings = {
            openAtLogin,
            args,
        };

        if (process.platform === 'darwin') {
            settings.openAsHidden = openAtLogin && startMinimized;
        }

        app.setLoginItemSettings(settings);

        this.logger.log('Applied login item settings:', {
            feature: 'launch_at_startup',
            openAtLogin,
            startMinimized,
            args,
            platform: process.platform,
        });
    }

    unregister(): void {
        ipcMain.removeHandler(IPC_CHANNELS.LAUNCH_AT_STARTUP_GET);
        ipcMain.removeAllListeners(IPC_CHANNELS.LAUNCH_AT_STARTUP_SET);
        ipcMain.removeHandler(IPC_CHANNELS.START_MINIMIZED_GET);
        ipcMain.removeAllListeners(IPC_CHANNELS.START_MINIMIZED_SET);
    }
}

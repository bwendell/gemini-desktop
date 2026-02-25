/**
 * Hotkey IPC Handler.
 *
 * Handles IPC channels for hotkey management:
 * - hotkeys:individual:get - Returns all hotkey enabled states
 * - hotkeys:individual:set - Sets an individual hotkey enabled state
 * - hotkeys:accelerator:get - Returns all hotkey accelerators
 * - hotkeys:accelerator:set - Sets a hotkey accelerator
 * - hotkeys:full-settings:get - Returns both enabled states and accelerators
 *
 * @module ipc/HotkeyIpcHandler
 */

import { ipcMain } from 'electron';
import { BaseIpcHandler } from './BaseIpcHandler';
import { IPC_CHANNELS } from '../../utils/constants';
import {
    HOTKEY_IDS,
    DEFAULT_ACCELERATORS,
    type HotkeyId,
    type IndividualHotkeySettings,
    type HotkeyAccelerators,
    type HotkeySettings,
    type PlatformHotkeyStatus,
} from '../../../shared/types/hotkeys';
import { getActivationSignalStats, clearActivationSignalHistory } from '../../utils/dbusFallback';

/** Whether to enable test-only D-Bus activation signal IPC handlers */
const TEST_ONLY_DBUS_SIGNALS_ENABLED = process.env.NODE_ENV === 'test' || process.env.DEBUG_DBUS === '1';

/**
 * Handler for hotkey-related IPC channels.
 *
 * Manages hotkey enabled states, accelerators, persistence,
 * HotkeyManager synchronization, and broadcasting changes to all windows.
 */
export class HotkeyIpcHandler extends BaseIpcHandler {
    /**
     * Register hotkey IPC handlers with ipcMain.
     */
    register(): void {
        // Get current individual hotkey settings
        ipcMain.handle(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_GET, (): IndividualHotkeySettings => {
            return this._handleGetIndividualSettings();
        });

        // Set individual hotkey enabled state
        ipcMain.on(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET, (_event, id: HotkeyId, enabled: boolean) => {
            this._handleSetIndividualSetting(id, enabled);
        });

        // Get current accelerator settings
        ipcMain.handle(IPC_CHANNELS.HOTKEYS_ACCELERATOR_GET, (): HotkeyAccelerators => {
            return this._handleGetAccelerators();
        });

        // Set accelerator for a specific hotkey
        ipcMain.on(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET, (_event, id: HotkeyId, accelerator: string) => {
            this._handleSetAccelerator(id, accelerator);
        });

        // Get full hotkey settings (enabled + accelerators)
        ipcMain.handle(IPC_CHANNELS.HOTKEYS_FULL_SETTINGS_GET, (): HotkeySettings => {
            return this._handleGetFullSettings();
        });

        // Get current platform hotkey status (Wayland/Portal info)
        ipcMain.handle(IPC_CHANNELS.PLATFORM_HOTKEY_STATUS_GET, (): PlatformHotkeyStatus => {
            return this._handleGetPlatformHotkeyStatus();
        });

        // Test-only: Register D-Bus activation signal handlers only in test/debug mode
        if (TEST_ONLY_DBUS_SIGNALS_ENABLED) {
            // Get D-Bus activation signal stats for integration tests
            ipcMain.handle(IPC_CHANNELS.DBUS_ACTIVATION_SIGNAL_STATS_GET, () => {
                return getActivationSignalStats();
            });

            // Clear D-Bus activation signal history for test isolation
            ipcMain.on(IPC_CHANNELS.DBUS_ACTIVATION_SIGNAL_HISTORY_CLEAR, () => {
                clearActivationSignalHistory();
            });
        }
    }

    /**
     * Initialize hotkeys from store.
     * Syncs enabled states and accelerators to HotkeyManager.
     */
    initialize(): void {
        if (!this.deps.hotkeyManager) return;

        try {
            // Migrate legacy keys if present
            this._migrateLegacyHotkeySettings();

            // Sync enabled states
            const savedSettings = this._getIndividualSettings();
            this.deps.hotkeyManager.updateAllSettings(savedSettings);

            // Sync accelerators
            const savedAccelerators = this._getAccelerators();
            this.deps.hotkeyManager.updateAllAccelerators(savedAccelerators);

            this.logger.log('Hotkeys initialized from store');
        } catch (error) {
            this.handleError('initializing hotkeys', error);
        }
    }

    /**
     * Migrate legacy hotkey keys to new naming.
     * Only migrates if new keys are undefined.
     */
    private _migrateLegacyHotkeySettings(): void {
        const existingHotkeyPeekAndHide = this.deps.store.get('hotkeyPeekAndHide');
        const legacyHotkeyBossKey = this.deps.store.get('hotkeyBossKey');

        if (
            existingHotkeyPeekAndHide === undefined &&
            legacyHotkeyBossKey !== undefined &&
            typeof legacyHotkeyBossKey === 'boolean'
        ) {
            this.deps.store.set('hotkeyPeekAndHide', legacyHotkeyBossKey);
            this.logger.log('Migrated hotkeyBossKey to hotkeyPeekAndHide');
        }

        const existingAcceleratorPeekAndHide = this.deps.store.get('acceleratorPeekAndHide');
        const legacyAcceleratorBossKey = this.deps.store.get('acceleratorBossKey');

        if (
            existingAcceleratorPeekAndHide === undefined &&
            legacyAcceleratorBossKey !== undefined &&
            typeof legacyAcceleratorBossKey === 'string'
        ) {
            this.deps.store.set('acceleratorPeekAndHide', legacyAcceleratorBossKey);
            this.logger.log('Migrated acceleratorBossKey to acceleratorPeekAndHide');
        }
    }

    /**
     * Handle hotkeys:individual:get request.
     * @returns All hotkey enabled states
     */
    private _handleGetIndividualSettings(): IndividualHotkeySettings {
        try {
            return this._getIndividualSettings();
        } catch (error) {
            this.logger.error('Error getting individual hotkeys state:', error);
            return { alwaysOnTop: true, peekAndHide: true, quickChat: true, voiceChat: true, printToPdf: true };
        }
    }

    /**
     * Handle hotkeys:individual:set request.
     * @param id - The hotkey identifier
     * @param enabled - Whether the hotkey should be enabled
     */
    private _handleSetIndividualSetting(id: HotkeyId, enabled: boolean): void {
        try {
            // Validate hotkey ID
            if (!HOTKEY_IDS.includes(id)) {
                this.logger.warn(`Invalid hotkey id: ${id}`);
                return;
            }

            // Validate enabled value
            if (typeof enabled !== 'boolean') {
                this.logger.warn(`Invalid enabled value: ${enabled}`);
                return;
            }

            // Persist preference
            this._setIndividualSetting(id, enabled);

            // Update HotkeyManager if available
            if (this.deps.hotkeyManager) {
                this.deps.hotkeyManager.setIndividualEnabled(id, enabled);
            }

            this.logger.log(`Individual hotkey ${id} set to: ${enabled}`);

            // Broadcast to all windows
            this._broadcastIndividualChange();
        } catch (error) {
            this.logger.error('Error setting individual hotkey:', {
                error: (error as Error).message,
                id,
                enabled,
            });
        }
    }

    /**
     * Handle hotkeys:accelerator:get request.
     * @returns All hotkey accelerators
     */
    private _handleGetAccelerators(): HotkeyAccelerators {
        try {
            return this._getAccelerators();
        } catch (error) {
            this.logger.error('Error getting hotkey accelerators:', error);
            return { ...DEFAULT_ACCELERATORS };
        }
    }

    /**
     * Handle hotkeys:accelerator:set request.
     * @param id - The hotkey identifier
     * @param accelerator - The new accelerator string
     */
    private _handleSetAccelerator(id: HotkeyId, accelerator: string): void {
        try {
            // Validate hotkey ID
            if (!HOTKEY_IDS.includes(id)) {
                this.logger.warn(`Invalid hotkey id: ${id}`);
                return;
            }

            // Validate accelerator value
            if (typeof accelerator !== 'string' || accelerator.trim().length === 0) {
                this.logger.warn(`Invalid accelerator value: ${accelerator}`);
                return;
            }

            // Persist preference
            this._setAccelerator(id, accelerator);

            // Update HotkeyManager if available
            if (this.deps.hotkeyManager) {
                this.deps.hotkeyManager.setAccelerator(id, accelerator);
            }

            this.logger.log(`Hotkey accelerator ${id} set to: ${accelerator}`);

            // Broadcast to all windows
            this._broadcastAcceleratorChange();
        } catch (error) {
            this.logger.error('Error setting hotkey accelerator:', {
                error: (error as Error).message,
                id,
                accelerator,
            });
        }
    }

    /**
     * Handle hotkeys:full-settings:get request.
     * @returns Full hotkey settings with enabled states and accelerators
     */
    private _handleGetFullSettings(): HotkeySettings {
        try {
            const enabled = this._getIndividualSettings();
            const accelerators = this._getAccelerators();

            return {
                alwaysOnTop: {
                    enabled: enabled.alwaysOnTop,
                    accelerator: accelerators.alwaysOnTop,
                },
                peekAndHide: {
                    enabled: enabled.peekAndHide,
                    accelerator: accelerators.peekAndHide,
                },
                quickChat: {
                    enabled: enabled.quickChat,
                    accelerator: accelerators.quickChat,
                },
                voiceChat: {
                    enabled: enabled.voiceChat,
                    accelerator: accelerators.voiceChat,
                },
                printToPdf: {
                    enabled: enabled.printToPdf,
                    accelerator: accelerators.printToPdf,
                },
            };
        } catch (error) {
            this.logger.error('Error getting full hotkey settings:', error);
            return {
                alwaysOnTop: { enabled: true, accelerator: DEFAULT_ACCELERATORS.alwaysOnTop },
                peekAndHide: { enabled: true, accelerator: DEFAULT_ACCELERATORS.peekAndHide },
                quickChat: { enabled: true, accelerator: DEFAULT_ACCELERATORS.quickChat },
                voiceChat: { enabled: true, accelerator: DEFAULT_ACCELERATORS.voiceChat },
                printToPdf: { enabled: true, accelerator: DEFAULT_ACCELERATORS.printToPdf },
            };
        }
    }

    /**
     * Get individual hotkey settings from store.
     */
    private _getIndividualSettings(): IndividualHotkeySettings {
        return {
            alwaysOnTop: this.deps.store.get('hotkeyAlwaysOnTop') ?? true,
            peekAndHide: this.deps.store.get('hotkeyPeekAndHide') ?? true,
            quickChat: this.deps.store.get('hotkeyQuickChat') ?? true,
            voiceChat: this.deps.store.get('hotkeyVoiceChat') ?? true,
            printToPdf: this.deps.store.get('hotkeyPrintToPdf') ?? true,
        };
    }

    /**
     * Set an individual hotkey setting in the store.
     */
    private _setIndividualSetting(id: HotkeyId, enabled: boolean): void {
        switch (id) {
            case 'alwaysOnTop':
                this.deps.store.set('hotkeyAlwaysOnTop', enabled);
                break;
            case 'peekAndHide':
                this.deps.store.set('hotkeyPeekAndHide', enabled);
                break;
            case 'quickChat':
                this.deps.store.set('hotkeyQuickChat', enabled);
                break;
            case 'voiceChat':
                this.deps.store.set('hotkeyVoiceChat', enabled);
                break;
            case 'printToPdf':
                this.deps.store.set('hotkeyPrintToPdf', enabled);
                break;
        }
    }

    /**
     * Get hotkey accelerators from store.
     */
    private _getAccelerators(): HotkeyAccelerators {
        return {
            alwaysOnTop: this.deps.store.get('acceleratorAlwaysOnTop') ?? DEFAULT_ACCELERATORS.alwaysOnTop,
            peekAndHide: this.deps.store.get('acceleratorPeekAndHide') ?? DEFAULT_ACCELERATORS.peekAndHide,
            quickChat: this.deps.store.get('acceleratorQuickChat') ?? DEFAULT_ACCELERATORS.quickChat,
            voiceChat: this.deps.store.get('acceleratorVoiceChat') ?? DEFAULT_ACCELERATORS.voiceChat,
            printToPdf: this.deps.store.get('acceleratorPrintToPdf') ?? DEFAULT_ACCELERATORS.printToPdf,
        };
    }

    /**
     * Set a hotkey accelerator in the store.
     */
    private _setAccelerator(id: HotkeyId, accelerator: string): void {
        switch (id) {
            case 'alwaysOnTop':
                this.deps.store.set('acceleratorAlwaysOnTop', accelerator);
                break;
            case 'peekAndHide':
                this.deps.store.set('acceleratorPeekAndHide', accelerator);
                break;
            case 'quickChat':
                this.deps.store.set('acceleratorQuickChat', accelerator);
                break;
            case 'voiceChat':
                this.deps.store.set('acceleratorVoiceChat', accelerator);
                break;
            case 'printToPdf':
                this.deps.store.set('acceleratorPrintToPdf', accelerator);
                break;
        }
    }

    /**
     * Broadcast individual hotkey settings change to all open windows.
     */
    private _broadcastIndividualChange(): void {
        const settings = this._getIndividualSettings();
        this.broadcastToAllWindows(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_CHANGED, settings);
    }

    /**
     * Broadcast accelerator change to all open windows.
     */
    private _broadcastAcceleratorChange(): void {
        const accelerators = this._getAccelerators();
        this.broadcastToAllWindows(IPC_CHANNELS.HOTKEYS_ACCELERATOR_CHANGED, accelerators);
    }

    /** Unregister all IPC handlers. */
    unregister(): void {
        ipcMain.removeHandler(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_GET);
        ipcMain.removeAllListeners(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET);
        ipcMain.removeHandler(IPC_CHANNELS.HOTKEYS_ACCELERATOR_GET);
        ipcMain.removeAllListeners(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET);
        ipcMain.removeHandler(IPC_CHANNELS.HOTKEYS_FULL_SETTINGS_GET);
        ipcMain.removeHandler(IPC_CHANNELS.PLATFORM_HOTKEY_STATUS_GET);
        // Only remove test-only handlers if they were registered
        if (TEST_ONLY_DBUS_SIGNALS_ENABLED) {
            ipcMain.removeHandler(IPC_CHANNELS.DBUS_ACTIVATION_SIGNAL_STATS_GET);
            ipcMain.removeAllListeners(IPC_CHANNELS.DBUS_ACTIVATION_SIGNAL_HISTORY_CLEAR);
        }
    }

    /**
     * Handle platform:hotkey-status:get request.
     * @returns Current platform hotkey status
     */
    private _handleGetPlatformHotkeyStatus(): PlatformHotkeyStatus {
        if (!this.deps.hotkeyManager) {
            return {
                waylandStatus: {
                    isWayland: false,
                    desktopEnvironment: 'unknown' as const,
                    deVersion: null,
                    portalAvailable: false,
                    portalMethod: 'none' as const,
                },
                registrationResults: [],
                globalHotkeysEnabled: false,
            };
        }
        return this.deps.hotkeyManager.getPlatformHotkeyStatus();
    }
}

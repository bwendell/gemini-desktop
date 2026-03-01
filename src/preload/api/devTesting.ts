import { ipcRenderer } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';
import { createSignalSubscription } from '../createSubscription';

const TEST_ONLY_DBUS_SIGNALS_ENABLED = process.env.NODE_ENV === 'test' || process.env.DEBUG_DBUS === '1';

export const devTestingAPI: Pick<
    ElectronAPI,
    | 'devShowBadge'
    | 'devClearBadge'
    | 'devSetUpdateEnabled'
    | 'devEmitUpdateEvent'
    | 'devMockPlatform'
    | 'devTriggerResponseNotification'
    | 'getDbusActivationSignalStats'
    | 'clearDbusActivationSignalHistory'
    | 'getTrayTooltip'
    | 'onDebugTriggerError'
> = {
    devShowBadge: (version?: string) => ipcRenderer.send(IPC_CHANNELS.DEV_TEST_SHOW_BADGE, version),
    devClearBadge: () => ipcRenderer.send(IPC_CHANNELS.DEV_TEST_CLEAR_BADGE),
    devSetUpdateEnabled: (enabled) => ipcRenderer.send(IPC_CHANNELS.DEV_TEST_SET_UPDATE_ENABLED, enabled),
    devEmitUpdateEvent: (event, data) => ipcRenderer.send(IPC_CHANNELS.DEV_TEST_EMIT_UPDATE_EVENT, event, data),
    devMockPlatform: (platform, env) => ipcRenderer.send(IPC_CHANNELS.DEV_TEST_MOCK_PLATFORM, platform, env),
    devTriggerResponseNotification: () => ipcRenderer.send(IPC_CHANNELS.DEV_TEST_TRIGGER_RESPONSE_NOTIFICATION),

    getDbusActivationSignalStats: TEST_ONLY_DBUS_SIGNALS_ENABLED
        ? () => ipcRenderer.invoke(IPC_CHANNELS.DBUS_ACTIVATION_SIGNAL_STATS_GET)
        : () =>
              Promise.resolve({
                  trackingEnabled: false,
                  totalSignals: 0,
                  signalsByShortcut: {},
                  lastSignalTime: null,
                  signals: Object.freeze([]),
              }),
    clearDbusActivationSignalHistory: TEST_ONLY_DBUS_SIGNALS_ENABLED
        ? () => ipcRenderer.send(IPC_CHANNELS.DBUS_ACTIVATION_SIGNAL_HISTORY_CLEAR)
        : () => {},

    getTrayTooltip: () => ipcRenderer.invoke(IPC_CHANNELS.TRAY_GET_TOOLTIP),
    onDebugTriggerError: createSignalSubscription(IPC_CHANNELS.DEBUG_TRIGGER_ERROR),
};

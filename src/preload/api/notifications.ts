import { ipcRenderer } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';

export const notificationsAPI: Pick<
    ElectronAPI,
    'getResponseNotificationsEnabled' | 'setResponseNotificationsEnabled'
> = {
    getResponseNotificationsEnabled: () => ipcRenderer.invoke(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_GET_ENABLED),
    setResponseNotificationsEnabled: (enabled: boolean) =>
        ipcRenderer.send(IPC_CHANNELS.RESPONSE_NOTIFICATIONS_SET_ENABLED, enabled),
};

import { ipcRenderer } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';
import type { DownloadProgress, UpdateInfo } from '../../shared/types/updates';
import { createSignalSubscription, createSubscription } from '../createSubscription';

export const updatesAPI: Pick<
    ElectronAPI,
    | 'getAutoUpdateEnabled'
    | 'setAutoUpdateEnabled'
    | 'checkForUpdates'
    | 'installUpdate'
    | 'onUpdateAvailable'
    | 'onUpdateDownloaded'
    | 'onUpdateError'
    | 'onUpdateNotAvailable'
    | 'onDownloadProgress'
    | 'onCheckingForUpdate'
    | 'getLastUpdateCheckTime'
> = {
    getAutoUpdateEnabled: () => ipcRenderer.invoke(IPC_CHANNELS.AUTO_UPDATE_GET_ENABLED),
    setAutoUpdateEnabled: (enabled: boolean) => ipcRenderer.send(IPC_CHANNELS.AUTO_UPDATE_SET_ENABLED, enabled),
    checkForUpdates: () => ipcRenderer.send(IPC_CHANNELS.AUTO_UPDATE_CHECK),
    installUpdate: () => ipcRenderer.send(IPC_CHANNELS.AUTO_UPDATE_INSTALL),
    onUpdateAvailable: createSubscription<UpdateInfo>(IPC_CHANNELS.AUTO_UPDATE_AVAILABLE),
    onUpdateDownloaded: createSubscription<UpdateInfo>(IPC_CHANNELS.AUTO_UPDATE_DOWNLOADED),
    onUpdateError: createSubscription<string>(IPC_CHANNELS.AUTO_UPDATE_ERROR),
    onUpdateNotAvailable: createSubscription<UpdateInfo>(IPC_CHANNELS.AUTO_UPDATE_NOT_AVAILABLE),
    onDownloadProgress: createSubscription<DownloadProgress>(IPC_CHANNELS.AUTO_UPDATE_DOWNLOAD_PROGRESS),
    onCheckingForUpdate: createSignalSubscription(IPC_CHANNELS.AUTO_UPDATE_CHECKING),
    getLastUpdateCheckTime: () => ipcRenderer.invoke(IPC_CHANNELS.AUTO_UPDATE_GET_LAST_CHECK),
};

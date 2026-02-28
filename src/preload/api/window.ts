import { ipcRenderer } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';

export const windowAPI: Pick<
    ElectronAPI,
    | 'minimizeWindow'
    | 'maximizeWindow'
    | 'closeWindow'
    | 'showWindow'
    | 'isMaximized'
    | 'toggleFullscreen'
    | 'openOptions'
    | 'openGoogleSignIn'
> = {
    minimizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    closeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
    showWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_SHOW),
    isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
    toggleFullscreen: () => ipcRenderer.send(IPC_CHANNELS.FULLSCREEN_TOGGLE),
    openOptions: (tab?: 'settings' | 'about') => ipcRenderer.send(IPC_CHANNELS.OPEN_OPTIONS, tab),
    openGoogleSignIn: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_GOOGLE_SIGNIN),
};

import { ipcRenderer } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';
import { createSubscription } from '../createSubscription';

export const windowAPI: Pick<
    ElectronAPI,
    | 'minimizeWindow'
    | 'maximizeWindow'
    | 'closeWindow'
    | 'showWindow'
    | 'isMaximized'
    | 'isFullscreen'
    | 'toggleFullscreen'
    | 'onFullscreenChanged'
    | 'openOptions'
    | 'openGoogleSignIn'
    | 'restartApp'
> = {
    minimizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximizeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
    closeWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE),
    showWindow: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_SHOW),
    isMaximized: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_MAXIMIZED),
    isFullscreen: () => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_IS_FULLSCREEN),
    toggleFullscreen: () => ipcRenderer.send(IPC_CHANNELS.FULLSCREEN_TOGGLE),
    onFullscreenChanged: createSubscription<boolean>(IPC_CHANNELS.FULLSCREEN_CHANGED),
    openOptions: (tab?: 'settings' | 'about') => ipcRenderer.send(IPC_CHANNELS.OPEN_OPTIONS, tab),
    openGoogleSignIn: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_GOOGLE_SIGNIN),
    restartApp: () => ipcRenderer.invoke(IPC_CHANNELS.APP_RESTART),
};

import { ipcRenderer } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';
import { createSubscription } from '../createSubscription';

export const zoomAPI: Pick<ElectronAPI, 'getZoomLevel' | 'zoomIn' | 'zoomOut' | 'onZoomLevelChanged'> = {
    getZoomLevel: () => ipcRenderer.invoke(IPC_CHANNELS.ZOOM_GET_LEVEL),
    zoomIn: () => ipcRenderer.invoke(IPC_CHANNELS.ZOOM_IN),
    zoomOut: () => ipcRenderer.invoke(IPC_CHANNELS.ZOOM_OUT),
    onZoomLevelChanged: createSubscription<number>(IPC_CHANNELS.ZOOM_LEVEL_CHANGED),
};

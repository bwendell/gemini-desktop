import { ipcRenderer } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';

export const startupAPI: Pick<
    ElectronAPI,
    'getLaunchAtStartup' | 'setLaunchAtStartup' | 'getStartMinimized' | 'setStartMinimized'
> = {
    getLaunchAtStartup: () => ipcRenderer.invoke(IPC_CHANNELS.LAUNCH_AT_STARTUP_GET),
    setLaunchAtStartup: (enabled: boolean) => ipcRenderer.send(IPC_CHANNELS.LAUNCH_AT_STARTUP_SET, enabled),
    getStartMinimized: () => ipcRenderer.invoke(IPC_CHANNELS.START_MINIMIZED_GET),
    setStartMinimized: (enabled: boolean) => ipcRenderer.send(IPC_CHANNELS.START_MINIMIZED_SET, enabled),
};

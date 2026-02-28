import { ipcRenderer } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';
import { createSubscription } from '../createSubscription';

export const alwaysOnTopAPI: Pick<ElectronAPI, 'getAlwaysOnTop' | 'setAlwaysOnTop' | 'onAlwaysOnTopChanged'> = {
    getAlwaysOnTop: () => ipcRenderer.invoke(IPC_CHANNELS.ALWAYS_ON_TOP_GET),
    setAlwaysOnTop: (enabled: boolean) => ipcRenderer.send(IPC_CHANNELS.ALWAYS_ON_TOP_SET, enabled),
    onAlwaysOnTopChanged: createSubscription<{ enabled: boolean }>(IPC_CHANNELS.ALWAYS_ON_TOP_CHANGED),
};

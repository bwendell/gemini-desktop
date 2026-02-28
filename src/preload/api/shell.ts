import { ipcRenderer } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';

export const shellAPI: Pick<ElectronAPI, 'revealInFolder'> = {
    revealInFolder: (path: string) => ipcRenderer.send(IPC_CHANNELS.SHELL_SHOW_ITEM_IN_FOLDER, path),
};

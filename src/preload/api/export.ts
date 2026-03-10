import { ipcRenderer } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';

export const exportAPI: Pick<ElectronAPI, 'exportChatToPdf' | 'exportChatToMarkdown'> = {
    exportChatToPdf: () => ipcRenderer.send(IPC_CHANNELS.EXPORT_CHAT_PDF),
    exportChatToMarkdown: () => ipcRenderer.send(IPC_CHANNELS.EXPORT_CHAT_MARKDOWN),
};

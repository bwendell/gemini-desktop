import { ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';

export const smartEnterAPI: Pick<
    ElectronAPI,
    | 'getSmartEnterEnabled'
    | 'setSmartEnterEnabled'
    | 'getScrollToBottomButtonEnabled'
    | 'setScrollToBottomButtonEnabled'
> = {
    getSmartEnterEnabled: () => ipcRenderer.invoke(IPC_CHANNELS.SMART_ENTER_GET_ENABLED),
    setSmartEnterEnabled: (enabled) => ipcRenderer.send(IPC_CHANNELS.SMART_ENTER_SET_ENABLED, enabled),
    getScrollToBottomButtonEnabled: () => ipcRenderer.invoke(IPC_CHANNELS.SCROLL_TO_BOTTOM_GET_ENABLED),
    setScrollToBottomButtonEnabled: (enabled) => ipcRenderer.send(IPC_CHANNELS.SCROLL_TO_BOTTOM_SET_ENABLED, enabled),
};

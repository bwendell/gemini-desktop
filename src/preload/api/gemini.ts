import { ipcRenderer } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';
import type { GeminiNavigatePayload, TabShortcutPayload } from '../../shared/types/tabs';
import { createSubscription } from '../createSubscription';

export const geminiAPI: Pick<
    ElectronAPI,
    | 'onGeminiNavigate'
    | 'signalGeminiReady'
    | 'getTabState'
    | 'saveTabState'
    | 'onTabShortcutTriggered'
    | 'onTabTitleUpdated'
    | 'updateTabTitle'
> = {
    onGeminiNavigate: createSubscription<GeminiNavigatePayload>(IPC_CHANNELS.GEMINI_NAVIGATE),
    signalGeminiReady: (payload) => ipcRenderer.send(IPC_CHANNELS.GEMINI_READY, payload),
    getTabState: () => ipcRenderer.invoke(IPC_CHANNELS.TABS_GET_STATE),
    saveTabState: (state) => ipcRenderer.send(IPC_CHANNELS.TABS_SAVE_STATE, state),
    onTabShortcutTriggered: createSubscription<TabShortcutPayload>(IPC_CHANNELS.TABS_SHORTCUT_TRIGGERED),
    onTabTitleUpdated: createSubscription<{ tabId: string; title: string }>(IPC_CHANNELS.TABS_TITLE_UPDATED),
    updateTabTitle: (tabId, title) =>
        ipcRenderer.send(IPC_CHANNELS.TABS_UPDATE_TITLE, {
            tabId,
            title,
        }),
};

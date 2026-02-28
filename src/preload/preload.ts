import { contextBridge } from 'electron';

import { alwaysOnTopAPI } from './api/alwaysOnTop';
import { devTestingAPI } from './api/devTesting';
import { exportAPI } from './api/export';
import { geminiAPI } from './api/gemini';
import { hotkeysAPI } from './api/hotkeys';
import { notificationsAPI } from './api/notifications';
import { platformAPI } from './api/platform';
import { quickChatAPI } from './api/quickChat';
import { shellAPI } from './api/shell';
import { textPredictionAPI } from './api/textPrediction';
import { themeAPI } from './api/theme';
import { toastAPI } from './api/toast';
import { updatesAPI } from './api/updates';
import { windowAPI } from './api/window';
import { zoomAPI } from './api/zoom';
import type { ElectronAPI } from '../shared/types';

const electronAPI: ElectronAPI = {
    ...windowAPI,
    ...themeAPI,
    ...quickChatAPI,
    ...geminiAPI,
    ...hotkeysAPI,
    ...alwaysOnTopAPI,
    ...zoomAPI,
    ...updatesAPI,
    ...textPredictionAPI,
    ...notificationsAPI,
    ...toastAPI,
    ...shellAPI,
    ...exportAPI,
    ...platformAPI,
    ...devTestingAPI,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
console.log('[Preload] Electron API exposed to renderer');

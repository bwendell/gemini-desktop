import { ipcRenderer } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';
import type { ThemeData } from '../../shared/types/theme';
import { createSubscription } from '../createSubscription';

export const themeAPI: Pick<ElectronAPI, 'getTheme' | 'setTheme' | 'onThemeChanged'> = {
    getTheme: () => ipcRenderer.invoke(IPC_CHANNELS.THEME_GET),
    setTheme: (theme: 'light' | 'dark' | 'system') => ipcRenderer.send(IPC_CHANNELS.THEME_SET, theme),
    onThemeChanged: createSubscription<ThemeData>(IPC_CHANNELS.THEME_CHANGED),
};

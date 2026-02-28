import type WindowManager from './managers/windowManager';
import type HotkeyManager from './managers/hotkeyManager';
import type IpcManager from './managers/ipcManager';
import type TrayManager from './managers/trayManager';
import type UpdateManager from './managers/updateManager';
import type BadgeManager from './managers/badgeManager';
import type LlmManager from './managers/llmManager';
import type NotificationManager from './managers/notificationManager';
import type ExportManager from './managers/exportManager';
import type MenuManager from './managers/menuManager';

export interface CoreManagers {
    windowManager: WindowManager;
    hotkeyManager: HotkeyManager;
    trayManager: TrayManager;
    badgeManager: BadgeManager;
    updateManager: UpdateManager;
    llmManager: LlmManager;
    exportManager: ExportManager;
    ipcManager: IpcManager;
}

export type ReadyManagers = {
    menuManager?: MenuManager;
    notificationManager?: NotificationManager;
};

export interface ApplicationContext extends CoreManagers, ReadyManagers {}

export interface E2EGlobals {
    appContext?: ApplicationContext;
    windowManager?: WindowManager;
    ipcManager?: IpcManager;
    trayManager?: TrayManager;
    updateManager?: UpdateManager;
    badgeManager?: BadgeManager;
    hotkeyManager?: HotkeyManager;
    llmManager?: LlmManager;
    menuManager?: MenuManager;
    notificationManager?: NotificationManager;
    __e2eGeminiReadyBuffer?: { enabled: boolean; pending: unknown[] };
    __e2eQuickChatHandler?: unknown;
}

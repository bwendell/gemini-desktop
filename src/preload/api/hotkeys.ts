import { ipcRenderer } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';
import type { HotkeyAccelerators, HotkeyId, IndividualHotkeySettings } from '../../shared/types/hotkeys';
import { createSubscription } from '../createSubscription';

export const hotkeysAPI: Pick<
    ElectronAPI,
    | 'getIndividualHotkeys'
    | 'setIndividualHotkey'
    | 'onIndividualHotkeysChanged'
    | 'getHotkeyAccelerators'
    | 'getFullHotkeySettings'
    | 'setHotkeyAccelerator'
    | 'onHotkeyAcceleratorsChanged'
> = {
    getIndividualHotkeys: () => ipcRenderer.invoke(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_GET),
    setIndividualHotkey: (id: HotkeyId, enabled: boolean) =>
        ipcRenderer.send(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_SET, id, enabled),
    onIndividualHotkeysChanged: createSubscription<IndividualHotkeySettings>(IPC_CHANNELS.HOTKEYS_INDIVIDUAL_CHANGED),
    getHotkeyAccelerators: () => ipcRenderer.invoke(IPC_CHANNELS.HOTKEYS_ACCELERATOR_GET),
    getFullHotkeySettings: () => ipcRenderer.invoke(IPC_CHANNELS.HOTKEYS_FULL_SETTINGS_GET),
    setHotkeyAccelerator: (id: HotkeyId, accelerator: string) =>
        ipcRenderer.send(IPC_CHANNELS.HOTKEYS_ACCELERATOR_SET, id, accelerator),
    onHotkeyAcceleratorsChanged: createSubscription<HotkeyAccelerators>(IPC_CHANNELS.HOTKEYS_ACCELERATOR_CHANGED),
};

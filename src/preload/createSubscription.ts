import { ipcRenderer } from 'electron';
import type { IpcChannel } from '../shared/constants/ipc-channels';

export function createSubscription<T>(channel: IpcChannel) {
    return (callback: (data: T) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: T) => callback(data);
        ipcRenderer.on(channel, handler);

        return () => {
            ipcRenderer.removeListener(channel, handler);
        };
    };
}

export function createSignalSubscription(channel: IpcChannel) {
    return (callback: () => void): (() => void) => {
        const handler = () => callback();
        ipcRenderer.on(channel, handler);

        return () => {
            ipcRenderer.removeListener(channel, handler);
        };
    };
}

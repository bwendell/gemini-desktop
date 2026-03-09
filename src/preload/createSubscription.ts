import { ipcRenderer } from 'electron';

export function createSubscription<T>(channel: string) {
    return (callback: (data: T) => void): (() => void) => {
        const handler = (_event: Electron.IpcRendererEvent, data: T) => callback(data);
        ipcRenderer.on(channel, handler);

        return () => {
            ipcRenderer.removeListener(channel, handler);
        };
    };
}

export function createSignalSubscription(channel: string) {
    return (callback: () => void): (() => void) => {
        const handler = () => callback();
        ipcRenderer.on(channel, handler);

        return () => {
            ipcRenderer.removeListener(channel, handler);
        };
    };
}

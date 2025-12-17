/**
 * Global mock for the 'electron' module.
 * This file is aliased in vitest.electron.config.ts.
 */
import { vi } from 'vitest';

export const app = {
    getPath: vi.fn((name) => `/mock/${name}`),
    isPackaged: false,
    whenReady: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    quit: vi.fn(),
};

const createMockWebContents = () => ({
    send: vi.fn(),
    on: vi.fn(),
    openDevTools: vi.fn(),
    setWindowOpenHandler: vi.fn(),
});

export class BrowserWindow {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static _instances: any[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(options: any = {}) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const instance: any = {
            options,
            webContents: createMockWebContents(),
            loadURL: vi.fn(),
            loadFile: vi.fn(),
            show: vi.fn(),
            hide: vi.fn(),
            close: vi.fn(),
            focus: vi.fn(),
            minimize: vi.fn(),
            maximize: vi.fn(),
            unmaximize: vi.fn(),
            isMaximized: vi.fn().mockReturnValue(false),
            isDestroyed: vi.fn().mockReturnValue(false),
            on: vi.fn(),
            once: vi.fn(),
            id: Math.random(),
        };
        BrowserWindow._instances.push(instance);
        // Return a proxy or just the instance properties mixed in? 
        // In JS class, 'this' is the instance. 
        // We can just assign mocks to 'this'.
        Object.assign(this, instance);
    }

    static getAllWindows = vi.fn(() => BrowserWindow._instances);
    static fromWebContents = vi.fn(() => BrowserWindow._instances[0] || null);

    static _reset() {
        BrowserWindow._instances = [];
    }
}

export const ipcMain = {
    on: vi.fn((channel, listener) => {
        ipcMain._listeners.set(channel, listener);
    }),
    handle: vi.fn((channel, handler) => {
        ipcMain._handlers.set(channel, handler);
    }),
    removeHandler: vi.fn((channel) => {
        ipcMain._handlers.delete(channel);
    }),
    once: vi.fn(),
    _handlers: new Map(),
    _listeners: new Map(),
    _reset: () => {
        ipcMain._handlers.clear();
        ipcMain._listeners.clear();
        ipcMain.on.mockClear();
        ipcMain.handle.mockClear();
        ipcMain.removeHandler.mockClear();
        ipcMain.once.mockClear();
    }
};

export const ipcRenderer = {
    send: vi.fn(),
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
};

export const session = {
    defaultSession: {
        webRequest: {
            onHeadersReceived: vi.fn(),
            onBeforeSendHeaders: vi.fn(),
        },
        cookies: {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn(),
        },
    },
};

export const nativeTheme = {
    themeSource: 'system',
    shouldUseDarkColors: true,
    on: vi.fn(),
    _reset: () => {
        nativeTheme.themeSource = 'system';
        nativeTheme.shouldUseDarkColors = true;
        nativeTheme.on.mockClear();
    }
};

export const shell = {
    openExternal: vi.fn().mockResolvedValue(undefined),
};

export const contextBridge = {
    exposeInMainWorld: vi.fn(),
};

// Default export for CJS compatibility
export default {
    app,
    BrowserWindow,
    ipcMain,
    ipcRenderer,
    session,
    nativeTheme,
    shell,
    contextBridge,
};

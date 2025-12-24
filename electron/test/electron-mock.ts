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
    requestSingleInstanceLock: vi.fn().mockReturnValue(true),
    dock: {
        setBadge: vi.fn(),
        getBadge: vi.fn().mockReturnValue(''),
        setMenu: vi.fn(),
    },
};

const createMockWebContents = () => ({
    send: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
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
            loadURL: vi.fn().mockResolvedValue(undefined),
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
            isVisible: vi.fn().mockReturnValue(true),
            setSkipTaskbar: vi.fn(),
            setAlwaysOnTop: vi.fn(),
            isAlwaysOnTop: vi.fn().mockReturnValue(false),
            setPosition: vi.fn(),
            setSize: vi.fn(),
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

export const screen = {
    getCursorScreenPoint: vi.fn().mockReturnValue({ x: 500, y: 500 }),
    getDisplayNearestPoint: vi.fn().mockReturnValue({
        workArea: { x: 0, y: 0 },
        workAreaSize: { width: 1920, height: 1080 }
    }),
    _reset: () => {
        screen.getCursorScreenPoint.mockClear();
        screen.getDisplayNearestPoint.mockClear();
    }
};

export const shell = {
    openExternal: vi.fn().mockResolvedValue(undefined),
};

export const contextBridge = {
    exposeInMainWorld: vi.fn(),
};

export const nativeImage = {
    createFromPath: vi.fn((path) => ({
        isEmpty: vi.fn().mockReturnValue(false),
        getSize: vi.fn().mockReturnValue({ width: 16, height: 16 }),
        toPNG: vi.fn().mockReturnValue(Buffer.from('mock-png')),
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock'),
    })),
    createFromDataURL: vi.fn((url) => ({
        isEmpty: vi.fn().mockReturnValue(false),
        getSize: vi.fn().mockReturnValue({ width: 16, height: 16 }),
        toPNG: vi.fn().mockReturnValue(Buffer.from('mock-png')),
        toDataURL: vi.fn().mockReturnValue(url),
    })),
    createFromBuffer: vi.fn((buffer) => ({
        isEmpty: vi.fn().mockReturnValue(false),
        getSize: vi.fn().mockReturnValue({ width: 16, height: 16 }),
        toPNG: vi.fn().mockReturnValue(buffer),
        toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mock'),
    })),
    createEmpty: vi.fn(() => ({
        isEmpty: vi.fn().mockReturnValue(true),
        getSize: vi.fn().mockReturnValue({ width: 0, height: 0 }),
        toPNG: vi.fn().mockReturnValue(Buffer.alloc(0)),
        toDataURL: vi.fn().mockReturnValue(''),
    })),
    _reset: () => {
        nativeImage.createFromPath.mockClear();
        nativeImage.createFromDataURL.mockClear();
        nativeImage.createFromBuffer.mockClear();
        nativeImage.createEmpty.mockClear();
    }
};

export const globalShortcut = {
    register: vi.fn().mockReturnValue(true),
    unregisterAll: vi.fn(),
    isRegistered: vi.fn().mockReturnValue(false),
    _reset: () => {
        globalShortcut.register.mockClear();
        globalShortcut.unregisterAll.mockClear();
        globalShortcut.isRegistered.mockClear();
    }
};

// ============================================================================
// Tray Mock
// ============================================================================
export class Tray {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static _instances: any[] = [];
    iconPath: string;
    private _tooltip: string = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _contextMenu: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private _clickHandler: ((event: any) => void) | null = null;

    constructor(iconPath: string) {
        this.iconPath = iconPath;
        Tray._instances.push(this);
    }

    setToolTip = vi.fn((tip: string) => { this._tooltip = tip; });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setContextMenu = vi.fn((menu: any) => { this._contextMenu = menu; });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on = vi.fn((event: string, handler: (event: any) => void) => {
        if (event === 'click') {
            this._clickHandler = handler;
        }
    });
    destroy = vi.fn();
    isDestroyed = vi.fn().mockReturnValue(false);

    // Test helpers
    getTooltip() { return this._tooltip; }
    getContextMenu() { return this._contextMenu; }
    simulateClick() {
        if (this._clickHandler) {
            this._clickHandler({});
        }
    }

    static _reset() {
        Tray._instances = [];
    }
}

// ============================================================================
// Menu Mock
// ============================================================================
export const Menu = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    buildFromTemplate: vi.fn((template: any[]) => ({
        items: template,
        popup: vi.fn(),
    })),
    setApplicationMenu: vi.fn(),
    _reset: () => {
        Menu.buildFromTemplate.mockClear();
        Menu.setApplicationMenu.mockClear();
    }
};

// Default export for CJS compatibility
export default {
    app,
    BrowserWindow,
    ipcMain,
    ipcRenderer,
    session,
    nativeTheme,
    nativeImage,
    screen,
    shell,
    contextBridge,
    globalShortcut,
    Tray,
    Menu,
};

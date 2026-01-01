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
  getVersion: vi.fn().mockReturnValue('1.0.0'),
  setName: vi.fn(),
  getName: vi.fn().mockReturnValue('Gemini Desktop'),
  dock: {
    setBadge: vi.fn(),
    getBadge: vi.fn().mockReturnValue(''),
    setMenu: vi.fn(),
  },
};

// systemPreferences mock for macOS-specific media access
export const systemPreferences = {
  askForMediaAccess: vi.fn().mockResolvedValue(true),
  getMediaAccessStatus: vi.fn().mockReturnValue('granted'),
  _reset: () => {
    systemPreferences.askForMediaAccess.mockClear();
    systemPreferences.getMediaAccessStatus.mockClear();
  },
};

const createMockWebContents = () => {
  // Create a mock image with required methods
  // Use values that result in exactly 1 capture: ceil(800 / (1000 * 0.9)) = 1
  const mockImage = {
    toPNG: vi.fn().mockReturnValue(Buffer.from('mock-png-data')),
    getSize: vi.fn().mockReturnValue({ width: 1920, height: 1000 }),
  };

  // Create mock frame for iframe scroll info and scrolling
  const mockGeminiFrame = {
    url: 'https://gemini.google.com/app',
    executeJavaScript: vi.fn().mockResolvedValue({
      scrollHeight: 800,
      scrollTop: 0,
      clientHeight: 1000,
    }),
  };

  return {
    send: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    openDevTools: vi.fn(),
    setWindowOpenHandler: vi.fn(),
    getURL: vi.fn().mockReturnValue('https://gemini.google.com/app'),
    printToPDF: vi.fn().mockResolvedValue(Buffer.from('mock-pdf')),
    isDestroyed: vi.fn().mockReturnValue(false),
    // Methods for scrolling capture
    capturePage: vi.fn().mockResolvedValue(mockImage),
    mainFrame: {
      frames: [mockGeminiFrame],
    },
  };
};

export class BrowserWindow {
  static _instances: any[] = [];

  constructor(options: any = {}) {
    // Create stateful behavior
    let isVisible = true;
    let isDestroyed = false;
    let isMaximized = false;
    let isAlwaysOnTop = false;

    const instance: any = {
      options,
      webContents: createMockWebContents(),
      loadURL: vi.fn().mockResolvedValue(undefined),
      loadFile: vi.fn(),
      _listeners: new Map<string, Function>(),

      // Stateful methods
      show: vi.fn(() => {
        isVisible = true;
      }),
      hide: vi.fn(() => {
        isVisible = false;
      }),
      isVisible: vi.fn(() => isVisible),

      close: vi.fn(() => {
        isDestroyed = true;
        const handler = instance._listeners.get('closed');
        if (handler) handler();
      }),
      destroy: vi.fn(() => {
        isDestroyed = true;
        const handler = instance._listeners.get('closed');
        if (handler) handler();
      }),
      isDestroyed: vi.fn(() => isDestroyed),

      maximize: vi.fn(() => {
        isMaximized = true;
      }),
      unmaximize: vi.fn(() => {
        isMaximized = false;
      }),
      isMaximized: vi.fn(() => isMaximized),

      minimize: vi.fn(),
      reload: vi.fn(),

      setSkipTaskbar: vi.fn(),
      setOverlayIcon: vi.fn(),

      setAlwaysOnTop: vi.fn((flag) => {
        isAlwaysOnTop = flag;
      }),
      isAlwaysOnTop: vi.fn(() => isAlwaysOnTop),

      focus: vi.fn(),
      setPosition: vi.fn(),
      setSize: vi.fn(),
      on: vi.fn((event, handler) => {
        instance._listeners.set(event, handler);
      }),
      once: vi.fn((event, handler) => {
        instance._listeners.set(event, handler);
      }),
      id: Math.random(),
    };
    BrowserWindow._instances.push(instance);
    // Assign properties to 'this'
    Object.assign(this, instance);
  }

  static getAllWindows = vi.fn(() => BrowserWindow._instances);
  static fromWebContents = vi.fn(() => BrowserWindow._instances[0] || null);
  static getFocusedWindow = vi.fn(() => BrowserWindow._instances[0] || null);

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
  },
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
    setPermissionRequestHandler: vi.fn(),
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
  },
};

export const screen = {
  getCursorScreenPoint: vi.fn().mockReturnValue({ x: 500, y: 500 }),
  getDisplayNearestPoint: vi.fn().mockReturnValue({
    workArea: { x: 0, y: 0 },
    workAreaSize: { width: 1920, height: 1080 },
  }),
  _reset: () => {
    screen.getCursorScreenPoint.mockClear();
    screen.getDisplayNearestPoint.mockClear();
  },
};

export const shell = {
  openExternal: vi.fn().mockResolvedValue(undefined),
};

export const dialog = {
  showSaveDialog: vi.fn().mockResolvedValue({ canceled: false, filePath: '/mock/path.pdf' }),
  showErrorBox: vi.fn(),
  showMessageBox: vi.fn().mockResolvedValue({ response: 0 }),
  showOpenDialog: vi.fn().mockResolvedValue({ canceled: false, filePaths: [] }),
  _reset: () => {
    dialog.showSaveDialog.mockClear();
    dialog.showErrorBox.mockClear();
    dialog.showMessageBox.mockClear();
    dialog.showOpenDialog.mockClear();
  },
};

export const contextBridge = {
  exposeInMainWorld: vi.fn(),
};

export const nativeImage = {
  createFromPath: vi.fn((_path) => ({
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
  },
};

export const globalShortcut = {
  register: vi.fn().mockReturnValue(true),
  unregister: vi.fn(),
  unregisterAll: vi.fn(),
  isRegistered: vi.fn().mockReturnValue(false),
  _reset: () => {
    globalShortcut.register.mockClear();
    globalShortcut.unregister.mockClear();
    globalShortcut.unregisterAll.mockClear();
    globalShortcut.isRegistered.mockClear();
  },
};

// ============================================================================
// Tray Mock
// ============================================================================
export class Tray {
  static _instances: any[] = [];
  iconPath: string;
  private _tooltip: string = '';
  private _contextMenu: any = null;
  private _clickHandler: ((event: any) => void) | null = null;
  private _isDestroyed: boolean = false;

  constructor(iconPath: string) {
    this.iconPath = iconPath;
    Tray._instances.push(this);
  }

  setToolTip = vi.fn((tip: string) => {
    this._tooltip = tip;
  });
  setContextMenu = vi.fn((menu: any) => {
    this._contextMenu = menu;
  });
  on = vi.fn((event: string, handler: (event: any) => void) => {
    if (event === 'click') {
      this._clickHandler = handler;
    }
  });
  destroy = vi.fn(() => {
    this._isDestroyed = true;
  });
  isDestroyed = vi.fn(() => this._isDestroyed);

  // Test helpers
  getTooltip() {
    return this._tooltip;
  }
  getContextMenu() {
    return this._contextMenu;
  }
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
export interface Menu {
  items: MenuItem[];
  popup: () => void;
}

export class MenuItem {
  label?: string;
  id?: string;
  type?: string;
  checked?: boolean;
  submenu?: Menu;
  click?: Function;
  enabled?: boolean;
  role?: string;
  accelerator?: string;

  constructor(options: any) {
    this.label = options.label;
    this.id = options.id;
    this.type = options.type;
    this.checked = options.checked;
    this.click = options.click;
    this.enabled = options.enabled;
    this.role = options.role;
    this.accelerator = options.accelerator;

    if (options.submenu) {
      this.submenu = Menu.buildFromTemplate(options.submenu);
    }
  }
}

export const Menu = {
  buildFromTemplate: vi.fn((template: any[]) => {
    const items = template.map((item) => new MenuItem(item));

    const getMenuItemById = (id: string): MenuItem | undefined => {
      const find = (list: MenuItem[]): MenuItem | undefined => {
        for (const item of list) {
          if (item.id === id) return item;
          if (item.submenu) {
            // submenu is a Menu-like object with items
            const found = find(item.submenu.items);
            if (found) return found;
          }
        }
        return undefined;
      };
      return find(items);
    };

    return {
      items,
      popup: vi.fn(),
      getMenuItemById: getMenuItemById,
    };
  }),
  setApplicationMenu: vi.fn(),
  _reset: () => {
    Menu.buildFromTemplate.mockClear();
    Menu.setApplicationMenu.mockClear();
  },
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
  dialog,
  contextBridge,
  globalShortcut,
  systemPreferences,
  Tray,
  Menu,
};

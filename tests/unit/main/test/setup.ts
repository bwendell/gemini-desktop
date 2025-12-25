/**
 * Test setup for Electron main process tests.
 * Mocks Electron APIs that are not available in Node environment.
 *
 * This file uses ESM-style imports since Vitest runs in ESM mode.
 *
 * @module ElectronTestSetup
 */
import { vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Mock: Electron app module
// ============================================================================
export const mockApp = {
  getPath: vi.fn((name) => {
    const paths = {
      userData: '/mock/userData',
      appData: '/mock/appData',
      temp: '/mock/temp',
      home: '/mock/home',
    };
    return (paths as Record<string, string>)[name] || `/mock/${name}`;
  }),
  isPackaged: false,
  whenReady: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  quit: vi.fn(),
};

// ============================================================================
// Mock: Electron BrowserWindow
// ============================================================================
export const createMockWebContents = () => ({
  send: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  openDevTools: vi.fn(),
  setWindowOpenHandler: vi.fn(),
});

export const createMockBrowserWindow = () => {
  const webContents = createMockWebContents();
  return {
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
    webContents,
    id: Math.random(),
  };
};

export class MockBrowserWindow {
  static _instances: MockBrowserWindow[] = [];
  options: any;

  constructor(options = {}) {
    const mock = createMockBrowserWindow();
    Object.assign(this, mock);
    this.options = options;
    MockBrowserWindow._instances.push(this);
  }

  static getAllWindows = vi.fn(() => MockBrowserWindow._instances);
  static fromWebContents = vi.fn(() => MockBrowserWindow._instances[0] || null);

  static _reset() {
    MockBrowserWindow._instances = [];
  }
}

// ============================================================================
// Mock: Electron ipcMain
// ============================================================================
export const mockIpcMain = {
  on: vi.fn(),
  handle: vi.fn(),
  removeHandler: vi.fn(),
  once: vi.fn(),
};

// ============================================================================
// Mock: Electron session
// ============================================================================
export const mockWebRequest = {
  onHeadersReceived: vi.fn(),
  onBeforeSendHeaders: vi.fn(),
};

export const mockSession = {
  defaultSession: {
    webRequest: mockWebRequest,
  },
};

// ============================================================================
// Mock: Electron nativeTheme
// ============================================================================
export const mockNativeTheme = {
  themeSource: 'system',
  shouldUseDarkColors: true,
  on: vi.fn(),
};

// ============================================================================
// Mock: Electron shell
// ============================================================================
export const mockShell = {
  openExternal: vi.fn().mockResolvedValue(undefined),
};

// ============================================================================
// Mock: Electron contextBridge (for preload)
// ============================================================================
export const mockContextBridge = {
  exposeInMainWorld: vi.fn(),
};

// ============================================================================
// Mock: Electron ipcRenderer (for preload)
// ============================================================================
export const mockIpcRenderer = {
  send: vi.fn(),
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
};

// ============================================================================
// Mock the electron module for CJS require
// ============================================================================
// Vitest alias works for ESM import, but not for CJS require.
// We patch Module.prototype.require to capture require('electron') calls.


import electronMock from './electron-mock';

const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function (id: string) {
  if (id === 'electron') {
    return electronMock;
  }
  // eslint-disable-next-line prefer-rest-params
  return originalRequire.apply(this, arguments);
};

// Also verify vitest ESM mock is still active via alias
// import { session } from 'electron';
beforeEach(() => {
  vi.clearAllMocks();
  MockBrowserWindow._reset();
  mockNativeTheme.themeSource = 'system';
  mockNativeTheme.shouldUseDarkColors = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

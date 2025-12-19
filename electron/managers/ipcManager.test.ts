/**
 * Unit tests for IpcManager.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ipcMain, nativeTheme, BrowserWindow } from 'electron';
import IpcManager from './ipcManager';
import SettingsStore from '../store';

// Mock SettingsStore to prevent side effects during import
vi.mock('../store', () => {
    return {
        default: vi.fn()
    };
});

// Mock fs
vi.mock('fs', () => ({
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
}));

// Mock logger
const mockLogger = {
    log: vi.fn((...args) => console.log('[MOCK_LOG]', ...args)),
    error: vi.fn((...args) => console.error('[MOCK_ERROR]', ...args)),
    warn: vi.fn((...args) => console.warn('[MOCK_WARN]', ...args))
};
vi.mock('../utils/logger', () => ({
    createLogger: () => mockLogger
}));

describe('IpcManager', () => {
    let ipcManager: any;
    let mockWindowManager: any;
    let mockStore: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Reset Electron mocks
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((nativeTheme as any)._reset) (nativeTheme as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();

        // Setup WindowManager mock
        mockWindowManager = {
            createOptionsWindow: vi.fn(),
            createAuthWindow: vi.fn().mockReturnValue({
                on: vi.fn((event, handler) => {
                    if (event === 'closed') handler();
                })
            })
        };

        // Create mock store explicitly
        mockStore = {
            get: vi.fn().mockReturnValue('system'),
            set: vi.fn()
        };

        ipcManager = new IpcManager(mockWindowManager, null, mockStore as any, mockLogger);
    });

    describe('constructor', () => {
        it('initializes store and native theme', () => {
            expect(mockStore.get).toHaveBeenCalledWith('theme');
            expect(nativeTheme.themeSource).toBe('system');
        });

        it('sets native theme from store', () => {
            const darkStore = {
                get: vi.fn().mockReturnValue('dark'),
                set: vi.fn()
            };

            new IpcManager(mockWindowManager, null, darkStore as any, mockLogger);
            expect(nativeTheme.themeSource).toBe('dark');
        });
    });

    describe('setupIpcHandlers', () => {
        it('registers all handlers', () => {
            ipcManager.setupIpcHandlers();

            const hasHandler = (channel: string) => (ipcMain as any)._handlers.has(channel);
            const hasListener = (channel: string) => (ipcMain as any)._listeners.has(channel);

            expect(hasListener('window-minimize')).toBe(true);
            expect(hasListener('window-maximize')).toBe(true);
            expect(hasListener('window-close')).toBe(true);
            expect(hasHandler('window-is-maximized')).toBe(true);
            expect(hasHandler('theme:get')).toBe(true);
            expect(hasListener('theme:set')).toBe(true);
            expect(hasHandler('hotkeys:get')).toBe(true);
            expect(hasListener('hotkeys:set')).toBe(true);
            expect(hasListener('open-options-window')).toBe(true);
            expect(hasHandler('open-google-signin')).toBe(true);
        });
    });

    describe('Window Handlers', () => {
        let mockWindow: any;
        let mockEvent: any;

        beforeEach(() => {
            ipcManager.setupIpcHandlers();
            mockWindow = {
                id: 1,
                minimize: vi.fn(),
                maximize: vi.fn(),
                unmaximize: vi.fn(),
                close: vi.fn(),
                isMaximized: vi.fn().mockReturnValue(false),
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: {
                    send: vi.fn()
                }
            };
            mockEvent = { sender: {} };
            (BrowserWindow as any).fromWebContents = vi.fn().mockReturnValue(mockWindow);
        });

        it('handles window-minimize', () => {
            const handler = (ipcMain as any)._listeners.get('window-minimize');
            handler(mockEvent);
            expect(mockWindow.minimize).toHaveBeenCalled();
        });

        it('handles window-maximize (maximize)', () => {
            const handler = (ipcMain as any)._listeners.get('window-maximize');
            mockWindow.isMaximized.mockReturnValue(false);
            handler(mockEvent);
            expect(mockWindow.maximize).toHaveBeenCalled();
        });

        it('handles window-maximize (unmaximize)', () => {
            const handler = (ipcMain as any)._listeners.get('window-maximize');
            mockWindow.isMaximized.mockReturnValue(true);
            handler(mockEvent);
            expect(mockWindow.unmaximize).toHaveBeenCalled();
        });

        it('handles window-close', () => {
            const handler = (ipcMain as any)._listeners.get('window-close');
            handler(mockEvent);
            expect(mockWindow.close).toHaveBeenCalled();
        });

        it('handles window-is-maximized', async () => {
            const handler = (ipcMain as any)._handlers.get('window-is-maximized');
            mockWindow.isMaximized.mockReturnValue(true);
            const result = await handler(mockEvent);
            expect(result).toBe(true);
        });
    });

    describe('Theme Handlers', () => {
        beforeEach(() => {
            ipcManager.setupIpcHandlers();
        });

        it('handles theme:get', async () => {
            mockStore.get.mockReturnValue('light');
            (nativeTheme as any).shouldUseDarkColors = false;

            const handler = (ipcMain as any)._handlers.get('theme:get');
            const result = await handler();

            expect(result).toEqual({ preference: 'light', effectiveTheme: 'light' });
        });

        it('handles theme:set', () => {
            const handler = (ipcMain as any)._listeners.get('theme:set');
            const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
            (BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([mockWin]);

            handler({}, 'dark');

            expect(mockStore.set).toHaveBeenCalledWith('theme', 'dark');
            expect(nativeTheme.themeSource).toBe('dark');
            expect(mockWin.webContents.send).toHaveBeenCalledWith('theme:changed', {
                preference: 'dark',
                effectiveTheme: 'dark'
            });
        });

        it('validates theme input', () => {
            const handler = (ipcMain as any)._listeners.get('theme:set');
            handler({}, 'invalid-theme');
            expect(mockStore.set).not.toHaveBeenCalled();
        });
    });

    describe('Hotkey Handlers', () => {
        let mockHotkeyManager: any;

        beforeEach(() => {
            mockHotkeyManager = {
                setEnabled: vi.fn(),
                isEnabled: vi.fn().mockReturnValue(true)
            };
            ipcManager = new IpcManager(mockWindowManager, mockHotkeyManager, mockStore as any, mockLogger);
            ipcManager.setupIpcHandlers();
        });

        it('handles hotkeys:get', async () => {
            mockStore.get.mockReturnValue(true);

            const handler = (ipcMain as any)._handlers.get('hotkeys:get');
            const result = await handler();

            expect(result).toEqual({ enabled: true });
        });

        it('handles hotkeys:get with false value', async () => {
            mockStore.get.mockReturnValue(false);

            const handler = (ipcMain as any)._handlers.get('hotkeys:get');
            const result = await handler();

            expect(result).toEqual({ enabled: false });
        });

        it('handles hotkeys:get with undefined (defaults to true)', async () => {
            mockStore.get.mockReturnValue(undefined);

            const handler = (ipcMain as any)._handlers.get('hotkeys:get');
            const result = await handler();

            expect(result).toEqual({ enabled: true });
        });

        it('handles hotkeys:set to disable', () => {
            const handler = (ipcMain as any)._listeners.get('hotkeys:set');
            const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
            (BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([mockWin]);

            handler({}, false);

            expect(mockStore.set).toHaveBeenCalledWith('hotkeysEnabled', false);
            expect(mockHotkeyManager.setEnabled).toHaveBeenCalledWith(false);
            expect(mockWin.webContents.send).toHaveBeenCalledWith('hotkeys:changed', { enabled: false });
        });

        it('handles hotkeys:set to enable', () => {
            const handler = (ipcMain as any)._listeners.get('hotkeys:set');
            const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
            (BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([mockWin]);

            handler({}, true);

            expect(mockStore.set).toHaveBeenCalledWith('hotkeysEnabled', true);
            expect(mockHotkeyManager.setEnabled).toHaveBeenCalledWith(true);
            expect(mockWin.webContents.send).toHaveBeenCalledWith('hotkeys:changed', { enabled: true });
        });

        it('validates hotkeys:set input (rejects non-boolean)', () => {
            const handler = (ipcMain as any)._listeners.get('hotkeys:set');
            handler({}, 'invalid');
            expect(mockStore.set).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid hotkeys enabled value: invalid');
        });

        it('handles hotkeys:set without hotkeyManager', () => {
            // Create IpcManager without hotkeyManager
            ipcManager = new IpcManager(mockWindowManager, null, mockStore as any, mockLogger);
            ipcManager.setupIpcHandlers();

            const handler = (ipcMain as any)._listeners.get('hotkeys:set');
            const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
            (BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([mockWin]);

            // Should not throw when hotkeyManager is null
            handler({}, false);
            expect(mockStore.set).toHaveBeenCalledWith('hotkeysEnabled', false);
        });

        it('logs error when hotkeys:get fails', async () => {
            const handler = (ipcMain as any)._handlers.get('hotkeys:get');
            mockStore.get.mockImplementationOnce(() => { throw new Error('Get Failed'); });
            const result = await handler();
            expect(result).toEqual({ enabled: true });
            expect(mockLogger.error).toHaveBeenCalledWith('Error getting hotkeys state:', expect.anything());
        });

        it('logs error when hotkeys:set fails', () => {
            const handler = (ipcMain as any)._listeners.get('hotkeys:set');
            mockStore.set.mockImplementationOnce(() => { throw new Error('Set Failed'); });
            handler({}, true);
            expect(mockLogger.error).toHaveBeenCalledWith('Error setting hotkeys enabled:', expect.anything());
        });

        it('logs error when broadcasting hotkeys fails', () => {
            const handler = (ipcMain as any)._listeners.get('hotkeys:set');
            const badWindow = {
                isDestroyed: () => false,
                webContents: { send: vi.fn().mockImplementation(() => { throw new Error('Send Failed'); }) },
                id: 99
            };
            (BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([badWindow]);

            handler({}, true);
            expect(mockLogger.error).toHaveBeenCalledWith('Error broadcasting hotkeys change to window:', expect.anything());
        });

        it('skips destroyed windows when broadcasting', () => {
            const handler = (ipcMain as any)._listeners.get('hotkeys:set');
            const destroyedWindow = {
                isDestroyed: () => true,
                webContents: { send: vi.fn() },
                id: 1
            };
            const goodWindow = {
                isDestroyed: () => false,
                webContents: { send: vi.fn() },
                id: 2
            };
            (BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([destroyedWindow, goodWindow]);

            handler({}, true);

            expect(destroyedWindow.webContents.send).not.toHaveBeenCalled();
            expect(goodWindow.webContents.send).toHaveBeenCalledWith('hotkeys:changed', { enabled: true });
        });
    });

    describe('App Handlers', () => {
        beforeEach(() => {
            ipcManager.setupIpcHandlers();
        });

        it('handles open-options-window', () => {
            const handler = (ipcMain as any)._listeners.get('open-options-window');
            handler();
            expect(mockWindowManager.createOptionsWindow).toHaveBeenCalled();
        });

        it('handles open-google-signin', async () => {
            const handler = (ipcMain as any)._handlers.get('open-google-signin');
            await handler();
            expect(mockWindowManager.createAuthWindow).toHaveBeenCalled();
        });
    });

    describe('Error Handling Scenarios', () => {
        let mockEvent: any;
        let mockWindow: any;

        beforeEach(() => {
            ipcManager.setupIpcHandlers();
            mockEvent = { sender: {} };
            mockWindow = {
                id: 1,
                minimize: vi.fn(),
                maximize: vi.fn(),
                unmaximize: vi.fn(),
                close: vi.fn(),
                isMaximized: vi.fn(),
                isDestroyed: vi.fn().mockReturnValue(false),
                webContents: { send: vi.fn() }
            };
            (BrowserWindow as any).fromWebContents = vi.fn().mockReturnValue(mockWindow);
        });

        it('logs error when window-minimize fails', () => {
            const handler = (ipcMain as any)._listeners.get('window-minimize');
            mockWindow.minimize.mockImplementationOnce(() => { throw new Error('Minimize Failed'); });
            handler(mockEvent);
            expect(mockLogger.error).toHaveBeenCalledWith('Error minimizing window:', expect.anything());
        });

        it('logs error when window-maximize fails', () => {
            const handler = (ipcMain as any)._listeners.get('window-maximize');
            mockWindow.isMaximized.mockReturnValue(false);
            mockWindow.maximize.mockImplementationOnce(() => { throw new Error('Max Failed'); });
            handler(mockEvent);
            expect(mockLogger.error).toHaveBeenCalledWith('Error toggling maximize:', expect.anything());
        });

        it('logs error when window-close fails', () => {
            const handler = (ipcMain as any)._listeners.get('window-close');
            mockWindow.close.mockImplementationOnce(() => { throw new Error('Close Failed'); });
            handler(mockEvent);
            expect(mockLogger.error).toHaveBeenCalledWith('Error closing window:', expect.anything());
        });

        it('logs error when window-is-maximized fails', async () => {
            const handler = (ipcMain as any)._handlers.get('window-is-maximized');
            mockWindow.isMaximized.mockImplementationOnce(() => { throw new Error('Check Failed'); });
            const result = await handler(mockEvent);
            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith('Error checking maximized state:', expect.anything());
        });

        it('logs error when initializing theme fails', () => {
            const badStore = {
                get: vi.fn().mockImplementation(() => { throw new Error('Store Error'); }),
                set: vi.fn()
            };
            new IpcManager(mockWindowManager, null, badStore as any, mockLogger);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize native theme:', expect.anything());
        });

        it('logs error when broadcasting theme fails', () => {
            const handler = (ipcMain as any)._listeners.get('theme:set');
            const badWindow = {
                isDestroyed: () => false,
                webContents: { send: vi.fn().mockImplementation(() => { throw new Error('Send Failed'); }) },
                id: 99
            };
            (BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([badWindow]);

            handler({}, 'dark');
            expect(mockLogger.error).toHaveBeenCalledWith('Error broadcasting theme to window:', expect.anything());
        });

        it('logs error when setting theme fails', () => {
            const handler = (ipcMain as any)._listeners.get('theme:set');
            mockStore.set.mockImplementationOnce(() => { throw new Error('Set Failed'); });
            handler({}, 'light');
            expect(mockLogger.error).toHaveBeenCalledWith('Error setting theme:', expect.anything());
        });

        it('logs error when getting theme fails', async () => {
            const handler = (ipcMain as any)._handlers.get('theme:get');
            mockStore.get.mockImplementationOnce(() => { throw new Error('Get Failed'); });
            const result = await handler();
            expect(result).toEqual({ preference: 'system', effectiveTheme: 'dark' });
            expect(mockLogger.error).toHaveBeenCalledWith('Error getting theme:', expect.anything());
        });

        it('logs error when getWindowFromEvent fails', () => {
            const handler = (ipcMain as any)._listeners.get('window-minimize');
            (BrowserWindow as any).fromWebContents.mockImplementationOnce(() => { throw new Error('FromWC Failed'); });
            handler(mockEvent);
            expect(mockLogger.error).toHaveBeenCalledWith('Failed to get window from event:', expect.anything());
        });

        it('logs error when open-options-window fails', () => {
            const handler = (ipcMain as any)._listeners.get('open-options-window');
            mockWindowManager.createOptionsWindow.mockImplementationOnce(() => { throw new Error('Failed'); });
            handler();
            expect(mockLogger.error).toHaveBeenCalledWith('Error opening options window:', expect.anything());
        });

        it('logs error when open-google-signin fails', async () => {
            const handler = (ipcMain as any)._handlers.get('open-google-signin');
            mockWindowManager.createAuthWindow.mockImplementationOnce(() => { throw new Error('Failed'); });
            await expect(handler()).rejects.toThrow('Failed');
            expect(mockLogger.error).toHaveBeenCalledWith('Error opening Google sign-in:', expect.anything());
        });
    });

    describe('Quick Chat Handlers', () => {
        beforeEach(() => {
            mockWindowManager.hideQuickChat = vi.fn();
            mockWindowManager.focusMainWindow = vi.fn();
            ipcManager.setupIpcHandlers();
        });

        it('handles quick-chat:submit', () => {
            const handler = (ipcMain as any)._listeners.get('quick-chat:submit');
            handler({}, 'Hello, this is my prompt text');

            expect(mockWindowManager.hideQuickChat).toHaveBeenCalled();
            expect(mockWindowManager.focusMainWindow).toHaveBeenCalled();
        });

        it('handles quick-chat:hide', () => {
            const handler = (ipcMain as any)._listeners.get('quick-chat:hide');
            handler();

            expect(mockWindowManager.hideQuickChat).toHaveBeenCalled();
        });

        it('handles quick-chat:cancel', () => {
            const handler = (ipcMain as any)._listeners.get('quick-chat:cancel');
            handler();

            expect(mockWindowManager.hideQuickChat).toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith('Quick Chat cancelled');
        });

        it('logs error when quick-chat:submit fails', () => {
            const handler = (ipcMain as any)._listeners.get('quick-chat:submit');
            mockWindowManager.hideQuickChat.mockImplementationOnce(() => { throw new Error('Hide Failed'); });
            handler({}, 'test');
            expect(mockLogger.error).toHaveBeenCalledWith('Error handling quick chat submit:', expect.anything());
        });

        it('logs error when quick-chat:hide fails', () => {
            const handler = (ipcMain as any)._listeners.get('quick-chat:hide');
            mockWindowManager.hideQuickChat.mockImplementationOnce(() => { throw new Error('Hide Failed'); });
            handler();
            expect(mockLogger.error).toHaveBeenCalledWith('Error hiding quick chat:', expect.anything());
        });

        it('logs error when quick-chat:cancel fails', () => {
            const handler = (ipcMain as any)._listeners.get('quick-chat:cancel');
            mockWindowManager.hideQuickChat.mockImplementationOnce(() => { throw new Error('Cancel Failed'); });
            handler();
            expect(mockLogger.error).toHaveBeenCalledWith('Error cancelling quick chat:', expect.anything());
        });
    });
});

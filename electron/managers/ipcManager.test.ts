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
            }),
            setAlwaysOnTop: vi.fn(),
            isAlwaysOnTop: vi.fn(),
            on: vi.fn(),
            emit: vi.fn(),
            removeListener: vi.fn(),
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
            expect(hasHandler('hotkeys:individual:get')).toBe(true);
            expect(hasListener('hotkeys:individual:set')).toBe(true);
            expect(hasHandler('always-on-top:get')).toBe(true);
            expect(hasListener('always-on-top:set')).toBe(true);
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

    describe('Individual Hotkey Handlers', () => {
        let mockHotkeyManager: any;

        beforeEach(() => {
            mockHotkeyManager = {
                setIndividualEnabled: vi.fn(),
                getIndividualSettings: vi.fn().mockReturnValue({ alwaysOnTop: true, bossKey: true, quickChat: true })
            };
            ipcManager = new IpcManager(mockWindowManager, mockHotkeyManager, mockStore as any, mockLogger);
            ipcManager.setupIpcHandlers();
        });

        it('handles hotkeys:individual:get', async () => {
            mockStore.get.mockImplementation((key: string) => {
                if (key === 'hotkeyAlwaysOnTop') return true;
                if (key === 'hotkeyBossKey') return false;
                if (key === 'hotkeyQuickChat') return true;
                return undefined;
            });

            const handler = (ipcMain as any)._handlers.get('hotkeys:individual:get');
            const result = await handler();

            expect(result).toEqual({ alwaysOnTop: true, bossKey: false, quickChat: true });
        });

        it('handles hotkeys:individual:get with defaults', async () => {
            mockStore.get.mockReturnValue(undefined);

            const handler = (ipcMain as any)._handlers.get('hotkeys:individual:get');
            const result = await handler();

            expect(result).toEqual({ alwaysOnTop: true, bossKey: true, quickChat: true });
        });

        it('handles hotkeys:individual:set for alwaysOnTop', () => {
            const handler = (ipcMain as any)._listeners.get('hotkeys:individual:set');
            const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
            (BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([mockWin]);
            mockStore.get.mockReturnValue(true);

            handler({}, 'alwaysOnTop', false);

            expect(mockStore.set).toHaveBeenCalledWith('hotkeyAlwaysOnTop', false);
            expect(mockHotkeyManager.setIndividualEnabled).toHaveBeenCalledWith('alwaysOnTop', false);
            expect(mockWin.webContents.send).toHaveBeenCalledWith(
                'hotkeys:individual:changed',
                expect.objectContaining({ alwaysOnTop: true, bossKey: true, quickChat: true })
            );
        });

        it('handles hotkeys:individual:set for bossKey', () => {
            const handler = (ipcMain as any)._listeners.get('hotkeys:individual:set');
            const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
            (BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([mockWin]);

            handler({}, 'bossKey', false);

            expect(mockStore.set).toHaveBeenCalledWith('hotkeyBossKey', false);
            expect(mockHotkeyManager.setIndividualEnabled).toHaveBeenCalledWith('bossKey', false);
        });

        it('handles hotkeys:individual:set for quickChat', () => {
            const handler = (ipcMain as any)._listeners.get('hotkeys:individual:set');
            const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
            (BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([mockWin]);

            handler({}, 'quickChat', true);

            expect(mockStore.set).toHaveBeenCalledWith('hotkeyQuickChat', true);
            expect(mockHotkeyManager.setIndividualEnabled).toHaveBeenCalledWith('quickChat', true);
        });

        it('validates hotkeys:individual:set input (rejects invalid id)', () => {
            const handler = (ipcMain as any)._listeners.get('hotkeys:individual:set');
            handler({}, 'invalidId', false);
            expect(mockStore.set).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid hotkey id: invalidId');
        });

        it('validates hotkeys:individual:set input (rejects non-boolean)', () => {
            const handler = (ipcMain as any)._listeners.get('hotkeys:individual:set');
            handler({}, 'alwaysOnTop', 'invalid');
            expect(mockStore.set).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid enabled value: invalid');
        });

        it('handles hotkeys:individual:set without hotkeyManager', () => {
            // Create IpcManager without hotkeyManager
            ipcManager = new IpcManager(mockWindowManager, null, mockStore as any, mockLogger);
            ipcManager.setupIpcHandlers();

            const handler = (ipcMain as any)._listeners.get('hotkeys:individual:set');
            const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
            (BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([mockWin]);

            // Should not throw when hotkeyManager is null
            handler({}, 'alwaysOnTop', false);
            expect(mockStore.set).toHaveBeenCalledWith('hotkeyAlwaysOnTop', false);
        });

        it('logs error when hotkeys:individual:get fails', async () => {
            const handler = (ipcMain as any)._handlers.get('hotkeys:individual:get');
            mockStore.get.mockImplementationOnce(() => { throw new Error('Get Failed'); });
            const result = await handler();
            expect(result).toEqual({ alwaysOnTop: true, bossKey: true, quickChat: true });
            expect(mockLogger.error).toHaveBeenCalledWith('Error getting individual hotkeys state:', expect.anything());
        });

        it('logs error when hotkeys:individual:set fails', () => {
            const handler = (ipcMain as any)._listeners.get('hotkeys:individual:set');
            mockStore.set.mockImplementationOnce(() => { throw new Error('Set Failed'); });
            handler({}, 'alwaysOnTop', true);
            expect(mockLogger.error).toHaveBeenCalledWith('Error setting individual hotkey:', expect.anything());
        });

        it('logs error when broadcasting individual hotkeys fails', () => {
            const handler = (ipcMain as any)._listeners.get('hotkeys:individual:set');
            const badWindow = {
                isDestroyed: () => false,
                webContents: { send: vi.fn().mockImplementation(() => { throw new Error('Send Failed'); }) },
                id: 99
            };
            (BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([badWindow]);

            handler({}, 'quickChat', true);
            expect(mockLogger.error).toHaveBeenCalledWith('Error broadcasting individual hotkey change to window:', expect.anything());
        });

        it('skips destroyed windows when broadcasting', () => {
            const handler = (ipcMain as any)._listeners.get('hotkeys:individual:set');
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
            mockStore.get.mockReturnValue(true);

            handler({}, 'bossKey', true);

            expect(destroyedWindow.webContents.send).not.toHaveBeenCalled();
            expect(goodWindow.webContents.send).toHaveBeenCalledWith(
                'hotkeys:individual:changed',
                expect.objectContaining({ alwaysOnTop: true, bossKey: true, quickChat: true })
            );
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
        let mockFrame: any;
        let mockMainWin: any;

        beforeEach(() => {
            mockWindowManager.hideQuickChat = vi.fn();
            mockWindowManager.focusMainWindow = vi.fn();

            // Mock main window and frames for injection
            mockFrame = {
                url: 'https://gemini.google.com/app',
                executeJavaScript: vi.fn().mockResolvedValue(true)
            };

            mockMainWin = {
                webContents: {
                    mainFrame: {
                        frames: [mockFrame]
                    }
                }
            };
            mockWindowManager.getMainWindow = vi.fn().mockReturnValue(mockMainWin);

            ipcManager.setupIpcHandlers();
        });

        it('handles quick-chat:submit and injects text', async () => {
            const handler = (ipcMain as any)._listeners.get('quick-chat:submit');
            await handler({}, 'Hello, this is my prompt text');

            expect(mockWindowManager.hideQuickChat).toHaveBeenCalled();
            expect(mockWindowManager.focusMainWindow).toHaveBeenCalled();
            expect(mockWindowManager.getMainWindow).toHaveBeenCalled();

            // Verify injection
            expect(mockFrame.executeJavaScript).toHaveBeenCalled();
            const script = mockFrame.executeJavaScript.mock.calls[0][0];
            expect(script).toContain('Hello, this is my prompt text');
        });

        it('escapes special characters in injected text', async () => {
            const handler = (ipcMain as any)._listeners.get('quick-chat:submit');
            const funnyText = "Text with 'quotes' and \\ slashes and \n newlines";
            await handler({}, funnyText);

            const script = mockFrame.executeJavaScript.mock.calls[0][0];
            // Check that executeJavaScript was called with escaped text
            // The script string itself should contain escaped versions
            expect(script).toContain("\\\\"); // Escaped backslash
            expect(script).toContain("\\'"); // Escaped quote
            expect(script).toContain("\\n"); // Escaped newline
        });

        it('logs error when main window not found on submit', async () => {
            mockWindowManager.getMainWindow.mockReturnValue(null);
            const handler = (ipcMain as any)._listeners.get('quick-chat:submit');

            await handler({}, 'test');

            expect(mockLogger.error).toHaveBeenCalledWith('Cannot inject text: main window not found');
        });

        it('logs error when Gemini frame not found on submit', async () => {
            mockMainWin.webContents.mainFrame.frames = [{ url: 'https://google.com' }]; // Wrong domain
            const handler = (ipcMain as any)._listeners.get('quick-chat:submit');

            await handler({}, 'test');

            expect(mockLogger.error).toHaveBeenCalledWith('Cannot inject text: Gemini iframe not found');
        });

        it('logs error when injection script execution fails', async () => {
            mockFrame.executeJavaScript.mockRejectedValue(new Error('Script Error'));
            const handler = (ipcMain as any)._listeners.get('quick-chat:submit');

            await handler({}, 'test');

            expect(mockLogger.error).toHaveBeenCalledWith('Failed to inject text into Gemini:', expect.anything());
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

        it('logs error when quick-chat:submit fails synchronously', () => {
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

    describe('Always On Top Handlers', () => {
        beforeEach(() => {
            mockWindowManager.setAlwaysOnTop = vi.fn();
            ipcManager.setupIpcHandlers();
        });

        it('handles always-on-top:get with true', async () => {
            mockStore.get.mockReturnValue(true);

            const handler = (ipcMain as any)._handlers.get('always-on-top:get');
            const result = await handler();

            expect(result).toEqual({ enabled: true });
        });

        it('handles always-on-top:get with false', async () => {
            mockStore.get.mockReturnValue(false);

            const handler = (ipcMain as any)._handlers.get('always-on-top:get');
            const result = await handler();

            expect(result).toEqual({ enabled: false });
        });

        it('handles always-on-top:get with undefined (defaults to false)', async () => {
            mockStore.get.mockReturnValue(undefined);

            const handler = (ipcMain as any)._handlers.get('always-on-top:get');
            const result = await handler();

            expect(result).toEqual({ enabled: false });
        });

        it('handles always-on-top:set by delegating to windowManager', () => {
            const handler = (ipcMain as any)._listeners.get('always-on-top:set');

            handler({}, true);

            expect(mockWindowManager.setAlwaysOnTop).toHaveBeenCalledWith(true);
            // Verify it DOES NOT persist/broadcast directly anymore
            expect(mockStore.set).not.toHaveBeenCalled();
        });

        it('handles always-on-top-changed event by persisting and broadcasting', () => {
            // Retrieve the listener registered in setupIpcHandlers
            const calls = mockWindowManager.on.mock.calls;
            const changeListenerCall = calls.find((c: any) => c[0] === 'always-on-top-changed');
            expect(changeListenerCall).toBeDefined();
            const listener = changeListenerCall[1];

            const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
            (BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([mockWin]);

            // Simulate event from WindowManager
            listener(true);

            expect(mockStore.set).toHaveBeenCalledWith('alwaysOnTop', true);
            expect(mockWin.webContents.send).toHaveBeenCalledWith('always-on-top:changed', { enabled: true });
        });

        it('handles always-on-top-changed event (disabled state)', () => {
            // Retrieve the listener
            const calls = mockWindowManager.on.mock.calls;
            const changeListenerCall = calls.find((c: any) => c[0] === 'always-on-top-changed');
            const listener = changeListenerCall[1];

            const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
            (BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([mockWin]);

            // Simulate event
            listener(false);

            expect(mockStore.set).toHaveBeenCalledWith('alwaysOnTop', false);
            expect(mockWin.webContents.send).toHaveBeenCalledWith('always-on-top:changed', { enabled: false });
        });

        it('validates always-on-top:set input (rejects non-boolean)', () => {
            const handler = (ipcMain as any)._listeners.get('always-on-top:set');
            handler({}, 'invalid');
            expect(mockStore.set).not.toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith('Invalid alwaysOnTop value: invalid');
        });

        it('logs error when always-on-top:get fails', async () => {
            const handler = (ipcMain as any)._handlers.get('always-on-top:get');
            mockStore.get.mockImplementationOnce(() => { throw new Error('Get Failed'); });
            const result = await handler();
            expect(result).toEqual({ enabled: false });
            expect(mockLogger.error).toHaveBeenCalledWith('Error getting always on top state:', expect.anything());
        });

        it('logs error when always-on-top:set fails', () => {
            const handler = (ipcMain as any)._listeners.get('always-on-top:set');
            mockWindowManager.setAlwaysOnTop.mockImplementationOnce(() => { throw new Error('Set Failed'); });
            handler({}, true);
            expect(mockLogger.error).toHaveBeenCalledWith('Error setting always on top:', expect.anything());
        });

        it('logs error when broadcasting always-on-top fails', () => {
            const calls = mockWindowManager.on.mock.calls;
            const changeListenerCall = calls.find((c: any) => c[0] === 'always-on-top-changed');
            const listener = changeListenerCall[1];

            const badWindow = {
                isDestroyed: () => false,
                webContents: { send: vi.fn().mockImplementation(() => { throw new Error('Send Failed'); }) },
                id: 99
            };
            (BrowserWindow as any).getAllWindows = vi.fn().mockReturnValue([badWindow]);

            listener(true);

            expect(mockLogger.error).toHaveBeenCalledWith('Error broadcasting always on top change to window:', expect.anything());
        });

        it('skips destroyed windows when broadcasting', () => {
            const calls = mockWindowManager.on.mock.calls;
            const changeListenerCall = calls.find((c: any) => c[0] === 'always-on-top-changed');
            const listener = changeListenerCall[1];

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

            listener(true);

            expect(destroyedWindow.webContents.send).not.toHaveBeenCalled();
            expect(goodWindow.webContents.send).toHaveBeenCalledWith('always-on-top:changed', { enabled: true });
        });
    });

    it('initializes always-on-top from stored preference when enabled', () => {
        mockStore.get.mockImplementation((key: string) => {
            if (key === 'alwaysOnTop') return true;
            return 'system';
        });

        const newManager = new IpcManager(mockWindowManager, null, mockStore as any, mockLogger);
        newManager.setupIpcHandlers();

        expect(mockWindowManager.setAlwaysOnTop).toHaveBeenCalledWith(true);
    });

    it('does not call setAlwaysOnTop when preference is false', () => {
        mockStore.get.mockImplementation((key: string) => {
            if (key === 'alwaysOnTop') return false;
            return 'system';
        });

        mockWindowManager.setAlwaysOnTop.mockClear();
        const newManager = new IpcManager(mockWindowManager, null, mockStore as any, mockLogger);
        newManager.setupIpcHandlers();

        expect(mockWindowManager.setAlwaysOnTop).not.toHaveBeenCalled();
    });

    it('logs error when initializing always-on-top fails', () => {
        const badStore = {
            get: vi.fn().mockImplementation((key: string) => {
                if (key === 'alwaysOnTop') throw new Error('Store Error');
                return 'system';
            }),
            set: vi.fn()
        };
        const manager = new IpcManager(mockWindowManager, null, badStore as any, mockLogger);
        manager.setupIpcHandlers();
        expect(mockLogger.error).toHaveBeenCalledWith('Failed to initialize always on top:', expect.anything());
    });
});


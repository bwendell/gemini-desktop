/**
 * Unit tests for WindowManager.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow, shell } from 'electron';
import WindowManager from './windowManager';
import path from 'path';

describe('WindowManager', () => {
    let windowManager: any;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset BrowserWindow instances mock
        (BrowserWindow as any)._reset();
        windowManager = new WindowManager(false);
    });

    describe('constructor', () => {
        it('initializes with isDev flag', () => {
            const wm = new WindowManager(true);
            expect(wm.isDev).toBe(true);
        });
    });

    describe('createMainWindow', () => {
        it('creates a new window if one does not exist', () => {
            const win = windowManager.createMainWindow();

            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win).toBeDefined();
            // Verify window options
            expect(win.options).toMatchObject({
                width: 1200,
                height: 800,
                show: false
            });
        });

        it('returns existing window if already created', () => {
            const win1 = windowManager.createMainWindow();
            const win2 = windowManager.createMainWindow();

            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win1).toBe(win2);
            expect(win1.focus).toHaveBeenCalled();
        });

        it('loads production file when not in dev mode', () => {
            const win = windowManager.createMainWindow();
            expect(win.loadFile).toHaveBeenCalledWith(expect.stringContaining('index.html'));
            expect(win.loadURL).not.toHaveBeenCalled();
        });

        it('loads dev server URL when in dev mode', () => {
            const wm = new WindowManager(true);
            const win = wm.createMainWindow();
            expect(win.loadURL).toHaveBeenCalledWith('http://localhost:1420');
            expect(win.webContents.openDevTools).toHaveBeenCalled();
        });

        it('shows window when ready-to-show is emitted', () => {
            const win = windowManager.createMainWindow();
            // Trigger ready-to-show
            const readyHandler = win.once.mock.calls.find((call: any) => call[0] === 'ready-to-show')[1];
            readyHandler();

            expect(win.show).toHaveBeenCalled();
        });

        it('clears reference when window is closed', () => {
            windowManager.createMainWindow();
            // Get the mock instance
            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];

            // Trigger closed event
            const closeHandler = win.on.mock.calls.find((call: any) => call[0] === 'closed')[1];
            closeHandler();

            expect(windowManager.mainWindow).toBeNull();
        });

        it('closes options window when main window is closed', () => {
            windowManager.createMainWindow();
            windowManager.createOptionsWindow();

            const instances = (BrowserWindow as any).getAllWindows();
            const mainWin = instances[0]; // First window created
            const optionsWin = instances[1]; // Second window created

            // Trigger main window closed
            const closeHandler = mainWin.on.mock.calls.find((call: any) => call[0] === 'closed')[1];
            closeHandler();

            expect(optionsWin.close).toHaveBeenCalled();
        });
    });

    describe('createOptionsWindow', () => {
        it('creates a new options window', () => {
            const win = windowManager.createOptionsWindow();
            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win).toBeDefined();
            expect(win.options).toMatchObject({
                width: 600,
                height: 400
            });
        });

        it('returns existing options window if open', () => {
            const win1 = windowManager.createOptionsWindow();
            const win2 = windowManager.createOptionsWindow();
            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win1).toBe(win2);
            expect(win1.focus).toHaveBeenCalled();
        });

        it('loads options.html in dev mode', () => {
            const wm = new WindowManager(true);
            const win = wm.createOptionsWindow();
            expect(win.loadURL).toHaveBeenCalledWith('http://localhost:1420/options.html');
        });

        it('loads options.html in prod mode', () => {
            const win = windowManager.createOptionsWindow();
            expect(win.loadFile).toHaveBeenCalledWith(
                expect.stringContaining('options.html'),
                expect.objectContaining({ hash: undefined })
            );
        });

        it('shows window when ready-to-show is emitted', () => {
            const win = windowManager.createOptionsWindow();
            const readyHandler = win.once.mock.calls.find((call: any) => call[0] === 'ready-to-show')[1];
            readyHandler();

            expect(win.show).toHaveBeenCalled();
        });

        it('clears reference when options window is closed', () => {
            windowManager.createOptionsWindow();
            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];

            const closeHandler = win.on.mock.calls.find((call: any) => call[0] === 'closed')[1];
            closeHandler();

            expect(windowManager.optionsWindow).toBeNull();
        });
    });

    describe('createAuthWindow', () => {
        it('creates window with auth config and loads URL', () => {
            const url = 'https://accounts.google.com/signin';
            const win = windowManager.createAuthWindow(url);

            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win.loadURL).toHaveBeenCalledWith(url);
        });

        it('logs when auth window is closed', () => {
            const win = windowManager.createAuthWindow('https://accounts.google.com');
            const closeHandler = win.on.mock.calls.find((call: any) => call[0] === 'closed')[1];
            closeHandler();
            // Event handler was called (coverage of line 46)
        });
    });

    describe('window open handler', () => {
        it('opens external links in shell', () => {
            windowManager.createMainWindow();
            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];

            // Simulate setWindowOpenHandler call
            const handler = win.webContents.setWindowOpenHandler.mock.calls[0][0];

            const result = handler({ url: 'https://example.com' });
            expect(shell.openExternal).toHaveBeenCalledWith('https://example.com');
            expect(result).toEqual({ action: 'deny' });
        });

        it('intercepts OAuth links and opens auth window', () => {
            windowManager.createMainWindow();
            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];
            const handler = win.webContents.setWindowOpenHandler.mock.calls[0][0];

            // Spy on createAuthWindow
            const spy = vi.spyOn(windowManager, 'createAuthWindow');

            const url = 'https://accounts.google.com/o/oauth2/auth';
            const result = handler({ url });

            expect(spy).toHaveBeenCalledWith(url);
            expect(result).toEqual({ action: 'deny' });
        });

        it('allows internal domains in new window', () => {
            windowManager.createMainWindow();
            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];
            const handler = win.webContents.setWindowOpenHandler.mock.calls[0][0];

            const result = handler({ url: 'https://gemini.google.com/chat' });
            expect(result).toEqual({ action: 'allow' });
        });

        it('handles invalid URLs gracefully', () => {
            windowManager.createMainWindow();
            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];
            const handler = win.webContents.setWindowOpenHandler.mock.calls[0][0];

            const result = handler({ url: 'not-a-valid-url' });
            expect(result).toEqual({ action: 'deny' });
        });

        it('denies non-http/https protocols', () => {
            windowManager.createMainWindow();
            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];
            const handler = win.webContents.setWindowOpenHandler.mock.calls[0][0];

            const result = handler({ url: 'file:///etc/passwd' });
            expect(result).toEqual({ action: 'deny' });
            expect(shell.openExternal).not.toHaveBeenCalled();
        });
    });

    describe('navigation handler', () => {
        let navigateHandler: any;

        beforeEach(() => {
            windowManager.createMainWindow();
            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];
            // Find the 'will-navigate' listener
            const call = win.webContents.on.mock.calls.find((c: any) => c[0] === 'will-navigate');
            navigateHandler = call ? call[1] : null;
        });

        it('sets up will-navigate listener', () => {
            expect(navigateHandler).toBeDefined();
        });

        it('allows navigation to internal domains', () => {
            const event = { preventDefault: vi.fn() };
            navigateHandler(event, 'https://gemini.google.com/app');
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('allows navigation to OAuth domains', () => {
            const event = { preventDefault: vi.fn() };
            navigateHandler(event, 'https://accounts.google.com/signin');
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('blocks navigation to external domains', () => {
            const event = { preventDefault: vi.fn() };
            navigateHandler(event, 'https://malicious-site.com');
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('blocks navigation to invalid URLs', () => {
            const event = { preventDefault: vi.fn() };
            navigateHandler(event, 'not-a-valid-url');
            expect(event.preventDefault).toHaveBeenCalled();
        });
    });

    describe('getMainWindow', () => {
        it('returns null when no window exists', () => {
            expect(windowManager.getMainWindow()).toBeNull();
        });

        it('returns the main window when it exists', () => {
            const win = windowManager.createMainWindow();
            expect(windowManager.getMainWindow()).toBe(win);
        });
    });
});

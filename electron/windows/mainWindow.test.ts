/**
 * Unit tests for MainWindow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow, shell } from 'electron';
import MainWindow from './mainWindow';

const mocks = vi.hoisted(() => ({
    isMacOS: false,
}));

vi.mock('../utils/constants', async (importOriginal) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual = await importOriginal<any>();
    return {
        ...actual,
        get isMacOS() {
            return mocks.isMacOS;
        },
    };
});

vi.mock('../utils/paths', async (importOriginal) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual = await importOriginal<any>();
    return {
        ...actual,
        getIconPath: vi.fn().mockReturnValue('/mock/icon/path.png'),
    };
});

describe('MainWindow', () => {
    let mainWindow: MainWindow;

    beforeEach(() => {
        vi.clearAllMocks();
        (BrowserWindow as any)._reset();
        mainWindow = new MainWindow(false);
    });

    describe('create', () => {
        it('creates a new window if one does not exist', () => {
            const win = mainWindow.create();

            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win).toBeDefined();
            expect(win.options).toMatchObject({
                width: 1200,
                height: 800,
                show: false,
            });
        });

        it('returns existing window if already created', () => {
            const win1 = mainWindow.create();
            const win2 = mainWindow.create();

            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win1).toBe(win2);
            expect(win1.focus).toHaveBeenCalled();
        });

        it('loads production file when not in dev mode', () => {
            const win = mainWindow.create();
            expect(win.loadFile).toHaveBeenCalledWith(expect.stringContaining('index.html'));
            expect(win.loadURL).not.toHaveBeenCalled();
        });

        it('loads dev server URL when in dev mode', () => {
            const devWindow = new MainWindow(true);
            const win = devWindow.create();
            expect(win.loadURL).toHaveBeenCalledWith('http://localhost:1420');
            expect(win.webContents.openDevTools).toHaveBeenCalled();
        });

        it('shows window when ready-to-show is emitted', () => {
            const win = mainWindow.create();
            const readyHandler = win.once.mock.calls.find((call: any) => call[0] === 'ready-to-show')[1];
            readyHandler();

            expect(win.show).toHaveBeenCalled();
        });
    });

    describe('navigation handler', () => {
        let navigateHandler: any;

        beforeEach(() => {
            mainWindow.create();
            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];
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

        it('allows navigation to local file:// protocol', () => {
            const event = { preventDefault: vi.fn() };
            navigateHandler(event, 'file:///C:/path/to/app/index.html');
            expect(event.preventDefault).not.toHaveBeenCalled();
        });
    });

    describe('window open handler', () => {
        it('opens external links in shell', () => {
            mainWindow.create();
            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];
            const handler = win.webContents.setWindowOpenHandler.mock.calls[0][0];

            const result = handler({ url: 'https://example.com' });
            expect(shell.openExternal).toHaveBeenCalledWith('https://example.com');
            expect(result).toEqual({ action: 'deny' });
        });

        it('intercepts OAuth links and calls auth callback', () => {
            const authCallback = vi.fn();
            mainWindow.setAuthWindowCallback(authCallback);
            mainWindow.create();

            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];
            const handler = win.webContents.setWindowOpenHandler.mock.calls[0][0];

            const url = 'https://accounts.google.com/o/oauth2/auth';
            const result = handler({ url });

            expect(authCallback).toHaveBeenCalledWith(url);
            expect(result).toEqual({ action: 'deny' });
        });

        it('allows internal domains in new window', () => {
            mainWindow.create();
            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];
            const handler = win.webContents.setWindowOpenHandler.mock.calls[0][0];

            const result = handler({ url: 'https://gemini.google.com/chat' });
            expect(result).toEqual({ action: 'allow' });
        });
    });

    describe('hideToTray', () => {
        beforeEach(() => {
            mocks.isMacOS = false;
        });

        it('hides window and sets skipTaskbar on Windows', () => {
            mocks.isMacOS = false;
            const win = mainWindow.create();

            mainWindow.hideToTray();

            expect(win.hide).toHaveBeenCalled();
            expect(win.setSkipTaskbar).toHaveBeenCalledWith(true);
        });

        it('only hides window on macOS (no skipTaskbar call)', () => {
            mocks.isMacOS = true;
            const win = mainWindow.create();

            mainWindow.hideToTray();

            expect(win.hide).toHaveBeenCalled();
            expect(win.setSkipTaskbar).not.toHaveBeenCalled();
        });

        it('calls close options callback when hiding', () => {
            const closeOptionsCallback = vi.fn();
            mainWindow.setCloseOptionsCallback(closeOptionsCallback);
            mainWindow.create();

            mainWindow.hideToTray();

            expect(closeOptionsCallback).toHaveBeenCalled();
        });
    });

    describe('restoreFromTray', () => {
        beforeEach(() => {
            mocks.isMacOS = false;
        });

        it('shows, focuses window and clears skipTaskbar on Windows', () => {
            mocks.isMacOS = false;
            const win = mainWindow.create();

            mainWindow.restoreFromTray();

            expect(win.show).toHaveBeenCalled();
            expect(win.focus).toHaveBeenCalled();
            expect(win.setSkipTaskbar).toHaveBeenCalledWith(false);
        });

        it('only shows and focuses window on macOS', () => {
            mocks.isMacOS = true;
            const win = mainWindow.create();

            mainWindow.restoreFromTray();

            expect(win.show).toHaveBeenCalled();
            expect(win.focus).toHaveBeenCalled();
            expect(win.setSkipTaskbar).not.toHaveBeenCalled();
        });
    });

    describe('setAlwaysOnTop', () => {
        it('sets always on top and emits event', () => {
            const win = mainWindow.create();
            const listener = vi.fn();
            mainWindow.on('always-on-top-changed', listener);

            mainWindow.setAlwaysOnTop(true);

            expect(win.setAlwaysOnTop).toHaveBeenCalledWith(true);
            expect(listener).toHaveBeenCalledWith(true);
        });
    });

    describe('isAlwaysOnTop', () => {
        it('returns current always on top state', () => {
            const win = mainWindow.create();
            win.isAlwaysOnTop = vi.fn().mockReturnValue(true);

            expect(mainWindow.isAlwaysOnTop()).toBe(true);
        });

        it('returns false when window not created', () => {
            expect(mainWindow.isAlwaysOnTop()).toBe(false);
        });
    });

    describe('minimize', () => {
        it('minimizes the window', () => {
            const win = mainWindow.create();
            mainWindow.minimize();
            expect(win.minimize).toHaveBeenCalled();
        });
    });
});

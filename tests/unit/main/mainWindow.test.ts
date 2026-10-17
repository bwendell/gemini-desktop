/**
 * Unit tests for MainWindow.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow, shell } from 'electron';
import MainWindow from '../../../src/main/windows/mainWindow';
import type { PlatformAdapter } from '../../../src/main/platform/PlatformAdapter';

import { platformAdapterPresets, resetPlatformAdapterForTests, useMockPlatformAdapter } from '../../helpers/mocks';

vi.mock('../../../src/main/utils/paths', async (importOriginal) => {
    type PathsModule = typeof import('../../../src/main/utils/paths');
    const actual = await importOriginal<PathsModule>();
    return {
        ...actual,
        getIconPath: vi.fn().mockReturnValue('/mock/icon/path.png'),
    };
});

describe('MainWindow', () => {
    let mainWindow: MainWindow;
    let adapter: PlatformAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        (BrowserWindow as any)._reset();
        resetPlatformAdapterForTests({ resetModules: true });
        adapter = platformAdapterPresets['linux-x11']();
        useMockPlatformAdapter(adapter);
        mainWindow = new MainWindow(false, adapter);
    });

    afterEach(() => {
        resetPlatformAdapterForTests({ resetModules: true });
    });

    describe('create', () => {
        it('creates a new window if one does not exist', () => {
            const win = mainWindow.create();

            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win).toBeDefined();
            expect((win as any).options).toMatchObject({
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
            const readyHandler = (win.once as any).mock.calls.find(
                (call: [string, () => void]) => call[0] === 'ready-to-show'
            )?.[1];
            readyHandler?.();

            expect(win.show).toHaveBeenCalled();
        });
    });

    describe('navigation handler', () => {
        type NavigateHandler = (event: { preventDefault: () => void }, url: string) => void;
        let navigateHandler: NavigateHandler | null;

        beforeEach(() => {
            mainWindow.create();
            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];
            const call = win.webContents.on.mock.calls.find((c: [string, NavigateHandler]) => c[0] === 'will-navigate');
            navigateHandler = call ? call[1] : null;
        });

        it('sets up will-navigate listener', () => {
            expect(navigateHandler).toBeDefined();
        });

        it('allows navigation to internal domains', () => {
            const event = { preventDefault: vi.fn() };
            navigateHandler!(event as any, 'https://gemini.google.com/app');
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('allows navigation to OAuth domains', () => {
            const event = { preventDefault: vi.fn() };
            navigateHandler!(event as any, 'https://accounts.google.com/signin');
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('blocks navigation to external domains', () => {
            const event = { preventDefault: vi.fn() };
            navigateHandler!(event as any, 'https://malicious-site.com');
            expect(event.preventDefault).toHaveBeenCalled();
        });

        it('allows navigation to local file:// protocol', () => {
            const event = { preventDefault: vi.fn() };
            navigateHandler!(event as any, 'file:///C:/path/to/app/index.html');
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it('handles invalid URL in navigation handler', () => {
            const event = { preventDefault: vi.fn() };
            // Triggering throw by passing a malformed URL that causes URL constructor to fail
            navigateHandler!(event as any, 'not-a-url');
            expect(event.preventDefault).toHaveBeenCalled();
        });
    });

    describe('sign-in from a Gemini tab', () => {
        type FakeFrame = { url: string; parent: FakeFrame | null };
        type FrameNavigateDetails = {
            url: string;
            isMainFrame: boolean;
            frame: FakeFrame | null;
            preventDefault: ReturnType<typeof vi.fn>;
        };
        type FakeAuthWindow = {
            once: ReturnType<typeof vi.fn>;
            focus: ReturnType<typeof vi.fn>;
            isDestroyed: ReturnType<typeof vi.fn>;
            webContents: { on: ReturnType<typeof vi.fn> };
        };

        const GEMINI_TAB_URL = 'https://gemini.google.com/app';
        // The link behind Gemini's own Sign in button, and where Gemini's server redirects a tab
        const SIGN_IN_URL =
            'https://accounts.google.com/ServiceLogin?passive=1209600&continue=https%3A%2F%2Fgemini.google.com%2Fapp';

        // The main window's own frame, a tab (one of its iframes) and a frame inside a tab
        const mainFrame = (): FakeFrame => ({ url: 'file:///app/index.html', parent: null });
        const tabFrame = (url = GEMINI_TAB_URL): FakeFrame => ({ url, parent: mainFrame() });
        const frameInTab = (url = 'about:blank'): FakeFrame => ({ url, parent: tabFrame() });

        let win: any;
        let authWindows: FakeAuthWindow[];
        let authCallback: ReturnType<typeof vi.fn>;

        const handlerFor = (event: string): ((details: FrameNavigateDetails) => void) =>
            win.webContents.on.mock.calls.find((call: [string, unknown]) => call[0] === event)[1];

        const send = (
            event: 'will-frame-navigate' | 'will-redirect',
            url: string,
            frame: FakeFrame | null,
            isMainFrame = false
        ): FrameNavigateDetails => {
            const details: FrameNavigateDetails = { url, isMainFrame, frame, preventDefault: vi.fn() };
            handlerFor(event)(details);
            return details;
        };
        const navigateFrame = (url: string, frame: FakeFrame | null, isMainFrame = false) =>
            send('will-frame-navigate', url, frame, isMainFrame);

        const closeAuthWindow = (authWindow: FakeAuthWindow, { signedIn }: { signedIn: boolean }) => {
            if (signedIn) {
                const onNavigate = authWindow.webContents.on.mock.calls.find(
                    (call: [string, unknown]) => call[0] === 'did-navigate'
                )[1];
                onNavigate({}, `${GEMINI_TAB_URL}?hl=en`);
            }
            authWindow.isDestroyed.mockReturnValue(true);
            const [event, onClosed] = authWindow.once.mock.calls[0];
            expect(event).toBe('closed');
            onClosed();
        };

        beforeEach(() => {
            authWindows = [];
            authCallback = vi.fn(() => {
                const authWindow: FakeAuthWindow = {
                    once: vi.fn(),
                    focus: vi.fn(),
                    isDestroyed: vi.fn().mockReturnValue(false),
                    webContents: { on: vi.fn() },
                };
                authWindows.push(authWindow);
                return authWindow;
            });
            mainWindow.setAuthWindowCallback(authCallback);
            win = mainWindow.create();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('opens the sign-in page in the auth window instead of the tab', () => {
            const details = navigateFrame(SIGN_IN_URL, tabFrame());

            expect(details.preventDefault).toHaveBeenCalled();
            expect(authCallback).toHaveBeenCalledWith(SIGN_IN_URL);
        });

        it.each([
            ['a tab that is loading', tabFrame('')],
            ['a tab that shows Gemini', tabFrame()],
        ])('opens a server redirect of %s to sign-in in the auth window', (_name, frame) => {
            const details = send('will-redirect', SIGN_IN_URL, frame);

            expect(details.preventDefault).toHaveBeenCalled();
            expect(authCallback).toHaveBeenCalledWith(SIGN_IN_URL);
        });

        it('reloads the main window after the auth window closes', () => {
            navigateFrame(SIGN_IN_URL, tabFrame());
            expect(win.reload).not.toHaveBeenCalled();

            closeAuthWindow(authWindows[0], { signedIn: true });

            expect(win.reload).toHaveBeenCalledTimes(1);
        });

        it('does not reload a main window that is already destroyed', () => {
            navigateFrame(SIGN_IN_URL, tabFrame());
            win.isDestroyed.mockReturnValue(true);

            closeAuthWindow(authWindows[0], { signedIn: true });

            expect(win.reload).not.toHaveBeenCalled();
        });

        it('focuses the open sign-in window instead of opening another', () => {
            navigateFrame(SIGN_IN_URL, tabFrame());
            const second = send('will-redirect', SIGN_IN_URL, tabFrame(''));

            expect(second.preventDefault).toHaveBeenCalled();
            expect(authCallback).toHaveBeenCalledTimes(1);
            expect(authWindows[0].focus).toHaveBeenCalled();
        });

        it('does not reopen sign-in in a loop when a tab is sent back right after signing in', () => {
            vi.useFakeTimers();
            navigateFrame(SIGN_IN_URL, tabFrame());
            closeAuthWindow(authWindows[0], { signedIn: true });

            const again = send('will-redirect', SIGN_IN_URL, tabFrame(''));
            expect(again.preventDefault).toHaveBeenCalled();
            expect(authCallback).toHaveBeenCalledTimes(1);

            vi.advanceTimersByTime(30000);
            send('will-redirect', SIGN_IN_URL, tabFrame(''));
            expect(authCallback).toHaveBeenCalledTimes(2);
        });

        it('opens sign-in again at once when the last sign-in window was closed without signing in', () => {
            navigateFrame(SIGN_IN_URL, tabFrame());
            closeAuthWindow(authWindows[0], { signedIn: false });

            navigateFrame(SIGN_IN_URL, tabFrame());

            expect(authCallback).toHaveBeenCalledTimes(2);
            expect(win.reload).toHaveBeenCalledTimes(1);
        });

        it.each([
            [
                'a hidden accounts frame that Gemini adds in a tab',
                'https://accounts.google.com/RotateCookiesPage',
                frameInTab(),
            ],
            ['a navigation inside Gemini', 'https://gemini.google.com/app/abc123', tabFrame()],
            ['an invalid URL', 'not a url', tabFrame()],
        ])('leaves %s alone', (_name, url, frame) => {
            for (const event of ['will-frame-navigate', 'will-redirect'] as const) {
                const details = send(event, url, frame);
                expect(details.preventDefault).not.toHaveBeenCalled();
            }
            expect(authCallback).not.toHaveBeenCalled();
        });

        it('leaves main frame navigations to the will-navigate handler', () => {
            const details = navigateFrame(SIGN_IN_URL, mainFrame(), true);

            expect(details.preventDefault).not.toHaveBeenCalled();
            expect(authCallback).not.toHaveBeenCalled();
        });

        it('ignores a frame that is already gone', () => {
            const details = navigateFrame(SIGN_IN_URL, null);

            expect(details.preventDefault).not.toHaveBeenCalled();
            expect(authCallback).not.toHaveBeenCalled();
        });

        it('still keeps the sign-in page out of the tab when no auth callback is set', () => {
            (mainWindow as any).createAuthWindowCallback = undefined;

            const details = navigateFrame(SIGN_IN_URL, tabFrame());

            expect(details.preventDefault).toHaveBeenCalled();
            expect(authCallback).not.toHaveBeenCalled();
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

        it('handles invalid URL in window open handler', () => {
            mainWindow.create();
            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];
            const openHandler = win.webContents.setWindowOpenHandler.mock.calls[0][0];

            // Malformed URL should be handled gracefully
            const result = openHandler({ url: '::malformed' });
            expect(result).toEqual({ action: 'deny' });
        });
    });

    describe('hideToTray', () => {
        it('hides window and sets skipTaskbar on Windows/Linux', () => {
            const win = mainWindow.create();

            mainWindow.hideToTray();

            expect(win.hide).toHaveBeenCalled();
            expect(win.setSkipTaskbar).toHaveBeenCalledWith(true);
        });

        it('only hides window on macOS (no skipTaskbar call)', () => {
            const macAdapter = platformAdapterPresets.mac();
            useMockPlatformAdapter(macAdapter);
            const macWindow = new MainWindow(false, macAdapter);
            const win = macWindow.create();

            macWindow.hideToTray();

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

        it('handles hideToTray when window is not created', () => {
            mainWindow.hideToTray();
            // Should just log a warning and return without crashing
        });
    });

    describe('restoreFromTray', () => {
        it('shows, focuses window and clears skipTaskbar on Windows/Linux', () => {
            const win = mainWindow.create();

            mainWindow.restoreFromTray();

            expect(win.show).toHaveBeenCalled();
            expect(win.focus).toHaveBeenCalled();
            expect(win.setSkipTaskbar).toHaveBeenCalledWith(false);
        });

        it('only shows and focuses window on macOS', () => {
            const macAdapter = platformAdapterPresets.mac();
            useMockPlatformAdapter(macAdapter);
            const macWindow = new MainWindow(false, macAdapter);
            const win = macWindow.create();

            macWindow.restoreFromTray();

            expect(win.show).toHaveBeenCalled();
            expect(win.focus).toHaveBeenCalled();
            expect(win.setSkipTaskbar).not.toHaveBeenCalled();
        });

        it('handles error in restoreFromTray', () => {
            const win = mainWindow.create();
            vi.mocked(win.show).mockImplementation(() => {
                throw new Error('Show failed');
            });

            // Should not crash when show() throws
            mainWindow.restoreFromTray();
        });

        it('handles restoreFromTray when window is not created', () => {
            mainWindow.restoreFromTray();
            // Should just log a warning and return without crashing
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

    describe('before-input-event handler', () => {
        type InputHandler = (event: { preventDefault: () => void }, input: any) => void;
        let inputHandler: InputHandler | null;
        let winMock: any;

        beforeEach(() => {
            mainWindow.create();
            const instances = (BrowserWindow as any).getAllWindows();
            winMock = instances[0];
            const call = winMock.webContents.on.mock.calls.find(
                (c: [string, InputHandler]) => c[0] === 'before-input-event'
            );
            inputHandler = call ? call[1] : null;
        });

        it('sets up before-input-event listener', () => {
            expect(inputHandler).toBeDefined();
        });

        it('toggles fullscreen on F11 keydown', () => {
            const event = { preventDefault: vi.fn() };

            inputHandler!(event as any, { type: 'keyDown', key: 'F11' });

            expect(event.preventDefault).toHaveBeenCalled();
            expect(winMock.setFullScreen).toHaveBeenCalledWith(true);
        });

        it('does not toggle fullscreen on non-F11 keydown', () => {
            const event = { preventDefault: vi.fn() };

            inputHandler!(event as any, { type: 'keyDown', key: 'F10' });

            expect(event.preventDefault).not.toHaveBeenCalled();
            expect(winMock.setFullScreen).not.toHaveBeenCalled();
        });
    });
});

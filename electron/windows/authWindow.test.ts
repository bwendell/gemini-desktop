/**
 * Unit tests for AuthWindow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow } from 'electron';
import AuthWindow from './authWindow';

vi.mock('../utils/paths', async (importOriginal) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual = await importOriginal<any>();
    return {
        ...actual,
        getIconPath: vi.fn().mockReturnValue('/mock/icon/path.png'),
    };
});

describe('AuthWindow', () => {
    let authWindow: AuthWindow;

    beforeEach(() => {
        vi.clearAllMocks();
        (BrowserWindow as any)._reset();
        authWindow = new AuthWindow(false);
    });

    describe('create', () => {
        it('creates window with auth config and loads URL', () => {
            const url = 'https://accounts.google.com/signin';
            const win = authWindow.create(url);

            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win.loadURL).toHaveBeenCalledWith(url);
        });

        it('closes existing auth window before creating a new one', () => {
            const win1 = authWindow.create('https://accounts.google.com');
            const win2 = authWindow.create('https://accounts.google.com/new');

            expect(win1.close).toHaveBeenCalled();
            expect(win2).not.toBe(win1);
        });

        it('sets up did-navigate listener', () => {
            const win = authWindow.create('https://accounts.google.com');
            const navigateCall = win.webContents.on.mock.calls.find((c: any) => c[0] === 'did-navigate');
            expect(navigateCall).toBeDefined();
        });

        it('auto-closes auth window when navigating to Gemini domain', () => {
            const win = authWindow.create('https://accounts.google.com');
            const navigateCall = win.webContents.on.mock.calls.find((c: any) => c[0] === 'did-navigate');
            const navigateHandler = navigateCall[1];

            navigateHandler({}, 'https://gemini.google.com/app');

            expect(win.close).toHaveBeenCalled();
        });

        it('does not close auth window when navigating between Google auth pages', () => {
            const win = authWindow.create('https://accounts.google.com');
            const navigateCall = win.webContents.on.mock.calls.find((c: any) => c[0] === 'did-navigate');
            const navigateHandler = navigateCall[1];

            navigateHandler({}, 'https://accounts.google.com/o/oauth2/v2/auth');

            expect(win.close).not.toHaveBeenCalled();
        });

        it('handles invalid navigation URLs gracefully', () => {
            const win = authWindow.create('https://accounts.google.com');
            const navigateCall = win.webContents.on.mock.calls.find((c: any) => c[0] === 'did-navigate');
            const navigateHandler = navigateCall[1];

            expect(() => navigateHandler({}, 'not-a-valid-url')).not.toThrow();
            expect(win.close).not.toHaveBeenCalled();
        });

        it('guards against destroyed window in did-navigate handler', () => {
            const win = authWindow.create('https://accounts.google.com');
            const navigateCall = win.webContents.on.mock.calls.find((c: any) => c[0] === 'did-navigate');
            const navigateHandler = navigateCall[1];

            win.isDestroyed = vi.fn().mockReturnValue(true);

            expect(() => navigateHandler({}, 'https://gemini.google.com/app')).not.toThrow();
            expect(win.close).not.toHaveBeenCalled();
        });

        it('sets up did-fail-load listener', () => {
            const win = authWindow.create('https://accounts.google.com');
            const failLoadCall = win.webContents.on.mock.calls.find((c: any) => c[0] === 'did-fail-load');
            expect(failLoadCall).toBeDefined();
        });

        it('handles did-fail-load event gracefully', () => {
            const win = authWindow.create('https://accounts.google.com');
            const failLoadCall = win.webContents.on.mock.calls.find((c: any) => c[0] === 'did-fail-load');
            const failLoadHandler = failLoadCall[1];

            expect(() =>
                failLoadHandler({}, -105, 'ERR_NAME_NOT_RESOLVED', 'https://accounts.google.com')
            ).not.toThrow();
            expect(win.close).not.toHaveBeenCalled();
        });

        it('sets up certificate-error listener', () => {
            const win = authWindow.create('https://accounts.google.com');
            const certErrorCall = win.webContents.on.mock.calls.find(
                (c: any) => c[0] === 'certificate-error'
            );
            expect(certErrorCall).toBeDefined();
        });

        it('denies certificate errors for security', () => {
            const win = authWindow.create('https://accounts.google.com');
            const certErrorCall = win.webContents.on.mock.calls.find(
                (c: any) => c[0] === 'certificate-error'
            );
            const certErrorHandler = certErrorCall[1];

            const callbackMock = vi.fn();
            certErrorHandler(
                {},
                'https://accounts.google.com',
                'ERR_CERT_AUTHORITY_INVALID',
                {},
                callbackMock
            );

            expect(callbackMock).toHaveBeenCalledWith(false);
        });

        it('sets up unresponsive handler', () => {
            const win = authWindow.create('https://accounts.google.com');
            const unresponsiveCall = win.on.mock.calls.find((c: any) => c[0] === 'unresponsive');
            expect(unresponsiveCall).toBeDefined();
        });

        it('handles unresponsive event gracefully', () => {
            const win = authWindow.create('https://accounts.google.com');
            const unresponsiveCall = win.on.mock.calls.find((c: any) => c[0] === 'unresponsive');
            const unresponsiveHandler = unresponsiveCall[1];

            expect(() => unresponsiveHandler()).not.toThrow();
        });

        it('sets up responsive handler', () => {
            const win = authWindow.create('https://accounts.google.com');
            const responsiveCall = win.on.mock.calls.find((c: any) => c[0] === 'responsive');
            expect(responsiveCall).toBeDefined();
        });

        it('clears window reference when closed', () => {
            authWindow.create('https://accounts.google.com');
            expect(authWindow.getWindow()).not.toBeNull();

            const win = (BrowserWindow as any).getAllWindows()[0];
            const closeHandler = win.on.mock.calls.find((call: any) => call[0] === 'closed')[1];
            closeHandler();

            expect(authWindow.getWindow()).toBeNull();
        });
    });

    describe('getWindow', () => {
        it('returns null when no window exists', () => {
            expect(authWindow.getWindow()).toBeNull();
        });

        it('returns the window when it exists', () => {
            authWindow.create('https://accounts.google.com');
            expect(authWindow.getWindow()).not.toBeNull();
        });
    });
});

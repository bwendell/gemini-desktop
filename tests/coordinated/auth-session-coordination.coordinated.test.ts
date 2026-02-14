import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow } from 'electron';
import AuthWindow from '../../src/main/windows/authWindow';
import WindowManager from '../../src/main/managers/windowManager';
import { platformAdapterPresets, useMockPlatformAdapter, resetPlatformAdapterForTests } from '../helpers/mocks';

vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/__mocks__/logger';

vi.mock('../../src/main/utils/paths', () => ({
    getIconPath: () => '/mock/icon.png',
    getPreloadPath: () => '/mock/preload.js',
    getDistHtmlPath: (filename: string) => `/mock/dist/${filename}`,
}));

vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
}));

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

describe('Auth Session Coordination', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests({ resetModules: true });
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(() => {
            useMockPlatformAdapter(adapterForPlatform[platform]());
        });

        describe('Auth Window Creation', () => {
            it('should create auth window successfully', () => {
                const authWindow = new AuthWindow(false);
                const window = authWindow.create('https://accounts.google.com/signin');

                expect(window).toBeDefined();
                expect(window.loadURL).toHaveBeenCalledWith('https://accounts.google.com/signin');
            });

            it('should create WindowManager auth window successfully', () => {
                const windowManager = new WindowManager(false);
                const authWindow = windowManager.createAuthWindow('https://accounts.google.com/signin');

                expect(authWindow).toBeDefined();
                expect(authWindow.loadURL).toHaveBeenCalledWith('https://accounts.google.com/signin');
            });
        });

        describe('OAuth Navigation Flow', () => {
            it('should load OAuth URL when auth window is created', () => {
                const authWindow = new AuthWindow(false);
                const oauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=xxx';
                const window = authWindow.create(oauthUrl);

                expect(window.loadURL).toHaveBeenCalledWith(oauthUrl);
            });

            it('should set up navigation handler for detecting sign-in completion', () => {
                const authWindow = new AuthWindow(false);
                const window = authWindow.create('https://accounts.google.com/signin');

                expect(window.webContents.on).toHaveBeenCalledWith('did-navigate', expect.any(Function));
            });

            it('should close auth window when navigating to internal domain', () => {
                const authWindow = new AuthWindow(false);
                const window = authWindow.create('https://accounts.google.com/signin');

                const onCalls = (window.webContents.on as any).mock.calls;
                const navigateCall = onCalls.find((call: any[]) => call[0] === 'did-navigate');
                const navigateHandler = navigateCall?.[1];

                expect(navigateHandler).toBeDefined();

                navigateHandler({}, 'https://gemini.google.com/app');

                expect(window.close).toHaveBeenCalled();
                expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Login successful'));
            });

            it('should not close auth window when navigating within external domains', () => {
                const authWindow = new AuthWindow(false);
                const window = authWindow.create('https://accounts.google.com/signin');

                const onCalls = (window.webContents.on as any).mock.calls;
                const navigateCall = onCalls.find((call: any[]) => call[0] === 'did-navigate');
                const navigateHandler = navigateCall?.[1];

                navigateHandler({}, 'https://accounts.google.com/signin/v2/challenge/pwd');

                expect(window.close).not.toHaveBeenCalled();
            });
        });

        describe('Error Handling', () => {
            it('should handle did-fail-load event without crashing', () => {
                const authWindow = new AuthWindow(false);
                const window = authWindow.create('https://accounts.google.com/signin');

                const onCalls = (window.webContents.on as any).mock.calls;
                const failLoadCall = onCalls.find((call: any[]) => call[0] === 'did-fail-load');
                const failLoadHandler = failLoadCall?.[1];

                expect(failLoadHandler).toBeDefined();

                expect(() => {
                    failLoadHandler({}, -3, 'ERR_NAME_NOT_RESOLVED', 'https://example.com');
                }).not.toThrow();

                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('failed to load'),
                    expect.any(Object)
                );
            });

            it('should handle certificate errors securely', () => {
                const authWindow = new AuthWindow(false);
                const window = authWindow.create('https://accounts.google.com/signin');

                const onCalls = (window.webContents.on as any).mock.calls;
                const certErrorCall = onCalls.find((call: any[]) => call[0] === 'certificate-error');
                const certErrorHandler = certErrorCall?.[1];

                expect(certErrorHandler).toBeDefined();

                const callback = vi.fn();

                certErrorHandler({}, 'https://example.com', 'ERR_CERT_AUTHORITY_INVALID', {}, callback);

                expect(callback).toHaveBeenCalledWith(false);
                expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Certificate error'));
            });

            it('should handle invalid URL in navigation gracefully', () => {
                const authWindow = new AuthWindow(false);
                const window = authWindow.create('https://accounts.google.com/signin');

                const onCalls = (window.webContents.on as any).mock.calls;
                const navigateCall = onCalls.find((call: any[]) => call[0] === 'did-navigate');
                const navigateHandler = navigateCall?.[1];

                expect(() => {
                    navigateHandler({}, 'not-a-valid-url');
                }).not.toThrow();

                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Invalid URL'),
                    expect.any(Object)
                );
            });
        });

        describe('Window Lifecycle', () => {
            it('should close existing auth window before creating new one', () => {
                const authWindow = new AuthWindow(false);

                const window1 = authWindow.create('https://accounts.google.com/signin');
                (window1 as any).isDestroyed = vi.fn().mockReturnValue(false);

                authWindow.create('https://accounts.google.com/signin');

                expect(window1.close).toHaveBeenCalled();
            });

            it('should emit closed event when auth window is closed', () => {
                const authWindow = new AuthWindow(false);
                const closedSpy = vi.fn();
                authWindow.on('closed', closedSpy);

                const window = authWindow.create('https://accounts.google.com/signin');

                const onCalls = (window.on as any).mock.calls;
                const closedCall = onCalls.find((call: any[]) => call[0] === 'closed');
                const closedHandler = closedCall?.[1];

                expect(closedHandler).toBeDefined();

                closedHandler();

                expect(closedSpy).toHaveBeenCalled();
            });

            it('should register unresponsive and responsive event handlers', () => {
                const authWindow = new AuthWindow(false);
                const window = authWindow.create('https://accounts.google.com/signin');

                const onCalls = (window.on as any).mock.calls;
                const unresponsiveCall = onCalls.find((call: any[]) => call[0] === 'unresponsive');
                const responsiveCall = onCalls.find((call: any[]) => call[0] === 'responsive');

                expect(unresponsiveCall).toBeDefined();
                expect(responsiveCall).toBeDefined();

                expect(() => unresponsiveCall?.[1]()).not.toThrow();
                expect(() => responsiveCall?.[1]()).not.toThrow();
            });
        });

        describe('WindowManager Auth Integration', () => {
            it('should provide auth window through WindowManager.createAuthWindow', () => {
                const windowManager = new WindowManager(false);
                const authWindow = windowManager.createAuthWindow('https://accounts.google.com/signin');

                expect(authWindow).toBeDefined();
            });

            it('should wire main window close to auth window close via callback', () => {
                const windowManager = new WindowManager(false);

                windowManager.createMainWindow();

                const authWindow = windowManager.createAuthWindow('https://accounts.google.com/signin');

                const internalAuthWindow = (windowManager as any).authWindow;
                expect(internalAuthWindow).toBeDefined();

                internalAuthWindow.close();
                expect(authWindow.close).toHaveBeenCalled();
            });

            it('should handle multiple auth window creations', () => {
                const windowManager = new WindowManager(false);

                const _authWindow1 = windowManager.createAuthWindow('https://accounts.google.com/signin');
                const authWindow2 = windowManager.createAuthWindow('https://accounts.google.com/o/oauth2');

                expect(authWindow2).toBeDefined();
            });
        });
    });
});

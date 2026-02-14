import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shell } from 'electron';
import MainWindow from '../../src/main/windows/mainWindow';

vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/__mocks__/logger';
import { platformAdapterPresets, useMockPlatformAdapter, resetPlatformAdapterForTests } from '../helpers/mocks';

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

describe('Navigation Security Integration', () => {
    let mockMainWindow: any;
    let webContentsHandlers: Record<string, Function> = {};
    let windowOpenHandler: Function | null = null;

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(() => {
            vi.clearAllMocks();
            useMockPlatformAdapter(adapterForPlatform[platform]());
            webContentsHandlers = {};
            windowOpenHandler = null;

            const mockWebContents = {
                on: vi.fn((event, handler) => {
                    webContentsHandlers[event] = handler;
                }),
                setWindowOpenHandler: vi.fn((handler) => {
                    windowOpenHandler = handler;
                }),
                openDevTools: vi.fn(),
                loadURL: vi.fn(),
                loadFile: vi.fn(),
                isDestroyed: vi.fn().mockReturnValue(false),
                session: {},
                mainFrame: { frames: [] },
            };

            mockMainWindow = {
                webContents: mockWebContents,
                once: vi.fn(),
                on: vi.fn(),
                show: vi.fn(),
                isDestroyed: vi.fn().mockReturnValue(false),
                loadURL: vi.fn(),
                loadFile: vi.fn(),
            };
        });

        afterEach(() => {
            resetPlatformAdapterForTests({ resetModules: true });
        });

        it('should allow navigation to internal files (file protocol)', () => {
            const mainWindow = new MainWindow(false);
            (mainWindow as any).window = mockMainWindow;
            (mainWindow as any).setupNavigationHandler();

            const handler = webContentsHandlers['will-navigate'];
            const mockEvent = { preventDefault: vi.fn() };
            handler(mockEvent, 'file:///app/index.html');

            expect(mockEvent.preventDefault).not.toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith(
                expect.stringContaining('Allowing navigation to local file'),
                expect.any(String)
            );
        });

        it('should allow navigation to internal Gemini domains', () => {
            const mainWindow = new MainWindow(false);
            (mainWindow as any).window = mockMainWindow;
            (mainWindow as any).setupNavigationHandler();

            const handler = webContentsHandlers['will-navigate'];
            const mockEvent = { preventDefault: vi.fn() };
            handler(mockEvent, 'https://gemini.google.com/app');

            expect(mockEvent.preventDefault).not.toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith(
                expect.stringContaining('Allowing navigation to internal URL'),
                expect.any(String)
            );
        });

        it('should allow navigation to OAuth domains', () => {
            const mainWindow = new MainWindow(false);
            (mainWindow as any).window = mockMainWindow;
            (mainWindow as any).setupNavigationHandler();

            const handler = webContentsHandlers['will-navigate'];
            const mockEvent = { preventDefault: vi.fn() };

            handler(mockEvent, 'https://accounts.google.com/signin');

            expect(mockEvent.preventDefault).not.toHaveBeenCalled();
            expect(mockLogger.log).toHaveBeenCalledWith(
                expect.stringContaining('Allowing navigation to OAuth URL'),
                expect.any(String)
            );
        });

        it('should BLOCK navigation to external domains', () => {
            const mainWindow = new MainWindow(false);
            (mainWindow as any).window = mockMainWindow;
            (mainWindow as any).setupNavigationHandler();

            const handler = webContentsHandlers['will-navigate'];
            const mockEvent = { preventDefault: vi.fn() };
            handler(mockEvent, 'https://malicious-site.com');

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('Blocked navigation to external URL'),
                expect.any(String)
            );
        });

        it('should intercept window.open for OAuth links and create auth window', () => {
            const mainWindow = new MainWindow(false);
            (mainWindow as any).window = mockMainWindow;
            const createAuthWindowMock = vi.fn();
            mainWindow.setAuthWindowCallback(createAuthWindowMock);
            (mainWindow as any).setupWindowOpenHandler();

            const handler = windowOpenHandler;
            const result = (handler as any)({ url: 'https://accounts.google.com/oauth' });

            expect(result).toEqual({ action: 'deny' });
            expect(createAuthWindowMock).toHaveBeenCalledWith('https://accounts.google.com/oauth');
            expect(mockLogger.log).toHaveBeenCalledWith(
                expect.stringContaining('Intercepting OAuth popup'),
                expect.any(String)
            );
        });

        it('should intercept window.open for external links and open values in system browser', () => {
            const mainWindow = new MainWindow(false);
            (mainWindow as any).window = mockMainWindow;
            (mainWindow as any).setupWindowOpenHandler();

            const handler = windowOpenHandler;
            const result = (handler as any)({ url: 'https://example.com' });

            expect(result).toEqual({ action: 'deny' });
            expect(shell.openExternal).toHaveBeenCalledWith('https://example.com');
        });

        it('should allow window.open for internal domains', () => {
            const mainWindow = new MainWindow(false);
            (mainWindow as any).window = mockMainWindow;
            (mainWindow as any).setupWindowOpenHandler();

            const handler = windowOpenHandler;

            const result = (handler as any)({ url: 'https://gemini.google.com/some-feature' });

            expect(result).toEqual({ action: 'allow' });
        });
    });
});

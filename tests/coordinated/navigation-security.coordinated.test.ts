/**
 * Integration tests for MainWindow navigation security.
 * Verifies that the window manager correctly blocks/allows URLs based on security policies.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { shell } from 'electron';

import MainWindow from '../../src/main/windows/mainWindow';

// Mock logger
const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));
vi.mock('../../src/main/utils/logger', () => ({
  createLogger: () => mockLogger,
}));

// Mock constants to be dynamic for platform testing
vi.mock('../../src/main/utils/constants', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    get isMacOS() {
      return process.platform === 'darwin';
    },
    get isWindows() {
      return process.platform === 'win32';
    },
    get isLinux() {
      return process.platform === 'linux';
    },
  };
});

describe('Navigation Security Integration', () => {
  let mockMainWindow: any;
  let webContentsHandlers: Record<string, Function> = {};
  let windowOpenHandler: Function | null = null;

  describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.stubGlobal('process', { ...process, platform });
      webContentsHandlers = {};
      windowOpenHandler = null;

      // Mock BrowserWindow implementation for this test
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
      vi.unstubAllGlobals();
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

      // Test: accounts.google.com
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

      // Test: window.open to internal domain (e.g. creating a child window for app features)
      const result = (handler as any)({ url: 'https://gemini.google.com/some-feature' });

      expect(result).toEqual({ action: 'allow' });
    });
  });
});

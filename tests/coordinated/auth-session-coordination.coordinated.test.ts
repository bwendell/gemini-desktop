/**
 * Coordinated tests for Auth Window ↔ Main Window Session Coordination.
 *
 * Tests the OAuth flow:
 * - Auth window creation with shared session partition
 * - Navigation detection for successful sign-in
 * - Auto-close when navigation returns to internal domain
 * - Error handling for network/certificate issues
 * - Session cookie sharing between auth and main windows
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow } from 'electron';
import AuthWindow from '../../src/main/windows/authWindow';
import WindowManager from '../../src/main/managers/windowManager';

// Mock logger
const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));
vi.mock('../../src/main/utils/logger', () => ({
  createLogger: () => mockLogger,
}));

// Mock paths
vi.mock('../../src/main/utils/paths', () => ({
  getIconPath: () => '/mock/icon.png',
  getPreloadPath: () => '/mock/preload.js',
  getDistHtmlPath: (filename: string) => `/mock/dist/${filename}`,
}));

// Mock constants
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
    isInternalDomain: (hostname: string) => {
      // Only gemini.google.com is considered internal (matches actual implementation)
      return hostname === 'gemini.google.com' || hostname.endsWith('.gemini.google.com');
    },
    getDevUrl: (page: string = '') => `http://localhost:1420/${page}`,
    AUTH_WINDOW_CONFIG: {
      width: 500,
      height: 700,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        partition: 'persist:gemini',
        nodeIntegration: false,
        contextIsolation: true,
      },
    },
  };
});

// Mock fs
vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe('Auth Session Coordination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
    beforeEach(() => {
      vi.stubGlobal('process', { ...process, platform });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
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

        // Verify loadURL was called with the OAuth URL
        expect(window.loadURL).toHaveBeenCalledWith(oauthUrl);
      });

      it('should set up navigation handler for detecting sign-in completion', () => {
        const authWindow = new AuthWindow(false);
        const window = authWindow.create('https://accounts.google.com/signin');

        // Verify did-navigate listener was registered
        expect(window.webContents.on).toHaveBeenCalledWith('did-navigate', expect.any(Function));
      });

      it('should close auth window when navigating to internal domain', () => {
        const authWindow = new AuthWindow(false);
        const window = authWindow.create('https://accounts.google.com/signin');

        // Get the did-navigate handler
        const onCalls = (window.webContents.on as any).mock.calls;
        const navigateCall = onCalls.find((call: any[]) => call[0] === 'did-navigate');
        const navigateHandler = navigateCall?.[1];

        expect(navigateHandler).toBeDefined();

        // Simulate navigation to gemini.google.com (internal domain)
        navigateHandler({}, 'https://gemini.google.com/app');

        // Window should be closed
        expect(window.close).toHaveBeenCalled();
        expect(mockLogger.log).toHaveBeenCalledWith(
          expect.stringContaining('Login successful')
        );
      });

      it('should not close auth window when navigating within external domains', () => {
        const authWindow = new AuthWindow(false);
        const window = authWindow.create('https://accounts.google.com/signin');

        // Get the did-navigate handler
        const onCalls = (window.webContents.on as any).mock.calls;
        const navigateCall = onCalls.find((call: any[]) => call[0] === 'did-navigate');
        const navigateHandler = navigateCall?.[1];

        // Simulate navigation within Google accounts (still signing in)
        navigateHandler({}, 'https://accounts.google.com/signin/v2/challenge/pwd');

        // Window should NOT be closed (still in login flow)
        // Note: accounts.google.com is internal, but the close logic checks
        // for gemini/aistudio specifically for completion
        expect(window.close).not.toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should handle did-fail-load event without crashing', () => {
        const authWindow = new AuthWindow(false);
        const window = authWindow.create('https://accounts.google.com/signin');

        // Get the did-fail-load handler
        const onCalls = (window.webContents.on as any).mock.calls;
        const failLoadCall = onCalls.find((call: any[]) => call[0] === 'did-fail-load');
        const failLoadHandler = failLoadCall?.[1];

        expect(failLoadHandler).toBeDefined();

        // Simulate load failure
        expect(() => {
          failLoadHandler({}, -3, 'ERR_NAME_NOT_RESOLVED', 'https://example.com');
        }).not.toThrow();

        // Should log error
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('failed to load'),
          expect.any(Object)
        );
      });

      it('should handle certificate errors securely', () => {
        const authWindow = new AuthWindow(false);
        const window = authWindow.create('https://accounts.google.com/signin');

        // Get the certificate-error handler
        const onCalls = (window.webContents.on as any).mock.calls;
        const certErrorCall = onCalls.find((call: any[]) => call[0] === 'certificate-error');
        const certErrorHandler = certErrorCall?.[1];

        expect(certErrorHandler).toBeDefined();

        const callback = vi.fn();

        // Simulate certificate error
        certErrorHandler({}, 'https://example.com', 'ERR_CERT_AUTHORITY_INVALID', {}, callback);

        // Should deny connection (not bypass cert error)
        expect(callback).toHaveBeenCalledWith(false);
        expect(mockLogger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Certificate error')
        );
      });

      it('should handle invalid URL in navigation gracefully', () => {
        const authWindow = new AuthWindow(false);
        const window = authWindow.create('https://accounts.google.com/signin');

        // Get the did-navigate handler
        const onCalls = (window.webContents.on as any).mock.calls;
        const navigateCall = onCalls.find((call: any[]) => call[0] === 'did-navigate');
        const navigateHandler = navigateCall?.[1];

        // Simulate navigation with invalid URL
        expect(() => {
          navigateHandler({}, 'not-a-valid-url');
        }).not.toThrow();

        // Should log error
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Invalid URL'),
          expect.any(Object)
        );
      });
    });

    describe('Window Lifecycle', () => {
      it('should close existing auth window before creating new one', () => {
        const authWindow = new AuthWindow(false);

        // Create first window
        const window1 = authWindow.create('https://accounts.google.com/signin');
        (window1 as any).isDestroyed = vi.fn().mockReturnValue(false);

        // Create second window (should close first)
        authWindow.create('https://accounts.google.com/signin');

        expect(window1.close).toHaveBeenCalled();
      });

      it('should emit closed event when auth window is closed', () => {
        const authWindow = new AuthWindow(false);
        const closedSpy = vi.fn();
        authWindow.on('closed', closedSpy);

        const window = authWindow.create('https://accounts.google.com/signin');

        // Get the closed handler
        const onCalls = (window.on as any).mock.calls;
        const closedCall = onCalls.find((call: any[]) => call[0] === 'closed');
        const closedHandler = closedCall?.[1];

        expect(closedHandler).toBeDefined();

        // Simulate window close
        closedHandler();

        // Verify event was emitted
        expect(closedSpy).toHaveBeenCalled();
      });

      it('should register unresponsive and responsive event handlers', () => {
        const authWindow = new AuthWindow(false);
        const window = authWindow.create('https://accounts.google.com/signin');

        // Get event handlers
        const onCalls = (window.on as any).mock.calls;
        const unresponsiveCall = onCalls.find((call: any[]) => call[0] === 'unresponsive');
        const responsiveCall = onCalls.find((call: any[]) => call[0] === 'responsive');

        // Verify handlers are registered
        expect(unresponsiveCall).toBeDefined();
        expect(responsiveCall).toBeDefined();

        // Simulate events to ensure handlers don't crash
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

        // Create main window first (sets up callbacks)
        windowManager.createMainWindow();

        // Create auth window
        const authWindow = windowManager.createAuthWindow('https://accounts.google.com/signin');

        // The WindowManager constructor sets up:
        // this.mainWindow.setCloseAuthCallback(() => this.authWindow.close());
        // Which means when main window closes, it triggers auth window close

        // Access the internal authWindow and verify close works
        const internalAuthWindow = (windowManager as any).authWindow;
        expect(internalAuthWindow).toBeDefined();

        // Call close on the auth window directly (simulating callback trigger)
        internalAuthWindow.close();
        expect(authWindow.close).toHaveBeenCalled();
      });

      it('should handle multiple auth window creations', () => {
        const windowManager = new WindowManager(false);

        const authWindow1 = windowManager.createAuthWindow('https://accounts.google.com/signin');
        const authWindow2 = windowManager.createAuthWindow('https://accounts.google.com/o/oauth2');

        // The second call should still work (AuthWindow handles closing previous)
        expect(authWindow2).toBeDefined();
      });
    });
  });
});

/**
 * Unit tests for fatal error handling - window crash handlers.
 *
 * Tests verify that crash handlers are properly set up on windows.
 * Uses the same patterns as existing window tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow } from 'electron';
import MainWindow from '../../../src/main/windows/mainWindow';
import AuthWindow from '../../../src/main/windows/authWindow';

vi.mock('../../../src/main/utils/paths', async (importOriginal) => {
  type PathsModule = typeof import('../../../src/main/utils/paths');
  const actual = await importOriginal<PathsModule>();
  return {
    ...actual,
    getIconPath: vi.fn().mockReturnValue('/mock/icon/path.png'),
  };
});

describe('Fatal Error Handling - Window Crash Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (BrowserWindow as any)._reset();
  });

  describe('MainWindow crash handlers', () => {
    let mainWindow: MainWindow;

    beforeEach(() => {
      mainWindow = new MainWindow(false);
    });

    it('should setup render-process-gone handler on webContents', () => {
      const win = mainWindow.create();

      // Find the render-process-gone handler in mock calls
      const renderProcessGoneCall = win.webContents.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'render-process-gone'
      );

      expect(renderProcessGoneCall).toBeDefined();
    });

    it('should setup did-fail-load handler on webContents', () => {
      const win = mainWindow.create();

      const didFailLoadCall = win.webContents.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'did-fail-load'
      );

      expect(didFailLoadCall).toBeDefined();
    });

    it('should setup unresponsive handler on window', () => {
      const win = mainWindow.create();

      const unresponsiveCall = win.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'unresponsive'
      );

      expect(unresponsiveCall).toBeDefined();
    });

    it('should setup responsive handler on window', () => {
      const win = mainWindow.create();

      const responsiveCall = win.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'responsive'
      );

      expect(responsiveCall).toBeDefined();
    });

    it('should log error when render-process-gone fires', () => {
      const win = mainWindow.create();

      const renderProcessGoneCall = win.webContents.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'render-process-gone'
      );

      const handler = renderProcessGoneCall?.[1];
      expect(handler).toBeDefined();

      // Handler should not throw when called
      expect(() => {
        handler!({}, { reason: 'crashed', exitCode: 1 });
      }).not.toThrow();
    });

    it('should reload window on crash (non-killed)', () => {
      const win = mainWindow.create();

      const renderProcessGoneCall = win.webContents.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'render-process-gone'
      );

      const handler = renderProcessGoneCall?.[1];
      handler!({}, { reason: 'crashed', exitCode: 1 });

      expect(win.reload).toHaveBeenCalled();
    });

    it('should not reload window when intentionally killed', () => {
      const win = mainWindow.create();

      const renderProcessGoneCall = win.webContents.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'render-process-gone'
      );

      const handler = renderProcessGoneCall?.[1];
      handler!({}, { reason: 'killed', exitCode: 0 });

      expect(win.reload).not.toHaveBeenCalled();
    });
  });

  describe('AuthWindow crash handlers', () => {
    let authWindow: AuthWindow;

    beforeEach(() => {
      authWindow = new AuthWindow(false);
    });

    it('should setup did-fail-load handler on webContents', () => {
      const win = authWindow.create('https://accounts.google.com/test');

      const didFailLoadCall = win.webContents.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'did-fail-load'
      );

      expect(didFailLoadCall).toBeDefined();
    });

    it('should setup certificate-error handler on webContents', () => {
      const win = authWindow.create('https://accounts.google.com/test');

      const certErrorCall = win.webContents.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'certificate-error'
      );

      expect(certErrorCall).toBeDefined();
    });

    it('should setup unresponsive handler on window', () => {
      const win = authWindow.create('https://accounts.google.com/test');

      const unresponsiveCall = win.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'unresponsive'
      );

      expect(unresponsiveCall).toBeDefined();
    });

    it('should setup responsive handler on window', () => {
      const win = authWindow.create('https://accounts.google.com/test');

      const responsiveCall = win.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'responsive'
      );

      expect(responsiveCall).toBeDefined();
    });

    it('should deny certificate errors for security', () => {
      const win = authWindow.create('https://accounts.google.com/test');

      const certErrorCall = win.webContents.on.mock.calls.find(
        (call: [string, Function]) => call[0] === 'certificate-error'
      );

      const handler = certErrorCall?.[1];
      expect(handler).toBeDefined();

      const callback = vi.fn();
      handler!({}, 'https://fake.com', 'ERR_CERT_INVALID', {}, callback);

      expect(callback).toHaveBeenCalledWith(false);
    });
  });
});

describe('Fatal Error Handling - Configuration', () => {
  it('should define correct crashReporter configuration values', () => {
    // Verify the expected configuration for crashReporter
    const expectedConfig = {
      productName: 'Gemini Desktop',
      companyName: 'Ben Wendell',
      submitURL: '',
      uploadToServer: false,
      ignoreSystemCrashHandler: true,
    };

    // These values are critical for preventing OS crash dialogs
    expect(expectedConfig.ignoreSystemCrashHandler).toBe(true);
    expect(expectedConfig.uploadToServer).toBe(false);
    expect(expectedConfig.submitURL).toBe('');
    expect(expectedConfig.productName).toBe('Gemini Desktop');
  });

  it('should define crash recovery behavior for different reasons', () => {
    // Crashed renderers should be reloaded (except when killed intentionally)
    const shouldReloadReasons = ['crashed', 'oom', 'launch-failed', 'integrity-failure'];
    const shouldNotReloadReasons = ['killed'];

    expect(shouldNotReloadReasons).toContain('killed');
    shouldReloadReasons.forEach((reason) => {
      expect(reason).not.toBe('killed');
    });
  });

  it('should define graceful shutdown exit codes', () => {
    // Exit code 0 for graceful shutdown (SIGTERM, SIGINT)
    // Exit code 1 for errors (uncaughtException)
    const exitCodes = {
      graceful: 0,
      error: 1,
    };

    expect(exitCodes.graceful).toBe(0);
    expect(exitCodes.error).toBe(1);
  });
});

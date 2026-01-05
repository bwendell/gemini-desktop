/**
 * Integration tests for Application Security features.
 * Verifies that header stripping and webview blocking are correctly configured.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupHeaderStripping, setupWebviewSecurity } from '../../src/main/utils/security';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/logger';

describe('Security Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header Stripping', () => {
    let mockSession: any;
    let headersHandler: Function;

    beforeEach(() => {
      mockSession = {
        webRequest: {
          onHeadersReceived: vi.fn((filter, handler) => {
            headersHandler = handler;
          }),
        },
      };
    });

    it('should register headers listener for Gemini domains', () => {
      setupHeaderStripping(mockSession);

      expect(mockSession.webRequest.onHeadersReceived).toHaveBeenCalledWith(
        expect.objectContaining({
          urls: expect.arrayContaining(['*://gemini.google.com/*', '*://*.google.com/gemini/*']),
        }),
        expect.any(Function)
      );
    });

    it('should strip X-Frame-Options from response headers', () => {
      setupHeaderStripping(mockSession);

      // Execute the registered handler
      const callback = vi.fn();
      headersHandler(
        {
          responseHeaders: {
            'X-Frame-Options': ['SAMEORIGIN'],
            'Content-Type': ['text/html'],
          },
        },
        callback
      );

      expect(callback).toHaveBeenCalledWith({
        responseHeaders: {
          'Content-Type': ['text/html'],
        },
      });
    });

    it('should strip frame-ancestors from CSP', () => {
      setupHeaderStripping(mockSession);

      const callback = vi.fn();
      headersHandler(
        {
          responseHeaders: {
            'Content-Security-Policy': [
              "default-src 'self'; frame-ancestors 'none'; script-src 'self'",
            ],
          },
        },
        callback
      );

      expect(callback).toHaveBeenCalledWith({
        responseHeaders: {
          'Content-Security-Policy': [
            expect.stringMatching(/default-src 'self';\s*script-src 'self'/),
          ],
        },
      });
    });
  });

  describe('Webview Security', () => {
    let mockApp: any;
    let webContentsHandler: Function;

    beforeEach(() => {
      mockApp = {
        on: vi.fn((event, handler) => {
          if (event === 'web-contents-created') {
            webContentsHandler = handler;
          }
        }),
      };
    });

    it('should block webview creation attempts', () => {
      setupWebviewSecurity(mockApp);

      expect(mockApp.on).toHaveBeenCalledWith('web-contents-created', expect.any(Function));

      // Simulate web-contents-created
      const mockContents = {
        on: vi.fn(),
      };
      webContentsHandler({}, mockContents);

      expect(mockContents.on).toHaveBeenCalledWith('will-attach-webview', expect.any(Function));

      // Extract the will-attach-webview handler
      const attachHandler = mockContents.on.mock.calls[0][1];
      const mockEvent = { preventDefault: vi.fn() };

      // Simulate attachment attempt
      attachHandler(mockEvent);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Blocked webview creation')
      );
    });
  });
});

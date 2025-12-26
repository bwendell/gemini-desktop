/**
 * Integration tests for media permissions across platforms.
 * Tests the setupMediaPermissions function with platform-specific behavior.
 *
 * @module media-permissions.integration.test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import electron from 'electron';

describe('Media Permissions Integration', () => {
  const mockSession = electron.session as any;
  let originalPlatform: string;
  let permissionHandler: (
    webContents: any,
    permission: string,
    callback: (granted: boolean) => void,
    details: { requestingUrl?: string }
  ) => void;

  beforeEach(() => {
    originalPlatform = process.platform;
    vi.clearAllMocks();

    // Capture the permission handler when it's set
    mockSession.defaultSession.setPermissionRequestHandler.mockImplementation(
      (handler: any) => {
        permissionHandler = handler;
      }
    );
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
      writable: true,
    });
    vi.resetModules();
  });

  describe('Permission Handler Registration', () => {
    describe.each(['darwin', 'win32', 'linux'])('on %s', (platform) => {
      beforeEach(() => {
        Object.defineProperty(process, 'platform', {
          value: platform,
          configurable: true,
          writable: true,
        });
      });

      it('registers permission handler on all platforms', async () => {
        vi.resetModules();
        const { setupMediaPermissions } = await import('../../src/main/utils/security');

        setupMediaPermissions(mockSession.defaultSession);

        expect(mockSession.defaultSession.setPermissionRequestHandler).toHaveBeenCalled();
      });

      it('grants media permission to Gemini domains', async () => {
        vi.resetModules();
        const { setupMediaPermissions } = await import('../../src/main/utils/security');

        setupMediaPermissions(mockSession.defaultSession);

        let granted: boolean | undefined;
        permissionHandler(
          {} as any,
          'media',
          (result) => {
            granted = result;
          },
          { requestingUrl: 'https://gemini.google.com/app' }
        );

        expect(granted).toBe(true);
      });

      it('denies media permission to non-Google domains', async () => {
        vi.resetModules();
        const { setupMediaPermissions } = await import('../../src/main/utils/security');

        setupMediaPermissions(mockSession.defaultSession);

        let granted: boolean | undefined;
        permissionHandler(
          {} as any,
          'media',
          (result) => {
            granted = result;
          },
          { requestingUrl: 'https://malicious-site.com' }
        );

        expect(granted).toBe(false);
      });
    });
  });
  // NOTE: macOS-specific microphone access (askForMediaAccess) tests are
  // covered in tests/unit/main/security.test.ts with proper mocking.

  describe('Cross-platform permission consistency', () => {
    const testCases = [
      { url: 'https://gemini.google.com/app', permission: 'media', expected: true },
      { url: 'https://gemini.google.com/chat', permission: 'media', expected: true },
      { url: 'https://accounts.google.com/signin', permission: 'media', expected: true },
      { url: 'https://google.com', permission: 'media', expected: true },
      { url: 'https://example.com', permission: 'media', expected: false },
      { url: 'https://gemini.google.com', permission: 'notifications', expected: false },
      { url: '', permission: 'media', expected: false },
    ];

    describe.each(['darwin', 'win32', 'linux'])('on %s', (platform) => {
      beforeEach(async () => {
        Object.defineProperty(process, 'platform', {
          value: platform,
          configurable: true,
          writable: true,
        });

        vi.resetModules();
        const { setupMediaPermissions } = await import('../../src/main/utils/security');
        setupMediaPermissions(mockSession.defaultSession);
      });

      it.each(testCases)(
        'handles permission request for $url ($permission) consistently',
        ({ url, permission, expected }) => {
          let granted: boolean | undefined;
          permissionHandler(
            {} as any,
            permission,
            (result) => {
              granted = result;
            },
            { requestingUrl: url }
          );

          expect(granted).toBe(expected);
        }
      );
    });
  });
});

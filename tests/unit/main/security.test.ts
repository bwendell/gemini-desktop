/**
 * Unit tests for security utilities.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import electron from 'electron';
import { getPlatformAdapter } from '../../../src/main/platform/platformAdapterFactory';
import { resetPlatformAdapterForTests } from '../../helpers/mocks';

vi.mock('../../../src/main/platform/platformAdapterFactory', () => ({
    getPlatformAdapter: vi.fn(),
}));

describe('setupHeaderStripping', () => {
    const mockSession = electron.session as any;

    let headerCallback: (
        details: { responseHeaders: Record<string, string[]> },
        callback: (result: { responseHeaders: Record<string, string[]> }) => void
    ) => void;

    beforeEach(() => {
        // mockSession is the global session mock from electron-mock.ts
        // We need to implement the onHeadersReceived mock to capture the callback
        (mockSession.defaultSession.webRequest.onHeadersReceived as any).mockImplementation(
            (_filter: any, callback: any) => {
                headerCallback = callback;
            }
        );
    });

    it('registers header handler on session', async () => {
        const { setupHeaderStripping } = await import('../../../src/main/utils/security');
        setupHeaderStripping(mockSession.defaultSession);

        expect(mockSession.defaultSession.webRequest.onHeadersReceived).toHaveBeenCalled();
    });

    it('filters for Gemini domains', async () => {
        const { setupHeaderStripping } = await import('../../../src/main/utils/security');
        setupHeaderStripping(mockSession.defaultSession);

        const call = mockSession.defaultSession.webRequest.onHeadersReceived.mock.calls[0];
        const filter = call[0] as { urls: string[] };

        expect(filter.urls).toContain('*://gemini.google.com/*');
        expect(filter.urls).toContain('*://*.gemini.google.com/*');
        expect(filter.urls).toContain('*://aistudio.google.com/*');
    });

    describe('header stripping', () => {
        beforeEach(async () => {
            const { setupHeaderStripping } = await import('../../../src/main/utils/security');
            setupHeaderStripping(mockSession.defaultSession);
        });

        it('removes x-frame-options header (lowercase)', () => {
            const details = {
                responseHeaders: {
                    'x-frame-options': ['DENY'],
                    'content-type': ['text/html'],
                },
            };

            let result: { responseHeaders: Record<string, string[]> } | undefined;
            headerCallback(details, (res) => {
                result = res;
            });

            expect(result!.responseHeaders['x-frame-options']).toBeUndefined();
            expect(result!.responseHeaders['content-type']).toEqual(['text/html']);
        });

        it('removes X-Frame-Options header (uppercase)', () => {
            const details = {
                responseHeaders: {
                    'X-Frame-Options': ['SAMEORIGIN'],
                    'Content-Type': ['text/html'],
                },
            };

            let result: { responseHeaders: Record<string, string[]> } | undefined;
            headerCallback(details, (res) => {
                result = res;
            });

            expect(result!.responseHeaders['X-Frame-Options']).toBeUndefined();
        });

        it('removes frame-ancestors from CSP (lowercase)', () => {
            const details = {
                responseHeaders: {
                    'content-security-policy': ["frame-ancestors 'none'; default-src 'self'"],
                },
            };

            let result: { responseHeaders: Record<string, string[]> } | undefined;
            headerCallback(details, (res) => {
                result = res;
            });

            expect(result!.responseHeaders['content-security-policy'][0]).not.toContain('frame-ancestors');
            expect(result!.responseHeaders['content-security-policy'][0]).toContain("default-src 'self'");
        });

        it('removes frame-ancestors from CSP (uppercase)', () => {
            const details = {
                responseHeaders: {
                    'Content-Security-Policy': ["frame-ancestors https://example.com; script-src 'self'"],
                },
            };

            let result: { responseHeaders: Record<string, string[]> } | undefined;
            headerCallback(details, (res) => {
                result = res;
            });

            expect(result!.responseHeaders['Content-Security-Policy'][0]).not.toContain('frame-ancestors');
            expect(result!.responseHeaders['Content-Security-Policy'][0]).toContain("script-src 'self'");
        });

        it('preserves other headers unchanged', () => {
            const details = {
                responseHeaders: {
                    'cache-control': ['max-age=3600'],
                    'set-cookie': ['session=abc123'],
                },
            };

            let result: { responseHeaders: Record<string, string[]> } | undefined;
            headerCallback(details, (res) => {
                result = res;
            });

            expect(result!.responseHeaders['cache-control']).toEqual(['max-age=3600']);
            expect(result!.responseHeaders['set-cookie']).toEqual(['session=abc123']);
        });

        it('handles missing CSP headers gracefully', () => {
            const details = {
                responseHeaders: {
                    'content-type': ['text/html'],
                },
            };

            let result: { responseHeaders: Record<string, string[]> } | undefined;
            headerCallback(details, (res) => {
                result = res;
            });

            expect(result!.responseHeaders['content-type']).toEqual(['text/html']);
        });
    });
});

describe('setupMediaPermissions', () => {
    const mockSession = electron.session as any;
    let permissionHandler: (
        webContents: any,
        permission: string,
        callback: (granted: boolean) => void,
        details: { requestingUrl?: string }
    ) => void;

    beforeEach(() => {
        mockSession.defaultSession.setPermissionRequestHandler.mockClear();
        vi.mocked(getPlatformAdapter).mockReset();

        mockSession.defaultSession.setPermissionRequestHandler.mockImplementation((handler: any) => {
            permissionHandler = handler;
        });
    });

    it('registers permission handler on session', async () => {
        const { setupMediaPermissions } = await import('../../../src/main/utils/security');
        vi.mocked(getPlatformAdapter).mockReturnValue({ requestMediaPermissions: vi.fn() } as any);
        setupMediaPermissions(mockSession.defaultSession);

        expect(mockSession.defaultSession.setPermissionRequestHandler).toHaveBeenCalled();
    });

    it('grants media permission to gemini.google.com', async () => {
        const { setupMediaPermissions } = await import('../../../src/main/utils/security');
        vi.mocked(getPlatformAdapter).mockReturnValue({ requestMediaPermissions: vi.fn() } as any);
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

    it('grants media permission to google.com subdomains', async () => {
        const { setupMediaPermissions } = await import('../../../src/main/utils/security');
        vi.mocked(getPlatformAdapter).mockReturnValue({ requestMediaPermissions: vi.fn() } as any);
        setupMediaPermissions(mockSession.defaultSession);

        let granted: boolean | undefined;
        permissionHandler(
            {} as any,
            'media',
            (result) => {
                granted = result;
            },
            { requestingUrl: 'https://accounts.google.com/signin' }
        );

        expect(granted).toBe(true);
    });

    it('denies media permission to non-Google domains', async () => {
        const { setupMediaPermissions } = await import('../../../src/main/utils/security');
        vi.mocked(getPlatformAdapter).mockReturnValue({ requestMediaPermissions: vi.fn() } as any);
        setupMediaPermissions(mockSession.defaultSession);

        let granted: boolean | undefined;
        permissionHandler(
            {} as any,
            'media',
            (result) => {
                granted = result;
            },
            { requestingUrl: 'https://example.com' }
        );

        expect(granted).toBe(false);
    });

    it('grants clipboard-sanitized-write permission to Google domains', async () => {
        const { setupMediaPermissions } = await import('../../../src/main/utils/security');
        vi.mocked(getPlatformAdapter).mockReturnValue({ requestMediaPermissions: vi.fn() } as any);
        setupMediaPermissions(mockSession.defaultSession);

        let granted: boolean | undefined;
        permissionHandler(
            {} as any,
            'clipboard-sanitized-write',
            (result) => {
                granted = result;
            },
            { requestingUrl: 'https://gemini.google.com/app' }
        );

        expect(granted).toBe(true);
    });

    it('denies clipboard-sanitized-write permission to non-Google domains', async () => {
        const { setupMediaPermissions } = await import('../../../src/main/utils/security');
        vi.mocked(getPlatformAdapter).mockReturnValue({ requestMediaPermissions: vi.fn() } as any);
        setupMediaPermissions(mockSession.defaultSession);

        let granted: boolean | undefined;
        permissionHandler(
            {} as any,
            'clipboard-sanitized-write',
            (result) => {
                granted = result;
            },
            { requestingUrl: 'https://example.com' }
        );

        expect(granted).toBe(false);
    });

    it('denies other permissions from any domain', async () => {
        const { setupMediaPermissions } = await import('../../../src/main/utils/security');
        vi.mocked(getPlatformAdapter).mockReturnValue({ requestMediaPermissions: vi.fn() } as any);
        setupMediaPermissions(mockSession.defaultSession);

        let granted: boolean | undefined;
        permissionHandler(
            {} as any,
            'notifications',
            (result) => {
                granted = result;
            },
            { requestingUrl: 'https://gemini.google.com/app' }
        );

        expect(granted).toBe(false);
    });

    it('handles missing requestingUrl gracefully', async () => {
        const { setupMediaPermissions } = await import('../../../src/main/utils/security');
        vi.mocked(getPlatformAdapter).mockReturnValue({ requestMediaPermissions: vi.fn() } as any);
        setupMediaPermissions(mockSession.defaultSession);

        let granted: boolean | undefined;
        permissionHandler(
            {} as any,
            'media',
            (result) => {
                granted = result;
            },
            {}
        );

        expect(granted).toBe(false);
    });

    describe('macOS microphone access (askForMediaAccess)', () => {
        afterEach(() => {
            resetPlatformAdapterForTests();
        });

        it('calls requestMediaPermissions on macOS', async () => {
            const mockRequestMediaPermissions = vi.fn().mockResolvedValue(undefined);

            vi.mocked(getPlatformAdapter).mockReturnValue({
                requestMediaPermissions: mockRequestMediaPermissions,
            } as any);

            const { setupMediaPermissions: setupMediaPermissionsMocked } =
                await import('../../../src/main/utils/security');

            const freshMockSession = {
                setPermissionRequestHandler: vi.fn(),
            };

            setupMediaPermissionsMocked(freshMockSession as any);

            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(mockRequestMediaPermissions).toHaveBeenCalled();
        });

        it('does NOT call requestMediaPermissions if adapter method is undefined', async () => {
            vi.mocked(getPlatformAdapter).mockReturnValue({
                requestMediaPermissions: undefined,
            } as any);

            const { setupMediaPermissions: setupMediaPermissionsMocked } =
                await import('../../../src/main/utils/security');

            const freshMockSession = {
                setPermissionRequestHandler: vi.fn(),
            };

            expect(() => setupMediaPermissionsMocked(freshMockSession as any)).not.toThrow();
        });
    });
});

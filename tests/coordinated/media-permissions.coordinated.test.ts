import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import electron from 'electron';
import { platformAdapterPresets, useMockPlatformAdapter, resetPlatformAdapterForTests } from '../helpers/mocks';

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

describe('Media Permissions Integration', () => {
    const mockSession = electron.session as any;
    let permissionHandler: (
        webContents: any,
        permission: string,
        callback: (granted: boolean) => void,
        details: { requestingUrl?: string }
    ) => void;

    beforeEach(() => {
        vi.clearAllMocks();

        mockSession.defaultSession.setPermissionRequestHandler.mockImplementation((handler: any) => {
            permissionHandler = handler;
        });
    });

    afterEach(() => {
        resetPlatformAdapterForTests();
        vi.resetModules();
    });

    describe('Permission Handler Registration', () => {
        describe.each(['darwin', 'win32', 'linux'])('on %s', (platform) => {
            beforeEach(() => {
                useMockPlatformAdapter(adapterForPlatform[platform]());
            });

            afterEach(() => {
                resetPlatformAdapterForTests();
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
                useMockPlatformAdapter(adapterForPlatform[platform]());

                vi.resetModules();
                const { setupMediaPermissions } = await import('../../src/main/utils/security');
                setupMediaPermissions(mockSession.defaultSession);
            });

            afterEach(() => {
                resetPlatformAdapterForTests();
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

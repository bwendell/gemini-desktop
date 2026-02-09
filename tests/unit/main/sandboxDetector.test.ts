/**
 * Unit tests for sandboxDetector utility.
 *
 * Tests the detection of Linux AppImage sandbox restrictions.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';

// Mock fs module
vi.mock('fs');

describe('sandboxDetector', () => {
    const originalPlatform = process.platform;
    const originalEnv = { ...process.env };

    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        // Reset env
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        // Restore platform
        Object.defineProperty(process, 'platform', {
            value: originalPlatform,
            configurable: true,
            writable: true,
        });
        // Restore env
        process.env = originalEnv;
    });

    describe('isAppImage', () => {
        it('returns true when APPIMAGE env var is set', async () => {
            process.env.APPIMAGE = '/path/to/app.AppImage';
            const { isAppImage } = await import('../../../src/main/utils/sandboxDetector');
            expect(isAppImage()).toBe(true);
        });

        it('returns false when APPIMAGE env var is not set', async () => {
            delete process.env.APPIMAGE;
            const { isAppImage } = await import('../../../src/main/utils/sandboxDetector');
            expect(isAppImage()).toBe(false);
        });

        it('returns false when APPIMAGE env var is empty string', async () => {
            process.env.APPIMAGE = '';
            const { isAppImage } = await import('../../../src/main/utils/sandboxDetector');
            expect(isAppImage()).toBe(false);
        });
    });

    describe('hasAppArmorRestriction', () => {
        it('returns true when apparmor_restrict_unprivileged_userns is "1"', async () => {
            vi.mocked(fs.readFileSync).mockReturnValue('1\n');
            const { hasAppArmorRestriction } = await import('../../../src/main/utils/sandboxDetector');

            expect(hasAppArmorRestriction()).toBe(true);
            expect(fs.readFileSync).toHaveBeenCalledWith(
                '/proc/sys/kernel/apparmor_restrict_unprivileged_userns',
                'utf8'
            );
        });

        it('returns false when apparmor_restrict_unprivileged_userns is "0"', async () => {
            vi.mocked(fs.readFileSync).mockReturnValue('0\n');
            const { hasAppArmorRestriction } = await import('../../../src/main/utils/sandboxDetector');

            expect(hasAppArmorRestriction()).toBe(false);
        });

        it('returns false when file does not exist (non-AppArmor systems)', async () => {
            vi.mocked(fs.readFileSync).mockImplementation(() => {
                throw new Error('ENOENT');
            });
            const { hasAppArmorRestriction } = await import('../../../src/main/utils/sandboxDetector');

            expect(hasAppArmorRestriction()).toBe(false);
        });
    });

    describe('hasUserNamespaceRestriction', () => {
        it('returns true when unprivileged_userns_clone is "0" (disabled)', async () => {
            vi.mocked(fs.readFileSync).mockReturnValue('0\n');
            const { hasUserNamespaceRestriction } = await import('../../../src/main/utils/sandboxDetector');

            expect(hasUserNamespaceRestriction()).toBe(true);
            expect(fs.readFileSync).toHaveBeenCalledWith('/proc/sys/kernel/unprivileged_userns_clone', 'utf8');
        });

        it('returns false when unprivileged_userns_clone is "1" (enabled)', async () => {
            vi.mocked(fs.readFileSync).mockReturnValue('1\n');
            const { hasUserNamespaceRestriction } = await import('../../../src/main/utils/sandboxDetector');

            expect(hasUserNamespaceRestriction()).toBe(false);
        });

        it('returns false when file does not exist', async () => {
            vi.mocked(fs.readFileSync).mockImplementation(() => {
                throw new Error('ENOENT');
            });
            const { hasUserNamespaceRestriction } = await import('../../../src/main/utils/sandboxDetector');

            expect(hasUserNamespaceRestriction()).toBe(false);
        });
    });

    describe('shouldDisableSandbox', () => {
        it('returns false on non-Linux platforms', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'darwin',
                configurable: true,
                writable: true,
            });
            process.env.APPIMAGE = '/path/to/app.AppImage';
            vi.mocked(fs.readFileSync).mockReturnValue('1\n');

            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            expect(shouldDisableSandbox()).toBe(false);
        });

        it('returns false on Windows', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                configurable: true,
                writable: true,
            });
            process.env.APPIMAGE = '/path/to/app.AppImage';

            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            expect(shouldDisableSandbox()).toBe(false);
        });

        it('returns false on Linux when not running as AppImage', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true,
                writable: true,
            });
            delete process.env.APPIMAGE;
            vi.mocked(fs.readFileSync).mockReturnValue('1\n');

            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            expect(shouldDisableSandbox()).toBe(false);
        });

        it('returns true on Linux AppImage with AppArmor restriction', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true,
                writable: true,
            });
            process.env.APPIMAGE = '/path/to/app.AppImage';
            // AppArmor restriction active
            vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
                if (path === '/proc/sys/kernel/apparmor_restrict_unprivileged_userns') {
                    return '1\n';
                }
                throw new Error('ENOENT');
            });

            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            expect(shouldDisableSandbox()).toBe(true);
        });

        it('returns true on Linux AppImage with user namespace restriction', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true,
                writable: true,
            });
            process.env.APPIMAGE = '/path/to/app.AppImage';
            // No AppArmor, but user namespace disabled
            vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
                if (path === '/proc/sys/kernel/apparmor_restrict_unprivileged_userns') {
                    throw new Error('ENOENT');
                }
                if (path === '/proc/sys/kernel/unprivileged_userns_clone') {
                    return '0\n';
                }
                throw new Error('ENOENT');
            });

            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            expect(shouldDisableSandbox()).toBe(true);
        });

        it('returns false on Linux AppImage with no restrictions', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true,
                writable: true,
            });
            process.env.APPIMAGE = '/path/to/app.AppImage';
            // No restrictions
            vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
                if (path === '/proc/sys/kernel/apparmor_restrict_unprivileged_userns') {
                    return '0\n'; // Not restricted
                }
                if (path === '/proc/sys/kernel/unprivileged_userns_clone') {
                    return '1\n'; // Enabled
                }
                throw new Error('ENOENT');
            });

            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            expect(shouldDisableSandbox()).toBe(false);
        });

        it('returns true when both restrictions are active', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true,
                writable: true,
            });
            process.env.APPIMAGE = '/path/to/app.AppImage';
            // Both restrictions active
            vi.mocked(fs.readFileSync).mockImplementation((path: any) => {
                if (path === '/proc/sys/kernel/apparmor_restrict_unprivileged_userns') {
                    return '1\n';
                }
                if (path === '/proc/sys/kernel/unprivileged_userns_clone') {
                    return '0\n';
                }
                throw new Error('ENOENT');
            });

            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            expect(shouldDisableSandbox()).toBe(true);
        });
    });
});

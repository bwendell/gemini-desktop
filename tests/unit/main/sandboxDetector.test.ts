/**
 * Unit tests for sandboxDetector utility.
 *
 * Tests detection of Linux sandbox restrictions including:
 *   - AppImage detection
 *   - AppArmor user namespace restrictions
 *   - Kernel user namespace restrictions
 *   - User namespace support (composite check)
 *   - SUID sandbox binary permission checks
 *   - shouldDisableSandbox decision logic
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';

// Mock fs module
vi.mock('fs');

describe('sandboxDetector', () => {
    const originalPlatform = process.platform;
    const originalEnv = { ...process.env };
    const originalExecPath = process.execPath;

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
        // Restore execPath
        Object.defineProperty(process, 'execPath', {
            value: originalExecPath,
            configurable: true,
            writable: true,
        });
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

    describe('hasUserNamespaceSupport', () => {
        it('returns true when neither restriction is active', async () => {
            vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
                if (filePath === '/proc/sys/kernel/apparmor_restrict_unprivileged_userns') {
                    return '0\n'; // Not restricted
                }
                if (filePath === '/proc/sys/kernel/unprivileged_userns_clone') {
                    return '1\n'; // Enabled
                }
                throw new Error('ENOENT');
            });
            const { hasUserNamespaceSupport } = await import('../../../src/main/utils/sandboxDetector');
            expect(hasUserNamespaceSupport()).toBe(true);
        });

        it('returns false when AppArmor restricts namespaces', async () => {
            vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
                if (filePath === '/proc/sys/kernel/apparmor_restrict_unprivileged_userns') {
                    return '1\n'; // Restricted
                }
                if (filePath === '/proc/sys/kernel/unprivileged_userns_clone') {
                    return '1\n'; // Enabled
                }
                throw new Error('ENOENT');
            });
            const { hasUserNamespaceSupport } = await import('../../../src/main/utils/sandboxDetector');
            expect(hasUserNamespaceSupport()).toBe(false);
        });

        it('returns false when kernel disables user namespaces', async () => {
            vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
                if (filePath === '/proc/sys/kernel/apparmor_restrict_unprivileged_userns') {
                    throw new Error('ENOENT'); // No AppArmor
                }
                if (filePath === '/proc/sys/kernel/unprivileged_userns_clone') {
                    return '0\n'; // Disabled
                }
                throw new Error('ENOENT');
            });
            const { hasUserNamespaceSupport } = await import('../../../src/main/utils/sandboxDetector');
            expect(hasUserNamespaceSupport()).toBe(false);
        });
    });

    describe('hasSuidSandboxPermissions', () => {
        it('returns true when chrome-sandbox has correct owner and mode', async () => {
            Object.defineProperty(process, 'execPath', {
                value: '/usr/lib/electron/electron',
                configurable: true,
                writable: true,
            });
            vi.mocked(fs.statSync).mockReturnValue({
                uid: 0, // owned by root
                mode: 0o104755, // regular file + SUID + 755
            } as any);

            const { hasSuidSandboxPermissions } = await import('../../../src/main/utils/sandboxDetector');
            expect(hasSuidSandboxPermissions()).toBe(true);
            expect(fs.statSync).toHaveBeenCalledWith('/usr/lib/electron/chrome-sandbox');
        });

        it('returns false when chrome-sandbox is not owned by root', async () => {
            Object.defineProperty(process, 'execPath', {
                value: '/home/user/repos/project/node_modules/electron/dist/electron',
                configurable: true,
                writable: true,
            });
            vi.mocked(fs.statSync).mockReturnValue({
                uid: 1000, // owned by regular user
                mode: 0o100755,
            } as any);

            const { hasSuidSandboxPermissions } = await import('../../../src/main/utils/sandboxDetector');
            expect(hasSuidSandboxPermissions()).toBe(false);
        });

        it('returns false when chrome-sandbox lacks SUID bit', async () => {
            Object.defineProperty(process, 'execPath', {
                value: '/usr/lib/electron/electron',
                configurable: true,
                writable: true,
            });
            vi.mocked(fs.statSync).mockReturnValue({
                uid: 0, // owned by root
                mode: 0o100755, // no SUID bit
            } as any);

            const { hasSuidSandboxPermissions } = await import('../../../src/main/utils/sandboxDetector');
            expect(hasSuidSandboxPermissions()).toBe(false);
        });

        it('returns false when chrome-sandbox does not exist', async () => {
            Object.defineProperty(process, 'execPath', {
                value: '/usr/lib/electron/electron',
                configurable: true,
                writable: true,
            });
            vi.mocked(fs.statSync).mockImplementation(() => {
                throw new Error('ENOENT');
            });

            const { hasSuidSandboxPermissions } = await import('../../../src/main/utils/sandboxDetector');
            expect(hasSuidSandboxPermissions()).toBe(false);
        });

        it('uses CHROME_DEVEL_SANDBOX env var path when set', async () => {
            process.env.CHROME_DEVEL_SANDBOX = '/usr/local/sbin/chrome-devel-sandbox';
            vi.mocked(fs.statSync).mockReturnValue({
                uid: 0,
                mode: 0o104755,
            } as any);

            const { hasSuidSandboxPermissions } = await import('../../../src/main/utils/sandboxDetector');
            expect(hasSuidSandboxPermissions()).toBe(true);
            expect(fs.statSync).toHaveBeenCalledWith('/usr/local/sbin/chrome-devel-sandbox');

            delete process.env.CHROME_DEVEL_SANDBOX;
        });
    });

    describe('shouldDisableSandbox', () => {
        it('returns false on non-Linux platforms', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'darwin',
                configurable: true,
                writable: true,
            });
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

            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            expect(shouldDisableSandbox()).toBe(false);
        });

        it('returns false on Linux when user namespaces are available', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true,
                writable: true,
            });
            // No restrictions on user namespaces
            vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
                if (filePath === '/proc/sys/kernel/apparmor_restrict_unprivileged_userns') {
                    return '0\n';
                }
                if (filePath === '/proc/sys/kernel/unprivileged_userns_clone') {
                    return '1\n';
                }
                throw new Error('ENOENT');
            });

            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            expect(shouldDisableSandbox()).toBe(false);
        });

        it('returns false when user namespaces restricted but SUID sandbox is available', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true,
                writable: true,
            });
            Object.defineProperty(process, 'execPath', {
                value: '/usr/lib/electron/electron',
                configurable: true,
                writable: true,
            });
            // AppArmor restricts namespaces
            vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
                if (filePath === '/proc/sys/kernel/apparmor_restrict_unprivileged_userns') {
                    return '1\n';
                }
                throw new Error('ENOENT');
            });
            // But SUID sandbox binary is properly set up
            vi.mocked(fs.statSync).mockReturnValue({
                uid: 0,
                mode: 0o104755,
            } as any);

            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            expect(shouldDisableSandbox()).toBe(false);
        });

        it('returns true in local dev (namespaces restricted, no SUID sandbox)', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true,
                writable: true,
            });
            Object.defineProperty(process, 'execPath', {
                value: '/home/user/repos/project/node_modules/electron/dist/electron',
                configurable: true,
                writable: true,
            });
            // AppArmor restricts namespaces
            vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
                if (filePath === '/proc/sys/kernel/apparmor_restrict_unprivileged_userns') {
                    return '1\n';
                }
                throw new Error('ENOENT');
            });
            // chrome-sandbox is owned by regular user (typical node_modules)
            vi.mocked(fs.statSync).mockReturnValue({
                uid: 1000,
                mode: 0o100755,
            } as any);

            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            expect(shouldDisableSandbox()).toBe(true);
        });

        it('returns true in AppImage with AppArmor restriction (original use case)', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true,
                writable: true,
            });
            process.env.APPIMAGE = '/path/to/app.AppImage';
            // AppArmor restriction active
            vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
                if (filePath === '/proc/sys/kernel/apparmor_restrict_unprivileged_userns') {
                    return '1\n';
                }
                throw new Error('ENOENT');
            });
            // No SUID sandbox available
            vi.mocked(fs.statSync).mockImplementation(() => {
                throw new Error('ENOENT');
            });

            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            expect(shouldDisableSandbox()).toBe(true);
        });

        it('returns true when kernel disables user namespaces and no SUID fallback', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true,
                writable: true,
            });
            // No AppArmor, but kernel disables user namespaces
            vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
                if (filePath === '/proc/sys/kernel/apparmor_restrict_unprivileged_userns') {
                    throw new Error('ENOENT');
                }
                if (filePath === '/proc/sys/kernel/unprivileged_userns_clone') {
                    return '0\n';
                }
                throw new Error('ENOENT');
            });
            // No SUID sandbox
            vi.mocked(fs.statSync).mockImplementation(() => {
                throw new Error('ENOENT');
            });

            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            expect(shouldDisableSandbox()).toBe(true);
        });

        it('returns true when both restrictions active and no SUID fallback', async () => {
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                configurable: true,
                writable: true,
            });
            // Both restrictions active
            vi.mocked(fs.readFileSync).mockImplementation((filePath: any) => {
                if (filePath === '/proc/sys/kernel/apparmor_restrict_unprivileged_userns') {
                    return '1\n';
                }
                if (filePath === '/proc/sys/kernel/unprivileged_userns_clone') {
                    return '0\n';
                }
                throw new Error('ENOENT');
            });
            // No SUID sandbox
            vi.mocked(fs.statSync).mockImplementation(() => {
                throw new Error('ENOENT');
            });

            const { shouldDisableSandbox } = await import('../../../src/main/utils/sandboxDetector');
            expect(shouldDisableSandbox()).toBe(true);
        });
    });
});

import { describe, it, expect } from 'vitest';
import {
    type DesktopEnvironment,
    type PortalMethod,
    type WaylandStatus,
    type HotkeyRegistrationResult,
    type PlatformHotkeyStatus,
    type HotkeyId,
} from '../../../src/shared/types/hotkeys';

describe('Platform Status Types', () => {
    // ==========================================================================
    // DesktopEnvironment type
    // ==========================================================================
    describe('DesktopEnvironment', () => {
        it('should accept "kde" as a valid value', () => {
            const de: DesktopEnvironment = 'kde';
            expect(de).toBe('kde');
        });

        it('should accept "unknown" as a valid value', () => {
            const de: DesktopEnvironment = 'unknown';
            expect(de).toBe('unknown');
        });
    });

    // ==========================================================================
    // PortalMethod type
    // ==========================================================================
    describe('PortalMethod', () => {
        it('should accept "chromium-flag" as a valid value', () => {
            const method: PortalMethod = 'chromium-flag';
            expect(method).toBe('chromium-flag');
        });

        it('should accept "dbus-fallback" as a valid value', () => {
            const method: PortalMethod = 'dbus-fallback';
            expect(method).toBe('dbus-fallback');
        });

        it('should accept "none" as a valid value', () => {
            const method: PortalMethod = 'none';
            expect(method).toBe('none');
        });
    });

    // ==========================================================================
    // WaylandStatus interface
    // ==========================================================================
    describe('WaylandStatus', () => {
        it('should accept a valid WaylandStatus object with all required fields', () => {
            const status: WaylandStatus = {
                isWayland: true,
                desktopEnvironment: 'kde',
                deVersion: '5.27',
                portalAvailable: true,
                portalMethod: 'chromium-flag',
            };
            expect(status.isWayland).toBe(true);
            expect(status.desktopEnvironment).toBe('kde');
            expect(status.deVersion).toBe('5.27');
            expect(status.portalAvailable).toBe(true);
            expect(status.portalMethod).toBe('chromium-flag');
        });

        it('should accept WaylandStatus with isWayland false and unknown DE', () => {
            const status: WaylandStatus = {
                isWayland: false,
                desktopEnvironment: 'unknown',
                deVersion: null,
                portalAvailable: false,
                portalMethod: 'none',
            };
            expect(status.isWayland).toBe(false);
            expect(status.desktopEnvironment).toBe('unknown');
            expect(status.deVersion).toBeNull();
            expect(status.portalAvailable).toBe(false);
            expect(status.portalMethod).toBe('none');
        });

        it('should accept null deVersion', () => {
            const status: WaylandStatus = {
                isWayland: true,
                desktopEnvironment: 'kde',
                deVersion: null,
                portalAvailable: false,
                portalMethod: 'none',
            };
            expect(status.deVersion).toBeNull();
        });

        it('should have exactly the expected keys', () => {
            const status: WaylandStatus = {
                isWayland: true,
                desktopEnvironment: 'kde',
                deVersion: '6.0',
                portalAvailable: true,
                portalMethod: 'chromium-flag',
            };
            const keys = Object.keys(status).sort();
            expect(keys).toEqual(['deVersion', 'desktopEnvironment', 'isWayland', 'portalAvailable', 'portalMethod']);
        });
    });

    // ==========================================================================
    // HotkeyRegistrationResult interface
    // ==========================================================================
    describe('HotkeyRegistrationResult', () => {
        it('should accept a successful registration result', () => {
            const result: HotkeyRegistrationResult = {
                hotkeyId: 'quickChat',
                success: true,
            };
            expect(result.hotkeyId).toBe('quickChat');
            expect(result.success).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should accept a failed registration result with error', () => {
            const result: HotkeyRegistrationResult = {
                hotkeyId: 'bossKey',
                success: false,
                error: 'Wayland does not support global shortcuts via globalShortcut API',
            };
            expect(result.hotkeyId).toBe('bossKey');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Wayland does not support global shortcuts via globalShortcut API');
        });

        it('should accept any valid HotkeyId', () => {
            const ids: HotkeyId[] = ['alwaysOnTop', 'bossKey', 'quickChat', 'printToPdf'];
            ids.forEach((id) => {
                const result: HotkeyRegistrationResult = { hotkeyId: id, success: true };
                expect(result.hotkeyId).toBe(id);
            });
        });

        it('should have error as optional', () => {
            const result: HotkeyRegistrationResult = {
                hotkeyId: 'quickChat',
                success: true,
            };
            expect('error' in result).toBe(false);
        });
    });

    // ==========================================================================
    // PlatformHotkeyStatus interface
    // ==========================================================================
    describe('PlatformHotkeyStatus', () => {
        it('should accept a complete PlatformHotkeyStatus object', () => {
            const status: PlatformHotkeyStatus = {
                waylandStatus: {
                    isWayland: true,
                    desktopEnvironment: 'kde',
                    deVersion: '5.27',
                    portalAvailable: true,
                    portalMethod: 'chromium-flag',
                },
                registrationResults: [
                    { hotkeyId: 'quickChat', success: true },
                    { hotkeyId: 'bossKey', success: true },
                ],
                globalHotkeysEnabled: true,
            };
            expect(status.waylandStatus.isWayland).toBe(true);
            expect(status.registrationResults).toHaveLength(2);
            expect(status.globalHotkeysEnabled).toBe(true);
        });

        it('should accept PlatformHotkeyStatus with empty registration results', () => {
            const status: PlatformHotkeyStatus = {
                waylandStatus: {
                    isWayland: false,
                    desktopEnvironment: 'unknown',
                    deVersion: null,
                    portalAvailable: false,
                    portalMethod: 'none',
                },
                registrationResults: [],
                globalHotkeysEnabled: false,
            };
            expect(status.registrationResults).toHaveLength(0);
            expect(status.globalHotkeysEnabled).toBe(false);
        });

        it('should accept PlatformHotkeyStatus with mixed registration results', () => {
            const status: PlatformHotkeyStatus = {
                waylandStatus: {
                    isWayland: true,
                    desktopEnvironment: 'kde',
                    deVersion: '6.0',
                    portalAvailable: true,
                    portalMethod: 'dbus-fallback',
                },
                registrationResults: [
                    { hotkeyId: 'quickChat', success: true },
                    { hotkeyId: 'bossKey', success: false, error: 'Registration failed' },
                    { hotkeyId: 'alwaysOnTop', success: true },
                    { hotkeyId: 'printToPdf', success: true },
                ],
                globalHotkeysEnabled: true,
            };
            expect(status.registrationResults).toHaveLength(4);
            const failed = status.registrationResults.filter((r) => !r.success);
            expect(failed).toHaveLength(1);
            expect(failed[0].hotkeyId).toBe('bossKey');
        });

        it('should have waylandStatus as a nested WaylandStatus', () => {
            const status: PlatformHotkeyStatus = {
                waylandStatus: {
                    isWayland: true,
                    desktopEnvironment: 'kde',
                    deVersion: null,
                    portalAvailable: false,
                    portalMethod: 'none',
                },
                registrationResults: [],
                globalHotkeysEnabled: false,
            };
            expect(status.waylandStatus).toHaveProperty('isWayland');
            expect(status.waylandStatus).toHaveProperty('desktopEnvironment');
            expect(status.waylandStatus).toHaveProperty('deVersion');
            expect(status.waylandStatus).toHaveProperty('portalAvailable');
            expect(status.waylandStatus).toHaveProperty('portalMethod');
        });
    });
});

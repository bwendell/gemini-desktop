/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as platformUtils from '../../../../src/renderer/utils/platform';

describe('Renderer Platform Utils - Wayland Support', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset window.electronAPI mock if needed
        (window as any).electronAPI = {
            getPlatformHotkeyStatus: vi.fn(),
        };
    });

    describe('getPlatformHotkeyStatus', () => {
        it('should call electronAPI.getPlatformHotkeyStatus and return result', async () => {
            const mockStatus = {
                waylandStatus: {
                    isWayland: true,
                    desktopEnvironment: 'kde',
                    deVersion: '5.27.0',
                    portalAvailable: true,
                    portalMethod: 'chromium-flag',
                },
                registrationResults: [],
                globalHotkeysEnabled: true,
            };
            (window.electronAPI.getPlatformHotkeyStatus as any).mockResolvedValue(mockStatus);

            const result = await platformUtils.getPlatformHotkeyStatus();

            expect(window.electronAPI.getPlatformHotkeyStatus).toHaveBeenCalled();
            expect(result).toEqual(mockStatus);
        });

        it('should return null if electronAPI is not available', async () => {
            (window as any).electronAPI = undefined;
            const result = await platformUtils.getPlatformHotkeyStatus();
            expect(result).toBeNull();
        });
    });

    describe('isWaylandWithPortal', () => {
        it('should return true when Wayland and portal are both available', () => {
            const status: any = {
                waylandStatus: { isWayland: true, portalAvailable: true },
            };
            expect(platformUtils.isWaylandWithPortal(status)).toBe(true);
        });

        it('should return false when Wayland is false', () => {
            const status: any = {
                waylandStatus: { isWayland: false, portalAvailable: true },
            };
            expect(platformUtils.isWaylandWithPortal(status)).toBe(false);
        });

        it('should return false when portalAvailable is false', () => {
            const status: any = {
                waylandStatus: { isWayland: true, portalAvailable: false },
            };
            expect(platformUtils.isWaylandWithPortal(status)).toBe(false);
        });

        it('should return false when status is null', () => {
            expect(platformUtils.isWaylandWithPortal(null)).toBe(false);
        });
    });

    describe('areGlobalHotkeysEnabled', () => {
        it('should return value from status.globalHotkeysEnabled', () => {
            expect(platformUtils.areGlobalHotkeysEnabled({ globalHotkeysEnabled: true } as any)).toBe(true);
            expect(platformUtils.areGlobalHotkeysEnabled({ globalHotkeysEnabled: false } as any)).toBe(false);
        });

        it('should return false when status is null', () => {
            expect(platformUtils.areGlobalHotkeysEnabled(null)).toBe(false);
        });
    });
});

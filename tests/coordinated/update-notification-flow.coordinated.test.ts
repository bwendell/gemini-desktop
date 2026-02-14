import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, BrowserWindow } from 'electron';
import BadgeManager from '../../src/main/managers/badgeManager';
import TrayManager from '../../src/main/managers/trayManager';
import WindowManager from '../../src/main/managers/windowManager';
import { platformAdapterPresets, useMockPlatformAdapter, resetPlatformAdapterForTests } from '../helpers/mocks';

vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/__mocks__/logger';

vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue(Buffer.from('mock')),
}));

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

describe('Update Notification Flow Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests();
    });

    describe('BadgeManager', () => {
        it('should track badge state correctly', () => {
            const badgeManager = new BadgeManager();

            expect(badgeManager.hasBadgeShown()).toBe(false);

            badgeManager.showUpdateBadge();
            expect(badgeManager.hasBadgeShown()).toBe(true);

            badgeManager.clearUpdateBadge();
            expect(badgeManager.hasBadgeShown()).toBe(false);
        });

        it('should not show badge twice', () => {
            const badgeManager = new BadgeManager();

            badgeManager.showUpdateBadge();
            badgeManager.showUpdateBadge();

            expect(badgeManager.hasBadgeShown()).toBe(true);
            expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('already'));
        });

        it('should handle clear when no badge shown', () => {
            const badgeManager = new BadgeManager();

            badgeManager.clearUpdateBadge();

            expect(badgeManager.hasBadgeShown()).toBe(false);
            expect(mockLogger.error).not.toHaveBeenCalled();
        });

        describe('on macOS', () => {
            beforeEach(() => {
                useMockPlatformAdapter(adapterForPlatform.darwin());
            });

            afterEach(() => {
                resetPlatformAdapterForTests();
            });

            it('should call app.dock.setBadge', () => {
                const badgeManager = new BadgeManager();
                badgeManager.showUpdateBadge();

                expect(app.dock?.setBadge).toHaveBeenCalledWith('•');
            });

            it('should clear dock badge', () => {
                const badgeManager = new BadgeManager();
                badgeManager.showUpdateBadge();
                badgeManager.clearUpdateBadge();

                expect(app.dock?.setBadge).toHaveBeenCalledWith('');
            });
        });

        describe('on Windows', () => {
            beforeEach(() => {
                useMockPlatformAdapter(adapterForPlatform.win32());
            });

            afterEach(() => {
                resetPlatformAdapterForTests();
            });

            it('should call setOverlayIcon when main window set', () => {
                const badgeManager = new BadgeManager();

                const mockWindow = new BrowserWindow();
                (mockWindow as any).setOverlayIcon = vi.fn();
                badgeManager.setMainWindow(mockWindow as any);

                badgeManager.showUpdateBadge();

                expect((mockWindow as any).setOverlayIcon).toHaveBeenCalled();
            });
        });

        describe('on Linux', () => {
            beforeEach(() => {
                useMockPlatformAdapter(adapterForPlatform.linux());
            });

            afterEach(() => {
                resetPlatformAdapterForTests();
            });

            it('should gracefully skip badge', () => {
                const badgeManager = new BadgeManager();
                badgeManager.showUpdateBadge();

                expect(badgeManager.hasBadgeShown()).toBe(true);
                expect(mockLogger.error).not.toHaveBeenCalled();
            });
        });
    });

    describe('TrayManager', () => {
        it('should update tooltip when setUpdateTooltip is called', () => {
            const windowManager = new WindowManager(false);
            const trayManager = new TrayManager(windowManager);
            trayManager.createTray();

            trayManager.setUpdateTooltip('2.0.0');

            expect(trayManager.getToolTip()).toContain('2.0.0');
        });

        it('should clear tooltip when clearUpdateTooltip is called', () => {
            const windowManager = new WindowManager(false);
            const trayManager = new TrayManager(windowManager);
            trayManager.createTray();

            trayManager.setUpdateTooltip('2.0.0');
            expect(trayManager.getToolTip()).toContain('2.0.0');

            trayManager.clearUpdateTooltip();
            expect(trayManager.getToolTip()).not.toContain('2.0.0');
        });
    });

    describe('BadgeManager + TrayManager Coordination', () => {
        it('should coordinate badge and tooltip for update notification', () => {
            const windowManager = new WindowManager(false);
            const badgeManager = new BadgeManager();
            const trayManager = new TrayManager(windowManager);
            trayManager.createTray();

            badgeManager.showUpdateBadge();
            trayManager.setUpdateTooltip('2.0.0');

            expect(badgeManager.hasBadgeShown()).toBe(true);
            expect(trayManager.getToolTip()).toContain('2.0.0');

            badgeManager.clearUpdateBadge();
            trayManager.clearUpdateTooltip();

            expect(badgeManager.hasBadgeShown()).toBe(false);
            expect(trayManager.getToolTip()).not.toContain('2.0.0');
        });
    });
});

/**
 * Integration tests for update notification flow.
 * Tests BadgeManager → TrayManager coordination.
 * 
 * Platform-specific behavior:
 * - macOS: Badge via app.dock.setBadge() + tray tooltip
 * - Windows: Badge via window.setOverlayIcon() + tray tooltip
 * - Linux: No badge (graceful skip) + tray tooltip only
 * 
 * Note: Platform detection in BadgeManager uses constants (isMacOS, isWindows, isLinux)
 * which are evaluated at module load time. To test platform-specific behavior,
 * we test on the actual running platform and verify the expected behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, BrowserWindow } from 'electron';
import BadgeManager from '../../src/main/managers/badgeManager';
import TrayManager from '../../src/main/managers/trayManager';
import WindowManager from '../../src/main/managers/windowManager';

// Mock logger - must use hoisted to avoid initialization issues
const mockLogger = vi.hoisted(() => ({
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
}));
vi.mock('../../src/main/utils/logger', () => ({
    createLogger: () => mockLogger
}));

// Mock fs for tray icon
vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue(Buffer.from('mock'))
}));

// Platform detection - same as constants.ts but for test use
const isMacOS = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

describe('Update Notification Flow Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
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
            badgeManager.showUpdateBadge(); // Second call should be no-op

            expect(badgeManager.hasBadgeShown()).toBe(true);
            // Log should indicate badge already shown
            expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('already'));
        });

        it('should handle clear when no badge shown', () => {
            const badgeManager = new BadgeManager();

            // Clear when no badge - should not error
            badgeManager.clearUpdateBadge();

            expect(badgeManager.hasBadgeShown()).toBe(false);
            expect(mockLogger.error).not.toHaveBeenCalled();
        });

        if (isMacOS) {
            it('should call app.dock.setBadge on macOS', () => {
                const badgeManager = new BadgeManager();
                badgeManager.showUpdateBadge();

                expect(app.dock?.setBadge).toHaveBeenCalledWith('•');
            });

            it('should clear dock badge on macOS', () => {
                const badgeManager = new BadgeManager();
                badgeManager.showUpdateBadge();
                badgeManager.clearUpdateBadge();

                expect(app.dock?.setBadge).toHaveBeenCalledWith('');
            });
        }

        if (isWindows) {
            it('should call setOverlayIcon on Windows when main window set', () => {
                const badgeManager = new BadgeManager();

                // Create and set mock main window
                const mockWindow = new BrowserWindow();
                (mockWindow as any).setOverlayIcon = vi.fn();
                badgeManager.setMainWindow(mockWindow as any);

                badgeManager.showUpdateBadge();

                expect((mockWindow as any).setOverlayIcon).toHaveBeenCalled();
            });
        }

        if (isLinux) {
            it('should gracefully skip badge on Linux', () => {
                const badgeManager = new BadgeManager();
                badgeManager.showUpdateBadge();

                // Badge state tracks as shown even on Linux
                expect(badgeManager.hasBadgeShown()).toBe(true);
                // No errors
                expect(mockLogger.error).not.toHaveBeenCalled();
            });
        }
    });

    describe('TrayManager', () => {
        it('should update tooltip when setUpdateTooltip is called', () => {
            const windowManager = new WindowManager(false);
            const trayManager = new TrayManager(windowManager);
            trayManager.createTray(); // Must create tray first

            trayManager.setUpdateTooltip('2.0.0');

            expect(trayManager.getToolTip()).toContain('2.0.0');
        });

        it('should clear tooltip when clearUpdateTooltip is called', () => {
            const windowManager = new WindowManager(false);
            const trayManager = new TrayManager(windowManager);
            trayManager.createTray(); // Must create tray first

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
            trayManager.createTray(); // Must create tray first

            // Simulate update available notification flow
            badgeManager.showUpdateBadge();
            trayManager.setUpdateTooltip('2.0.0');

            expect(badgeManager.hasBadgeShown()).toBe(true);
            expect(trayManager.getToolTip()).toContain('2.0.0');

            // Simulate update applied - clear notification
            badgeManager.clearUpdateBadge();
            trayManager.clearUpdateTooltip();

            expect(badgeManager.hasBadgeShown()).toBe(false);
            expect(trayManager.getToolTip()).not.toContain('2.0.0');
        });
    });
});



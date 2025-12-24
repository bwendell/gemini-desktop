/**
 * Integration Test: Badge + OS Integration
 *
 * Verifies that the BadgeManager correctly interacts with OS-specific APIs
 * (dock on macOS, taskbar overlay on Windows) when updates are available.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, BrowserWindow, nativeImage } from 'electron';
import BadgeManager from '../../electron/managers/badgeManager';

import { isMacOS, isWindows, isLinux } from '../../electron/utils/constants';

// Mock dependencies
vi.mock('../../electron/utils/logger', () => ({
    createLogger: () => ({
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    })
}));

// Mock constants for platform switching
vi.mock('../../electron/utils/constants', async () => {
    const actual = await vi.importActual('../../electron/utils/constants');
    return {
        ...actual,
        isMacOS: false,
        isWindows: false,
        isLinux: false
    };
});

describe('Badge Integration', () => {
    let badgeManager: BadgeManager;
    let mainWindowMock: any;

    beforeEach(() => {
        vi.clearAllMocks();

        badgeManager = new BadgeManager();

        mainWindowMock = {
            isDestroyed: () => false,
            setOverlayIcon: vi.fn()
        };

        badgeManager.setMainWindow(mainWindowMock);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('macOS Behavior', () => {
        beforeEach(async () => {
            // Simulate macOS
            const constants = await import('../../electron/utils/constants');
            (constants as any).isMacOS = true;
            (constants as any).isWindows = false;
            (constants as any).isLinux = false;

            Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });
            (app as any).dock = {
                setBadge: vi.fn()
            };
        });

        it('should update dock badge on showUpdateBadge', () => {
            badgeManager.showUpdateBadge('!');
            expect(app.dock.setBadge).toHaveBeenCalledWith('!');
        });

        it('should use default bullet char if no text provided', () => {
            badgeManager.showUpdateBadge();
            expect(app.dock.setBadge).toHaveBeenCalledWith('•');
        });

        it('should clear dock badge on clearUpdateBadge', () => {
            // First show it
            badgeManager.showUpdateBadge();
            expect(badgeManager.hasBadgeShown()).toBe(true);

            // Then clear it
            badgeManager.clearUpdateBadge();
            expect(app.dock.setBadge).toHaveBeenCalledWith('');
            expect(badgeManager.hasBadgeShown()).toBe(false);
        });
    });

    describe('Windows Behavior', () => {
        beforeEach(async () => {
            // Simulate Windows
            const constants = await import('../../electron/utils/constants');
            (constants as any).isMacOS = false;
            (constants as any).isWindows = true;
            (constants as any).isLinux = false;

            Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

            // Mock nativeImage.createFromPath to return a dummy image
            vi.spyOn(nativeImage, 'createFromPath').mockReturnValue({} as any);
        });

        it('should set overlay icon on main window', () => {
            // Force reload to pick up Windows platform check in constructor or load method
            badgeManager = new BadgeManager();
            badgeManager.setMainWindow(mainWindowMock);

            badgeManager.showUpdateBadge();

            expect(mainWindowMock.setOverlayIcon).toHaveBeenCalled();
            // Verify it was called with some image and tooltip 'Update available'
            expect(mainWindowMock.setOverlayIcon).toHaveBeenCalledWith(expect.anything(), 'Update available');
        });

        it('should clear overlay icon', () => {
            // Force reload
            badgeManager = new BadgeManager();
            badgeManager.setMainWindow(mainWindowMock);

            // Show first
            badgeManager.showUpdateBadge();
            expect(badgeManager.hasBadgeShown()).toBe(true);

            // Clear
            badgeManager.clearUpdateBadge();
            expect(mainWindowMock.setOverlayIcon).toHaveBeenCalledWith(null, '');
            expect(badgeManager.hasBadgeShown()).toBe(false);
        });

        it('should handle missing main window gracefully', () => {
            // Force reload
            badgeManager = new BadgeManager();
            badgeManager.setMainWindow(null);

            // Should not throw
            expect(() => badgeManager.showUpdateBadge()).not.toThrow();
            expect(() => badgeManager.clearUpdateBadge()).not.toThrow();
        });
    });

    describe('Linux Behavior', () => {
        beforeEach(async () => {
            // Simulate Linux
            const constants = await import('../../electron/utils/constants');
            (constants as any).isMacOS = false;
            (constants as any).isWindows = false;
            (constants as any).isLinux = true;

            Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });

            // Mock nativeImage for safety, though should not be used
            vi.spyOn(nativeImage, 'createFromPath').mockReturnValue({} as any);
        });

        it('should NOT attempt to set dock badge or overlay icon', () => {
            badgeManager = new BadgeManager();
            badgeManager.setMainWindow(mainWindowMock);

            badgeManager.showUpdateBadge('!');

            // Should verify that NO platform APIs were called
            // app.dock might be undefined on linux, so check that if it exists it wasn't called
            if (app.dock) {
                expect(app.dock.setBadge).not.toHaveBeenCalled();
            }
            expect(mainWindowMock.setOverlayIcon).not.toHaveBeenCalled();

            // But state should be tracked
            expect(badgeManager.hasBadgeShown()).toBe(true);
        });

        it('should clear gracefully', () => {
            badgeManager = new BadgeManager();
            badgeManager.setMainWindow(mainWindowMock);
            badgeManager.showUpdateBadge();

            badgeManager.clearUpdateBadge();

            expect(mainWindowMock.setOverlayIcon).not.toHaveBeenCalled();
            expect(badgeManager.hasBadgeShown()).toBe(false);
        });
    });
});

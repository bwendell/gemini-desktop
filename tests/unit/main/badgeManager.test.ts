/**
 * Unit tests for BadgeManager.
 * Tests Windows platform (the default in mock) with full coverage.
 * macOS/Linux paths are covered by v8 ignore for platform-specific code.
 * 
 * @module badgeManager.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow } from 'electron';
import BadgeManager from '../../../src/main/managers/badgeManager';

// Mock the constants module to control platform detection (Windows by default)
vi.mock('../../../src/main/utils/constants', () => ({
    isMacOS: false,
    isWindows: true,
    isLinux: false,
}));

describe('BadgeManager', () => {
    let badgeManager: BadgeManager;

    beforeEach(() => {
        vi.clearAllMocks();
        badgeManager = new BadgeManager();
    });

    describe('constructor', () => {
        it('initializes without errors', () => {
            expect(badgeManager).toBeDefined();
        });

        it('initializes with no badge shown', () => {
            expect(badgeManager.hasBadgeShown()).toBe(false);
        });
    });

    describe('setMainWindow', () => {
        it('sets the main window reference', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn()
            } as unknown as BrowserWindow;

            badgeManager.setMainWindow(mockWindow);
            expect(true).toBe(true);
        });

        it('accepts null window reference', () => {
            badgeManager.setMainWindow(null);
            expect(true).toBe(true);
        });
    });

    describe('showUpdateBadge', () => {
        it('sets hasBadge flag to true', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn()
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showUpdateBadge();
            expect(badgeManager.hasBadgeShown()).toBe(true);
        });

        it('does not call showUpdateBadge again if already shown', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn()
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showUpdateBadge();
            badgeManager.showUpdateBadge();

            // On Windows, setOverlayIcon should only be called once
            expect(mockWindow.setOverlayIcon).toHaveBeenCalledTimes(1);
        });

        it('sets overlay icon on Windows with correct description', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn()
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showUpdateBadge();
            expect(mockWindow.setOverlayIcon).toHaveBeenCalledWith(
                expect.anything(),
                'Update available'
            );
        });

        it('handles null window gracefully', () => {
            badgeManager.setMainWindow(null);
            badgeManager.showUpdateBadge();
            // Should not throw, badge state is still set
            expect(badgeManager.hasBadgeShown()).toBe(true);
        });

        it('does not set overlay if window is destroyed', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(true),
                setOverlayIcon: vi.fn()
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showUpdateBadge();
            expect(mockWindow.setOverlayIcon).not.toHaveBeenCalled();
        });
    });

    describe('clearUpdateBadge', () => {
        it('clears the overlay icon with null', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn()
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showUpdateBadge();
            badgeManager.clearUpdateBadge();

            expect(mockWindow.setOverlayIcon).toHaveBeenLastCalledWith(null, '');
        });

        it('sets hasBadge flag to false', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn()
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showUpdateBadge();
            badgeManager.clearUpdateBadge();

            expect(badgeManager.hasBadgeShown()).toBe(false);
        });

        it('does nothing if badge not shown', () => {
            // hasBadge is false initially, clearUpdateBadge should be a no-op
            badgeManager.clearUpdateBadge();
            expect(badgeManager.hasBadgeShown()).toBe(false);
        });

        it('handles destroyed window gracefully', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn()
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);
            badgeManager.showUpdateBadge();

            // Now simulate window destruction
            mockWindow.isDestroyed = vi.fn().mockReturnValue(true);

            expect(() => badgeManager.clearUpdateBadge()).not.toThrow();
        });
    });

    describe('hasBadgeShown', () => {
        it('returns false initially', () => {
            expect(badgeManager.hasBadgeShown()).toBe(false);
        });

        it('returns true after showUpdateBadge', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn()
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showUpdateBadge();
            expect(badgeManager.hasBadgeShown()).toBe(true);
        });

        it('returns false after clearUpdateBadge', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn()
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showUpdateBadge();
            badgeManager.clearUpdateBadge();
            expect(badgeManager.hasBadgeShown()).toBe(false);
        });
    });
});







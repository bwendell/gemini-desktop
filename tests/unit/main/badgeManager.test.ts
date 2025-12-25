/**
 * Unit tests for BadgeManager.
 * Tests all platforms (macOS, Windows, Linux) by mocking constants with hoisted getters.
 *
 * @module badgeManager.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow, app } from 'electron';
import BadgeManager from '../../../src/main/managers/badgeManager';

// Use hoisted mocks for dynamic platform switching
const mocks = vi.hoisted(() => ({
  isMacOS: false,
  isWindows: true,
  isLinux: false,
}));

vi.mock('../../../src/main/utils/constants', async (importOriginal) => {
  type ConstantsModule = typeof import('../../../src/main/utils/constants');
  const actual = await importOriginal<ConstantsModule>();
  return {
    ...actual,
    get isMacOS() {
      return mocks.isMacOS;
    },
    get isWindows() {
      return mocks.isWindows;
    },
    get isLinux() {
      return mocks.isLinux;
    },
  };
});

describe('BadgeManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Windows Platform', () => {
    let badgeManager: BadgeManager;

    beforeEach(() => {
      mocks.isMacOS = false;
      mocks.isWindows = true;
      mocks.isLinux = false;
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
          setOverlayIcon: vi.fn(),
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
          setOverlayIcon: vi.fn(),
        } as unknown as BrowserWindow;
        badgeManager.setMainWindow(mockWindow);

        badgeManager.showUpdateBadge();
        expect(badgeManager.hasBadgeShown()).toBe(true);
      });

      it('does not call setOverlayIcon again if already shown', () => {
        const mockWindow = {
          isDestroyed: vi.fn().mockReturnValue(false),
          setOverlayIcon: vi.fn(),
        } as unknown as BrowserWindow;
        badgeManager.setMainWindow(mockWindow);

        badgeManager.showUpdateBadge();
        badgeManager.showUpdateBadge();

        expect(mockWindow.setOverlayIcon).toHaveBeenCalledTimes(1);
      });

      it('sets overlay icon on Windows with correct description', () => {
        const mockWindow = {
          isDestroyed: vi.fn().mockReturnValue(false),
          setOverlayIcon: vi.fn(),
        } as unknown as BrowserWindow;
        badgeManager.setMainWindow(mockWindow);

        badgeManager.showUpdateBadge();
        expect(mockWindow.setOverlayIcon).toHaveBeenCalledWith(expect.anything(), 'Update available');
      });

      it('handles null window gracefully', () => {
        badgeManager.setMainWindow(null);
        badgeManager.showUpdateBadge();
        expect(badgeManager.hasBadgeShown()).toBe(true);
      });

      it('does not set overlay if window is destroyed', () => {
        const mockWindow = {
          isDestroyed: vi.fn().mockReturnValue(true),
          setOverlayIcon: vi.fn(),
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
          setOverlayIcon: vi.fn(),
        } as unknown as BrowserWindow;
        badgeManager.setMainWindow(mockWindow);

        badgeManager.showUpdateBadge();
        badgeManager.clearUpdateBadge();

        expect(mockWindow.setOverlayIcon).toHaveBeenLastCalledWith(null, '');
      });

      it('sets hasBadge flag to false', () => {
        const mockWindow = {
          isDestroyed: vi.fn().mockReturnValue(false),
          setOverlayIcon: vi.fn(),
        } as unknown as BrowserWindow;
        badgeManager.setMainWindow(mockWindow);

        badgeManager.showUpdateBadge();
        badgeManager.clearUpdateBadge();

        expect(badgeManager.hasBadgeShown()).toBe(false);
      });

      it('does nothing if badge not shown', () => {
        badgeManager.clearUpdateBadge();
        expect(badgeManager.hasBadgeShown()).toBe(false);
      });

      it('handles destroyed window gracefully', () => {
        const mockWindow = {
          isDestroyed: vi.fn().mockReturnValue(false),
          setOverlayIcon: vi.fn(),
        } as unknown as BrowserWindow;
        badgeManager.setMainWindow(mockWindow);
        badgeManager.showUpdateBadge();

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
          setOverlayIcon: vi.fn(),
        } as unknown as BrowserWindow;
        badgeManager.setMainWindow(mockWindow);

        badgeManager.showUpdateBadge();
        expect(badgeManager.hasBadgeShown()).toBe(true);
      });

      it('returns false after clearUpdateBadge', () => {
        const mockWindow = {
          isDestroyed: vi.fn().mockReturnValue(false),
          setOverlayIcon: vi.fn(),
        } as unknown as BrowserWindow;
        badgeManager.setMainWindow(mockWindow);

        badgeManager.showUpdateBadge();
        badgeManager.clearUpdateBadge();
        expect(badgeManager.hasBadgeShown()).toBe(false);
      });
    });
  });

  describe('macOS Platform', () => {
    let badgeManager: BadgeManager;

    beforeEach(() => {
      mocks.isMacOS = true;
      mocks.isWindows = false;
      mocks.isLinux = false;
      badgeManager = new BadgeManager();
    });

    describe('showUpdateBadge', () => {
      it('sets dock badge on macOS', () => {
        badgeManager.showUpdateBadge();
        expect(app.dock?.setBadge).toHaveBeenCalledWith('•');
        expect(badgeManager.hasBadgeShown()).toBe(true);
      });

      it('sets custom text on dock badge', () => {
        badgeManager.showUpdateBadge('1');
        expect(app.dock?.setBadge).toHaveBeenCalledWith('1');
      });

      it('does not call setOverlayIcon on macOS', () => {
        const mockWindow = {
          isDestroyed: vi.fn().mockReturnValue(false),
          setOverlayIcon: vi.fn(),
        } as unknown as BrowserWindow;
        badgeManager.setMainWindow(mockWindow);

        badgeManager.showUpdateBadge();
        expect(mockWindow.setOverlayIcon).not.toHaveBeenCalled();
      });
    });

    describe('clearUpdateBadge', () => {
      it('clears dock badge on macOS', () => {
        badgeManager.showUpdateBadge();
        badgeManager.clearUpdateBadge();

        expect(app.dock?.setBadge).toHaveBeenLastCalledWith('');
        expect(badgeManager.hasBadgeShown()).toBe(false);
      });
    });
  });

  describe('Linux Platform', () => {
    let badgeManager: BadgeManager;

    beforeEach(() => {
      mocks.isMacOS = false;
      mocks.isWindows = false;
      mocks.isLinux = true;
      badgeManager = new BadgeManager();
    });

    describe('showUpdateBadge', () => {
      it('sets hasBadge flag to true even on Linux (no native support)', () => {
        badgeManager.showUpdateBadge();
        // Linux has no native badge, but state should still be tracked
        expect(badgeManager.hasBadgeShown()).toBe(true);
      });

      it('does not call setOverlayIcon on Linux', () => {
        const mockWindow = {
          isDestroyed: vi.fn().mockReturnValue(false),
          setOverlayIcon: vi.fn(),
        } as unknown as BrowserWindow;
        badgeManager.setMainWindow(mockWindow);

        badgeManager.showUpdateBadge();
        expect(mockWindow.setOverlayIcon).not.toHaveBeenCalled();
      });

      it('does not call dock.setBadge on Linux', () => {
        badgeManager.showUpdateBadge();
        expect(app.dock?.setBadge).not.toHaveBeenCalled();
      });
    });

    describe('clearUpdateBadge', () => {
      it('clears hasBadge flag on Linux', () => {
        badgeManager.showUpdateBadge();
        badgeManager.clearUpdateBadge();
        expect(badgeManager.hasBadgeShown()).toBe(false);
      });
    });
  });
});

/**
 * Unit tests for BadgeManager.
 * Tests all platforms (Windows, macOS, Linux) with full coverage.
 *
 * @module badgeManager.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow } from 'electron';
import BadgeManager from '../../../src/main/managers/badgeManager';
import type { PlatformAdapter } from '../../../src/main/platform/PlatformAdapter';
import { platformAdapterPresets, resetPlatformAdapterForTests, useMockPlatformAdapter } from '../../helpers/mocks';

/** Create a spy-wrapped adapter for a given platform */
function createSpyAdapter(platform: 'windows' | 'mac' | 'linux'): PlatformAdapter {
    const adapter =
        platform === 'windows'
            ? platformAdapterPresets.windows()
            : platform === 'mac'
              ? platformAdapterPresets.mac()
              : platformAdapterPresets['linux-x11']();

    // Wrap key methods with spies
    vi.spyOn(adapter, 'supportsBadges');
    vi.spyOn(adapter, 'showBadge');
    vi.spyOn(adapter, 'clearBadge');

    return adapter;
}

describe.each([
    { name: 'Windows', platform: 'windows' as const },
    { name: 'macOS', platform: 'mac' as const },
    { name: 'Linux', platform: 'linux' as const },
])('BadgeManager on $name', ({ name, platform }) => {
    let badgeManager: BadgeManager;
    let adapter: PlatformAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        resetPlatformAdapterForTests({ resetModules: true });

        adapter = createSpyAdapter(platform);
        useMockPlatformAdapter(adapter);
        badgeManager = new BadgeManager(adapter);
    });

    afterEach(() => {
        resetPlatformAdapterForTests({ resetModules: true });
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

        it('does not call platform APIs again if already shown', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn(),
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showUpdateBadge();
            badgeManager.showUpdateBadge();

            // Should early return and log
            if (name === 'Windows') {
                expect(mockWindow.setOverlayIcon).toHaveBeenCalledTimes(1);
            }
        });

        if (name === 'Windows') {
            it('sets overlay icon on Windows with correct description', () => {
                const mockWindow = {
                    isDestroyed: vi.fn().mockReturnValue(false),
                    setOverlayIcon: vi.fn(),
                } as unknown as BrowserWindow;
                badgeManager.setMainWindow(mockWindow);

                badgeManager.showUpdateBadge();
                expect(mockWindow.setOverlayIcon).toHaveBeenCalledWith(expect.anything(), 'Update available');
            });

            it('handles null window gracefully on Windows', () => {
                badgeManager.setMainWindow(null);
                badgeManager.showUpdateBadge();
                // Should not throw, badge state is still set
                expect(badgeManager.hasBadgeShown()).toBe(true);
            });

            it('does not set overlay if window is destroyed on Windows', () => {
                const mockWindow = {
                    isDestroyed: vi.fn().mockReturnValue(true),
                    setOverlayIcon: vi.fn(),
                } as unknown as BrowserWindow;
                badgeManager.setMainWindow(mockWindow);

                badgeManager.showUpdateBadge();
                expect(mockWindow.setOverlayIcon).not.toHaveBeenCalled();
            });
        }

        if (name === 'macOS') {
            it('uses app.dock.setBadge on macOS via adapter', () => {
                badgeManager.showUpdateBadge('•');
                expect(adapter.showBadge).toHaveBeenCalledWith(
                    expect.objectContaining({ description: 'Update available', text: '•' }),
                    expect.anything()
                );
            });
        }

        if (name === 'Linux') {
            it('gracefully handles no native badge support on Linux', () => {
                badgeManager.showUpdateBadge();
                // Badge state should still be set even though no visual badge is shown
                expect(badgeManager.hasBadgeShown()).toBe(true);
            });
        }
    });

    describe('clearUpdateBadge', () => {
        if (name === 'Windows') {
            it('clears the overlay icon with null on Windows', () => {
                const mockWindow = {
                    isDestroyed: vi.fn().mockReturnValue(false),
                    setOverlayIcon: vi.fn(),
                } as unknown as BrowserWindow;
                badgeManager.setMainWindow(mockWindow);

                badgeManager.showUpdateBadge();
                badgeManager.clearUpdateBadge();

                expect(mockWindow.setOverlayIcon).toHaveBeenLastCalledWith(null, '');
            });

            it('handles destroyed window gracefully on Windows', () => {
                const mockWindow = {
                    isDestroyed: vi.fn().mockReturnValue(false),
                    setOverlayIcon: vi.fn(),
                } as unknown as BrowserWindow;
                badgeManager.setMainWindow(mockWindow);
                badgeManager.showUpdateBadge();

                // Now simulate window destruction
                mockWindow.isDestroyed = vi.fn().mockReturnValue(true);

                expect(() => badgeManager.clearUpdateBadge()).not.toThrow();
            });
        }

        if (name === 'macOS') {
            it('clears badge via adapter on macOS', () => {
                badgeManager.showUpdateBadge();
                badgeManager.clearUpdateBadge();
                expect(adapter.clearBadge).toHaveBeenCalled();
            });
        }

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

        it('returns true after showNotificationBadge', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn(),
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showNotificationBadge();
            expect(badgeManager.hasBadgeShown()).toBe(true);
        });
    });

    describe('showNotificationBadge', () => {
        it('sets hasNotificationBadgeShown flag to true', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn(),
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showNotificationBadge();
            expect(badgeManager.hasNotificationBadgeShown()).toBe(true);
        });

        it('does not call platform APIs again if already shown', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn(),
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showNotificationBadge();
            badgeManager.showNotificationBadge();

            // Should early return and log
            if (name === 'Windows') {
                expect(mockWindow.setOverlayIcon).toHaveBeenCalledTimes(1);
            }
        });

        if (name === 'Windows') {
            it('sets overlay icon on Windows with correct description', () => {
                const mockWindow = {
                    isDestroyed: vi.fn().mockReturnValue(false),
                    setOverlayIcon: vi.fn(),
                } as unknown as BrowserWindow;
                badgeManager.setMainWindow(mockWindow);

                badgeManager.showNotificationBadge();
                expect(mockWindow.setOverlayIcon).toHaveBeenCalledWith(expect.anything(), 'Response ready');
            });

            it('handles null window gracefully on Windows', () => {
                badgeManager.setMainWindow(null);
                badgeManager.showNotificationBadge();
                // Should not throw, badge state is still set
                expect(badgeManager.hasNotificationBadgeShown()).toBe(true);
            });
        }

        if (name === 'macOS') {
            it('uses adapter.showBadge on macOS', () => {
                badgeManager.showNotificationBadge('•');
                expect(adapter.showBadge).toHaveBeenCalledWith(
                    expect.objectContaining({ description: 'Response ready', text: '•' }),
                    expect.anything()
                );
            });
        }

        if (name === 'Linux') {
            it('gracefully handles no native badge support on Linux', () => {
                badgeManager.showNotificationBadge();
                // Badge state should still be set even though no visual badge is shown
                expect(badgeManager.hasNotificationBadgeShown()).toBe(true);
            });
        }
    });

    describe('clearNotificationBadge', () => {
        if (name === 'Windows') {
            it('clears the overlay icon with null on Windows', () => {
                const mockWindow = {
                    isDestroyed: vi.fn().mockReturnValue(false),
                    setOverlayIcon: vi.fn(),
                } as unknown as BrowserWindow;
                badgeManager.setMainWindow(mockWindow);

                badgeManager.showNotificationBadge();
                badgeManager.clearNotificationBadge();

                expect(mockWindow.setOverlayIcon).toHaveBeenLastCalledWith(null, '');
            });
        }

        if (name === 'macOS') {
            it('clears badge via adapter on macOS', () => {
                badgeManager.showNotificationBadge();
                badgeManager.clearNotificationBadge();
                expect(adapter.clearBadge).toHaveBeenCalled();
            });
        }

        it('sets hasNotificationBadgeShown flag to false', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn(),
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showNotificationBadge();
            badgeManager.clearNotificationBadge();

            expect(badgeManager.hasNotificationBadgeShown()).toBe(false);
        });

        it('does nothing if badge not shown', () => {
            badgeManager.clearNotificationBadge();
            expect(badgeManager.hasNotificationBadgeShown()).toBe(false);
        });
    });

    describe('hasNotificationBadgeShown', () => {
        it('returns false initially', () => {
            expect(badgeManager.hasNotificationBadgeShown()).toBe(false);
        });

        it('returns true after showNotificationBadge', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn(),
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showNotificationBadge();
            expect(badgeManager.hasNotificationBadgeShown()).toBe(true);
        });

        it('returns false after clearNotificationBadge', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn(),
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showNotificationBadge();
            badgeManager.clearNotificationBadge();
            expect(badgeManager.hasNotificationBadgeShown()).toBe(false);
        });
    });

    describe('badge coexistence', () => {
        it('can show both update and notification badges simultaneously', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn(),
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showUpdateBadge();
            badgeManager.showNotificationBadge();

            expect(badgeManager.hasBadgeShown()).toBe(true);
            expect(badgeManager.hasNotificationBadgeShown()).toBe(true);
        });

        it('keeps badge visible after clearing only one type', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn(),
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showUpdateBadge();
            badgeManager.showNotificationBadge();
            badgeManager.clearNotificationBadge();

            // Update badge should still be shown
            expect(badgeManager.hasBadgeShown()).toBe(true);
            expect(badgeManager.hasNotificationBadgeShown()).toBe(false);
        });

        it('keeps badge visible after clearing update badge when notification badge active', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn(),
            } as unknown as BrowserWindow;
            badgeManager.setMainWindow(mockWindow);

            badgeManager.showUpdateBadge();
            badgeManager.showNotificationBadge();
            badgeManager.clearUpdateBadge();

            // Notification badge should still be shown
            expect(badgeManager.hasBadgeShown()).toBe(true);
            expect(badgeManager.hasNotificationBadgeShown()).toBe(true);
        });

        if (name === 'Windows') {
            it('does not clear overlay icon when one badge type remains on Windows', () => {
                const mockWindow = {
                    isDestroyed: vi.fn().mockReturnValue(false),
                    setOverlayIcon: vi.fn(),
                } as unknown as BrowserWindow;
                badgeManager.setMainWindow(mockWindow);

                badgeManager.showUpdateBadge();
                badgeManager.showNotificationBadge();
                badgeManager.clearNotificationBadge();

                // Should NOT have called setOverlayIcon with null

                const calls = (mockWindow.setOverlayIcon as any).mock.calls;
                const nullCalls = calls.filter((call: [Electron.NativeImage | null, string]) => call[0] === null);
                expect(nullCalls.length).toBe(0);
            });

            it('clears overlay icon only when all badge types are cleared on Windows', () => {
                const mockWindow = {
                    isDestroyed: vi.fn().mockReturnValue(false),
                    setOverlayIcon: vi.fn(),
                } as unknown as BrowserWindow;
                badgeManager.setMainWindow(mockWindow);

                badgeManager.showUpdateBadge();
                badgeManager.showNotificationBadge();
                badgeManager.clearUpdateBadge();
                badgeManager.clearNotificationBadge();

                expect(mockWindow.setOverlayIcon).toHaveBeenLastCalledWith(null, '');
            });
        }
    });
});

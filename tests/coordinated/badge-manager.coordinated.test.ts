/**
 * Coordinated tests for BadgeManager integration with IpcManager and WindowManager.
 * Tests multi-component coordination for badge state synchronization.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, BrowserWindow } from 'electron';
import BadgeManager from '../../src/main/managers/badgeManager';
import WindowManager from '../../src/main/managers/windowManager';
import type { PlatformAdapter } from '../../src/main/platform/PlatformAdapter';
import { platformAdapterPresets, resetPlatformAdapterForTests, useMockPlatformAdapter } from '../helpers/mocks';

vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/__mocks__/logger';

vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
}));

describe('BadgeManager Coordinated Tests', () => {
    let badgeManager: BadgeManager;
    let windowManager: WindowManager;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();
        resetPlatformAdapterForTests({ resetModules: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests({ resetModules: true });
    });

    const adapterForPlatform: Record<string, () => PlatformAdapter> = {
        darwin: () => platformAdapterPresets.mac(),
        win32: () => platformAdapterPresets.windows(),
        linux: () => platformAdapterPresets.linuxX11(),
    };

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        let adapter: PlatformAdapter;

        beforeEach(() => {
            adapter = adapterForPlatform[platform]();
            useMockPlatformAdapter(adapter);
            windowManager = new WindowManager(false);
            badgeManager = new BadgeManager(adapter);
        });

        describe('Window Coordination', () => {
            it('should coordinate badge with main window lifecycle', () => {
                const mainWindow = windowManager.createMainWindow();

                badgeManager.setMainWindow(mainWindow);

                badgeManager.showUpdateBadge();
                expect(badgeManager.hasBadgeShown()).toBe(true);

                if (platform === 'win32') {
                    expect(mainWindow.setOverlayIcon).toHaveBeenCalled();
                } else if (platform === 'darwin') {
                    expect(app.dock?.setBadge).toHaveBeenCalled();
                }

                badgeManager.clearUpdateBadge();
                expect(badgeManager.hasBadgeShown()).toBe(false);

                if (platform === 'win32') {
                    expect(mainWindow.setOverlayIcon).toHaveBeenCalledWith(null, '');
                } else if (platform === 'darwin') {
                    expect(app.dock?.setBadge).toHaveBeenCalledWith('');
                }
            });

            it('should handle window destruction gracefully', () => {
                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);

                (mainWindow.isDestroyed as any).mockReturnValue(true);

                expect(() => {
                    badgeManager.showUpdateBadge();
                }).not.toThrow();

                if (platform === 'win32') {
                    expect(mockLogger.warn).toHaveBeenCalledWith(
                        expect.stringContaining('window or icon not available')
                    );
                }
            });

            it('should handle null main window reference', () => {
                badgeManager.setMainWindow(null);

                expect(() => {
                    badgeManager.showUpdateBadge();
                }).not.toThrow();

                if (platform === 'win32') {
                    expect(mockLogger.warn).toHaveBeenCalled();
                }
            });
        });

        describe('Badge State Management', () => {
            it('should prevent showing badge twice', () => {
                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);

                badgeManager.showUpdateBadge();
                expect(badgeManager.hasBadgeShown()).toBe(true);

                vi.clearAllMocks();

                badgeManager.showUpdateBadge();

                expect(mockLogger.log).toHaveBeenCalledWith('Update badge already shown');

                if (platform === 'win32') {
                    expect(mainWindow.setOverlayIcon).not.toHaveBeenCalled();
                } else if (platform === 'darwin') {
                    expect(app.dock?.setBadge).not.toHaveBeenCalled();
                }
            });

            it('should handle clear badge when not shown', () => {
                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);

                badgeManager.clearUpdateBadge();

                if (platform === 'win32') {
                    expect(mainWindow.setOverlayIcon).not.toHaveBeenCalled();
                } else if (platform === 'darwin') {
                    expect(app.dock?.setBadge).not.toHaveBeenCalled();
                }
            });
        });

        describe('Platform-Specific Behavior', () => {
            it('should use correct platform API', () => {
                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);

                badgeManager.showUpdateBadge('1');

                if (platform === 'darwin') {
                    expect(app.dock?.setBadge).toHaveBeenCalledWith('1');
                } else if (platform === 'win32') {
                    expect(mainWindow.setOverlayIcon).toHaveBeenCalledWith(expect.anything(), 'Update available');
                } else if (platform === 'linux') {
                    expect(mockLogger.log).toHaveBeenCalledWith(
                        expect.stringContaining('Linux: Native badge not supported')
                    );
                }
            });

            it('should support custom badge text on macOS', () => {
                if (platform !== 'darwin') return;

                badgeManager.showUpdateBadge('5');
                expect(app.dock?.setBadge).toHaveBeenCalledWith('5');
            });
        });

        describe('Error Handling', () => {
            it('should handle badge display errors gracefully', () => {
                if (platform === 'linux') return;

                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);

                if (platform === 'win32') {
                    (mainWindow.setOverlayIcon as any).mockImplementation(() => {
                        throw new Error('Overlay failed');
                    });
                } else if (platform === 'darwin') {
                    (app.dock?.setBadge as any).mockImplementation(() => {
                        throw new Error('Dock failed');
                    });
                }

                expect(() => {
                    badgeManager.showUpdateBadge();
                }).not.toThrow();

                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Failed to show badge'),
                    expect.any(Error)
                );
            });

            it('should handle badge clear errors gracefully', () => {
                if (platform === 'linux' || platform === 'darwin') return;

                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);

                badgeManager.showUpdateBadge();
                vi.clearAllMocks();

                if (platform === 'win32') {
                    (mainWindow.setOverlayIcon as any).mockImplementation(() => {
                        throw new Error('Clear failed');
                    });
                } else if (platform === 'darwin') {
                    if (!app.dock) throw new Error('app.dock should be mocked');
                    (app.dock.setBadge as any).mockImplementation(() => {
                        throw new Error('Clear failed');
                    });
                }

                expect(() => {
                    badgeManager.clearUpdateBadge();
                }).not.toThrow();

                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Failed to clear badge'),
                    expect.any(Error)
                );
            });
        });
    });
});

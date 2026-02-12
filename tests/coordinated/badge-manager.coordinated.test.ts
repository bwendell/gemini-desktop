/**
 * Coordinated tests for BadgeManager integration with IpcManager and WindowManager.
 * Tests multi-component coordination for badge state synchronization.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, BrowserWindow } from 'electron';
import BadgeManager from '../../src/main/managers/badgeManager';
import WindowManager from '../../src/main/managers/windowManager';
import { WindowsAdapter } from '../../src/main/platform/adapters/WindowsAdapter';
import { MacAdapter } from '../../src/main/platform/adapters/MacAdapter';
import { LinuxX11Adapter } from '../../src/main/platform/adapters/LinuxX11Adapter';
import type { PlatformAdapter } from '../../src/main/platform/PlatformAdapter';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/logger';

// Mock fs for BadgeManager icon loading
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
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Map platform to adapter
    const adapterForPlatform: Record<string, () => PlatformAdapter> = {
        darwin: () => new MacAdapter(),
        win32: () => new WindowsAdapter(),
        linux: () => new LinuxX11Adapter(),
    };

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        let adapter: PlatformAdapter;

        beforeEach(() => {
            // Mock global process platform as well for consistency
            vi.stubGlobal('process', { ...process, platform });

            // Create adapter + managers
            adapter = adapterForPlatform[platform]();
            windowManager = new WindowManager(false);
            badgeManager = new BadgeManager(adapter);
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        describe('Window Coordination', () => {
            it('should coordinate badge with main window lifecycle', () => {
                const mainWindow = windowManager.createMainWindow();

                // Set main window reference
                badgeManager.setMainWindow(mainWindow);

                // Show badge
                badgeManager.showUpdateBadge();
                expect(badgeManager.hasBadgeShown()).toBe(true);

                if (platform === 'win32') {
                    // Windows: verify overlay icon was set
                    expect(mainWindow.setOverlayIcon).toHaveBeenCalled();
                } else if (platform === 'darwin') {
                    // macOS: verify dock badge was set
                    expect(app.dock?.setBadge).toHaveBeenCalled();
                }

                // Clear badge
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

                // Simulate window destruction
                (mainWindow.isDestroyed as any).mockReturnValue(true);

                // Should not crash when trying to show badge
                expect(() => {
                    badgeManager.showUpdateBadge();
                }).not.toThrow();

                // Should log warning on Windows
                if (platform === 'win32') {
                    expect(mockLogger.warn).toHaveBeenCalledWith(
                        expect.stringContaining('window or icon not available')
                    );
                }
            });

            it('should handle null main window reference', () => {
                badgeManager.setMainWindow(null);

                // Should not crash
                expect(() => {
                    badgeManager.showUpdateBadge();
                }).not.toThrow();

                // On platforms that need a window, should log warning
                if (platform === 'win32') {
                    expect(mockLogger.warn).toHaveBeenCalled();
                }
            });
        });

        describe('Badge State Management', () => {
            it('should prevent showing badge twice', () => {
                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);

                // Show badge first time
                badgeManager.showUpdateBadge();
                expect(badgeManager.hasBadgeShown()).toBe(true);

                vi.clearAllMocks();

                // Try to show again
                badgeManager.showUpdateBadge();

                // Should early return and log
                expect(mockLogger.log).toHaveBeenCalledWith('Update badge already shown');

                // Should not call platform APIs again
                if (platform === 'win32') {
                    expect(mainWindow.setOverlayIcon).not.toHaveBeenCalled();
                } else if (platform === 'darwin') {
                    expect(app.dock?.setBadge).not.toHaveBeenCalled();
                }
            });

            it('should handle clear badge when not shown', () => {
                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);

                // Clear without showing first
                badgeManager.clearUpdateBadge();

                // Should early return, no platform API calls
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
                    // macOS uses dock badge with text
                    expect(app.dock?.setBadge).toHaveBeenCalledWith('1');
                } else if (platform === 'win32') {
                    // Windows uses overlay icon
                    expect(mainWindow.setOverlayIcon).toHaveBeenCalledWith(expect.anything(), 'Update available');
                } else if (platform === 'linux') {
                    // Linux logs that it's not supported
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
                // Linux has no badge APIs to fail, skip this test
                if (platform === 'linux') return;

                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);

                // Mock error
                if (platform === 'win32') {
                    (mainWindow.setOverlayIcon as any).mockImplementation(() => {
                        throw new Error('Overlay failed');
                    });
                } else if (platform === 'darwin') {
                    (app.dock?.setBadge as any).mockImplementation(() => {
                        throw new Error('Dock failed');
                    });
                }

                // Should not crash
                expect(() => {
                    badgeManager.showUpdateBadge();
                }).not.toThrow();

                // Should log error
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Failed to show badge'),
                    expect.any(Error)
                );
            });

            it('should handle badge clear errors gracefully', () => {
                // Linux has no badge APIs to fail; Darwin dock error handling is defensive (v8 ignore)
                if (platform === 'linux' || platform === 'darwin') return;

                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);

                // Show first
                badgeManager.showUpdateBadge();
                vi.clearAllMocks();

                // Mock error on clear
                if (platform === 'win32') {
                    (mainWindow.setOverlayIcon as any).mockImplementation(() => {
                        throw new Error('Clear failed');
                    });
                } else if (platform === 'darwin') {
                    // Ensure dock exists and mock it
                    if (!app.dock) throw new Error('app.dock should be mocked');
                    (app.dock.setBadge as any).mockImplementation(() => {
                        throw new Error('Clear failed');
                    });
                }

                // Should not crash
                expect(() => {
                    badgeManager.clearUpdateBadge();
                }).not.toThrow();

                // Should log error
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Failed to clear badge'),
                    expect.any(Error)
                );
            });
        });
    });
});

/**
 * Tests for Windows and Mac platform adapters.
 *
 * Verifies app configuration, AppUserModelId, hotkey registration plan,
 * Wayland status defaults, and shouldQuitOnWindowAllClosed for both adapters.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WaylandStatus } from '../../../../src/shared/types/hotkeys';
import type { Logger } from '../../../../src/main/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../../../src/main/utils/constants', () => ({
    isLinux: false,
    isWindows: true,
    isWayland: false,
    APP_ID: 'com.benwendell.gemini-desktop',
}));

vi.mock('../../../../src/main/utils/logger', () => ({
    createLogger: () => ({
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    }),
}));

import { WindowsAdapter } from '../../../../src/main/platform/adapters/WindowsAdapter';
import { MacAdapter } from '../../../../src/main/platform/adapters/MacAdapter';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Default WaylandStatus for non-Wayland / non-Linux contexts */
const DEFAULT_WAYLAND_STATUS: WaylandStatus = {
    isWayland: false,
    desktopEnvironment: 'unknown',
    deVersion: null,
    portalAvailable: false,
    portalMethod: 'none',
};

/** Create a mock Electron.App */
function createMockApp(): Electron.App {
    return {
        setName: vi.fn(),
        commandLine: {
            appendSwitch: vi.fn(),
            hasSwitch: vi.fn(),
            getSwitchValue: vi.fn(),
            removeSwitch: vi.fn(),
        },
        setDesktopName: vi.fn(),
        setAppUserModelId: vi.fn(),
    } as unknown as Electron.App;
}

/** Create a mock Logger */
function createMockLogger(): Logger {
    return {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    };
}

// ===========================================================================
// WindowsAdapter
// ===========================================================================

describe('WindowsAdapter', () => {
    let adapter: WindowsAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new WindowsAdapter();
    });

    it('should have id "windows"', () => {
        expect(adapter.id).toBe('windows');
    });

    describe('applyAppConfiguration()', () => {
        it('should set app name to "Gemini Desktop"', () => {
            const app = createMockApp();
            const logger = createMockLogger();

            adapter.applyAppConfiguration(app, logger);

            expect(app.setName).toHaveBeenCalledWith('Gemini Desktop');
        });

        it('should NOT set WM_CLASS or desktop name (Windows-only)', () => {
            const app = createMockApp();
            const logger = createMockLogger();

            adapter.applyAppConfiguration(app, logger);

            expect(app.commandLine.appendSwitch).not.toHaveBeenCalledWith('class', expect.anything());
            expect((app as any).setDesktopName).not.toHaveBeenCalled();
        });
    });

    describe('applyAppUserModelId()', () => {
        it('should call app.setAppUserModelId with APP_ID', () => {
            const app = createMockApp();

            adapter.applyAppUserModelId(app);

            expect(app.setAppUserModelId).toHaveBeenCalledWith('com.benwendell.gemini-desktop');
        });
    });

    describe('getHotkeyRegistrationPlan()', () => {
        it('should return mode "native"', () => {
            const plan = adapter.getHotkeyRegistrationPlan();

            expect(plan.mode).toBe('native');
        });

        it('should return default (all-false) WaylandStatus', () => {
            const plan = adapter.getHotkeyRegistrationPlan();

            expect(plan.waylandStatus).toEqual(DEFAULT_WAYLAND_STATUS);
        });
    });

    describe('getWaylandStatus()', () => {
        it('should return default (all-false) WaylandStatus', () => {
            const status = adapter.getWaylandStatus();

            expect(status).toEqual(DEFAULT_WAYLAND_STATUS);
        });
    });

    describe('shouldQuitOnWindowAllClosed()', () => {
        it('should return true', () => {
            expect(adapter.shouldQuitOnWindowAllClosed()).toBe(true);
        });
    });

    // --- New badge/window/menu methods ---

    describe('supportsBadges()', () => {
        it('should return true (Windows has overlay icons)', () => {
            expect(adapter.supportsBadges()).toBe(true);
        });
    });

    describe('showBadge()', () => {
        it('should call window.setOverlayIcon when window and icon are available', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn(),
            } as unknown as Electron.BrowserWindow;
            const mockIcon = {} as Electron.NativeImage;

            adapter.showBadge({
                window: mockWindow,
                description: 'Update available',
                text: '•',
                overlayIcon: mockIcon,
            });

            expect(mockWindow.setOverlayIcon).toHaveBeenCalledWith(mockIcon, 'Update available');
        });

        it('should not throw when window is null', () => {
            expect(() =>
                adapter.showBadge({
                    window: null,
                    description: 'Update',
                    text: '•',
                    overlayIcon: null,
                })
            ).not.toThrow();
        });

        it('should not throw when window is destroyed', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(true),
                setOverlayIcon: vi.fn(),
            } as unknown as Electron.BrowserWindow;

            expect(() =>
                adapter.showBadge({
                    window: mockWindow,
                    description: 'Update',
                    text: '•',
                    overlayIcon: null,
                })
            ).not.toThrow();
        });
    });

    describe('clearBadge()', () => {
        it('should call window.setOverlayIcon(null, "") to clear', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                setOverlayIcon: vi.fn(),
            } as unknown as Electron.BrowserWindow;

            adapter.clearBadge({ window: mockWindow });

            expect(mockWindow.setOverlayIcon).toHaveBeenCalledWith(null, '');
        });

        it('should not throw when window is null', () => {
            expect(() => adapter.clearBadge({ window: null })).not.toThrow();
        });
    });

    describe('getMainWindowPlatformConfig()', () => {
        it('should return empty object (no WM_CLASS needed on Windows)', () => {
            expect(adapter.getMainWindowPlatformConfig()).toEqual({});
        });
    });

    describe('hideToTray()', () => {
        it('should call hide() and setSkipTaskbar(true)', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                hide: vi.fn(),
                setSkipTaskbar: vi.fn(),
            } as unknown as Electron.BrowserWindow;

            adapter.hideToTray(mockWindow);

            expect(mockWindow.hide).toHaveBeenCalled();
            expect(mockWindow.setSkipTaskbar).toHaveBeenCalledWith(true);
        });
    });

    describe('restoreFromTray()', () => {
        it('should call show(), focus(), and setSkipTaskbar(false)', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                show: vi.fn(),
                focus: vi.fn(),
                setSkipTaskbar: vi.fn(),
            } as unknown as Electron.BrowserWindow;

            adapter.restoreFromTray(mockWindow);

            expect(mockWindow.show).toHaveBeenCalled();
            expect(mockWindow.focus).toHaveBeenCalled();
            expect(mockWindow.setSkipTaskbar).toHaveBeenCalledWith(false);
        });
    });

    describe('shouldIncludeAppMenu()', () => {
        it('should return false (no macOS-style app menu)', () => {
            expect(adapter.shouldIncludeAppMenu()).toBe(false);
        });
    });

    describe('getSettingsMenuLabel()', () => {
        it('should return "Options"', () => {
            expect(adapter.getSettingsMenuLabel()).toBe('Options');
        });
    });

    describe('getWindowCloseRole()', () => {
        it('should return "quit"', () => {
            expect(adapter.getWindowCloseRole()).toBe('quit');
        });
    });

    describe('getDockMenuTemplate()', () => {
        it('should return null (no dock menu on Windows)', () => {
            const callbacks = {
                restoreFromTray: vi.fn(),
                createOptionsWindow: vi.fn(),
            };
            expect(adapter.getDockMenuTemplate(callbacks)).toBeNull();
        });
    });
});

// ===========================================================================
// MacAdapter
// ===========================================================================

describe('MacAdapter', () => {
    let adapter: MacAdapter;

    beforeEach(() => {
        vi.clearAllMocks();
        adapter = new MacAdapter();
    });

    it('should have id "mac"', () => {
        expect(adapter.id).toBe('mac');
    });

    describe('applyAppConfiguration()', () => {
        it('should set app name to "Gemini Desktop"', () => {
            const app = createMockApp();
            const logger = createMockLogger();

            adapter.applyAppConfiguration(app, logger);

            expect(app.setName).toHaveBeenCalledWith('Gemini Desktop');
        });

        it('should NOT set WM_CLASS or desktop name (Mac-only)', () => {
            const app = createMockApp();
            const logger = createMockLogger();

            adapter.applyAppConfiguration(app, logger);

            expect(app.commandLine.appendSwitch).not.toHaveBeenCalledWith('class', expect.anything());
            expect((app as any).setDesktopName).not.toHaveBeenCalled();
        });
    });

    describe('applyAppUserModelId()', () => {
        it('should be a no-op (no calls to app)', () => {
            const app = createMockApp();

            adapter.applyAppUserModelId(app);

            expect(app.setAppUserModelId).not.toHaveBeenCalled();
        });
    });

    describe('getHotkeyRegistrationPlan()', () => {
        it('should return mode "native"', () => {
            const plan = adapter.getHotkeyRegistrationPlan();

            expect(plan.mode).toBe('native');
        });

        it('should return default (all-false) WaylandStatus', () => {
            const plan = adapter.getHotkeyRegistrationPlan();

            expect(plan.waylandStatus).toEqual(DEFAULT_WAYLAND_STATUS);
        });
    });

    describe('getWaylandStatus()', () => {
        it('should return default (all-false) WaylandStatus', () => {
            const status = adapter.getWaylandStatus();

            expect(status).toEqual(DEFAULT_WAYLAND_STATUS);
        });
    });

    describe('shouldQuitOnWindowAllClosed()', () => {
        it('should return false (macOS stays in dock)', () => {
            expect(adapter.shouldQuitOnWindowAllClosed()).toBe(false);
        });
    });

    // --- New badge/window/menu methods ---

    describe('supportsBadges()', () => {
        it('should return true (macOS has dock badges)', () => {
            expect(adapter.supportsBadges()).toBe(true);
        });
    });

    describe('showBadge()', () => {
        it('should call app.dock.setBadge with text', () => {
            const mockDock = { setBadge: vi.fn() };
            const mockApp = { dock: mockDock } as unknown as Electron.App;

            adapter.showBadge(
                {
                    window: null,
                    description: 'Update available',
                    text: '•',
                    overlayIcon: null,
                },
                mockApp
            );

            expect(mockDock.setBadge).toHaveBeenCalledWith('•');
        });

        it('should not throw when app.dock is undefined', () => {
            const mockApp = {} as unknown as Electron.App;

            expect(() =>
                adapter.showBadge(
                    {
                        window: null,
                        description: 'Update',
                        text: '•',
                        overlayIcon: null,
                    },
                    mockApp
                )
            ).not.toThrow();
        });
    });

    describe('clearBadge()', () => {
        it('should call app.dock.setBadge("") to clear', () => {
            const mockDock = { setBadge: vi.fn() };
            const mockApp = { dock: mockDock } as unknown as Electron.App;

            adapter.clearBadge({ window: null }, mockApp);

            expect(mockDock.setBadge).toHaveBeenCalledWith('');
        });

        it('should not throw when app.dock is undefined', () => {
            const mockApp = {} as unknown as Electron.App;
            expect(() => adapter.clearBadge({ window: null }, mockApp)).not.toThrow();
        });
    });

    describe('getMainWindowPlatformConfig()', () => {
        it('should return empty object (no WM_CLASS needed on macOS)', () => {
            expect(adapter.getMainWindowPlatformConfig()).toEqual({});
        });
    });

    describe('hideToTray()', () => {
        it('should call hide() but NOT setSkipTaskbar', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                hide: vi.fn(),
                setSkipTaskbar: vi.fn(),
            } as unknown as Electron.BrowserWindow;

            adapter.hideToTray(mockWindow);

            expect(mockWindow.hide).toHaveBeenCalled();
            expect(mockWindow.setSkipTaskbar).not.toHaveBeenCalled();
        });
    });

    describe('restoreFromTray()', () => {
        it('should call show() and focus() but NOT setSkipTaskbar', () => {
            const mockWindow = {
                isDestroyed: vi.fn().mockReturnValue(false),
                show: vi.fn(),
                focus: vi.fn(),
                setSkipTaskbar: vi.fn(),
            } as unknown as Electron.BrowserWindow;

            adapter.restoreFromTray(mockWindow);

            expect(mockWindow.show).toHaveBeenCalled();
            expect(mockWindow.focus).toHaveBeenCalled();
            expect(mockWindow.setSkipTaskbar).not.toHaveBeenCalled();
        });
    });

    describe('shouldIncludeAppMenu()', () => {
        it('should return true (macOS has app menu)', () => {
            expect(adapter.shouldIncludeAppMenu()).toBe(true);
        });
    });

    describe('getSettingsMenuLabel()', () => {
        it('should return "Settings..."', () => {
            expect(adapter.getSettingsMenuLabel()).toBe('Settings...');
        });
    });

    describe('getWindowCloseRole()', () => {
        it('should return "close" (macOS closes window, not app)', () => {
            expect(adapter.getWindowCloseRole()).toBe('close');
        });
    });

    describe('getDockMenuTemplate()', () => {
        it('should return a non-null menu template array', () => {
            const callbacks = {
                restoreFromTray: vi.fn(),
                createOptionsWindow: vi.fn(),
            };
            const template = adapter.getDockMenuTemplate(callbacks);

            expect(template).not.toBeNull();
            expect(Array.isArray(template)).toBe(true);
        });

        it('should include Show Gemini and Settings entries', () => {
            const callbacks = {
                restoreFromTray: vi.fn(),
                createOptionsWindow: vi.fn(),
            };
            const template = adapter.getDockMenuTemplate(callbacks)!;

            const labels = template.filter((item) => item.label).map((item) => item.label);
            expect(labels).toContain('Show Gemini');
            expect(labels).toContain('Settings');
        });

        it('should call restoreFromTray when Show Gemini is clicked', () => {
            const callbacks = {
                restoreFromTray: vi.fn(),
                createOptionsWindow: vi.fn(),
            };
            const template = adapter.getDockMenuTemplate(callbacks)!;

            const showGemini = template.find((item) => item.label === 'Show Gemini');
            showGemini?.click?.(null as any, null as any, null as any);

            expect(callbacks.restoreFromTray).toHaveBeenCalled();
        });

        it('should call createOptionsWindow when Settings is clicked', () => {
            const callbacks = {
                restoreFromTray: vi.fn(),
                createOptionsWindow: vi.fn(),
            };
            const template = adapter.getDockMenuTemplate(callbacks)!;

            const settings = template.find((item) => item.label === 'Settings');
            settings?.click?.(null as any, null as any, null as any);

            expect(callbacks.createOptionsWindow).toHaveBeenCalled();
        });
    });
});

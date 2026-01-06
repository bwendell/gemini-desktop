/**
 * Integration tests for WindowManager ↔ TrayManager ↔ MenuManager state coordination.
 * Tests window visibility state synchronization across managers.
 *
 * These tests use REAL manager instances (not mocked) while mocking Electron APIs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Menu, app } from 'electron';
import WindowManager from '../../src/main/managers/windowManager';
import TrayManager from '../../src/main/managers/trayManager';
import MenuManager from '../../src/main/managers/menuManager';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../src/main/utils/logger');

// Mock paths
vi.mock('../../src/main/utils/paths', () => ({
    getIconPath: () => '/mock/icon.png',
    getPreloadPath: () => '/mock/preload.js',
    getDistHtmlPath: (filename: string) => `/mock/dist/${filename}`,
}));

// Mock constants for getDevUrl
vi.mock('../../src/main/utils/constants', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
        get isMacOS() {
            return process.platform === 'darwin';
        },
        get isWindows() {
            return process.platform === 'win32';
        },
        get isLinux() {
            return process.platform === 'linux';
        },
        getDevUrl: (page: string = '') => `http://localhost:1420/${page}`,
    };
});

// Mock fs for icon existence check
vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
    },
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
}));

describe('WindowManager ↔ TrayManager ↔ MenuManager State Coordination', () => {
    let windowManager: WindowManager;
    let trayManager: TrayManager;
    let menuManager: MenuManager;

    beforeEach(() => {
        vi.clearAllMocks();
        const { BrowserWindow: BW, Tray: T, Menu: M } = require('electron');
        if ((BW as any)._reset) (BW as any)._reset();
        if ((T as any)._reset) (T as any)._reset();
        if ((M as any)._reset) (M as any)._reset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(() => {
            // Mock platform
            vi.stubGlobal('process', { ...process, platform });

            // Create REAL WindowManager after platform stub
            windowManager = new WindowManager(false);

            // Create REAL TrayManager and MenuManager
            trayManager = new TrayManager(windowManager);
            menuManager = new MenuManager(windowManager);
        });

        afterEach(() => {
            vi.unstubAllGlobals();
        });

        describe('Hide to tray → State synchronization → Restore', () => {
            it('should hide window, update tray state, and restore on tray click', () => {
                // Create main window
                const mainWindow = windowManager.createMainWindow();
                expect(mainWindow).toBeDefined();

                // Create tray
                const tray = trayManager.createTray();
                expect(tray).toBeDefined();

                // Window should be visible initially
                expect(mainWindow.isVisible()).toBe(true);

                // Hide to tray
                windowManager.hideToTray();

                // Verify window is hidden but not destroyed
                expect(mainWindow.isVisible()).toBe(false);
                expect(mainWindow.isDestroyed()).toBe(false);

                // Verify tray tooltip remains (TrayManager doesn't change tooltip on hide)
                expect(trayManager.getToolTip()).toBe('Gemini Desktop');

                // Simulate tray click to restore
                (tray as any).simulateClick();

                // Verify window is restored and visible
                expect(mainWindow.isVisible()).toBe(true);
                expect(mainWindow.isDestroyed()).toBe(false);
            });

            it('should handle hide/restore cycle multiple times', () => {
                const mainWindow = windowManager.createMainWindow();
                const tray = trayManager.createTray();

                // Cycle 3 times
                for (let i = 0; i < 3; i++) {
                    // Hide
                    windowManager.hideToTray();
                    expect(mainWindow.isVisible()).toBe(false);
                    expect(mainWindow.isDestroyed()).toBe(false);

                    // Restore
                    (tray as any).simulateClick();
                    expect(mainWindow.isVisible()).toBe(true);
                }
            });

            it('should update menu to reflect window state', () => {
                const mainWindow = windowManager.createMainWindow();
                trayManager.createTray();

                // Build menu
                menuManager.buildMenu();

                // Verify Menu.setApplicationMenu was called
                expect(Menu.setApplicationMenu).toHaveBeenCalled();

                // Hide window
                windowManager.hideToTray();
                expect(mainWindow.isVisible()).toBe(false);

                // Rebuild menu (in real app, this might be triggered by window state change)
                menuManager.buildMenu();

                // Menu should be rebuilt
                expect(Menu.setApplicationMenu).toHaveBeenCalledTimes(2);
            });
        });

        describe('Boss key hide → Window state coordination', () => {
            it('should hide all windows via boss key and track state', () => {
                // Create multiple windows
                const mainWindow = windowManager.createMainWindow();
                const quickChatWindow = windowManager.createQuickChatWindow();

                expect(mainWindow.isVisible()).toBe(true);
                expect(quickChatWindow.isVisible()).toBe(true);

                // Simulate boss key (via WindowManager methods)
                // Boss key hides Quick Chat window
                windowManager.hideQuickChat();
                expect(quickChatWindow.isVisible()).toBe(false);

                // Main window could be hidden too
                windowManager.hideToTray();
                expect(mainWindow.isVisible()).toBe(false);

                // Both windows should be hidden but not destroyed
                expect(mainWindow.isDestroyed()).toBe(false);
                expect(quickChatWindow.isDestroyed()).toBe(false);

                // Restore
                windowManager.restoreFromTray();
                windowManager.showQuickChat();

                expect(mainWindow.isVisible()).toBe(true);
                expect(quickChatWindow.isVisible()).toBe(true);
            });

            it('should coordinate window visibility across manager boundaries', () => {
                const mainWindow = windowManager.createMainWindow();
                const optionsWindow = windowManager.createOptionsWindow();
                trayManager.createTray();

                // Both windows visible
                expect(mainWindow.isVisible()).toBe(true);
                expect(optionsWindow.isVisible()).toBe(true);

                // Hide main window only
                windowManager.hideToTray();
                expect(mainWindow.isVisible()).toBe(false);

                // Options window should remain visible (it's independent)
                expect(optionsWindow.isVisible()).toBe(true);

                // Close options separately
                optionsWindow.close();
                expect(optionsWindow.isDestroyed()).toBe(true);

                // Main window still hidden
                expect(mainWindow.isVisible()).toBe(false);
            });
        });

        describe('macOS-specific: Dock behavior + window state + menu state', () => {
            it('should handle macOS dock menu creation', () => {
                if (platform !== 'darwin') {
                    // Skip on non-macOS
                    expect(true).toBe(true);
                    return;
                }

                windowManager.createMainWindow();

                // Build menu (includes dock menu on macOS)
                menuManager.buildMenu();

                // Verify dock.setMenu was called on macOS
                expect(app.dock?.setMenu).toHaveBeenCalled();

                // Verify context menu includes Show Gemini and Settings
                const dockMenuCalls = (app.dock?.setMenu as any).mock.calls;
                expect(dockMenuCalls.length).toBeGreaterThan(0);

                const dockMenu = dockMenuCalls[0][0];
                expect(dockMenu).toBeDefined();
                expect(dockMenu.items).toBeDefined();
            });

            it('should coordinate dock menu clicks with WindowManager', () => {
                if (platform !== 'darwin') {
                    expect(true).toBe(true);
                    return;
                }

                const mainWindow = windowManager.createMainWindow();
                windowManager.hideToTray();

                menuManager.buildMenu();

                // Get dock menu
                const dockMenuCalls = (app.dock?.setMenu as any).mock.calls;
                const dockMenu = dockMenuCalls[0][0];

                // Find "Show Gemini" item
                const showItem = dockMenu.items.find((item: any) => item.label === 'Show Gemini');
                expect(showItem).toBeDefined();

                // Simulate click
                if (showItem && showItem.click) {
                    showItem.click();
                }

                // Window should be visible
                expect(mainWindow.isVisible()).toBe(true);
            });

            it('should update application menu to reflect always-on-top state', () => {
                windowManager.createMainWindow();

                // Initially not always-on-top
                expect(windowManager.isAlwaysOnTop()).toBe(false);

                // Build menu
                menuManager.buildMenu();

                const menuCalls = (Menu.setApplicationMenu as any).mock.calls;
                const initialMenu = menuCalls[0][0];

                // Find View menu
                const viewMenu = initialMenu.items.find((item: any) => item.label === 'View');
                expect(viewMenu).toBeDefined();

                // Find Always On Top item
                const alwaysOnTopItem = viewMenu.submenu?.items?.find((item: any) => item.label === 'Always On Top');
                expect(alwaysOnTopItem).toBeDefined();
                expect(alwaysOnTopItem.type).toBe('checkbox');

                // Should not be checked initially
                expect(alwaysOnTopItem.checked).toBe(false);

                // Set always-on-top
                windowManager.setAlwaysOnTop(true);
                expect(windowManager.isAlwaysOnTop()).toBe(true);

                // Rebuild menu
                menuManager.buildMenu();

                const updatedMenu = (Menu.setApplicationMenu as any).mock.calls[1][0];
                const updatedViewMenu = updatedMenu.items.find((item: any) => item.label === 'View');
                const updatedAlwaysOnTopItem = updatedViewMenu.submenu?.items?.find(
                    (item: any) => item.label === 'Always On Top'
                );

                // Should now be checked
                expect(updatedAlwaysOnTopItem.checked).toBe(true);
            });
        });

        describe('TrayManager tooltip updates', () => {
            it('should maintain consistent tooltip state', () => {
                const tray = trayManager.createTray();

                // Initial tooltip
                expect(trayManager.getToolTip()).toBe('Gemini Desktop');
                expect((tray as any).getTooltip()).toBe('Gemini Desktop');

                // Update tooltip (simulating update notification)
                trayManager.setUpdateTooltip('2.0.0');
                expect(trayManager.getToolTip()).toBe('Gemini Desktop - Update v2.0.0 available');

                // Clear tooltip
                trayManager.clearUpdateTooltip();
                expect(trayManager.getToolTip()).toBe('Gemini Desktop');
            });

            it('should handle tooltip updates without tray crash', () => {
                const tray = trayManager.createTray();

                // Multiple rapid updates
                for (let i = 0; i < 10; i++) {
                    trayManager.setUpdateTooltip(`${i}.0.0`);
                    expect(tray.isDestroyed()).toBe(false);
                }

                trayManager.clearUpdateTooltip();
                expect(tray.isDestroyed()).toBe(false);
            });
        });

        describe('Window and Tray lifecycle', () => {
            it('should handle window close without affecting tray', () => {
                const mainWindow = windowManager.createMainWindow();
                const tray = trayManager.createTray();

                expect(mainWindow.isDestroyed()).toBe(false);
                expect(tray.isDestroyed()).toBe(false);

                // Close window
                mainWindow.close();
                expect(mainWindow.isDestroyed()).toBe(true);

                // Tray should still exist
                expect(tray.isDestroyed()).toBe(false);
            });

            it('should destroy tray independently of windows', () => {
                const mainWindow = windowManager.createMainWindow();
                const tray = trayManager.createTray();

                expect(tray.isDestroyed()).toBe(false);

                // Destroy tray
                trayManager.destroyTray();
                expect(tray.isDestroyed()).toBe(true);

                // Window should still exist
                expect(mainWindow.isDestroyed()).toBe(false);
            });
        });
    });
});

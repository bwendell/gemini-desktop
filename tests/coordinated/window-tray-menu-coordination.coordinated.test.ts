import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Menu, app } from 'electron';
import WindowManager from '../../src/main/managers/windowManager';
import TrayManager from '../../src/main/managers/trayManager';
import MenuManager from '../../src/main/managers/menuManager';
import { platformAdapterPresets, useMockPlatformAdapter, resetPlatformAdapterForTests } from '../helpers/mocks';

const pathsMocks = vi.hoisted(() => ({
    getIconPath: vi.fn(() => '/mock/icon.png'),
    getTrayIconPath: vi.fn(() => '/mock/icon.png'),
    getPreloadPath: vi.fn(() => '/mock/preload.js'),
    getDistHtmlPath: vi.fn((filename: string) => `/mock/dist/${filename}`),
}));

vi.mock('electron', async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return { ...actual };
});

vi.mock('../../src/main/utils/logger');

vi.mock('../../src/main/utils/paths', () => pathsMocks);

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

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

describe('WindowManager ↔ TrayManager ↔ MenuManager State Coordination', () => {
    let windowManager: WindowManager;
    let trayManager: TrayManager;
    let menuManager: MenuManager;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mocked classes after each test
        // Note: Use optional chaining to avoid errors if _reset doesn't exist
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests();
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        let platformAdapter: ReturnType<(typeof adapterForPlatform)[typeof platform]>;
        beforeEach(() => {
            platformAdapter = adapterForPlatform[platform]();
            useMockPlatformAdapter(platformAdapter);
            windowManager = new WindowManager(false);
            trayManager = new TrayManager(windowManager);
            menuManager = new MenuManager(windowManager);
        });

        describe('Hide to tray → State synchronization → Restore', () => {
            it('should hide window, update tray state, and restore on tray click', () => {
                const mainWindow = windowManager.createMainWindow();
                expect(mainWindow).toBeDefined();

                const tray = trayManager.createTray();
                expect(tray).toBeDefined();

                expect(mainWindow.isVisible()).toBe(true);

                windowManager.hideToTray();

                expect(mainWindow.isVisible()).toBe(false);
                expect(mainWindow.isDestroyed()).toBe(false);

                expect(trayManager.getToolTip()).toBe('Gemini Desktop');

                (tray as any).simulateClick();

                expect(mainWindow.isVisible()).toBe(true);
                expect(mainWindow.isDestroyed()).toBe(false);
            });

            it('should handle hide/restore cycle multiple times', () => {
                const mainWindow = windowManager.createMainWindow();
                const tray = trayManager.createTray();

                for (let i = 0; i < 3; i++) {
                    windowManager.hideToTray();
                    expect(mainWindow.isVisible()).toBe(false);
                    expect(mainWindow.isDestroyed()).toBe(false);

                    (tray as any).simulateClick();
                    expect(mainWindow.isVisible()).toBe(true);
                }
            });

            it('should update menu to reflect window state', () => {
                const mainWindow = windowManager.createMainWindow();
                trayManager.createTray();

                menuManager.buildMenu();

                expect(Menu.setApplicationMenu).toHaveBeenCalled();

                windowManager.hideToTray();
                expect(mainWindow.isVisible()).toBe(false);

                menuManager.buildMenu();

                expect(Menu.setApplicationMenu).toHaveBeenCalledTimes(2);
            });
        });

        describe('Peek and Hide → Window state coordination', () => {
            it('should hide all windows via Peek and Hide and track state', () => {
                const mainWindow = windowManager.createMainWindow();
                const quickChatWindow = windowManager.createQuickChatWindow();

                expect(mainWindow.isVisible()).toBe(true);
                expect(quickChatWindow.isVisible()).toBe(true);

                windowManager.hideQuickChat();
                expect(quickChatWindow.isVisible()).toBe(false);

                windowManager.hideToTray();
                expect(mainWindow.isVisible()).toBe(false);

                expect(mainWindow.isDestroyed()).toBe(false);
                expect(quickChatWindow.isDestroyed()).toBe(false);

                windowManager.restoreFromTray();
                windowManager.showQuickChat();

                expect(mainWindow.isVisible()).toBe(true);
                expect(quickChatWindow.isVisible()).toBe(true);
            });

            it('should coordinate window visibility across manager boundaries', () => {
                const mainWindow = windowManager.createMainWindow();
                const optionsWindow = windowManager.createOptionsWindow();
                trayManager.createTray();

                expect(mainWindow.isVisible()).toBe(true);
                expect(optionsWindow.isVisible()).toBe(true);

                windowManager.hideToTray();
                expect(mainWindow.isVisible()).toBe(false);

                expect(optionsWindow.isVisible()).toBe(true);

                optionsWindow.close();
                expect(optionsWindow.isDestroyed()).toBe(true);

                expect(mainWindow.isVisible()).toBe(false);
            });
        });

        describe('macOS-specific: Dock behavior + window state + menu state', () => {
            it('should handle macOS dock menu creation', () => {
                if (platform !== 'darwin') {
                    expect(true).toBe(true);
                    return;
                }

                windowManager.createMainWindow();

                menuManager.buildMenu();

                expect(app.dock?.setMenu).toHaveBeenCalled();

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

                const dockMenuCalls = (app.dock?.setMenu as any).mock.calls;
                const dockMenu = dockMenuCalls[0]?.[0];
                expect(dockMenu).toBeDefined();

                const showItem = dockMenu.items.find((item: any) => item.label === 'Show Gemini');
                expect(showItem).toBeDefined();

                if (showItem && showItem.click) {
                    showItem.click();
                }

                expect(mainWindow.isVisible()).toBe(true);
            });

            it('should update application menu to reflect always-on-top state', () => {
                windowManager.createMainWindow();

                expect(windowManager.isAlwaysOnTop()).toBe(false);

                menuManager.buildMenu();

                const menuCalls = (Menu.setApplicationMenu as any).mock.calls;
                const initialMenu = menuCalls[0][0];

                const viewMenu = initialMenu.items.find((item: any) => item.label === 'View');
                expect(viewMenu).toBeDefined();

                const alwaysOnTopItem = viewMenu.submenu?.items?.find((item: any) => item.label === 'Always On Top');
                expect(alwaysOnTopItem).toBeDefined();
                expect(alwaysOnTopItem.type).toBe('checkbox');

                expect(alwaysOnTopItem.checked).toBe(false);

                windowManager.setAlwaysOnTop(true);
                expect(windowManager.isAlwaysOnTop()).toBe(true);

                menuManager.buildMenu();

                const updatedMenu = (Menu.setApplicationMenu as any).mock.calls[1][0];
                const updatedViewMenu = updatedMenu.items.find((item: any) => item.label === 'View');
                const updatedAlwaysOnTopItem = updatedViewMenu.submenu?.items?.find(
                    (item: any) => item.label === 'Always On Top'
                );

                expect(updatedAlwaysOnTopItem.checked).toBe(true);
            });
        });

        describe('TrayManager tooltip updates', () => {
            it('should maintain consistent tooltip state', () => {
                const tray = trayManager.createTray();

                expect(trayManager.getToolTip()).toBe('Gemini Desktop');
                expect((tray as any).getTooltip()).toBe('Gemini Desktop');

                trayManager.setUpdateTooltip('2.0.0');
                expect(trayManager.getToolTip()).toBe('Gemini Desktop - Update v2.0.0 available');

                trayManager.clearUpdateTooltip();
                expect(trayManager.getToolTip()).toBe('Gemini Desktop');
            });

            it('should handle tooltip updates without tray crash', () => {
                const tray = trayManager.createTray();

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

                mainWindow.close();
                expect(mainWindow.isDestroyed()).toBe(true);

                expect(tray.isDestroyed()).toBe(false);
            });

            it('should destroy tray independently of windows', () => {
                const mainWindow = windowManager.createMainWindow();
                const tray = trayManager.createTray();

                expect(tray.isDestroyed()).toBe(false);

                trayManager.destroyTray();
                expect(tray.isDestroyed()).toBe(true);

                expect(mainWindow.isDestroyed()).toBe(false);
            });
        });

        describe('macOS-specific: Tray icon path usage and hide/restore', () => {
            it('should use correct tray icon path on macOS', () => {
                if (platform !== 'darwin') {
                    expect(true).toBe(true);
                    return;
                }

                const tray = trayManager.createTray();
                expect(tray).toBeDefined();

                // Verify the adapter is properly configured with getTrayIconFilename
                const filename = platformAdapter.getTrayIconFilename?.();
                expect(filename).toBe('icon.png');

                // Verify getTrayIconPath was called during tray creation
                expect(vi.mocked(pathsMocks.getTrayIconPath)).toHaveBeenCalled();
            });

            it('should hide and restore main window via adapter on macOS', () => {
                if (platform !== 'darwin') {
                    expect(true).toBe(true);
                    return;
                }

                const mainWindow = windowManager.createMainWindow();
                expect(mainWindow.isVisible()).toBe(true);

                windowManager.hideToTray();
                expect(mainWindow.isVisible()).toBe(false);

                windowManager.restoreFromTray();
                expect(mainWindow.isVisible()).toBe(true);
            });

            it('should restore window via tray menu click on macOS', () => {
                if (platform !== 'darwin') {
                    expect(true).toBe(true);
                    return;
                }

                const mainWindow = windowManager.createMainWindow();
                const tray = trayManager.createTray();

                windowManager.hideToTray();
                expect(mainWindow.isVisible()).toBe(false);

                (tray as any).simulateClick();
                expect(mainWindow.isVisible()).toBe(true);
            });
        });

        describe('Cross-platform: Tray icon filename selection', () => {
            it('should select correct tray icon filename for platform', () => {
                const filename = platformAdapter.getTrayIconFilename?.();

                if (platform === 'darwin') {
                    expect(filename).toBe('icon.png');
                } else if (platform === 'win32') {
                    expect(filename).toBe('icon.ico');
                } else if (platform === 'linux') {
                    expect(filename).toBe('icon.png');
                }
            });
        });
});
});

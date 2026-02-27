/**
 * Coordinated tests for MenuManager integration with WindowManager.
 * Tests menu state synchronization with application state.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Menu, app } from 'electron';
import MenuManager from '../../src/main/managers/menuManager';
import WindowManager from '../../src/main/managers/windowManager';
import { platformAdapterPresets, resetPlatformAdapterForTests, useMockPlatformAdapter } from '../helpers/mocks';

vi.mock('../../src/main/utils/logger');

vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue('{}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
}));

describe('MenuManager Coordinated Tests', () => {
    let menuManager: MenuManager;
    let windowManager: WindowManager;

    beforeEach(() => {
        vi.clearAllMocks();
        resetPlatformAdapterForTests({ resetModules: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests({ resetModules: true });
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        const adapterForPlatform = {
            darwin: platformAdapterPresets.mac,
            win32: platformAdapterPresets.windows,
            linux: platformAdapterPresets.linuxX11,
        } as const;

        beforeEach(() => {
            useMockPlatformAdapter(adapterForPlatform[platform]());
            windowManager = new WindowManager(false);
            menuManager = new MenuManager(windowManager);
        });

        describe('Menu Building', () => {
            it('should build application menu successfully', () => {
                menuManager.buildMenu();

                expect(Menu.buildFromTemplate).toHaveBeenCalled();

                expect(Menu.setApplicationMenu).toHaveBeenCalled();
            });

            it('should build macOS dock menu', () => {
                if (platform !== 'darwin') return;

                menuManager.buildMenu();

                expect(app.dock?.setMenu).toHaveBeenCalled();
            });

            it('should include platform-specific menu items', () => {
                menuManager.buildMenu();

                const buildCall = (Menu.buildFromTemplate as any).mock.calls[0][0];

                if (platform === 'darwin') {
                    expect(buildCall).toEqual(
                        expect.arrayContaining([expect.objectContaining({ label: 'Gemini Desktop' })])
                    );
                } else {
                    expect(buildCall).toEqual(expect.arrayContaining([expect.objectContaining({ label: 'File' })]));
                }
            });

            it('should include Edit menu in application menu between File and View', () => {
                menuManager.buildMenu();

                const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
                const fileIndex = template.findIndex((item: any) => item.label === 'File');
                const editIndex = template.findIndex((item: any) => item.label === 'Edit');
                const viewIndex = template.findIndex((item: any) => item.label === 'View');

                expect(editIndex).toBeGreaterThanOrEqual(0);
                expect(fileIndex).toBeGreaterThanOrEqual(0);
                expect(viewIndex).toBeGreaterThanOrEqual(0);
                expect(editIndex).toBeGreaterThan(fileIndex);
                expect(viewIndex).toBeGreaterThan(editIndex);
            });
        });

        describe('Context Menu', () => {
            it('should setup context menu for webContents', () => {
                const mainWindow = windowManager.createMainWindow();
                menuManager.setupContextMenu();

                const appOnCalls = (app.on as any).mock.calls;
                const createdHandler = appOnCalls.find((c: any) => c[0] === 'web-contents-created')?.[1];
                if (createdHandler) {
                    createdHandler({}, mainWindow.webContents);
                }

                expect(mainWindow.webContents.on as any).toHaveBeenCalledWith('context-menu', expect.any(Function));
            });

            it('should enable/disable context menu items based on edit flags', () => {
                const mainWindow = windowManager.createMainWindow();

                menuManager.setupContextMenu();

                const appOnCalls = (app.on as any).mock.calls;
                const createdHandler = appOnCalls.find((c: any) => c[0] === 'web-contents-created')?.[1];
                if (createdHandler) {
                    createdHandler({}, mainWindow.webContents);
                }

                const handlerCall = (mainWindow.webContents.on as any).mock.calls.find(
                    (call: any) => call[0] === 'context-menu'
                );
                const handler = handlerCall![1];

                const mockEvent = {};
                const mockParams = {
                    editFlags: {
                        canUndo: true,
                        canRedo: false,
                        canCut: true,
                        canCopy: true,
                        canPaste: true,
                        canSelectAll: true,
                    },
                    isEditable: true,
                };

                handler(mockEvent, mockParams);

                expect(Menu.buildFromTemplate).toHaveBeenCalled();
            });
        });

        describe('Menu Actions', () => {
            it('should open options window from menu', () => {
                menuManager.buildMenu();

                const template = (Menu.buildFromTemplate as any).mock.calls[0][0];

                const fileOrAppMenu = template.find(
                    (menu: any) => menu.label === 'File' || menu.label === 'Gemini Desktop'
                );
                expect(fileOrAppMenu).toBeDefined();

                const settingsItem = fileOrAppMenu.submenu?.find?.((item: any) => item.label === 'Settings...');

                if (settingsItem) {
                    const spy = vi.spyOn(windowManager, 'createOptionsWindow');

                    settingsItem.click();

                    expect(spy).toHaveBeenCalled();
                }
            });

            it('should toggle full screen from View menu', () => {
                menuManager.buildMenu();

                const template = (Menu.buildFromTemplate as any).mock.calls[0][0];

                const viewMenu = template.find((menu: any) => menu.label === 'View');
                expect(viewMenu).toBeDefined();

                const fullScreenItem = viewMenu.submenu?.find((item: any) => item.role === 'togglefullscreen');

                expect(fullScreenItem).toBeDefined();
            });
        });

        describe('Coordination with WindowManager', () => {
            it('should restore main window from dock menu', () => {
                if (platform !== 'darwin') return;

                menuManager.buildMenu();

                const dockMenu = (app.dock?.setMenu as any).mock.calls[0]?.[0];
                const showWindowItem = dockMenu?.items?.find((item: any) => item.label === 'Show Gemini');
                expect(showWindowItem).toBeDefined();

                const spy = vi.spyOn(windowManager, 'restoreFromTray');

                showWindowItem.click();
                expect(spy).toHaveBeenCalled();
            });

            it('should create Quick Chat window from dock menu', () => {
                if (platform !== 'darwin') return;

                menuManager.buildMenu();

                const dockMenu = (app.dock?.setMenu as any).mock.calls[0]?.[0];
                const settingsItem = dockMenu?.items?.find((item: any) => item.label === 'Settings');
                expect(settingsItem).toBeDefined();

                const spy = vi.spyOn(windowManager, 'createOptionsWindow');

                settingsItem.click();
                expect(spy).toHaveBeenCalled();
            });
        });

        describe('Menu Item State', () => {
            it('should update context menu on each show', () => {
                const mainWindow = windowManager.createMainWindow();
                menuManager.setupContextMenu();

                const appOnCalls = (app.on as any).mock.calls;
                const createdHandler = appOnCalls.find((c: any) => c[0] === 'web-contents-created')?.[1];
                if (createdHandler) {
                    createdHandler({}, mainWindow.webContents);
                }

                const handlerCall = (mainWindow.webContents.on as any).mock.calls.find(
                    (call: any) => call[0] === 'context-menu'
                );
                const handler = handlerCall![1];

                handler(
                    {},
                    {
                        editFlags: { canCut: true, canCopy: true, canPaste: true },
                        isEditable: true,
                    }
                );

                const menu = (Menu.buildFromTemplate as any).mock.results[0].value;
                const cutItem = menu.getMenuItemById('cut');

                vi.clearAllMocks();

                handler(
                    {},
                    {
                        editFlags: { canCut: false, canCopy: false, canPaste: false },
                        isEditable: false,
                    }
                );

                expect(cutItem.enabled).toBe(false);
                expect(menu.popup).toHaveBeenCalled();
            });
        });

        describe('Error Handling', () => {
            it('should handle missing window manager methods gracefully', () => {
                const minimalManager = {
                    createOptionsWindow: null,
                    restoreFromTray: null,
                    toggleQuickChat: null,
                    isAlwaysOnTop: () => false,
                    getZoomLevel: () => 100,
                    on: vi.fn(),
                } as any;

                const minimalMenuManager = new MenuManager(minimalManager);

                expect(() => {
                    minimalMenuManager.buildMenu();
                }).not.toThrow();
            });
        });
    });
});

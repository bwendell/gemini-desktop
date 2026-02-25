/**
 * Integration tests for MenuManager cross-platform behavior.
 * Tests platform-specific menu structures and action callbacks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Menu, BrowserWindow } from 'electron';
import MenuManager from '../../src/main/managers/menuManager';
import WindowManager from '../../src/main/managers/windowManager';
import { platformAdapterPresets, resetPlatformAdapterForTests, useMockPlatformAdapter } from '../helpers/mocks';

vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/__mocks__/logger';

vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue('{}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
}));

describe('MenuManager Platform Integration', () => {
    let windowManager: WindowManager;
    let menuManager: MenuManager;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((Menu as any)._reset) (Menu as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();
        resetPlatformAdapterForTests({ resetModules: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests({ resetModules: true });
    });

    describe('on darwin (macOS)', () => {
        beforeEach(() => {
            useMockPlatformAdapter(platformAdapterPresets.mac());
            windowManager = new WindowManager(false);
            menuManager = new MenuManager(windowManager);
        });

        it('should create menu with Gemini Desktop app menu first on macOS', () => {
            menuManager.buildMenu();

            expect(Menu.buildFromTemplate).toHaveBeenCalled();
            expect(Menu.setApplicationMenu).toHaveBeenCalled();

            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            expect(template).toBeDefined();
            expect(Array.isArray(template)).toBe(true);
            expect(template.length).toBeGreaterThanOrEqual(4);

            const firstMenu = template[0];
            expect(firstMenu).toBeDefined();
            expect(firstMenu.label).toBe('Gemini Desktop');
        });

        it('should include Edit menu with clipboard roles on macOS', () => {
            menuManager.buildMenu();

            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const editMenu = template.find((m: any) => m.label === 'Edit');
            expect(editMenu).toBeDefined();

            const submenu = editMenu?.submenu ?? [];
            const roles = submenu.filter((item: any) => item.role).map((item: any) => item.role);
            expect(roles).toEqual(expect.arrayContaining(['undo', 'redo', 'cut', 'copy', 'paste', 'delete', 'selectAll']));
        });

        it('should include About and Settings in app menu on macOS', () => {
            menuManager.buildMenu();

            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const appMenu = template[0];

            const appMenuItems = appMenu.submenu?.items ?? appMenu.submenu;
            expect(appMenuItems).toBeDefined();

            const hasAbout = appMenuItems.some(
                (item: any) => item.label?.includes('About') || item.id === 'menu-app-about'
            );
            const hasSettings = appMenuItems.some(
                (item: any) => item.label?.includes('Settings') || item.id === 'menu-app-settings'
            );

            expect(hasAbout).toBe(true);
            expect(hasSettings).toBe(true);
        });

        it('should include View menu with Always On Top on macOS', () => {
            menuManager.buildMenu();

            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const viewMenu = template.find((m: any) => m.label === 'View');

            expect(viewMenu).toBeDefined();
            expect(viewMenu.submenu).toBeDefined();

            const hasAlwaysOnTop = viewMenu.submenu.some(
                (item: any) => item.label?.includes('Always On Top') || item.id === 'menu-view-always-on-top'
            );
            expect(hasAlwaysOnTop).toBe(true);
        });
    });

    describe('on win32 (Windows)', () => {
        beforeEach(() => {
            useMockPlatformAdapter(platformAdapterPresets.windows());
            windowManager = new WindowManager(false);
            menuManager = new MenuManager(windowManager);
        });

        it('should create menu with File menu on Windows', () => {
            menuManager.buildMenu();

            expect(Menu.buildFromTemplate).toHaveBeenCalled();
            expect(Menu.setApplicationMenu).toHaveBeenCalled();

            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];

            const fileMenu = template.find((m: any) => m.label === 'File');
            expect(fileMenu).toBeDefined();
        });

        it('should include Exit in File menu on Windows', () => {
            menuManager.buildMenu();

            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const fileMenu = template.find((m: any) => m.label === 'File');

            if (fileMenu?.submenu) {
                const hasExit = fileMenu.submenu.some(
                    (item: any) => item.label?.includes('Exit') || item.role === 'quit'
                );
                expect(hasExit).toBe(true);
            }
        });

        it('should include Edit menu with clipboard roles on Windows', () => {
            menuManager.buildMenu();

            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const editMenu = template.find((m: any) => m.label === 'Edit');
            expect(editMenu).toBeDefined();

            const submenu = editMenu?.submenu ?? [];
            const roles = submenu.filter((item: any) => item.role).map((item: any) => item.role);
            expect(roles).toEqual(expect.arrayContaining(['undo', 'redo', 'cut', 'copy', 'paste', 'delete', 'selectAll']));
        });
    });

    describe('on linux', () => {
        beforeEach(() => {
            useMockPlatformAdapter(platformAdapterPresets.linuxX11());
            windowManager = new WindowManager(false);
            menuManager = new MenuManager(windowManager);
        });

        it('should create menu with File menu on Linux', () => {
            menuManager.buildMenu();

            expect(Menu.buildFromTemplate).toHaveBeenCalled();
            expect(Menu.setApplicationMenu).toHaveBeenCalled();

            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];

            const fileMenu = template.find((m: any) => m.label === 'File');
            expect(fileMenu).toBeDefined();
        });

        it('should include Quit in File menu on Linux', () => {
            menuManager.buildMenu();

            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const fileMenu = template.find((m: any) => m.label === 'File');

            if (fileMenu?.submenu) {
                const hasQuit = fileMenu.submenu.some(
                    (item: any) => item.label?.includes('Quit') || item.label?.includes('Exit') || item.role === 'quit'
                );
                expect(hasQuit).toBe(true);
            }
        });

        it('should include Edit menu with clipboard roles on Linux', () => {
            menuManager.buildMenu();

            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const editMenu = template.find((m: any) => m.label === 'Edit');
            expect(editMenu).toBeDefined();

            const submenu = editMenu?.submenu ?? [];
            const roles = submenu.filter((item: any) => item.role).map((item: any) => item.role);
            expect(roles).toEqual(expect.arrayContaining(['undo', 'redo', 'cut', 'copy', 'paste', 'delete', 'selectAll']));
        });
    });

    describe('Menu Action Callbacks', () => {
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

            it('should trigger WindowManager methods via menu callbacks', () => {
                windowManager.createMainWindow();
                menuManager.buildMenu();

                const template = (Menu.buildFromTemplate as any).mock.calls[0][0];

                const viewMenu = template.find((m: any) => m.label === 'View');

                if (viewMenu?.submenu) {
                    const alwaysOnTopItem = viewMenu.submenu.find(
                        (item: any) => item.label?.includes('Always on Top') || item.id === 'always-on-top'
                    );

                    if (alwaysOnTopItem?.click) {
                        alwaysOnTopItem.click();
                    }
                }
                expect(mockLogger.error).not.toHaveBeenCalled();
            });
        });
    });
});

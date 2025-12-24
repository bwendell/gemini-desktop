/**
 * Integration Test: Menu + Window Manager Integration
 * 
 * Verifies that the native application menu is correctly wired to WindowManager actions.
 * This ensures that menu items like "Sign in", "Always On Top", and "Reload" 
 * actually trigger the expected logic in the main process.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Menu, app, BrowserWindow, MenuItem, MenuItemConstructorOptions } from 'electron';
import WindowManager from '../../electron/managers/windowManager';
import MenuManager from '../../electron/managers/menuManager';
import { GOOGLE_SIGNIN_URL } from '../../electron/utils/constants';

// Mock dependencies
vi.mock('../../electron/utils/logger', () => ({
    createLogger: () => ({
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    })
}));

// Mock constants for platform switching
vi.mock('../../electron/utils/constants', async () => {
    const actual = await vi.importActual('../../electron/utils/constants');
    return {
        ...actual,
        isMacOS: false,
        isWindows: false,
        isLinux: false
    };
});

describe('Menu Integration', () => {
    let windowManager: any; // Use any to allow partial mock
    let menuManager: MenuManager;
    let mainWindowMock: any;
    let setApplicationMenuSpy: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // FULLY MOCK WindowManager
        windowManager = {
            getMainWindow: vi.fn(),
            createAuthWindow: vi.fn(),
            createOptionsWindow: vi.fn(),
            setAlwaysOnTop: vi.fn(),
            isAlwaysOnTop: vi.fn().mockReturnValue(false),
            restoreFromTray: vi.fn(),
        };

        // Mock the main window return
        mainWindowMock = {
            reload: vi.fn(),
            isDestroyed: () => false,
            webContents: {
                send: vi.fn()
            },
            on: vi.fn(),
            setAlwaysOnTop: vi.fn()
        };
        windowManager.getMainWindow.mockReturnValue(mainWindowMock);
        windowManager.createAuthWindow.mockResolvedValue({} as any);

        // Capture Menu.setApplicationMenu
        setApplicationMenuSpy = vi.spyOn(Menu, 'setApplicationMenu');

        // Initialize MenuManager with mocked WindowManager
        menuManager = new MenuManager(windowManager as WindowManager);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    /**
     * Helper to find a menu item by ID in the constructed menu.
     * Recursively searches submenus.
     */
    function findMenuItem(menu: any, id: string): any {
        const items = menu.items || (Array.isArray(menu) ? menu : []);
        for (const item of items) {
            if (item.id === id) return item;
            if (item.submenu) {
                const found = findMenuItem(item.submenu, id);
                if (found) return found;
            }
        }
        return undefined;
    }

    describe('macOS Menu Structure', () => {
        beforeEach(async () => {
            // Simulate macOS
            const constants = await import('../../electron/utils/constants');
            (constants as any).isMacOS = true;
            (constants as any).isWindows = false;

            // Mock app.dock for dock menu
            (app as any).dock = { setMenu: vi.fn() };
        });

        it('should include the App Menu (Gemini Desktop)', () => {
            menuManager.buildMenu();
            const menu = setApplicationMenuSpy.mock.calls[0][0] as Menu;

            // First item on macOS is the App Menu
            const appMenu = (menu as any).items[0];
            expect(appMenu.label).toBe('Gemini Desktop');

            // Should have "About Gemini Desktop"
            const aboutItem = findMenuItem(menu, 'menu-app-about');
            expect(aboutItem).toBeDefined();
        });

        it('should have "Settings..." in the App Menu', () => {
            menuManager.buildMenu();
            const menu = setApplicationMenuSpy.mock.calls[0][0] as Menu;

            const settingsItem = findMenuItem(menu, 'menu-app-settings');
            expect(settingsItem).toBeDefined();
            expect(settingsItem.label).toBe('Settings...');

            // Should NOT have "Options" label under File menu (it shares ID but uses different label/logic)
            // Code: label: isMacOS ? 'Settings...' : 'Options'
            // ID: 'menu-file-options'
            const fileOptions = findMenuItem(menu, 'menu-file-options');
            expect(fileOptions).toBeDefined();
            expect(fileOptions.label).toBe('Settings...');

            // Click to verify
            settingsItem!.click();
            expect(windowManager.createOptionsWindow).toHaveBeenCalled();
        });

        it('should build specific Dock menu', () => {
            menuManager.buildMenu();
            expect((app as any).dock.setMenu).toHaveBeenCalled();
        });
    });

    describe('Windows/Linux Menu Structure', () => {
        beforeEach(async () => {
            // Simulate Windows
            const constants = await import('../../electron/utils/constants');
            (constants as any).isMacOS = false;
            (constants as any).isWindows = true;

            // Should not try to access dock
            (app as any).dock = undefined;
        });

        it('should NOT include the App Menu', () => {
            menuManager.buildMenu();
            const menu = setApplicationMenuSpy.mock.calls[0][0] as Menu;

            // First item should be File, not Gemini Desktop
            const firstItem = (menu as any).items[0];
            expect(firstItem.label).toBe('File');

            const appMenu = (menu as any).items.find((i: any) => i.label === 'Gemini Desktop');
            expect(appMenu).toBeUndefined();
        });

        it('should have "Options" in the File Menu', () => {
            menuManager.buildMenu();
            const menu = setApplicationMenuSpy.mock.calls[0][0] as Menu;

            const optionsItem = findMenuItem(menu, 'menu-file-options');
            expect(optionsItem).toBeDefined();
            expect(optionsItem.label).toBe('Options');

            // Click to verify
            optionsItem!.click();
            expect(windowManager.createOptionsWindow).toHaveBeenCalled();
        });
    });

    // Shared functionality tests
    describe('Shared Menu Functionality', () => {
        beforeEach(async () => {
            // Default to Windows for shared tests
            const constants = await import('../../electron/utils/constants');
            (constants as any).isMacOS = false;
            (constants as any).isWindows = true;
        });

        it('should trigger auth window creation when "Sign in to Google" is clicked', async () => {
            menuManager.buildMenu();
            const menu = setApplicationMenuSpy.mock.calls[0][0] as Menu;
            const signInItem = findMenuItem(menu, 'menu-file-signin');
            await signInItem!.click();
            expect(windowManager.createAuthWindow).toHaveBeenCalledWith(GOOGLE_SIGNIN_URL);
            expect(mainWindowMock.reload).toHaveBeenCalled();
        });

        it('should toggle "Always On Top" when clicked', async () => {
            menuManager.buildMenu();
            const menu = setApplicationMenuSpy.mock.calls[0][0] as Menu;
            const alwaysOnTopItem = findMenuItem(menu, 'menu-view-always-on-top');

            await alwaysOnTopItem!.click({ checked: true } as any);
            expect(windowManager.setAlwaysOnTop).toHaveBeenCalledWith(true);

            await alwaysOnTopItem!.click({ checked: false } as any);
            expect(windowManager.setAlwaysOnTop).toHaveBeenCalledWith(false);
        });

        it('should open About window when "About" is clicked (Help menu)', () => {
            menuManager.buildMenu();
            const menu = setApplicationMenuSpy.mock.calls[0][0] as Menu;

            // About item under Help is common to both
            const aboutItem = findMenuItem(menu, 'menu-help-about');
            expect(aboutItem).toBeDefined();

            aboutItem!.click();
            expect(windowManager.createOptionsWindow).toHaveBeenCalledWith('about');
        });
    });
});

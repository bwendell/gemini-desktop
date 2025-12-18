import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Menu, shell } from 'electron';
import MenuManager from './menuManager';
import WindowManager from './windowManager';

// Mock electron
vi.mock('electron', () => ({
    app: {
        name: 'Gemini Desktop'
    },
    Menu: {
        buildFromTemplate: vi.fn((template) => template),
        setApplicationMenu: vi.fn(),
    },
    shell: {
        openExternal: vi.fn(),
    }
}));

describe('MenuManager', () => {
    let menuManager: MenuManager;
    let mockWindowManager: any;
    let originalPlatform: string;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock WindowManager
        mockWindowManager = {
            createOptionsWindow: vi.fn(),
            createAuthWindow: vi.fn().mockResolvedValue(undefined),
            getMainWindow: vi.fn().mockReturnValue({
                reload: vi.fn()
            })
        };

        menuManager = new MenuManager(mockWindowManager as unknown as WindowManager);
        originalPlatform = process.platform;
    });

    afterEach(() => {
        Object.defineProperty(process, 'platform', {
            value: originalPlatform
        });
    });

    const setPlatform = (platform: string) => {
        Object.defineProperty(process, 'platform', {
            value: platform
        });
    };

    const findMenuItem = (template: any[], label: string) => {
        return template.find(item => item.label === label);
    };

    const findSubmenuItem = (menu: any, label: string) => {
        return menu.submenu.find((item: any) => item.label === label);
    };

    describe('buildMenu', () => {
        it('includes App menu on macOS', () => {
            setPlatform('darwin');
            menuManager.buildMenu();

            const buildCall = (Menu.buildFromTemplate as any).mock.calls[0][0];
            expect(buildCall.length).toBe(4); // App, File, View, Help
            expect(buildCall[0].label).toBe('Gemini Desktop');
        });

        it('does not include App menu on Windows', () => {
            setPlatform('win32');
            menuManager.buildMenu();

            const buildCall = (Menu.buildFromTemplate as any).mock.calls[0][0];
            expect(buildCall.length).toBe(3); // File, View, Help
            expect(buildCall[0].label).toBe('File');
        });
    });

    describe('App Menu (macOS)', () => {
        it('About item calls createOptionsWindow("about")', () => {
            setPlatform('darwin');
            menuManager.buildMenu();
            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const appMenu = findMenuItem(template, 'Gemini Desktop');
            const aboutItem = findSubmenuItem(appMenu, 'About Gemini Desktop');

            expect(aboutItem).toBeTruthy();
            aboutItem.click();
            expect(mockWindowManager.createOptionsWindow).toHaveBeenCalledWith('about');
        });

        it('Settings item calls createOptionsWindow()', () => {
            setPlatform('darwin');
            menuManager.buildMenu();
            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const appMenu = findMenuItem(template, 'Gemini Desktop');
            const settingsItem = findSubmenuItem(appMenu, 'Settings...');

            expect(settingsItem).toBeTruthy();
            settingsItem.click();
            expect(mockWindowManager.createOptionsWindow).toHaveBeenCalledWith();
        });
    });

    describe('File Menu', () => {
        it('Sign in item calls createAuthWindow and reloads', async () => {
            setPlatform('darwin');
            menuManager.buildMenu();
            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const fileMenu = findMenuItem(template, 'File');
            const signInItem = findSubmenuItem(fileMenu, 'Sign in to Google');

            expect(signInItem).toBeTruthy();
            await signInItem.click();
            expect(mockWindowManager.createAuthWindow).toHaveBeenCalledWith(expect.stringContaining('accounts.google.com'));
            expect(mockWindowManager.getMainWindow().reload).toHaveBeenCalled();
        });

        it('Options/Settings item logic adapts to platform', () => {
            // macOS: Settings...
            setPlatform('darwin');
            menuManager.buildMenu();
            let template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            let fileMenu = findMenuItem(template, 'File');
            let item = findSubmenuItem(fileMenu, 'Settings...');
            expect(item).toBeTruthy();
            item.click();
            expect(mockWindowManager.createOptionsWindow).toHaveBeenCalled();

            vi.clearAllMocks();

            // Windows: Options
            setPlatform('win32');
            menuManager.buildMenu();
            template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            fileMenu = findMenuItem(template, 'File');
            item = findSubmenuItem(fileMenu, 'Options');
            expect(item).toBeTruthy();
            item.click();
            expect(mockWindowManager.createOptionsWindow).toHaveBeenCalled();
        });
    });

    describe('Help Menu', () => {
        it('Report Issue opens external link', () => {
            setPlatform('win32');
            menuManager.buildMenu();
            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const helpMenu = findMenuItem(template, 'Help');
            const reportItem = findSubmenuItem(helpMenu, 'Report an Issue');

            expect(reportItem).toBeTruthy();
            reportItem.click();
            expect(shell.openExternal).toHaveBeenCalledWith(expect.stringContaining('issues'));
        });

        it('About item calls createOptionsWindow("about")', () => {
            setPlatform('win32');
            menuManager.buildMenu();
            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const helpMenu = findMenuItem(template, 'Help');
            const aboutItem = findSubmenuItem(helpMenu, 'About Gemini Desktop');

            expect(aboutItem).toBeTruthy();
            aboutItem.click();
            expect(mockWindowManager.createOptionsWindow).toHaveBeenCalledWith('about');
        });
    });
});

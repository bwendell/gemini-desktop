import { Menu, MenuItemConstructorOptions, app, shell, MenuItem } from 'electron';
import WindowManager from './windowManager';
import { isMacOS, GOOGLE_SIGNIN_URL, GITHUB_ISSUES_URL } from '../utils/constants';

/**
 * Manages the application native menu.
 * Critical for macOS where the menu bar is at the top of the screen.
 * On Windows/Linux, we use a custom titlebar menu, so this is less visible,
 * but still good for accessibility if the custom menu is disabled.
 */
export default class MenuManager {
    constructor(private windowManager: WindowManager) { }

    /**
     * Builds and sets the application menu.
     */
    buildMenu(): void {
        const template: MenuItemConstructorOptions[] = [
            this.buildFileMenu(),
            this.buildViewMenu(),
            this.buildHelpMenu()
        ];

        if (isMacOS) {
            template.unshift(this.buildAppMenu());
        }

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    }

    private buildAppMenu(): MenuItemConstructorOptions {
        return {
            label: 'Gemini Desktop',
            submenu: [
                {
                    label: 'About Gemini Desktop',
                    id: 'menu-app-about',
                    click: () => this.windowManager.createOptionsWindow('about'),
                },
                { type: 'separator' },
                {
                    label: 'Settings...',
                    id: 'menu-app-settings',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => this.windowManager.createOptionsWindow(),
                },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        };
    }

    private buildFileMenu(): MenuItemConstructorOptions {
        const menu: MenuItemConstructorOptions = {
            label: 'File',
            submenu: [
                {
                    label: 'New Window',
                    accelerator: 'CmdOrCtrl+Shift+N',
                    enabled: false // Request to add later
                },
                { type: 'separator' },
                {
                    label: 'Sign in to Google',
                    id: 'menu-file-signin',
                    click: async () => {
                        await this.windowManager.createAuthWindow(GOOGLE_SIGNIN_URL);
                        // Reload main window to capture new auth state
                        this.windowManager.getMainWindow()?.reload();
                    }
                },
                {
                    label: isMacOS ? 'Settings...' : 'Options',
                    id: 'menu-file-options',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => this.windowManager.createOptionsWindow()
                },
                { type: 'separator' },
                { role: isMacOS ? 'close' : 'quit' }
            ]
        };

        return menu;
    }

    private buildViewMenu(): MenuItemConstructorOptions {
        return {
            label: 'View',
            submenu: [
                { role: 'reload', id: 'menu-view-reload' },
                { role: 'forceReload', id: 'menu-view-forcereload' },
                { role: 'toggleDevTools', id: 'menu-view-devtools' },
                { type: 'separator' },
                { role: 'togglefullscreen', id: 'menu-view-fullscreen' }
            ]
        };
    }

    private buildHelpMenu(): MenuItemConstructorOptions {
        return {
            label: 'Help',
            submenu: [
                {
                    label: 'About Gemini Desktop',
                    id: 'menu-help-about',
                    click: () => this.windowManager.createOptionsWindow('about')
                },
                {
                    label: 'Report an Issue',
                    click: () => shell.openExternal(GITHUB_ISSUES_URL)
                }
            ]
        };
    }
}

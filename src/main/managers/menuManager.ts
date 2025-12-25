import { Menu, MenuItemConstructorOptions, app, shell, MenuItem } from 'electron';
import WindowManager from './windowManager';
import { GOOGLE_SIGNIN_URL, GITHUB_ISSUES_URL } from '../utils/constants';

// Runtime platform check (evaluated on each call for testability)
const isMac = () => process.platform === 'darwin';

/**
 * Manages the application native menu and context menus.
 * Critical for macOS where the menu bar is at the top of the screen.
 * On Windows/Linux, we use a custom titlebar menu, so this is less visible,
 * but still good for accessibility if the custom menu is disabled.
 * Also handles right-click context menus for standard text editing operations.
 */
export default class MenuManager {
    private cachedContextMenu: Menu | null = null;
    private contextMenuItems: { id: string; item: MenuItem }[] = [];

    constructor(private windowManager: WindowManager) { }

    /**
     * Sets up context menu for all web contents.
     * Pre-builds the menu for faster display and updates enabled states dynamically.
     */
    setupContextMenu(): void {
        // Pre-build the context menu once
        this.cachedContextMenu = this.buildCachedContextMenu();

        app.on('web-contents-created', (_, contents) => {
            contents.on('context-menu', (_, params) => {
                // Update enabled states based on current context
                this.updateContextMenuState(params);
                // Show the pre-built menu
                this.cachedContextMenu?.popup();
            });
        });
    }

    /**
     * Builds and caches the context menu with menu item references.
     * @returns Pre-built Menu instance
     */
    private buildCachedContextMenu(): Menu {
        const template: MenuItemConstructorOptions[] = [
            {
                id: 'cut',
                role: 'cut',
                accelerator: 'CmdOrCtrl+X',
            },
            {
                id: 'copy',
                role: 'copy',
                accelerator: 'CmdOrCtrl+C',
            },
            {
                id: 'paste',
                role: 'paste',
                accelerator: 'CmdOrCtrl+V',
            },
            {
                id: 'delete',
                role: 'delete',
            },
            { type: 'separator' },
            {
                id: 'selectAll',
                role: 'selectAll',
                accelerator: 'CmdOrCtrl+A',
            },
        ];

        const menu = Menu.buildFromTemplate(template);

        // Cache references to menu items for fast state updates
        this.contextMenuItems = [
            { id: 'cut', item: menu.getMenuItemById('cut')! },
            { id: 'copy', item: menu.getMenuItemById('copy')! },
            { id: 'paste', item: menu.getMenuItemById('paste')! },
            { id: 'delete', item: menu.getMenuItemById('delete')! },
            { id: 'selectAll', item: menu.getMenuItemById('selectAll')! },
        ].filter(entry => entry.item !== null);

        return menu;
    }

    /**
     * Updates the enabled state of context menu items based on current edit flags.
     * @param params - Context menu parameters from Electron
     */
    private updateContextMenuState(params: Electron.ContextMenuParams): void {
        const flagMap: Record<string, boolean> = {
            cut: params.editFlags.canCut,
            copy: params.editFlags.canCopy,
            paste: params.editFlags.canPaste,
            delete: params.editFlags.canDelete,
            selectAll: params.editFlags.canSelectAll,
        };

        for (const { id, item } of this.contextMenuItems) {
            if (id in flagMap) {
                item.enabled = flagMap[id];
            }
        }
    }

    /**
     * Builds and sets the application menu.
     */
    buildMenu(): void {
        const template: MenuItemConstructorOptions[] = [
            this.buildFileMenu(),
            this.buildViewMenu(),
            this.buildHelpMenu()
        ];

        if (isMac()) {
            template.unshift(this.buildAppMenu());
        }

        const menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);

        if (isMac()) {
            this.buildDockMenu();
        }
    }

    /**
     * Builds and sets the Dock menu (macOS only).
     */
    private buildDockMenu(): void {
        const dockTemplate: MenuItemConstructorOptions[] = [
            {
                label: 'Show Gemini',
                click: () => this.windowManager.restoreFromTray()
            },
            { type: 'separator' },
            {
                label: 'Settings',
                click: () => this.windowManager.createOptionsWindow()
            }
        ];

        const dockMenu = Menu.buildFromTemplate(dockTemplate);
        if (app.dock) {
            app.dock.setMenu(dockMenu);
        }
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
                    label: isMac() ? 'Settings...' : 'Options',
                    id: 'menu-file-options',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => this.windowManager.createOptionsWindow()
                },
                { type: 'separator' },
                { role: isMac() ? 'close' : 'quit' }
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
                {
                    label: 'Always On Top',
                    id: 'menu-view-always-on-top',
                    type: 'checkbox',
                    checked: this.windowManager.isAlwaysOnTop(),
                    accelerator: 'CmdOrCtrl+Shift+T',
                    click: (menuItem) => {
                        this.windowManager.setAlwaysOnTop(menuItem.checked);
                    }
                },
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

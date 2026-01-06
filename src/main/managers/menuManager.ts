import { Menu, MenuItemConstructorOptions, app, shell, MenuItem } from 'electron';
import WindowManager from './windowManager';
import type HotkeyManager from './hotkeyManager';
import { GOOGLE_SIGNIN_URL, GITHUB_ISSUES_URL } from '../utils/constants';
import { isApplicationHotkey, type HotkeyId } from '../types';

// Runtime platform check (evaluated on each call for testability)
const isMac = () => process.platform === 'darwin';

/**
 * Manages the application native menu and context menus.
 * Critical for macOS where the menu bar is at the top of the screen.
 * On Windows/Linux, we use a custom titlebar menu, so this is less visible,
 * but still good for accessibility if the custom menu is disabled.
 * Also handles right-click context menus for standard text editing operations.
 *
 * ## Dynamic Accelerators
 *
 * Application hotkeys (`alwaysOnTop`, `printToPdf`) have their accelerators
 * read dynamically from HotkeyManager. When a user changes an accelerator
 * or toggles a hotkey's enabled state, the menu is automatically rebuilt
 * via the `rebuildMenuWithAccelerators()` method.
 */
export default class MenuManager {
    private cachedContextMenu: Menu | null = null;
    private contextMenuItems: { id: string; item: MenuItem }[] = [];
    private hotkeyManager: HotkeyManager | null = null;

    constructor(
        private windowManager: WindowManager,
        hotkeyManager?: HotkeyManager
    ) {
        if (hotkeyManager) {
            this.hotkeyManager = hotkeyManager;

            // Subscribe to hotkey events to rebuild menu when accelerators change
            windowManager.on('accelerator-changed', (id: HotkeyId) => {
                if (isApplicationHotkey(id)) {
                    this.rebuildMenuWithAccelerators();
                }
            });

            windowManager.on('hotkey-enabled-changed', (id: HotkeyId) => {
                if (isApplicationHotkey(id)) {
                    this.rebuildMenuWithAccelerators();
                }
            });
        }

        // Subscribe to zoom level changes to update menu labels
        windowManager.on('zoom-level-changed', () => {
            this.rebuildMenuWithAccelerators();
        });
    }

    /**
     * Rebuild the application menu with current accelerators from HotkeyManager.
     * Called automatically when accelerators or enabled states change.
     */
    rebuildMenuWithAccelerators(): void {
        this.buildMenu();
    }

    /**
     * Get the accelerator for an application hotkey, respecting enabled state.
     * Returns undefined if the hotkey is disabled or HotkeyManager is not available.
     *
     * @param id - The hotkey identifier
     * @returns The accelerator string or undefined
     */
    private getApplicationHotkeyAccelerator(id: HotkeyId): string | undefined {
        if (!this.hotkeyManager) {
            return undefined;
        }

        // Only show accelerator if the hotkey is enabled
        if (!this.hotkeyManager.isIndividualEnabled(id)) {
            return undefined;
        }

        return this.hotkeyManager.getAccelerator(id);
    }

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
        ].filter((entry) => entry.item !== null);

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
            this.buildHelpMenu(),
        ];

        if (this.windowManager.isDev) {
            template.push(this.buildDebugMenu());
        }

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
                click: () => this.windowManager.restoreFromTray(),
            },
            { type: 'separator' },
            {
                label: 'Settings',
                click: () => this.windowManager.createOptionsWindow(),
            },
        ];

        const dockMenu = Menu.buildFromTemplate(dockTemplate);
        if (app.dock) {
            app.dock.setMenu(dockMenu);
        }
    }

    private buildDebugMenu(): MenuItemConstructorOptions {
        return {
            label: 'Debug',
            submenu: [
                {
                    label: 'Crash Renderer',
                    accelerator: 'CmdOrCtrl+Alt+Shift+C',
                    click: () => {
                        const win = this.windowManager.getMainWindow();
                        if (win && !win.isDestroyed()) {
                            win.webContents.forcefullyCrashRenderer();
                        }
                    },
                },
                {
                    label: 'Trigger React Error',
                    accelerator: 'CmdOrCtrl+Alt+Shift+E',
                    click: () => {
                        const win = this.windowManager.getMainWindow();
                        if (win && !win.isDestroyed()) {
                            win.webContents.send('debug-trigger-error');
                        }
                    },
                },
            ],
        };
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
                { role: 'quit' },
            ],
        };
    }

    private buildFileMenu(): MenuItemConstructorOptions {
        // IMPORTANT: When adding items here, also update src/renderer/components/titlebar/useMenuDefinitions.ts
        // to ensure the custom titlebar menu (Windows/Linux) remains in sync.
        const menu: MenuItemConstructorOptions = {
            label: 'File',
            submenu: [
                {
                    label: 'New Window',
                    accelerator: 'CmdOrCtrl+Shift+N',
                    visible: false, // Hidden until functionality is implemented
                },
                {
                    label: 'Print to PDF',
                    id: 'menu-file-print-to-pdf',
                    accelerator: this.getApplicationHotkeyAccelerator('printToPdf'),
                    click: () => {
                        this.windowManager.emit('print-to-pdf-triggered');
                    },
                },
                { type: 'separator' },
                {
                    label: 'Sign in to Google',
                    id: 'menu-file-signin',
                    click: async () => {
                        await this.windowManager.createAuthWindow(GOOGLE_SIGNIN_URL);
                        // Reload main window to capture new auth state
                        this.windowManager.getMainWindow()?.reload();
                    },
                },
                {
                    label: isMac() ? 'Settings...' : 'Options',
                    id: 'menu-file-options',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => this.windowManager.createOptionsWindow(),
                },
                { type: 'separator' },
                { role: isMac() ? 'close' : 'quit' },
            ],
        };

        return menu;
    }

    private buildViewMenu(): MenuItemConstructorOptions {
        const zoomLevel = this.windowManager.getZoomLevel();
        const zoomLabel = `(${zoomLevel}%)`;

        return {
            label: 'View',
            submenu: [
                { role: 'reload', id: 'menu-view-reload' },
                { role: 'forceReload', id: 'menu-view-forcereload' },
                { role: 'toggleDevTools', id: 'menu-view-devtools' },
                { type: 'separator' },
                {
                    label: `Zoom In ${zoomLabel}`,
                    id: 'menu-view-zoom-in',
                    accelerator: 'CmdOrCtrl+=',
                    click: () => {
                        this.windowManager.zoomIn();
                    },
                },
                {
                    label: `Zoom Out ${zoomLabel}`,
                    id: 'menu-view-zoom-out',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        this.windowManager.zoomOut();
                    },
                },
                { type: 'separator' },
                {
                    label: 'Always On Top',
                    id: 'menu-view-always-on-top',
                    type: 'checkbox',
                    checked: this.windowManager.isAlwaysOnTop(),
                    accelerator: this.getApplicationHotkeyAccelerator('alwaysOnTop'),
                    click: (menuItem) => {
                        this.windowManager.setAlwaysOnTop(menuItem.checked);
                    },
                },
                { role: 'togglefullscreen', id: 'menu-view-fullscreen' },
            ],
        };
    }

    private buildHelpMenu(): MenuItemConstructorOptions {
        return {
            label: 'Help',
            submenu: [
                {
                    label: 'About Gemini Desktop',
                    id: 'menu-help-about',
                    click: () => this.windowManager.createOptionsWindow('about'),
                },
                {
                    label: 'Report an Issue',
                    click: () => shell.openExternal(GITHUB_ISSUES_URL),
                },
            ],
        };
    }
}

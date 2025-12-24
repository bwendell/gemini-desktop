import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Menu, shell } from 'electron';
import MenuManager from './menuManager';
import WindowManager from './windowManager';

// Hoisted mock for isMacOS
const mocks = vi.hoisted(() => ({
    isMacOS: false,
}));

// Mock constants to allow toggling isMacOS during tests
vi.mock('../utils/constants', async (importOriginal) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual = await importOriginal<any>();
    return {
        ...actual,
        get isMacOS() {
            return mocks.isMacOS;
        },
    };
});

// Mock electron
vi.mock('electron', () => ({
    app: {
        name: 'Gemini Desktop',
        on: vi.fn()
    },
    Menu: {
        buildFromTemplate: vi.fn((template) => ({
            popup: vi.fn(),
            template,
            getMenuItemById: vi.fn((id: string) => {
                const item = template.find((t: any) => t.id === id);
                if (item) {
                    return { ...item, enabled: true };
                }
                return null;
            })
        })),
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
            }),
            isAlwaysOnTop: vi.fn().mockReturnValue(false),
            setAlwaysOnTop: vi.fn()
        };

        menuManager = new MenuManager(mockWindowManager as unknown as WindowManager);
        originalPlatform = process.platform;
    });

    afterEach(() => {
        Object.defineProperty(process, 'platform', {
            value: originalPlatform,
            configurable: true,
            writable: true
        });
    });

    const setPlatform = (platform: string) => {
        Object.defineProperty(process, 'platform', {
            value: platform,
            configurable: true,
            writable: true
        });
        // Also update the mocked isMacOS constant
        mocks.isMacOS = platform === 'darwin';
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
            // macOS: App menu is prepended to [File, View, Help]
            expect(buildCall.length).toBe(4); // App, File, View, Help
            expect(buildCall[0].label).toBe('Gemini Desktop');
        });

        it('does not include App menu on Windows', () => {
            setPlatform('win32');
            menuManager.buildMenu();

            const buildCall = (Menu.buildFromTemplate as any).mock.calls[0][0];
            // Windows/Linux: No App menu, just [File, View, Help]
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

    describe('View Menu', () => {
        it('includes Always On Top menu item', () => {
            setPlatform('win32');
            menuManager.buildMenu();
            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const viewMenu = findMenuItem(template, 'View');
            const alwaysOnTopItem = findSubmenuItem(viewMenu, 'Always On Top');

            expect(alwaysOnTopItem).toBeTruthy();
            expect(alwaysOnTopItem.type).toBe('checkbox');
            expect(alwaysOnTopItem.id).toBe('menu-view-always-on-top');
            expect(alwaysOnTopItem.accelerator).toBe('CmdOrCtrl+Shift+T');
        });

        it('Always On Top click handler calls setAlwaysOnTop', () => {
            mockWindowManager.isAlwaysOnTop = vi.fn().mockReturnValue(false);
            mockWindowManager.setAlwaysOnTop = vi.fn();

            setPlatform('win32');
            menuManager.buildMenu();
            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const viewMenu = findMenuItem(template, 'View');
            const alwaysOnTopItem = findSubmenuItem(viewMenu, 'Always On Top');

            // Simulate menu click with checked = true
            alwaysOnTopItem.click({ checked: true });
            expect(mockWindowManager.setAlwaysOnTop).toHaveBeenCalledWith(true);

            // Simulate menu click with checked = false
            alwaysOnTopItem.click({ checked: false });
            expect(mockWindowManager.setAlwaysOnTop).toHaveBeenCalledWith(false);
        });

        it('Always On Top initial checked state reflects isAlwaysOnTop()', () => {
            mockWindowManager.isAlwaysOnTop = vi.fn().mockReturnValue(true);

            setPlatform('win32');
            menuManager.buildMenu();
            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const viewMenu = findMenuItem(template, 'View');
            const alwaysOnTopItem = findSubmenuItem(viewMenu, 'Always On Top');

            expect(alwaysOnTopItem.checked).toBe(true);
        });
    });

    describe('Context Menu', () => {
        let webContentsCreatedCallback: any;
        let contextMenuCallback: any;
        let mockContents: any;

        beforeEach(() => {
            mockContents = {
                on: vi.fn((event: string, callback: any) => {
                    if (event === 'context-menu') {
                        contextMenuCallback = callback;
                    }
                })
            };
        });

        it('registers web-contents-created listener', async () => {
            const { app } = await import('electron');

            menuManager.setupContextMenu();

            expect(app.on).toHaveBeenCalledWith('web-contents-created', expect.any(Function));
        });

        it('pre-builds context menu with correct items and accelerators', async () => {
            const { Menu } = await import('electron');

            menuManager.setupContextMenu();

            // Verify menu was pre-built once during setup
            expect(Menu.buildFromTemplate).toHaveBeenCalled();
            const buildCall = (Menu.buildFromTemplate as any).mock.calls[
                (Menu.buildFromTemplate as any).mock.calls.length - 1
            ];
            const template = buildCall[0];

            // Verify template includes IDs, roles, and accelerators
            expect(template).toEqual([
                { id: 'cut', role: 'cut', accelerator: 'CmdOrCtrl+X' },
                { id: 'copy', role: 'copy', accelerator: 'CmdOrCtrl+C' },
                { id: 'paste', role: 'paste', accelerator: 'CmdOrCtrl+V' },
                { id: 'delete', role: 'delete' },
                { type: 'separator' },
                { id: 'selectAll', role: 'selectAll', accelerator: 'CmdOrCtrl+A' }
            ]);
        });

        it('calls popup on the cached menu when context-menu event fires', async () => {
            const { app, Menu } = await import('electron');

            menuManager.setupContextMenu();

            // Get the web-contents-created callback
            webContentsCreatedCallback = (app.on as any).mock.calls.find(
                (call: any[]) => call[0] === 'web-contents-created'
            )?.[1];

            webContentsCreatedCallback({}, mockContents);

            const mockParams = {
                editFlags: {
                    canCut: true,
                    canCopy: true,
                    canPaste: true,
                    canDelete: true,
                    canSelectAll: true
                }
            };

            contextMenuCallback({}, mockParams);

            const menu = (Menu.buildFromTemplate as any).mock.results[
                (Menu.buildFromTemplate as any).mock.results.length - 1
            ].value;
            expect(menu.popup).toHaveBeenCalled();
        });
    });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Menu, shell } from 'electron';
import MenuManager from '../../../src/main/managers/menuManager';
import WindowManager from '../../../src/main/managers/windowManager';

// Mock electron
vi.mock('electron', () => ({
  app: {
    name: 'Gemini Desktop',
    on: vi.fn(),
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
      }),
    })),
    setApplicationMenu: vi.fn(),
  },
  shell: {
    openExternal: vi.fn(),
  },
}));

describe('MenuManager', () => {
  let menuManager: MenuManager;
  let mockWindowManager: any;
  let mockHotkeyManager: any;
  let originalPlatform: string;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock WindowManager
    mockWindowManager = {
      createOptionsWindow: vi.fn(),
      createAuthWindow: vi.fn().mockResolvedValue(undefined),
      getMainWindow: vi.fn().mockReturnValue({
        reload: vi.fn(),
      }),
      isAlwaysOnTop: vi.fn().mockReturnValue(false),
      setAlwaysOnTop: vi.fn(),
      on: vi.fn(), // For event subscription
      emit: vi.fn(),
      restoreFromTray: vi.fn(),
    };

    // Mock HotkeyManager
    mockHotkeyManager = {
      getAccelerator: vi.fn((id: string) => {
        const accelerators: Record<string, string> = {
          alwaysOnTop: 'CmdOrCtrl+Shift+T',
          printToPdf: 'CmdOrCtrl+Shift+P',
        };
        return accelerators[id] || '';
      }),
      isIndividualEnabled: vi.fn().mockReturnValue(true),
    };

    menuManager = new MenuManager(mockWindowManager as unknown as WindowManager, mockHotkeyManager);
    originalPlatform = process.platform;
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true,
      writable: true,
    });
  });

  const setPlatform = (platform: string) => {
    Object.defineProperty(process, 'platform', {
      value: platform,
      configurable: true,
      writable: true,
    });
  };

  const findMenuItem = (template: any[], label: string) => {
    return template.find((item) => item.label === label);
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

  describe('Dock Menu (macOS)', () => {
    it('should call app.dock.setMenu on macOS', async () => {
      const { app } = await import('electron');
      const mockDock = {
        setMenu: vi.fn(),
      };
      (app as any).dock = mockDock;

      setPlatform('darwin');
      menuManager.buildMenu();

      expect(mockDock.setMenu).toHaveBeenCalled();
    });

    it('should NOT call app.dock.setMenu on Windows', async () => {
      const { app } = await import('electron');
      const mockDock = {
        setMenu: vi.fn(),
      };
      (app as any).dock = mockDock;

      setPlatform('win32');
      menuManager.buildMenu();

      expect(mockDock.setMenu).not.toHaveBeenCalled();
    });

    it('should NOT call app.dock.setMenu on Linux', async () => {
      const { app } = await import('electron');
      const mockDock = {
        setMenu: vi.fn(),
      };
      (app as any).dock = mockDock;

      setPlatform('linux');
      menuManager.buildMenu();

      expect(mockDock.setMenu).not.toHaveBeenCalled();
    });

    it('should build dock menu with correct structure on macOS', async () => {
      setPlatform('darwin');
      const { Menu: MenuModule } = await import('electron');

      // Clear previous calls
      vi.clearAllMocks();

      menuManager.buildMenu();

      // Find the dock menu template call (will be the last buildFromTemplate call)
      const allCalls = (MenuModule.buildFromTemplate as any).mock.calls;
      // The dock menu is built after the app menu, so it's the last call
      const dockMenuTemplate = allCalls[allCalls.length - 1][0];

      // Verify dock menu structure
      expect(Array.isArray(dockMenuTemplate)).toBe(true);
      const labels = dockMenuTemplate.map((item: any) => item.label);
      expect(labels).toContain('Show Gemini');
      expect(labels).toContain('Settings');
    });

    it('should handle missing app.dock gracefully', async () => {
      setPlatform('darwin');
      const { app } = await import('electron');
      (app as any).dock = undefined;

      // Should not throw even if dock is undefined
      expect(() => menuManager.buildMenu()).not.toThrow();
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
      expect(mockWindowManager.createAuthWindow).toHaveBeenCalledWith(
        expect.stringContaining('accounts.google.com')
      );
      expect(mockWindowManager.getMainWindow().reload).toHaveBeenCalled();
    });

    it('Print to PDF item calls emit("print-to-pdf-triggered")', () => {
      setPlatform('win32');
      menuManager.buildMenu();
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const fileMenu = findMenuItem(template, 'File');
      const printItem = findSubmenuItem(fileMenu, 'Print to PDF');

      expect(printItem).toBeTruthy();
      expect(printItem.id).toBe('menu-file-print-to-pdf');
      expect(printItem.accelerator).toBe('CmdOrCtrl+Shift+P');

      printItem.click();
      expect(mockWindowManager.emit).toHaveBeenCalledWith('print-to-pdf-triggered');
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
        }),
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
        { id: 'selectAll', role: 'selectAll', accelerator: 'CmdOrCtrl+A' },
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
          canSelectAll: true,
        },
      };

      contextMenuCallback({}, mockParams);

      const menu = (Menu.buildFromTemplate as any).mock.results[
        (Menu.buildFromTemplate as any).mock.results.length - 1
      ].value;
      expect(menu.popup).toHaveBeenCalled();
    });
  });

  describe('Debug Menu', () => {
    beforeEach(() => {
      mockWindowManager.isDev = true;
    });

    it('includes Debug menu when isDev is true', () => {
      setPlatform('win32');
      menuManager.buildMenu();

      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const debugMenu = findMenuItem(template, 'Debug');
      expect(debugMenu).toBeTruthy();
    });

    it('Crash Renderer item calls forcefullyCrashRenderer', () => {
      setPlatform('win32');
      const mockWebContents = { forcefullyCrashRenderer: vi.fn() };
      const mockWin = { isDestroyed: () => false, webContents: mockWebContents };
      mockWindowManager.getMainWindow.mockReturnValue(mockWin);

      menuManager.buildMenu();
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const debugMenu = findMenuItem(template, 'Debug');
      const crashItem = findSubmenuItem(debugMenu, 'Crash Renderer');

      crashItem.click();
      expect(mockWebContents.forcefullyCrashRenderer).toHaveBeenCalled();
    });

    it('Crash Renderer handles missing window', () => {
      setPlatform('win32');
      mockWindowManager.getMainWindow.mockReturnValue(null);

      menuManager.buildMenu();
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const debugMenu = findMenuItem(template, 'Debug');
      const crashItem = findSubmenuItem(debugMenu, 'Crash Renderer');

      expect(() => crashItem.click()).not.toThrow();
    });

    it('Crash Renderer handles destroyed window', () => {
      setPlatform('win32');
      const mockWin = {
        isDestroyed: () => true,
        webContents: { forcefullyCrashRenderer: vi.fn() },
      };
      mockWindowManager.getMainWindow.mockReturnValue(mockWin);

      menuManager.buildMenu();
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const debugMenu = findMenuItem(template, 'Debug');
      const crashItem = findSubmenuItem(debugMenu, 'Crash Renderer');

      crashItem.click();
      expect(mockWin.webContents.forcefullyCrashRenderer).not.toHaveBeenCalled();
    });

    it('Trigger React Error item sends debug-trigger-error', () => {
      setPlatform('win32');
      const mockWebContents = { send: vi.fn() };
      const mockWin = { isDestroyed: () => false, webContents: mockWebContents };
      mockWindowManager.getMainWindow.mockReturnValue(mockWin);

      menuManager.buildMenu();
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const debugMenu = findMenuItem(template, 'Debug');
      const errorItem = findSubmenuItem(debugMenu, 'Trigger React Error');

      errorItem.click();
      expect(mockWebContents.send).toHaveBeenCalledWith('debug-trigger-error');
    });

    it('Trigger React Error handles missing window', () => {
      setPlatform('win32');
      mockWindowManager.getMainWindow.mockReturnValue(null);

      menuManager.buildMenu();
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const debugMenu = findMenuItem(template, 'Debug');
      const errorItem = findSubmenuItem(debugMenu, 'Trigger React Error');

      expect(() => errorItem.click()).not.toThrow();
    });
  });

  describe('Dock Menu Click Handlers', () => {
    it('Show Gemini calls restoreFromTray', async () => {
      setPlatform('darwin');
      const { Menu: MenuModule, app } = await import('electron');
      (app as any).dock = { setMenu: vi.fn() };

      vi.clearAllMocks();
      menuManager.buildMenu();

      // Find dock menu template (last buildFromTemplate call on macOS)
      const allCalls = (MenuModule.buildFromTemplate as any).mock.calls;
      const dockMenuTemplate = allCalls[allCalls.length - 1][0];
      const showItem = dockMenuTemplate.find((item: any) => item.label === 'Show Gemini');

      showItem.click();
      expect(mockWindowManager.restoreFromTray).toHaveBeenCalled();
    });

    it('Settings calls createOptionsWindow', async () => {
      setPlatform('darwin');
      const { Menu: MenuModule, app } = await import('electron');
      (app as any).dock = { setMenu: vi.fn() };

      vi.clearAllMocks();
      menuManager.buildMenu();

      const allCalls = (MenuModule.buildFromTemplate as any).mock.calls;
      const dockMenuTemplate = allCalls[allCalls.length - 1][0];
      const settingsItem = dockMenuTemplate.find((item: any) => item.label === 'Settings');

      settingsItem.click();
      expect(mockWindowManager.createOptionsWindow).toHaveBeenCalled();
    });
  });

  describe('Accelerator Disabled State', () => {
    it('returns undefined accelerator when hotkey is disabled', () => {
      mockHotkeyManager.isIndividualEnabled.mockReturnValue(false);

      setPlatform('win32');
      menuManager.buildMenu();
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const viewMenu = findMenuItem(template, 'View');
      const alwaysOnTopItem = findSubmenuItem(viewMenu, 'Always On Top');

      expect(alwaysOnTopItem.accelerator).toBeUndefined();
    });

    it('returns undefined accelerator for Print to PDF when disabled', () => {
      mockHotkeyManager.isIndividualEnabled.mockReturnValue(false);

      setPlatform('win32');
      menuManager.buildMenu();
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const fileMenu = findMenuItem(template, 'File');
      const printItem = findSubmenuItem(fileMenu, 'Print to PDF');

      expect(printItem.accelerator).toBeUndefined();
    });
  });

  describe('Constructor without hotkeyManager', () => {
    it('works without hotkeyManager', () => {
      const managerNoHotkey = new MenuManager(mockWindowManager as unknown as WindowManager);

      setPlatform('win32');
      managerNoHotkey.buildMenu();

      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const viewMenu = findMenuItem(template, 'View');
      const alwaysOnTopItem = findSubmenuItem(viewMenu, 'Always On Top');
      expect(alwaysOnTopItem.accelerator).toBeUndefined();
    });
  });

  describe('rebuildMenuWithAccelerators', () => {
    it('rebuilds menu when called', () => {
      vi.clearAllMocks();
      menuManager.rebuildMenuWithAccelerators();
      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });
  });

  describe('Event Subscription', () => {
    it('subscribes to accelerator-changed event for application hotkeys', () => {
      expect(mockWindowManager.on).toHaveBeenCalledWith(
        'accelerator-changed',
        expect.any(Function)
      );
    });

    it('subscribes to hotkey-enabled-changed event for application hotkeys', () => {
      expect(mockWindowManager.on).toHaveBeenCalledWith(
        'hotkey-enabled-changed',
        expect.any(Function)
      );
    });

    it('rebuilds menu when application hotkey accelerator changes', () => {
      const acceleratorHandler = mockWindowManager.on.mock.calls.find(
        (call: any) => call[0] === 'accelerator-changed'
      )[1];

      vi.clearAllMocks();
      acceleratorHandler('alwaysOnTop');
      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });

    it('does not rebuild menu when global hotkey accelerator changes', () => {
      const acceleratorHandler = mockWindowManager.on.mock.calls.find(
        (call: any) => call[0] === 'accelerator-changed'
      )[1];

      vi.clearAllMocks();
      acceleratorHandler('quickChat');
      expect(Menu.buildFromTemplate).not.toHaveBeenCalled();
    });

    it('rebuilds menu when application hotkey enabled state changes', () => {
      const enableHandler = mockWindowManager.on.mock.calls.find(
        (call: any) => call[0] === 'hotkey-enabled-changed'
      )[1];

      vi.clearAllMocks();
      enableHandler('printToPdf');
      expect(Menu.buildFromTemplate).toHaveBeenCalled();
    });

    it('does not rebuild menu when global hotkey enabled state changes', () => {
      const enableHandler = mockWindowManager.on.mock.calls.find(
        (call: any) => call[0] === 'hotkey-enabled-changed'
      )[1];

      vi.clearAllMocks();
      enableHandler('bossKey');
      expect(Menu.buildFromTemplate).not.toHaveBeenCalled();
    });
  });
});

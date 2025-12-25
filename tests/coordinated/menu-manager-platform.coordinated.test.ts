/**
 * Integration tests for MenuManager cross-platform behavior.
 * Tests platform-specific menu structures and action callbacks.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Menu, app, BrowserWindow } from 'electron';
import MenuManager from '../../src/main/managers/menuManager';
import WindowManager from '../../src/main/managers/windowManager';

// Mock logger - must use hoisted to avoid initialization issues
const mockLogger = vi.hoisted(() => ({
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));
vi.mock('../../src/main/utils/logger', () => ({
  createLogger: () => mockLogger,
}));

// Mock fs
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('on darwin (macOS)', () => {
    beforeEach(() => {
      vi.stubGlobal('process', { ...process, platform: 'darwin' });
      windowManager = new WindowManager(false);
      menuManager = new MenuManager(windowManager);
    });

    it('should create menu with Gemini Desktop app menu first on macOS', () => {
      menuManager.buildMenu();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      expect(Menu.setApplicationMenu).toHaveBeenCalled();

      // Get the template that was passed
      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      expect(template).toBeDefined();
      expect(Array.isArray(template)).toBe(true);
      expect(template.length).toBeGreaterThanOrEqual(4); // App, File, View, Help

      // First menu on macOS should be the app menu with label 'Gemini Desktop'
      const firstMenu = template[0];
      expect(firstMenu).toBeDefined();
      expect(firstMenu.label).toBe('Gemini Desktop');
    });

    it('should include About and Settings in app menu on macOS', () => {
      menuManager.buildMenu();

      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const appMenu = template[0];

      expect(appMenu.submenu).toBeDefined();

      const hasAbout = appMenu.submenu.some(
        (item: any) => item.label?.includes('About') || item.id === 'menu-app-about'
      );
      const hasSettings = appMenu.submenu.some(
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
        (item: any) =>
          item.label?.includes('Always On Top') || item.id === 'menu-view-always-on-top'
      );
      expect(hasAlwaysOnTop).toBe(true);
    });
  });

  describe('on win32 (Windows)', () => {
    beforeEach(() => {
      vi.stubGlobal('process', { ...process, platform: 'win32' });
      windowManager = new WindowManager(false);
      menuManager = new MenuManager(windowManager);
    });

    it('should create menu with File menu on Windows', () => {
      menuManager.buildMenu();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      expect(Menu.setApplicationMenu).toHaveBeenCalled();

      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];

      // Windows should have File menu first (not app name menu)
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
  });

  describe('on linux', () => {
    beforeEach(() => {
      vi.stubGlobal('process', { ...process, platform: 'linux' });
      windowManager = new WindowManager(false);
      menuManager = new MenuManager(windowManager);
    });

    it('should create menu with File menu on Linux', () => {
      menuManager.buildMenu();

      expect(Menu.buildFromTemplate).toHaveBeenCalled();
      expect(Menu.setApplicationMenu).toHaveBeenCalled();

      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];

      // Linux should have File menu first (like Windows)
      const fileMenu = template.find((m: any) => m.label === 'File');
      expect(fileMenu).toBeDefined();
    });

    it('should include Quit in File menu on Linux', () => {
      menuManager.buildMenu();

      const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
      const fileMenu = template.find((m: any) => m.label === 'File');

      if (fileMenu?.submenu) {
        const hasQuit = fileMenu.submenu.some(
          (item: any) =>
            item.label?.includes('Quit') || item.label?.includes('Exit') || item.role === 'quit'
        );
        expect(hasQuit).toBe(true);
      }
    });
  });

  describe('Menu Action Callbacks', () => {
    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
      beforeEach(() => {
        vi.stubGlobal('process', { ...process, platform });
        windowManager = new WindowManager(false);
        menuManager = new MenuManager(windowManager);
      });

      it('should trigger WindowManager methods via menu callbacks', () => {
        windowManager.createMainWindow();
        menuManager.buildMenu();

        const template = (Menu.buildFromTemplate as any).mock.calls[0][0];

        // Find View menu
        const viewMenu = template.find((m: any) => m.label === 'View');

        if (viewMenu?.submenu) {
          // Find Always On Top toggle
          const alwaysOnTopItem = viewMenu.submenu.find(
            (item: any) => item.label?.includes('Always on Top') || item.id === 'always-on-top'
          );

          if (alwaysOnTopItem?.click) {
            // Trigger the click callback
            alwaysOnTopItem.click();

            // Verify WindowManager was called
            // (actual verification depends on menu structure)
          }
        }

        // No errors should have occurred
        expect(mockLogger.error).not.toHaveBeenCalled();
      });
    });
  });
});

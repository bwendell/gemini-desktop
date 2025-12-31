/**
 * Coordinated tests for MenuManager and PrintManager integration.
 * Verifies that the "Print to PDF" menu item exists, triggers the correct flow,
 * and responds to hotkey setting changes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Menu, app } from 'electron';
import MenuManager from '../../src/main/managers/menuManager';
import WindowManager from '../../src/main/managers/windowManager';
import HotkeyManager from '../../src/main/managers/hotkeyManager';

// Mock logger
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

describe('Print to PDF Menu Integration', () => {
  let menuManager: MenuManager;
  let windowManager: WindowManager;
  let hotkeyManager: HotkeyManager;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
    beforeEach(() => {
      // Mock platform
      vi.stubGlobal('process', { ...process, platform });

      // Create managers
      windowManager = new WindowManager(false);
      hotkeyManager = new HotkeyManager(windowManager);
      menuManager = new MenuManager(windowManager, hotkeyManager);

      // Spy on WindowManager emit
      vi.spyOn(windowManager, 'emit');
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    describe('Menu Item Existence', () => {
      it('should have "Print to PDF" in the File menu', () => {
        menuManager.buildMenu();

        const template = (Menu.buildFromTemplate as any).mock.calls[0][0];

        // Find File menu
        const fileMenu = template.find((menu: any) => menu.label === 'File');
        expect(fileMenu).toBeDefined();

        // Find Print to PDF item
        const printItem = fileMenu.submenu?.find(
          (item: any) => item.id === 'menu-file-print-to-pdf'
        );

        expect(printItem).toBeDefined();
        expect(printItem.label).toBe('Print to PDF');
      });

      it('should have correct default accelerator', () => {
        menuManager.buildMenu();
        const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
        const fileMenu = template.find((menu: any) => menu.label === 'File');
        const printItem = fileMenu.submenu.find(
          (item: any) => item.id === 'menu-file-print-to-pdf'
        );

        // Default accelerator for printToPdf is CommandOrControl+Shift+P
        // But since we are mocking HotkeyManager (which reads from store defaults), check what HotkeyManager provides
        // In unit environment, store mocks might return defaults.
        // Let's check against what the hotkey manager actually returns.
        const expectedAccelerator = hotkeyManager.getAccelerator('printToPdf');
        expect(printItem.accelerator).toBe(expectedAccelerator);
        expect(printItem.accelerator).toBe('CommandOrControl+Shift+P');
      });
    });

    describe('Click Handler', () => {
      it('should trigger "print-to-pdf-triggered" event on WindowManager when clicked', () => {
        menuManager.buildMenu();
        const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
        const fileMenu = template.find((menu: any) => menu.label === 'File');
        const printItem = fileMenu.submenu.find(
          (item: any) => item.id === 'menu-file-print-to-pdf'
        );

        // Click the item
        printItem.click();

        // Verify event emission
        expect(windowManager.emit).toHaveBeenCalledWith('print-to-pdf-triggered');
      });
    });

    describe('Dynamic Accelerator Updates', () => {
      it('should update menu accelerator when hotkey changes', () => {
        // Initial build
        menuManager.buildMenu();

        // Change accelerator in HotkeyManager
        // This should trigger 'accelerator-changed' which MenuManager listens to
        hotkeyManager.setAccelerator('printToPdf', 'CommandOrControl+P');

        // Verify Menu was rebuilt (called at least once after update)
        expect(Menu.buildFromTemplate).toHaveBeenCalled();

        // Check the new template
        const calls = (Menu.buildFromTemplate as any).mock.calls;
        let foundUpdate = false;

        calls.forEach((callArgs: any) => {
          const template = callArgs[0];
          const fileMenu = template.find((menu: any) => menu.label === 'File');
          const printItem = fileMenu?.submenu?.find(
            (item: any) => item.id === 'menu-file-print-to-pdf'
          );
          if (printItem?.accelerator === 'CommandOrControl+P') {
            foundUpdate = true;
          }
        });

        expect(foundUpdate).toBe(true);
      });
    });

    describe('Enabled State Sync', () => {
      it('should remove accelerator hint when hotkey is disabled', () => {
        // Disable the hotkey
        hotkeyManager.setIndividualEnabled('printToPdf', false);

        // Verify Menu was rebuilt
        expect(Menu.buildFromTemplate).toHaveBeenCalled();

        // Check the template of the last call
        const calls = (Menu.buildFromTemplate as any).mock.calls;
        const lastCallTemplate = calls[calls.length - 1][0];
        const fileMenu = lastCallTemplate.find((menu: any) => menu.label === 'File');
        const printItem = fileMenu?.submenu?.find(
          (item: any) => item.id === 'menu-file-print-to-pdf'
        );

        // Accelerator should be undefined when disabled
        expect(printItem?.accelerator).toBeUndefined();
      });

      it('should restore accelerator hint when hotkey is re-enabled', () => {
        // Start disabled
        hotkeyManager.setIndividualEnabled('printToPdf', false);
        vi.clearAllMocks(); // Clear buildFromTemplate calls

        // Enable it
        hotkeyManager.setIndividualEnabled('printToPdf', true);

        // Verify Menu was rebuilt
        expect(Menu.buildFromTemplate).toHaveBeenCalled();

        // Check the template
        const calls = (Menu.buildFromTemplate as any).mock.calls;
        let foundRestore = false;

        calls.forEach((callArgs: any) => {
          const template = callArgs[0];
          const fileMenu = template.find((menu: any) => menu.label === 'File');
          const printItem = fileMenu?.submenu?.find(
            (item: any) => item.id === 'menu-file-print-to-pdf'
          );
          if (printItem?.accelerator === 'CommandOrControl+Shift+P') {
            foundRestore = true;
          }
        });

        expect(foundRestore).toBe(true);
      });
    });
  });
});

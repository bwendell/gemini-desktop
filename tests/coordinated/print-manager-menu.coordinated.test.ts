/**
 * Coordinated tests for MenuManager and PrintManager integration.
 * Verifies that the "Print to PDF" menu item exists, triggers the correct flow,
 * and responds to hotkey setting changes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Menu } from 'electron';
import MenuManager from '../../src/main/managers/menuManager';
import WindowManager from '../../src/main/managers/windowManager';
import HotkeyManager from '../../src/main/managers/hotkeyManager';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../src/main/utils/logger');

import { stubPlatform, restorePlatform } from '../helpers/harness';

// Mock fs
vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue('{}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
}));

describe('Export Menu Integration', () => {
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
            stubPlatform(platform);

            // Create managers
            windowManager = new WindowManager(false);
            windowManager.createMainWindow(); // Ensure main window exists for menu click handlers
            hotkeyManager = new HotkeyManager(windowManager);
            menuManager = new MenuManager(windowManager, hotkeyManager);

            // Spy on WindowManager emit
            vi.spyOn(windowManager, 'emit');
        });

        afterEach(() => {
            restorePlatform();
        });

        describe('Menu Item Existence', () => {
            it('should have "Export as PDF" in the File menu', () => {
                menuManager.buildMenu();

                const template = (Menu.buildFromTemplate as any).mock.calls[0][0];

                // Find File menu
                const fileMenu = template.find((menu: any) => menu.label === 'File');
                expect(fileMenu).toBeDefined();

                // Find Export as PDF item
                const exportItem = fileMenu.submenu?.find((item: any) => item.id === 'menu-view-export-pdf');

                expect(exportItem).toBeDefined();
                expect(exportItem.label).toBe('Export as PDF');
            });

            it('should have correct default accelerator', () => {
                menuManager.buildMenu();
                const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
                const fileMenu = template.find((menu: any) => menu.label === 'File');
                const exportItem = fileMenu.submenu.find((item: any) => item.id === 'menu-view-export-pdf');

                // Default accelerator for printToPdf is CommandOrControl+Shift+P
                const expectedAccelerator = hotkeyManager.getAccelerator('printToPdf');
                expect(exportItem.accelerator).toBe(expectedAccelerator);
                expect(exportItem.accelerator).toBe('CommandOrControl+Shift+P');
            });

            it('should have "Export as Markdown" in the File menu', () => {
                menuManager.buildMenu();

                const template = (Menu.buildFromTemplate as any).mock.calls[0][0];

                // Find File menu
                const fileMenu = template.find((menu: any) => menu.label === 'File');
                expect(fileMenu).toBeDefined();

                // Find Export as Markdown item
                const exportMdItem = fileMenu.submenu?.find((item: any) => item.id === 'menu-view-export-markdown');

                expect(exportMdItem).toBeDefined();
                expect(exportMdItem.label).toBe('Export as Markdown');
            });
        });

        describe('Click Handler', () => {
            it('should trigger "print-to-pdf-triggered" event on WindowManager when clicked', () => {
                menuManager.buildMenu();
                const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
                const fileMenu = template.find((menu: any) => menu.label === 'File');
                const exportItem = fileMenu.submenu.find((item: any) => item.id === 'menu-view-export-pdf');

                // Click the item
                exportItem.click();

                // Verify event emission
                expect(windowManager.emit).toHaveBeenCalledWith('print-to-pdf-triggered');
            });

            it('should trigger "export-markdown-triggered" event on WindowManager when clicked', () => {
                menuManager.buildMenu();
                const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
                const fileMenu = template.find((menu: any) => menu.label === 'File');
                const exportMdItem = fileMenu.submenu.find((item: any) => item.id === 'menu-view-export-markdown');

                // Click the item
                exportMdItem.click();

                // Verify event emission
                expect(windowManager.emit).toHaveBeenCalledWith('export-markdown-triggered');
            });
        });

        describe('Dynamic Accelerator Updates', () => {
            it('should update menu accelerator when hotkey changes', () => {
                // Initial build
                menuManager.buildMenu();

                // Change accelerator in HotkeyManager
                hotkeyManager.setAccelerator('printToPdf', 'CommandOrControl+P');

                // Verify Menu was rebuilt
                expect(Menu.buildFromTemplate).toHaveBeenCalled();

                // Check the new template
                const calls = (Menu.buildFromTemplate as any).mock.calls;
                let foundUpdate = false;

                calls.forEach((callArgs: any) => {
                    const template = callArgs[0];
                    const fileMenu = template.find((menu: any) => menu.label === 'File');
                    const exportItem = fileMenu?.submenu?.find((item: any) => item.id === 'menu-view-export-pdf');
                    if (exportItem?.accelerator === 'CommandOrControl+P') {
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
                const exportItem = fileMenu?.submenu?.find((item: any) => item.id === 'menu-view-export-pdf');

                // Accelerator should be undefined when disabled
                expect(exportItem?.accelerator).toBeUndefined();
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
                    const exportItem = fileMenu?.submenu?.find((item: any) => item.id === 'menu-view-export-pdf');
                    if (exportItem?.accelerator === 'CommandOrControl+Shift+P') {
                        foundRestore = true;
                    }
                });

                expect(foundRestore).toBe(true);
            });
        });
    });
});

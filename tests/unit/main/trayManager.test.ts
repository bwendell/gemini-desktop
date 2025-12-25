/**
 * Unit tests for TrayManager.
 * @module trayManager.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tray, Menu, app } from 'electron';
import TrayManager from '../../../src/main/managers/trayManager';
import type WindowManager from '../../../src/main/managers/windowManager';

describe('TrayManager', () => {
    let trayManager: TrayManager;
    let mockWindowManager: Partial<WindowManager>;
    let originalPlatform: string;

    // Helper to mock platform
    const mockPlatform = (platform: string) => {
        Object.defineProperty(process, 'platform', {
            value: platform,
            configurable: true,
            writable: true
        });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (Tray as any)._reset();
        (Menu as any)._reset?.();

        originalPlatform = process.platform;

        // Mock WindowManager
        mockWindowManager = {
            restoreFromTray: vi.fn(),
            getMainWindow: vi.fn().mockReturnValue({}),
        };

        trayManager = new TrayManager(mockWindowManager as WindowManager);
    });

    afterEach(() => {
        mockPlatform(originalPlatform);
    });

    describe('constructor', () => {
        it('initializes with WindowManager reference', () => {
            expect(trayManager).toBeDefined();
            expect(trayManager.getTray()).toBeNull();
        });
    });

    describe('createTray', () => {
        it('creates Tray with .ico icon on Windows', async () => {
            mockPlatform('win32');
            vi.resetModules();

            // Reimport TrayManager after platform mock
            const { default: TrayManager } = await import('../../../src/main/managers/trayManager');
            const manager = new TrayManager(mockWindowManager as WindowManager);
            const tray = manager.createTray();

            expect(tray).toBeDefined();
            expect((tray as any).iconPath).toContain('icon.ico');
        });

        it('creates Tray with .png icon on macOS', async () => {
            mockPlatform('darwin');
            vi.resetModules();

            // Reimport TrayManager after platform mock
            const { default: TrayManager } = await import('../../../src/main/managers/trayManager');
            const manager = new TrayManager(mockWindowManager as WindowManager);
            const tray = manager.createTray();

            expect(tray).toBeDefined();
            expect((tray as any).iconPath).toContain('icon.png');
        });

        it('creates Tray with .png icon on Linux', async () => {
            mockPlatform('linux');
            vi.resetModules();

            // Reimport TrayManager after platform mock
            const { default: TrayManager } = await import('../../../src/main/managers/trayManager');
            const manager = new TrayManager(mockWindowManager as WindowManager);
            const tray = manager.createTray();

            expect(tray).toBeDefined();
            expect((tray as any).iconPath).toContain('icon.png');
        });

        it('sets tooltip correctly', () => {
            const tray = trayManager.createTray();

            expect(tray.setToolTip).toHaveBeenCalledWith('Gemini Desktop');
        });

        it('builds context menu from TRAY_MENU_ITEMS', () => {
            trayManager.createTray();

            expect(Menu.buildFromTemplate).toHaveBeenCalled();
            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];

            // Should have Show, Separator, Quit
            expect(template.length).toBe(3);
            expect(template[0].label).toBe('Show Gemini Desktop');
            expect(template[1].type).toBe('separator');
            expect(template[2].label).toBe('Quit');
        });

        it('sets context menu on tray', () => {
            const tray = trayManager.createTray();

            expect(tray.setContextMenu).toHaveBeenCalled();
        });

        it('registers click handler on tray', () => {
            const tray = trayManager.createTray();

            expect(tray.on).toHaveBeenCalledWith('click', expect.any(Function));
        });

        it('returns existing tray if already created', () => {
            const tray1 = trayManager.createTray();
            const tray2 = trayManager.createTray();

            expect(tray1).toBe(tray2);
            expect((Tray as any)._instances.length).toBe(1);
        });

        it('throws error when icon file is not found', async () => {
            // Need to mock fs.existsSync to return false
            vi.resetModules();

            // Create a mock for fs that returns false for existsSync
            vi.doMock('fs', () => ({
                existsSync: vi.fn().mockReturnValue(false),
            }));

            // Reimport TrayManager after mocking fs
            const { default: TrayManagerMocked } = await import('../../../src/main/managers/trayManager');
            const manager = new TrayManagerMocked(mockWindowManager as WindowManager);

            expect(() => manager.createTray()).toThrow('Tray icon not found');

            vi.doUnmock('fs');
        });
    });

    describe('tray click handler', () => {
        it('calls restoreFromTray on WindowManager when tray is clicked', () => {
            const tray = trayManager.createTray() as any;

            // Simulate click
            tray.simulateClick();

            expect(mockWindowManager.restoreFromTray).toHaveBeenCalled();
        });
    });

    describe('context menu handlers', () => {
        it('Show menu item calls restoreFromTray', () => {
            trayManager.createTray();

            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const showItem = template.find((item: any) => item.label === 'Show Gemini Desktop');

            expect(showItem).toBeDefined();
            showItem.click();

            expect(mockWindowManager.restoreFromTray).toHaveBeenCalled();
        });

        it('Quit menu item calls app.quit', () => {
            trayManager.createTray();

            const template = (Menu.buildFromTemplate as any).mock.calls[0][0];
            const quitItem = template.find((item: any) => item.label === 'Quit');

            expect(quitItem).toBeDefined();
            quitItem.click();

            expect(app.quit).toHaveBeenCalled();
        });
    });

    describe('destroyTray', () => {
        it('destroys the tray instance', () => {
            const tray = trayManager.createTray();

            trayManager.destroyTray();

            expect(tray.destroy).toHaveBeenCalled();
            expect(trayManager.getTray()).toBeNull();
        });

        it('handles already-destroyed tray gracefully', () => {
            const tray = trayManager.createTray();
            (tray.isDestroyed as any).mockReturnValue(true);

            // Should not throw
            expect(() => trayManager.destroyTray()).not.toThrow();
        });

        it('does nothing when tray does not exist', () => {
            // Should not throw
            expect(() => trayManager.destroyTray()).not.toThrow();
        });
    });

    describe('getTray', () => {
        it('returns null when no tray exists', () => {
            expect(trayManager.getTray()).toBeNull();
        });

        it('returns the tray instance when it exists', () => {
            const tray = trayManager.createTray();
            expect(trayManager.getTray()).toBe(tray);
        });
    });

    describe('setUpdateTooltip', () => {
        it('sets tooltip with version info', () => {
            const tray = trayManager.createTray();

            trayManager.setUpdateTooltip('2.0.0');

            expect(tray.setToolTip).toHaveBeenLastCalledWith('Gemini Desktop - Update v2.0.0 available');
        });

        it('does nothing if tray does not exist', () => {
            // No tray created, should not throw
            expect(() => trayManager.setUpdateTooltip('2.0.0')).not.toThrow();
        });

        it('does nothing if tray is destroyed', () => {
            const tray = trayManager.createTray();
            (tray.isDestroyed as any).mockReturnValue(true);

            // Should not throw
            expect(() => trayManager.setUpdateTooltip('2.0.0')).not.toThrow();
        });
    });

    describe('clearUpdateTooltip', () => {
        it('resets tooltip to default', () => {
            const tray = trayManager.createTray();
            trayManager.setUpdateTooltip('2.0.0');

            trayManager.clearUpdateTooltip();

            expect(tray.setToolTip).toHaveBeenLastCalledWith('Gemini Desktop');
        });

        it('does nothing if tray does not exist', () => {
            // No tray created, should not throw
            expect(() => trayManager.clearUpdateTooltip()).not.toThrow();
        });

        it('does nothing if tray is destroyed', () => {
            const tray = trayManager.createTray();
            (tray.isDestroyed as any).mockReturnValue(true);

            // Should not throw
            expect(() => trayManager.clearUpdateTooltip()).not.toThrow();
        });
    });
});








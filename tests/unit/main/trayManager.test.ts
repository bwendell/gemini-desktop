/**
 * Unit tests for TrayManager.
 * @module trayManager.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Tray, Menu, app, nativeImage } from 'electron';
import TrayManager from '../../../src/main/managers/trayManager';
import type WindowManager from '../../../src/main/managers/windowManager';
import {
    createMockWindowManager,
    resetPlatformAdapterForTests,
    useMockPlatformAdapter,
    platformAdapterPresets,
    createMockPlatformAdapter,
} from '../../helpers/mocks';

// Mock fs module to control file existence
vi.mock('fs', () => ({
    existsSync: vi.fn((path: string) => {
        // Return false for nonexistent paths, true for others
        return !path.includes('nonexistent');
    }),
}));

const trayInstances: (typeof mockTrayInstance)[] = [];
const mockTrayInstance = {
    setToolTip: vi.fn(),
    setContextMenu: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
    isDestroyed: vi.fn().mockReturnValue(false),
    simulateClick: vi.fn(),
    getTooltip: vi.fn().mockReturnValue('Gemini Desktop'),
};

const mockNativeImage = {
    isEmpty: vi.fn().mockReturnValue(false),
    setTemplateImage: vi.fn(),
};

vi.mock('electron', async () => ({
    Tray: function Tray() {
        trayInstances.push(mockTrayInstance);
        return mockTrayInstance;
    },
    Menu: {
        buildFromTemplate: vi.fn(() => ({ items: [] })),
    },
    app: {
        quit: vi.fn(),
    },
    nativeImage: {
        createFromPath: vi.fn(() => mockNativeImage),
    },
}));

describe('TrayManager', () => {
    let trayManager: TrayManager;
    let mockWindowManager: WindowManager;

    beforeEach(() => {
        vi.clearAllMocks();
        trayInstances.splice(0, trayInstances.length);
        mockTrayInstance.setToolTip.mockClear();
        mockTrayInstance.setContextMenu.mockClear();
        mockTrayInstance.on.mockClear();
        mockTrayInstance.destroy.mockClear();
        mockTrayInstance.isDestroyed.mockClear();
        mockTrayInstance.isDestroyed.mockReturnValue(false);
        mockTrayInstance.simulateClick.mockClear();
        mockTrayInstance.getTooltip.mockClear();
        mockNativeImage.isEmpty.mockClear();
        mockNativeImage.isEmpty.mockReturnValue(false);
        mockNativeImage.setTemplateImage.mockClear();
        vi.mocked(Menu.buildFromTemplate).mockClear();
        vi.mocked(app.quit).mockClear();
        vi.mocked(nativeImage.createFromPath).mockClear();

        // Mock WindowManager using shared factory
        mockWindowManager = createMockWindowManager({
            getMainWindow: vi.fn().mockReturnValue({}),
        }) as unknown as WindowManager;

        trayManager = new TrayManager(mockWindowManager);
    });

    afterEach(() => {
        resetPlatformAdapterForTests();
    });

    describe('constructor', () => {
        it('initializes with WindowManager reference', () => {
            expect(trayManager).toBeDefined();
            expect(trayManager.getTray()).toBeNull();
        });
    });

    describe('createTray', () => {
        it('creates Tray with .ico icon on Windows', async () => {
            useMockPlatformAdapter(platformAdapterPresets.windows());

            // Reimport TrayManager after platform mock
            const { default: TrayManager } = await import('../../../src/main/managers/trayManager');
            const manager = new TrayManager(mockWindowManager);
            const tray = manager.createTray();

            expect(tray).toBeDefined();
            expect(vi.mocked(nativeImage.createFromPath).mock.calls[0]?.[0]).toContain('icon.ico');
        });

        it('creates Tray with macOS-specific tray icon on macOS', async () => {
            useMockPlatformAdapter(
                createMockPlatformAdapter({
                    getTrayIconFilename: vi.fn().mockReturnValue('icon-mac-tray.png'),
                })
            );

            // Reimport TrayManager after platform mock
            const { default: TrayManager } = await import('../../../src/main/managers/trayManager');
            const manager = new TrayManager(mockWindowManager);
            const tray = manager.createTray();

            expect(tray).toBeDefined();
            const trayIcon = vi.mocked(nativeImage.createFromPath).mock.results[0]?.value as {
                setTemplateImage?: (value: boolean) => void;
            };
            expect(vi.mocked(nativeImage.createFromPath).mock.calls[0]?.[0]).toContain('icon-mac-tray.png');
            expect(trayIcon.setTemplateImage).not.toHaveBeenCalled();
        });

        it('creates Tray with .png icon on Linux', async () => {
            useMockPlatformAdapter(platformAdapterPresets.linuxWayland());

            // Reimport TrayManager after platform mock
            const { default: TrayManager } = await import('../../../src/main/managers/trayManager');
            const manager = new TrayManager(mockWindowManager);
            const tray = manager.createTray();

            expect(tray).toBeDefined();
            expect(vi.mocked(nativeImage.createFromPath).mock.calls[0]?.[0]).toContain('icon.png');
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
            expect(trayInstances.length).toBe(1);
        });

        it('falls back to app icon when tray icon is missing', async () => {
            useMockPlatformAdapter(
                createMockPlatformAdapter({
                    getTrayIconFilename: vi.fn().mockReturnValue('nonexistent-tray.png'),
                    getAppIconFilename: vi.fn().mockReturnValue('icon.png'),
                })
            );

            const { default: TrayManager } = await import('../../../src/main/managers/trayManager');
            const manager = new TrayManager(mockWindowManager);
            manager.createTray();

            const lastCall = vi.mocked(nativeImage.createFromPath).mock.calls.slice(-1)[0]?.[0];
            expect(lastCall).toContain('icon.png');
        });

        it('throws error when icon file is not found', async () => {
            useMockPlatformAdapter(
                createMockPlatformAdapter({
                    getAppIconFilename: vi.fn().mockReturnValue('nonexistent-icon.png'),
                    getTrayIconFilename: vi.fn().mockReturnValue('nonexistent-tray.png'),
                })
            );

            expect(() => trayManager.createTray()).toThrow('Icon not found');
        });
    });

    describe('tray click handler', () => {
        it('calls restoreFromTray on WindowManager when tray is clicked', () => {
            const tray = trayManager.createTray() as any;

            // Simulate click
            const clickHandler = vi.mocked(mockTrayInstance.on).mock.calls.find((call) => call[0] === 'click')?.[1];
            clickHandler?.();

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

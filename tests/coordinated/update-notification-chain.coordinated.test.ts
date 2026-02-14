import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('electron', async () => {
    const mockModule = await import('../unit/main/test/electron-mock');
    return mockModule.default;
});

import { BrowserWindow, app } from 'electron';
import UpdateManager from '../../src/main/managers/updateManager';
import BadgeManager from '../../src/main/managers/badgeManager';
import TrayManager from '../../src/main/managers/trayManager';
import WindowManager from '../../src/main/managers/windowManager';
import IpcManager from '../../src/main/managers/ipcManager';
import type { UpdateInfo } from 'electron-updater';
import { platformAdapterPresets, resetPlatformAdapterForTests, useMockPlatformAdapter } from '../helpers/mocks';

vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/__mocks__/logger';

vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn().mockReturnValue(true),
        readFileSync: vi.fn().mockReturnValue(Buffer.from('mock')),
        writeFileSync: vi.fn(),
    },
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue(Buffer.from('mock')),
    writeFileSync: vi.fn(),
}));

const { mockAutoUpdater, emitAutoUpdaterEvent } = vi.hoisted(() => {
    const mock = {
        checkForUpdates: vi.fn(),
        checkForUpdatesAndNotify: vi.fn().mockResolvedValue(undefined),
        downloadUpdate: vi.fn(),
        quitAndInstall: vi.fn(),
        on: vi.fn(),
        removeAllListeners: vi.fn(),
        autoDownload: true,
        autoInstallOnAppQuit: true,
        forceDevUpdateConfig: false,
        logger: null,
        _handlers: new Map<string, Function>(),
    };

    const emit = (event: string, ...args: any[]) => {
        const handler = mock._handlers.get(event);
        if (handler) {
            handler(...args);
        }
    };

    return { mockAutoUpdater: mock, emitAutoUpdaterEvent: emit };
});

vi.mock('electron-updater', () => ({
    autoUpdater: {
        ...mockAutoUpdater,
        on: vi.fn((event: string, handler: Function) => {
            mockAutoUpdater._handlers.set(event, handler);
            return mockAutoUpdater;
        }),
    },
}));

const adapterForPlatform = {
    darwin: platformAdapterPresets.mac,
    win32: platformAdapterPresets.windows,
    linux: platformAdapterPresets.linuxX11,
} as const;

describe('UpdateManager ↔ BadgeManager ↔ TrayManager ↔ IpcManager Notification Chain', () => {
    let updateManager: UpdateManager;
    let badgeManager: BadgeManager;
    let trayManager: TrayManager;
    let windowManager: WindowManager;
    let ipcManager: IpcManager;
    let mockStore: any;
    let mockHotkeyManager: any;

    beforeEach(() => {
        vi.clearAllMocks();
        const { ipcMain, BrowserWindow: BW, Tray: T } = require('electron');
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BW as any)._reset) (BW as any)._reset();
        if ((T as any)._reset) (T as any)._reset();

        mockAutoUpdater._handlers.clear();
        mockAutoUpdater.checkForUpdates.mockClear();
        mockAutoUpdater.on.mockClear();

        const storeData: Record<string, any> = {
            autoUpdateEnabled: true,
        };
        mockStore = {
            get: vi.fn((key: string) => storeData[key]),
            set: vi.fn((key: string, value: any) => {
                storeData[key] = value;
            }),
            _data: storeData,
        };

        mockHotkeyManager = {
            setIndividualEnabled: vi.fn(),
            registerAll: vi.fn(),
            unregisterAll: vi.fn(),
            updateAllSettings: vi.fn(),
            updateAllAccelerators: vi.fn(),
            getIndividualSettings: vi.fn().mockReturnValue({
                alwaysOnTop: true,
                bossKey: true,
                quickChat: true,
                printToPdf: true,
            }),
            getHotkeyAccelerators: vi.fn().mockReturnValue({
                alwaysOnTop: 'Ctrl+Shift+T',
                bossKey: 'Ctrl+Shift+B',
                quickChat: 'Ctrl+Shift+X',
                printToPdf: 'Ctrl+Shift+P',
            }),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetPlatformAdapterForTests({ resetModules: true });
        if (updateManager) {
            updateManager.destroy();
        }
    });

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(async () => {
            useMockPlatformAdapter(adapterForPlatform[platform]());

            windowManager = new WindowManager(false);
            badgeManager = new BadgeManager();
            trayManager = new TrayManager(windowManager);

            updateManager = new UpdateManager(mockStore, {
                badgeManager,
                trayManager,
            });

            const originalIsPackaged = app.isPackaged;
            (app as any).isPackaged = true;
            await updateManager.checkForUpdates(false);
            (app as any).isPackaged = originalIsPackaged;

            ipcManager = new IpcManager(
                windowManager,
                mockHotkeyManager,
                updateManager,
                null,
                null,
                null,
                mockStore,
                mockLogger
            );
            ipcManager.setupIpcHandlers();
        });

        describe('UpdateManager detects update → Notification chain', () => {
            it('should show badge, update tray tooltip, and broadcast to all renderers', () => {
                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);

                trayManager.createTray();

                const mockWin1 = { isDestroyed: () => false, webContents: { send: vi.fn() } };
                const mockWin2 = { isDestroyed: () => false, webContents: { send: vi.fn() } };
                (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin1, mockWin2]);

                const updateInfo: UpdateInfo = {
                    version: '2.0.0',
                    releaseDate: '2024-01-01',
                    releaseName: 'Test Release',
                    releaseNotes: 'Test notes',
                    files: [],
                    path: '/test/path',
                    sha512: 'test-sha',
                };

                emitAutoUpdaterEvent('update-downloaded', updateInfo);

                expect(badgeManager.hasBadgeShown()).toBe(true);

                if (platform === 'darwin') {
                    expect(app.dock?.setBadge).toHaveBeenCalledWith('•');
                } else if (platform === 'win32') {
                    expect(mainWindow.setOverlayIcon).toHaveBeenCalled();
                }

                expect(trayManager.getToolTip()).toContain('2.0.0');

                expect(mockWin1.webContents.send).toHaveBeenCalledWith(
                    'auto-update:downloaded',
                    expect.objectContaining({
                        version: '2.0.0',
                    })
                );
                expect(mockWin2.webContents.send).toHaveBeenCalledWith(
                    'auto-update:downloaded',
                    expect.objectContaining({
                        version: '2.0.0',
                    })
                );
            });

            it('should handle update-downloaded event and broadcast', () => {
                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);
                trayManager.createTray();

                const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
                (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

                const updateInfo: UpdateInfo = {
                    version: '2.0.0',
                    releaseDate: '2024-01-01',
                    releaseName: 'Test Release',
                    releaseNotes: 'Test notes',
                    files: [],
                    path: '/test/path',
                    sha512: 'test-sha',
                };

                emitAutoUpdaterEvent('update-available', updateInfo);

                emitAutoUpdaterEvent('update-downloaded', updateInfo);

                expect(mockWin.webContents.send).toHaveBeenCalledWith(
                    'auto-update:available',
                    expect.objectContaining({
                        version: '2.0.0',
                    })
                );
                expect(mockWin.webContents.send).toHaveBeenCalledWith(
                    'auto-update:downloaded',
                    expect.objectContaining({
                        version: '2.0.0',
                    })
                );

                expect(badgeManager.hasBadgeShown()).toBe(true);
            });
        });

        describe('User dismisses update → Cleanup chain', () => {
            it('should clear badge, reset tooltip, and notify renderers', () => {
                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);
                trayManager.createTray();

                const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
                (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

                const updateInfo: UpdateInfo = {
                    version: '2.0.0',
                    releaseDate: '2024-01-01',
                    releaseName: 'Test Release',
                    releaseNotes: 'Test notes',
                    files: [],
                    path: '/test/path',
                    sha512: 'test-sha',
                };
                emitAutoUpdaterEvent('update-downloaded', updateInfo);

                expect(badgeManager.hasBadgeShown()).toBe(true);
                expect(trayManager.getToolTip()).toContain('2.0.0');

                updateManager.devClearBadge();

                expect(badgeManager.hasBadgeShown()).toBe(false);
                expect(trayManager.getToolTip()).not.toContain('2.0.0');

                if (platform === 'darwin') {
                    expect(app.dock?.setBadge).toHaveBeenCalledWith('');
                } else if (platform === 'win32') {
                    expect(mainWindow.setOverlayIcon).toHaveBeenCalledWith(null, '');
                }
            });

            it('should handle repeated dismissals gracefully', () => {
                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);
                trayManager.createTray();

                for (let i = 0; i < 3; i++) {
                    updateManager.devShowBadge(`${i}.0.0`);
                    expect(badgeManager.hasBadgeShown()).toBe(true);

                    updateManager.devClearBadge();
                    expect(badgeManager.hasBadgeShown()).toBe(false);
                }

                expect(mockLogger.error).not.toHaveBeenCalled();
            });
        });

        describe('No duplicate notifications', () => {
            it('should show badge only once for same update version', () => {
                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);
                trayManager.createTray();

                const updateInfo: UpdateInfo = {
                    version: '2.0.0',
                    releaseDate: '2024-01-01',
                    releaseName: 'Test Release',
                    releaseNotes: 'Test notes',
                    files: [],
                    path: '/test/path',
                    sha512: 'test-sha',
                };

                emitAutoUpdaterEvent('update-downloaded', updateInfo);
                emitAutoUpdaterEvent('update-downloaded', updateInfo);

                expect(badgeManager.hasBadgeShown()).toBe(true);

                const alreadyShownLogs = mockLogger.log.mock.calls.filter((call: any) => call[0]?.includes('already'));
                expect(alreadyShownLogs.length).toBeGreaterThan(0);
            });

            it('should handle different update versions correctly', () => {
                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);
                trayManager.createTray();

                const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
                (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

                const updateInfo1: UpdateInfo = {
                    version: '2.0.0',
                    releaseDate: '2024-01-01',
                    releaseName: 'v2.0.0',
                    releaseNotes: 'First update',
                    files: [],
                    path: '/test/path',
                    sha512: 'test-sha',
                };
                emitAutoUpdaterEvent('update-downloaded', updateInfo1);

                expect(badgeManager.hasBadgeShown()).toBe(true);
                expect(trayManager.getToolTip()).toContain('2.0.0');

                updateManager.devClearBadge();

                const updateInfo2: UpdateInfo = {
                    version: '3.0.0',
                    releaseDate: '2024-02-01',
                    releaseName: 'v3.0.0',
                    releaseNotes: 'Second update',
                    files: [],
                    path: '/test/path',
                    sha512: 'test-sha2',
                };
                emitAutoUpdaterEvent('update-downloaded', updateInfo2);

                expect(badgeManager.hasBadgeShown()).toBe(true);
                expect(trayManager.getToolTip()).toContain('3.0.0');
                expect(trayManager.getToolTip()).not.toContain('2.0.0');
            });

            it('should broadcast IPC only once per unique update', () => {
                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);
                trayManager.createTray();

                const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
                (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

                const updateInfo: UpdateInfo = {
                    version: '2.0.0',
                    releaseDate: '2024-01-01',
                    releaseName: 'Test Release',
                    releaseNotes: 'Test notes',
                    files: [],
                    path: '/test/path',
                    sha512: 'test-sha',
                };

                mockWin.webContents.send.mockClear();

                emitAutoUpdaterEvent('update-downloaded', updateInfo);

                const updateAvailableCalls = mockWin.webContents.send.mock.calls.filter(
                    (call: any) => call[0] === 'auto-update:downloaded'
                );
                expect(updateAvailableCalls.length).toBe(1);

                emitAutoUpdaterEvent('update-downloaded', updateInfo);

                const updateAvailableCallsAfter = mockWin.webContents.send.mock.calls.filter(
                    (call: any) => call[0] === 'auto-update:downloaded'
                );
                expect(updateAvailableCallsAfter.length).toBe(2);

                expect(badgeManager.hasBadgeShown()).toBe(true);
            });
        });

        describe('Download Progress Events', () => {
            it('should log download progress without triggering badge or tray updates', () => {
                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);
                trayManager.createTray();

                const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
                (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

                mockLogger.log.mockClear();

                emitAutoUpdaterEvent('download-progress', { percent: 0 });
                emitAutoUpdaterEvent('download-progress', { percent: 25.5 });
                emitAutoUpdaterEvent('download-progress', { percent: 50 });
                emitAutoUpdaterEvent('download-progress', { percent: 75.3 });
                emitAutoUpdaterEvent('download-progress', { percent: 100 });

                const progressLogs = mockLogger.log.mock.calls.filter((call: any) =>
                    call[0]?.includes('Download progress')
                );
                expect(progressLogs.length).toBeGreaterThan(0);

                expect(badgeManager.hasBadgeShown()).toBe(false);

                const progressBroadcasts = mockWin.webContents.send.mock.calls.filter(
                    (call: any) => call[0] === 'auto-update:download-progress'
                );
                expect(progressBroadcasts.length).toBe(5);

                expect(progressBroadcasts[2][1]).toEqual({ percent: 50 });
            });

            it('should handle download progress at various percentages', () => {
                const percentages = [0, 10.5, 25, 33.33, 50, 66.67, 75, 90.1, 99.9, 100];

                percentages.forEach((percent) => {
                    expect(() => {
                        emitAutoUpdaterEvent('download-progress', { percent });
                    }).not.toThrow();
                });

                const progressLogs = mockLogger.log.mock.calls.filter((call: any) =>
                    call[0]?.includes('Download progress')
                );
                expect(progressLogs.length).toBe(percentages.length);
            });

            it('should not interfere with other update events', () => {
                const mainWindow = windowManager.createMainWindow();
                badgeManager.setMainWindow(mainWindow);
                trayManager.createTray();

                const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
                (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

                const updateInfo: UpdateInfo = {
                    version: '2.0.0',
                    releaseDate: '2024-01-01',
                    releaseName: 'Test Release',
                    releaseNotes: 'Test notes',
                    files: [],
                    path: '/test/path',
                    sha512: 'test-sha',
                };

                emitAutoUpdaterEvent('update-available', updateInfo);
                emitAutoUpdaterEvent('download-progress', { percent: 25 });
                emitAutoUpdaterEvent('download-progress', { percent: 50 });
                emitAutoUpdaterEvent('download-progress', { percent: 75 });
                emitAutoUpdaterEvent('update-downloaded', updateInfo);

                expect(badgeManager.hasBadgeShown()).toBe(true);

                const availableCalls = mockWin.webContents.send.mock.calls.filter(
                    (call: any) => call[0] === 'auto-update:available'
                );
                const downloadedCalls = mockWin.webContents.send.mock.calls.filter(
                    (call: any) => call[0] === 'auto-update:downloaded'
                );
                expect(availableCalls.length).toBe(1);
                expect(downloadedCalls.length).toBe(1);
            });
        });

        describe('Error handling in notification chain', () => {
            it('should handle autoUpdater error gracefully', () => {
                const mockWin = { isDestroyed: () => false, webContents: { send: vi.fn() } };
                (BrowserWindow.getAllWindows as any).mockReturnValue([mockWin]);

                const error = new Error('Update check failed');
                emitAutoUpdaterEvent('error', error);

                expect(mockWin.webContents.send).toHaveBeenCalledWith(
                    'auto-update:error',
                    'The auto-update service encountered an error. Please try again later.'
                );

                expect(badgeManager.hasBadgeShown()).toBe(false);
            });

            it('should handle missing dependencies gracefully', () => {
                const standAloneUpdateManager = new UpdateManager(mockStore);

                const updateInfo: UpdateInfo = {
                    version: '2.0.0',
                    releaseDate: '2024-01-01',
                    releaseName: 'Test Release',
                    releaseNotes: 'Test notes',
                    files: [],
                    path: '/test/path',
                    sha512: 'test-sha',
                };

                expect(() => {
                    emitAutoUpdaterEvent('update-available', updateInfo);
                }).not.toThrow();

                standAloneUpdateManager.destroy();
            });
        });
    });
});

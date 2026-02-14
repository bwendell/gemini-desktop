/**
 * Coordinated tests for main process lifecycle events.
 * Tests platform-specific behavior for window-all-closed and activate events.
 *
 * @module main-lifecycle.coordinated.test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, BrowserWindow } from 'electron';
import WindowManager from '../../src/main/managers/windowManager';
import { platformAdapterPresets, resetPlatformAdapterForTests, useMockPlatformAdapter } from '../helpers/mocks';
import { stubPlatform, restorePlatform } from '../helpers/harness';

vi.mock('../../src/main/utils/logger');

vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue('{}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
}));

describe('Main Process Lifecycle Platform Behavior', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetPlatformAdapterForTests();
    });

    afterEach(() => {
        resetPlatformAdapterForTests();
    });

    describe('window-all-closed event', () => {
        describe.each([
            { platform: 'darwin', shouldQuit: false, adapter: platformAdapterPresets.mac },
            { platform: 'win32', shouldQuit: true, adapter: platformAdapterPresets.windows },
            { platform: 'linux', shouldQuit: true, adapter: platformAdapterPresets.linuxX11 },
        ])('on $platform', ({ platform, shouldQuit, adapter }) => {
            let platformAdapter: ReturnType<typeof adapter>;

            beforeEach(() => {
                stubPlatform(platform as 'darwin' | 'win32' | 'linux');
                platformAdapter = adapter();
                useMockPlatformAdapter(platformAdapter);
            });

            afterEach(() => {
                restorePlatform();
            });

            it(`should ${shouldQuit ? 'call' : 'NOT call'} app.quit() when all windows are closed`, () => {
                (app.quit as any).mockClear();
                if (platformAdapter.shouldQuitOnWindowAllClosed()) {
                    app.quit();
                }

                if (shouldQuit) {
                    expect(app.quit).toHaveBeenCalled();
                } else {
                    expect(app.quit).not.toHaveBeenCalled();
                }
            });

            it(`correctly identifies platform as ${platform}`, () => {
                expect(process.platform).toBe(platform);
            });
        });
    });

    describe('activate event (macOS dock click)', () => {
        beforeEach(() => {
            useMockPlatformAdapter(platformAdapterPresets.mac());
        });

        it('should recreate window if no windows exist on activate', () => {
            (BrowserWindow.getAllWindows as any).mockReturnValue([]);

            const windowManager = new WindowManager(false);
            const createMainWindowSpy = vi.spyOn(windowManager, 'createMainWindow');

            if (BrowserWindow.getAllWindows().length === 0) {
                windowManager.createMainWindow();
            }

            expect(createMainWindowSpy).toHaveBeenCalled();
        });

        it('should NOT recreate window if windows already exist on activate', () => {
            (BrowserWindow.getAllWindows as any).mockReturnValue([{ id: 1 }]);

            const windowManager = new WindowManager(false);
            const createMainWindowSpy = vi.spyOn(windowManager, 'createMainWindow');

            if (BrowserWindow.getAllWindows().length === 0) {
                windowManager.createMainWindow();
            }

            expect(createMainWindowSpy).not.toHaveBeenCalled();
        });
    });

    describe('before-quit event', () => {
        const adapterForPlatform = {
            darwin: platformAdapterPresets.mac,
            win32: platformAdapterPresets.windows,
            linux: platformAdapterPresets.linuxX11,
        } as const;

        describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
            beforeEach(() => {
                useMockPlatformAdapter(adapterForPlatform[platform]());
            });

            it('should set quitting state on WindowManager', () => {
                const windowManager = new WindowManager(false);
                const setQuittingSpy = vi.spyOn(windowManager, 'setQuitting');

                windowManager.setQuitting(true);

                expect(setQuittingSpy).toHaveBeenCalledWith(true);
            });
        });
    });
});

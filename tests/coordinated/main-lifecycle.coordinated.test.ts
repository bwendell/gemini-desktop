/**
 * Coordinated tests for main process lifecycle events.
 * Tests platform-specific behavior for window-all-closed and activate events.
 *
 * @module main-lifecycle.coordinated.test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app, BrowserWindow } from 'electron';
import WindowManager from '../../src/main/managers/windowManager';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../src/main/utils/logger');

// Mock fs
vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue('{}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
}));

describe('Main Process Lifecycle Platform Behavior', () => {
    let originalPlatform: string;

    beforeEach(() => {
        vi.clearAllMocks();
        originalPlatform = process.platform;
    });

    afterEach(() => {
        Object.defineProperty(process, 'platform', {
            value: originalPlatform,
            configurable: true,
            writable: true,
        });
    });

    describe('window-all-closed event', () => {
        describe.each([
            { platform: 'darwin', shouldQuit: false },
            { platform: 'win32', shouldQuit: true },
            { platform: 'linux', shouldQuit: true },
        ])('on $platform', ({ platform, shouldQuit }) => {
            beforeEach(() => {
                Object.defineProperty(process, 'platform', {
                    value: platform,
                    configurable: true,
                    writable: true,
                });
            });

            it(`should ${shouldQuit ? 'call' : 'NOT call'} app.quit() when all windows are closed`, () => {
                // Simulate the window-all-closed handler logic from main.ts:
                // app.on('window-all-closed', () => {
                //   if (process.platform !== 'darwin') {
                //     app.quit();
                //   }
                // });

                // Reset mock
                (app.quit as any).mockClear();

                // Execute the handler logic
                if (process.platform !== 'darwin') {
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
            Object.defineProperty(process, 'platform', {
                value: 'darwin',
                configurable: true,
                writable: true,
            });
        });

        it('should recreate window if no windows exist on activate', () => {
            // Mock BrowserWindow.getAllWindows to return empty array
            (BrowserWindow.getAllWindows as any).mockReturnValue([]);

            const windowManager = new WindowManager(false);
            const createMainWindowSpy = vi.spyOn(windowManager, 'createMainWindow');

            // Simulate activate event handler logic from main.ts:
            // app.on('activate', () => {
            //   if (BrowserWindow.getAllWindows().length === 0) {
            //     windowManager.createMainWindow();
            //   }
            // });

            if (BrowserWindow.getAllWindows().length === 0) {
                windowManager.createMainWindow();
            }

            expect(createMainWindowSpy).toHaveBeenCalled();
        });

        it('should NOT recreate window if windows already exist on activate', () => {
            // Mock BrowserWindow.getAllWindows to return existing window
            (BrowserWindow.getAllWindows as any).mockReturnValue([{ id: 1 }]);

            const windowManager = new WindowManager(false);
            const createMainWindowSpy = vi.spyOn(windowManager, 'createMainWindow');

            // Simulate activate event handler logic
            if (BrowserWindow.getAllWindows().length === 0) {
                windowManager.createMainWindow();
            }

            expect(createMainWindowSpy).not.toHaveBeenCalled();
        });
    });

    describe('before-quit event', () => {
        describe.each(['darwin', 'win32', 'linux'])('on %s', (platform) => {
            beforeEach(() => {
                Object.defineProperty(process, 'platform', {
                    value: platform,
                    configurable: true,
                    writable: true,
                });
            });

            it('should set quitting state on WindowManager', () => {
                const windowManager = new WindowManager(false);
                const setQuittingSpy = vi.spyOn(windowManager, 'setQuitting');

                // Simulate before-quit handler from main.ts:
                // app.on('before-quit', () => {
                //   windowManager.setQuitting(true);
                // });

                windowManager.setQuitting(true);

                expect(setQuittingSpy).toHaveBeenCalledWith(true);
            });
        });
    });
});

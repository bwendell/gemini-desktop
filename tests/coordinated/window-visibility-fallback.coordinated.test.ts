/**
 * Integration tests for Window Visibility Fallback.
 * Verifies that the main window becomes visible even if 'ready-to-show' event fails to fire.
 * This is critical for reliability on headless Linux environments.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MainWindow from '../../src/main/windows/mainWindow';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/logger';
import { useFakeTimers, useRealTimers, stubPlatform, restorePlatform } from '../helpers/harness';

// Mock constants to be dynamic for platform testing
vi.mock('../../src/main/utils/constants', async (importOriginal) => {
    const actual = (await importOriginal()) as any;
    return {
        ...actual,
        get isMacOS() {
            return process.platform === 'darwin';
        },
        get isWindows() {
            return process.platform === 'win32';
        },
        get isLinux() {
            return process.platform === 'linux';
        },
    };
});

describe('Window Visibility Fallback Integration', () => {
    let mockBrowserWindow: any;
    let registeredListeners: Record<string, Function> = {};

    describe.each(['darwin', 'win32', 'linux'] as const)('on %s', (platform) => {
        beforeEach(() => {
            vi.clearAllMocks();
            useFakeTimers();
            stubPlatform(platform);
            registeredListeners = {};

            mockBrowserWindow = {
                on: vi.fn((event, cb) => {
                    registeredListeners[event] = cb;
                }),
                once: vi.fn((event, cb) => {
                    registeredListeners[event] = cb;
                }),
                show: vi.fn(),
                hide: vi.fn(),
                focus: vi.fn(),
                isVisible: vi.fn().mockReturnValue(false),
                isDestroyed: vi.fn().mockReturnValue(false),
                setSkipTaskbar: vi.fn(),
                webContents: {
                    openDevTools: vi.fn(),
                    on: vi.fn(),
                    once: vi.fn(),
                    setWindowOpenHandler: vi.fn(),
                    loadURL: vi.fn(),
                    loadFile: vi.fn(),
                },
            };

            // Mock the base window internal property set
            vi.spyOn(MainWindow.prototype as any, 'createWindow').mockImplementation(function (this: any) {
                this.window = mockBrowserWindow;
                return mockBrowserWindow;
            });
        });

        afterEach(() => {
            useRealTimers();
            restorePlatform();
        });

        it('should show window immediately when ready-to-show fires (Happy Path)', () => {
            const mainWindow = new MainWindow(false);
            mainWindow.create();

            const readyShowHandler = registeredListeners['ready-to-show'];
            expect(readyShowHandler).toBeDefined();
            readyShowHandler();

            expect(mockBrowserWindow.show).toHaveBeenCalled();
        });

        it('should use fallback timer to show window if ready-to-show never fires', () => {
            const mainWindow = new MainWindow(false);
            mainWindow.create();

            expect(mockBrowserWindow.show).not.toHaveBeenCalled();

            vi.advanceTimersByTime(3001);

            expect(mockBrowserWindow.show).toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('ready-to-show timeout'));
        });

        it('should NOT trigger fallback show if window is already visible', () => {
            const mainWindow = new MainWindow(false);
            mainWindow.create();

            mockBrowserWindow.isVisible.mockReturnValue(true);
            vi.advanceTimersByTime(3001);
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });

        it('should handle hideToTray and restoreFromTray', () => {
            const mainWindow = new MainWindow(false);
            mainWindow.create();

            mainWindow.hideToTray();
            expect(mockBrowserWindow.hide).toHaveBeenCalled();

            mainWindow.restoreFromTray();
            expect(mockBrowserWindow.show).toHaveBeenCalled();

            // Shared behavior: no errors should have occurred
            expect(mockLogger.error).not.toHaveBeenCalled();
        });
    });
});

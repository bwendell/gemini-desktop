/**
 * Integration tests for window lifecycle coordination.
 * Tests WindowManager coordination of dependent windows.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ipcMain, BrowserWindow } from 'electron';
import WindowManager from '../../src/main/managers/windowManager';

// Use the centralized logger mock from __mocks__ directory
vi.mock('../../src/main/utils/logger');

// Mock fs for window state
vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue('{}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
}));

describe('Window Lifecycle Integration', () => {
    let windowManager: WindowManager;

    beforeEach(() => {
        vi.clearAllMocks();
        if ((ipcMain as any)._reset) (ipcMain as any)._reset();
        if ((BrowserWindow as any)._reset) (BrowserWindow as any)._reset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Window Creation', () => {
        beforeEach(() => {
            windowManager = new WindowManager(false);
        });

        it('should create main window successfully', () => {
            const mainWindow = windowManager.createMainWindow();
            expect(mainWindow).toBeDefined();
            expect(windowManager.getMainWindow()).toBe(mainWindow);
        });

        it('should create options window', () => {
            windowManager.createMainWindow();
            const optionsWindow = windowManager.createOptionsWindow();
            expect(optionsWindow).toBeDefined();
        });

        it('should create Quick Chat window', () => {
            const quickChatWindow = windowManager.createQuickChatWindow();
            expect(quickChatWindow).toBeDefined();
            expect(windowManager.getQuickChatWindow()).toBe(quickChatWindow);
        });

        it('should create auth window', async () => {
            const authWindow = await windowManager.createAuthWindow('https://example.com');
            expect(authWindow).toBeDefined();
        });
    });

    describe('Window State Management', () => {
        beforeEach(() => {
            windowManager = new WindowManager(false);
        });

        it('should handle setAlwaysOnTop without throwing', () => {
            windowManager.createMainWindow();

            expect(() => windowManager.setAlwaysOnTop(true)).not.toThrow();
            expect(() => windowManager.setAlwaysOnTop(false)).not.toThrow();
        });

        it('should emit always-on-top-changed event', () => {
            const eventSpy = vi.fn();
            windowManager.on('always-on-top-changed', eventSpy);
            windowManager.createMainWindow();

            windowManager.setAlwaysOnTop(true);
            expect(eventSpy).toHaveBeenCalledWith(true);
        });

        it('should handle hideToTray without throwing', () => {
            windowManager.createMainWindow();
            expect(() => windowManager.hideToTray()).not.toThrow();
        });

        it('should handle restoreFromTray without throwing', () => {
            windowManager.createMainWindow();
            expect(() => windowManager.restoreFromTray()).not.toThrow();
        });

        it('should handle setQuitting without throwing', () => {
            windowManager.createMainWindow();
            expect(() => windowManager.setQuitting(true)).not.toThrow();
        });
    });
});

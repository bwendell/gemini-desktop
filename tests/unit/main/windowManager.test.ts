/**
 * Unit tests for WindowManager (facade).
 * 
 * WindowManager now acts as a facade delegating to individual window classes.
 * These tests verify the facade pattern works correctly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow } from 'electron';
import WindowManager from '../../../src/main/managers/windowManager';

const mocks = vi.hoisted(() => ({
    isMacOS: false,
}));

vi.mock('../../../src/main/utils/constants', async (importOriginal) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual = await importOriginal<any>();
    return {
        ...actual,
        get isMacOS() {
            return mocks.isMacOS;
        },
    };
});

vi.mock('../../../src/main/utils/paths', async (importOriginal) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual = await importOriginal<any>();
    return {
        ...actual,
        getIconPath: vi.fn().mockReturnValue('/mock/icon/path.png'),
    };
});

describe('WindowManager', () => {
    let windowManager: WindowManager;

    beforeEach(() => {
        vi.clearAllMocks();
        (BrowserWindow as any)._reset();
        windowManager = new WindowManager(false);
    });

    describe('constructor', () => {
        it('initializes with isDev flag', () => {
            const wm = new WindowManager(true);
            expect(wm.isDev).toBe(true);
        });
    });

    describe('createMainWindow', () => {
        it('creates a new window', () => {
            const win = windowManager.createMainWindow();
            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win).toBeDefined();
        });

        it('returns existing window if already created', () => {
            const win1 = windowManager.createMainWindow();
            const win2 = windowManager.createMainWindow();
            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win1).toBe(win2);
        });
    });

    describe('createOptionsWindow', () => {
        it('creates a new options window', () => {
            const win = windowManager.createOptionsWindow();
            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win).toBeDefined();
        });

        it('returns existing window if already open', () => {
            const win1 = windowManager.createOptionsWindow();
            const win2 = windowManager.createOptionsWindow();
            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win1).toBe(win2);
        });
    });

    describe('createAuthWindow', () => {
        it('creates auth window with URL', () => {
            const url = 'https://accounts.google.com/signin';
            const win = windowManager.createAuthWindow(url);
            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win.loadURL).toHaveBeenCalledWith(url);
        });
    });

    describe('createQuickChatWindow', () => {
        it('creates quick chat window', () => {
            const win = windowManager.createQuickChatWindow();
            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win).toBeDefined();
        });
    });

    describe('getMainWindow', () => {
        it('returns null when no window exists', () => {
            expect(windowManager.getMainWindow()).toBeNull();
        });

        it('returns the main window when it exists', () => {
            windowManager.createMainWindow();
            expect(windowManager.getMainWindow()).not.toBeNull();
        });
    });

    describe('getQuickChatWindow', () => {
        it('returns null when no window exists', () => {
            expect(windowManager.getQuickChatWindow()).toBeNull();
        });

        it('returns the Quick Chat window when it exists', () => {
            windowManager.createQuickChatWindow();
            expect(windowManager.getQuickChatWindow()).not.toBeNull();
        });
    });

    describe('hideToTray', () => {
        beforeEach(() => {
            mocks.isMacOS = false;
        });

        it('hides main window', () => {
            const win = windowManager.createMainWindow();
            windowManager.hideToTray();
            expect(win.hide).toHaveBeenCalled();
        });
    });

    describe('restoreFromTray', () => {
        beforeEach(() => {
            mocks.isMacOS = false;
        });

        it('shows and focuses main window', () => {
            const win = windowManager.createMainWindow();
            windowManager.restoreFromTray();
            expect(win.show).toHaveBeenCalled();
            expect(win.focus).toHaveBeenCalled();
        });
    });

    describe('setAlwaysOnTop', () => {
        it('sets always on top and emits event', () => {
            const win = windowManager.createMainWindow();
            const listener = vi.fn();
            windowManager.on('always-on-top-changed', listener);

            windowManager.setAlwaysOnTop(true);

            expect(win.setAlwaysOnTop).toHaveBeenCalledWith(true);
            expect(listener).toHaveBeenCalledWith(true);
        });
    });

    describe('isAlwaysOnTop', () => {
        it('returns false when no window', () => {
            expect(windowManager.isAlwaysOnTop()).toBe(false);
        });

        it('returns current state', () => {
            const win = windowManager.createMainWindow();
            win.isAlwaysOnTop = vi.fn().mockReturnValue(true);
            expect(windowManager.isAlwaysOnTop()).toBe(true);
        });
    });

    describe('minimizeMainWindow', () => {
        it('minimizes main window', () => {
            const win = windowManager.createMainWindow();
            windowManager.minimizeMainWindow();
            expect(win.minimize).toHaveBeenCalled();
        });
    });

    describe('focusMainWindow', () => {
        it('shows and focuses main window', () => {
            const win = windowManager.createMainWindow();
            windowManager.focusMainWindow();
            expect(win.show).toHaveBeenCalled();
            expect(win.focus).toHaveBeenCalled();
        });
    });

    describe('toggleQuickChat', () => {
        it('creates and shows quick chat if not exists', () => {
            windowManager.toggleQuickChat();
            expect((BrowserWindow as any)._instances.length).toBe(1);
        });
    });

    describe('showQuickChat', () => {
        it('creates quick chat if not exists', () => {
            windowManager.showQuickChat();
            expect((BrowserWindow as any)._instances.length).toBe(1);
        });
    });

    describe('hideQuickChat', () => {
        it('hides quick chat window', () => {
            const win = windowManager.createQuickChatWindow();
            win.isDestroyed = vi.fn().mockReturnValue(false);
            windowManager.hideQuickChat();
            expect(win.hide).toHaveBeenCalled();
        });
    });
});







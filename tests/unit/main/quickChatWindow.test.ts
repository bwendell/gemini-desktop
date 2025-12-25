/**
 * Unit tests for QuickChatWindow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow } from 'electron';
import QuickChatWindow from '../../../src/main/windows/quickChatWindow';

vi.mock('../../../src/main/utils/paths', async (importOriginal) => {
    type PathsModule = typeof import('../../../src/main/utils/paths');
    const actual = await importOriginal<PathsModule>();
    return {
        ...actual,
        getIconPath: vi.fn().mockReturnValue('/mock/icon/path.png'),
    };
});

describe('QuickChatWindow', () => {
    let quickChatWindow: QuickChatWindow;

    beforeEach(() => {
        vi.clearAllMocks();
        (BrowserWindow as any)._reset();
        quickChatWindow = new QuickChatWindow(false);
    });

    describe('create', () => {
        it('creates Quick Chat window with correct configuration', () => {
            const win = quickChatWindow.create();
            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win).toBeDefined();
            expect(win.options).toMatchObject({
                frame: false,
                transparent: true,
                alwaysOnTop: true,
                skipTaskbar: true,
            });
        });

        it('returns existing Quick Chat window if already created', () => {
            const win1 = quickChatWindow.create();
            const win2 = quickChatWindow.create();
            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win1).toBe(win2);
        });

        it('loads quickchat.html in dev mode', () => {
            const devWindow = new QuickChatWindow(true);
            const win = devWindow.create();
            expect(win.loadURL).toHaveBeenCalledWith('http://localhost:1420/src/renderer/windows/quickchat/quickchat.html');
        });

        it('loads quickchat.html in prod mode', () => {
            const win = quickChatWindow.create();
            expect(win.loadFile).toHaveBeenCalledWith(expect.stringContaining('quickchat.html'));
        });

        it('shows and focuses window on ready-to-show', () => {
            const win = quickChatWindow.create();
            const readyHandler = win.once.mock.calls.find((call: [string, () => void]) => call[0] === 'ready-to-show')?.[1];
            readyHandler?.();
            expect(win.show).toHaveBeenCalled();
            expect(win.focus).toHaveBeenCalled();
        });

        it('hides window on blur event', () => {
            const win = quickChatWindow.create();
            win.isDestroyed = vi.fn().mockReturnValue(false);

            const blurHandler = win.on.mock.calls.find((call: [string, () => void]) => call[0] === 'blur')?.[1];
            blurHandler?.();
            expect(win.hide).toHaveBeenCalled();
        });

        it('clears reference when window is closed', () => {
            quickChatWindow.create();
            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];

            const closeHandler = win.on.mock.calls.find((call: [string, () => void]) => call[0] === 'closed')?.[1];
            closeHandler?.();

            expect(quickChatWindow.getWindow()).toBeNull();
        });
    });

    describe('showAndFocus', () => {
        it('creates Quick Chat window if it does not exist', () => {
            quickChatWindow.showAndFocus();
            expect((BrowserWindow as any)._instances.length).toBe(1);
        });

        it('repositions and shows existing window', () => {
            const win = quickChatWindow.create();
            win.setPosition = vi.fn();

            quickChatWindow.showAndFocus();

            expect(win.setPosition).toHaveBeenCalled();
            expect(win.show).toHaveBeenCalled();
            expect(win.focus).toHaveBeenCalled();
        });
    });

    describe('hide', () => {
        it('hides Quick Chat window when it exists and is not destroyed', () => {
            const win = quickChatWindow.create();
            win.isDestroyed = vi.fn().mockReturnValue(false);

            quickChatWindow.hide();
            expect(win.hide).toHaveBeenCalled();
        });

        it('does nothing when Quick Chat window does not exist', () => {
            expect(() => quickChatWindow.hide()).not.toThrow();
        });

        it('does nothing when Quick Chat window is destroyed', () => {
            const win = quickChatWindow.create();
            win.isDestroyed = vi.fn().mockReturnValue(true);

            quickChatWindow.hide();
            expect(win.hide).not.toHaveBeenCalled();
        });
    });

    describe('toggle', () => {
        it('shows Quick Chat when window does not exist', () => {
            quickChatWindow.toggle();
            expect((BrowserWindow as any)._instances.length).toBe(1);
        });

        it('hides Quick Chat when window is visible', () => {
            const win = quickChatWindow.create();
            win.isVisible = vi.fn().mockReturnValue(true);
            win.isDestroyed = vi.fn().mockReturnValue(false);

            quickChatWindow.toggle();
            expect(win.hide).toHaveBeenCalled();
        });

        it('shows Quick Chat when window exists but is hidden', () => {
            const win = quickChatWindow.create();
            win.isVisible = vi.fn().mockReturnValue(false);
            win.setPosition = vi.fn();

            quickChatWindow.toggle();
            expect(win.show).toHaveBeenCalled();
        });
    });

    describe('getWindow', () => {
        it('returns null when no Quick Chat window exists', () => {
            expect(quickChatWindow.getWindow()).toBeNull();
        });

        it('returns the Quick Chat window when it exists', () => {
            quickChatWindow.create();
            expect(quickChatWindow.getWindow()).not.toBeNull();
        });
    });
});







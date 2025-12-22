/**
 * Unit tests for OptionsWindow.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow } from 'electron';
import OptionsWindow from './optionsWindow';

vi.mock('../utils/paths', async (importOriginal) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actual = await importOriginal<any>();
    return {
        ...actual,
        getIconPath: vi.fn().mockReturnValue('/mock/icon/path.png'),
    };
});

describe('OptionsWindow', () => {
    let optionsWindow: OptionsWindow;

    beforeEach(() => {
        vi.clearAllMocks();
        (BrowserWindow as any)._reset();
        optionsWindow = new OptionsWindow(false);
    });

    describe('create', () => {
        it('creates a new options window', () => {
            const win = optionsWindow.create();
            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win).toBeDefined();
            expect(win.options).toMatchObject({
                width: 600,
                height: 400,
            });
        });

        it('returns existing options window if open', () => {
            const win1 = optionsWindow.create();
            const win2 = optionsWindow.create();
            expect((BrowserWindow as any)._instances.length).toBe(1);
            expect(win1).toBe(win2);
            expect(win1.focus).toHaveBeenCalled();
        });

        it('loads options.html in dev mode', () => {
            const devWindow = new OptionsWindow(true);
            const win = devWindow.create();
            expect(win.loadURL).toHaveBeenCalledWith('http://localhost:1420/options.html');
        });

        it('loads options.html in prod mode', () => {
            const win = optionsWindow.create();
            expect(win.loadFile).toHaveBeenCalledWith(
                expect.stringContaining('options.html'),
                expect.objectContaining({ hash: undefined })
            );
        });

        it('shows window when ready-to-show is emitted', () => {
            const win = optionsWindow.create();
            const readyHandler = win.once.mock.calls.find((call: any) => call[0] === 'ready-to-show')[1];
            readyHandler();

            expect(win.show).toHaveBeenCalled();
        });

        it('clears reference when options window is closed', () => {
            optionsWindow.create();
            const instances = (BrowserWindow as any).getAllWindows();
            const win = instances[0];

            const closeHandler = win.on.mock.calls.find((call: any) => call[0] === 'closed')[1];
            closeHandler();

            expect(optionsWindow.getWindow()).toBeNull();
        });
    });

    describe('create with tab', () => {
        it('passes settings tab hash in dev mode', () => {
            const devWindow = new OptionsWindow(true);
            const win = devWindow.create('settings');
            expect(win.loadURL).toHaveBeenCalledWith('http://localhost:1420/options.html#settings');
        });

        it('passes about tab hash in prod mode', () => {
            const win = optionsWindow.create('about');
            expect(win.loadFile).toHaveBeenCalledWith(
                expect.stringContaining('options.html'),
                expect.objectContaining({ hash: 'about' })
            );
        });

        it('navigates existing window to new tab', () => {
            const win1 = optionsWindow.create();
            win1.webContents.getURL = vi.fn().mockReturnValue('http://localhost:1420/options.html');

            const win2 = optionsWindow.create('settings');

            expect(win1).toBe(win2);
            expect(win1.loadURL).toHaveBeenCalledWith('http://localhost:1420/options.html#settings');
        });
    });

    describe('getWindow', () => {
        it('returns null when no window exists', () => {
            expect(optionsWindow.getWindow()).toBeNull();
        });

        it('returns the window when it exists', () => {
            optionsWindow.create();
            expect(optionsWindow.getWindow()).not.toBeNull();
        });
    });

    describe('close', () => {
        it('closes the window if it exists', () => {
            const win = optionsWindow.create();
            optionsWindow.close();
            expect(win.close).toHaveBeenCalled();
        });

        it('does nothing when window does not exist', () => {
            expect(() => optionsWindow.close()).not.toThrow();
        });
    });
});

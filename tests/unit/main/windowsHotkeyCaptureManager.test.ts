import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockHotkeyManager } from '../../helpers/mocks';
import { WindowsHotkeyCaptureManager } from '../../../src/main/managers/windowsHotkeyCaptureManager';

const createMockWindow = () => {
    const webContentsListeners = new Map<string, (...args: unknown[]) => void>();
    const windowListeners = new Map<string, (...args: unknown[]) => void>();

    const win = {
        id: 7,
        isDestroyed: vi.fn().mockReturnValue(false),
        getPosition: vi.fn().mockReturnValue([100, 101]),
        webContents: {
            on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
                webContentsListeners.set(event, handler);
            }),
        },
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
            windowListeners.set(event, handler);
        }),
    };

    return {
        win,
        getWebContentsListener: (event: string) => webContentsListeners.get(event),
        getWindowListener: (event: string) => windowListeners.get(event),
    };
};

describe('WindowsHotkeyCaptureManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('attaches before-input-event and system-context-menu listeners on Windows', () => {
        const hotkeyManager = createMockHotkeyManager();
        const manager = new WindowsHotkeyCaptureManager(hotkeyManager as never, 'win32');
        const { win } = createMockWindow();

        manager.attachWindow(win as never);

        expect(win.webContents.on).toHaveBeenCalledWith('before-input-event', expect.any(Function));
        expect(win.on).toHaveBeenCalledWith('system-context-menu', expect.any(Function));
        expect(win.on).toHaveBeenCalledWith('closed', expect.any(Function));
    });

    it('captures Alt+Space from keyboard corroboration plus system-context-menu', async () => {
        const hotkeyManager = createMockHotkeyManager();
        const manager = new WindowsHotkeyCaptureManager(hotkeyManager as never, 'win32');
        const { win, getWebContentsListener, getWindowListener } = createMockWindow();
        manager.attachWindow(win as never);

        const capturePromise = manager.beginCapture(win.id);
        const beforeInputEvent = getWebContentsListener('before-input-event');
        const systemContextMenu = getWindowListener('system-context-menu');
        const preventDefault = vi.fn();

        beforeInputEvent?.(
            { preventDefault: vi.fn() },
            {
                type: 'keyDown',
                key: 'Alt',
                code: 'AltLeft',
                alt: true,
                control: false,
                shift: false,
                meta: false,
                isAutoRepeat: false,
            }
        );

        systemContextMenu?.({ preventDefault }, { x: 100, y: 100 });

        await expect(capturePromise).resolves.toEqual({
            status: 'captured',
            accelerator: 'Alt+Space',
        });
        expect(preventDefault).toHaveBeenCalledTimes(1);
    });

    it('does not suppress the Windows system menu without keyboard corroboration during global Alt+Space registration', () => {
        const hotkeyManager = createMockHotkeyManager({
            ownsRegisteredGlobalAccelerator: vi.fn().mockReturnValue(true),
        });
        const manager = new WindowsHotkeyCaptureManager(hotkeyManager as never, 'win32');
        const { win, getWindowListener } = createMockWindow();
        manager.attachWindow(win as never);

        const preventDefault = vi.fn();
        getWindowListener('system-context-menu')?.({ preventDefault }, { x: 100, y: 100 });

        expect(preventDefault).not.toHaveBeenCalled();
    });

    it('does not suppress mouse-triggered system menus just because Alt+Space is registered', () => {
        const hotkeyManager = createMockHotkeyManager({
            ownsRegisteredGlobalAccelerator: vi.fn().mockReturnValue(true),
        });
        const manager = new WindowsHotkeyCaptureManager(hotkeyManager as never, 'win32');
        const { win, getWindowListener } = createMockWindow();
        manager.attachWindow(win as never);

        const preventDefault = vi.fn();
        getWindowListener('system-context-menu')?.({ preventDefault }, { x: 180, y: 220 });

        expect(preventDefault).not.toHaveBeenCalled();
    });

    it('suppresses keyboard-triggered system menu when Alt+Space is registered globally', () => {
        const hotkeyManager = createMockHotkeyManager({
            ownsRegisteredGlobalAccelerator: vi.fn().mockReturnValue(true),
        });
        const manager = new WindowsHotkeyCaptureManager(hotkeyManager as never, 'win32');
        const { win, getWebContentsListener, getWindowListener } = createMockWindow();
        manager.attachWindow(win as never);

        getWebContentsListener('before-input-event')?.(
            { preventDefault: vi.fn() },
            {
                type: 'keyDown',
                key: 'Alt',
                code: 'AltLeft',
                alt: true,
                control: false,
                shift: false,
                meta: false,
                isAutoRepeat: false,
            }
        );

        const preventDefault = vi.fn();
        getWindowListener('system-context-menu')?.({ preventDefault }, { x: 100, y: 100 });

        expect(preventDefault).toHaveBeenCalledTimes(1);
    });
});

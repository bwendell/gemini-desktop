import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BrowserWindowConstructorOptions } from 'electron';

import BaseWindow from '../../../../src/main/windows/baseWindow';
import { IPC_CHANNELS } from '../../../../src/shared/constants/ipc-channels';
import { restorePlatform, stubPlatform } from '../../../helpers/harness/platform';
import { createMockWebContents } from '../../../helpers/mocks';

type WindowEventWithPreventDefault = {
    preventDefault: ReturnType<typeof vi.fn>;
};

type BeforeInputEvent = {
    key: string;
    type: string;
};

type WindowListener = (...args: unknown[]) => void;
type MockWindowInstance = {
    webContents: ReturnType<typeof createMockWebContents>;
    loadURL: ReturnType<typeof vi.fn>;
    loadFile: ReturnType<typeof vi.fn>;
    focus: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    show: ReturnType<typeof vi.fn>;
    hide: ReturnType<typeof vi.fn>;
    isDestroyed: ReturnType<typeof vi.fn>;
    on: ReturnType<typeof vi.fn>;
    _listeners: Map<string, WindowListener>;
};

const { MockBrowserWindow } = vi.hoisted(() => {
    class MockBrowserWindow {
        static _instances: MockWindowInstance[] = [];

        webContents: ReturnType<typeof createMockWebContents>;
        loadURL = vi.fn();
        loadFile = vi.fn();
        focus = vi.fn();
        close = vi.fn();
        show = vi.fn();
        hide = vi.fn();
        isDestroyed = vi.fn().mockReturnValue(false);
        on = vi.fn((event: string, handler: WindowListener) => {
            this._listeners.set(event, handler);
        });
        _listeners = new Map<string, WindowListener>();

        constructor() {
            this.webContents = createMockWebContents();
            MockBrowserWindow._instances.push(this as unknown as MockWindowInstance);
        }

        static _reset() {
            MockBrowserWindow._instances = [];
        }
    }

    return { MockBrowserWindow };
});

vi.mock('electron', () => ({
    BrowserWindow: MockBrowserWindow,
}));

class TestWindow extends BaseWindow {
    protected readonly windowConfig: BrowserWindowConstructorOptions = {
        width: 800,
        height: 600,
        webPreferences: {},
    };

    protected readonly htmlFile = 'test.html';

    constructor(isDev: boolean) {
        super(isDev, '[TestWindow]');
    }

    public createForTest() {
        return this.createWindow();
    }
}

describe('BaseWindow Windows Alt+Space handling', () => {
    let testWindow: TestWindow;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        MockBrowserWindow._reset();
        testWindow = new TestWindow(false);
    });

    afterEach(() => {
        restorePlatform();
        vi.useRealTimers();
    });

    const getWindowInstance = () => testWindow.getWindow() as unknown as MockWindowInstance;

    const getBeforeInputHandler = () => {
        const webContentsOnCalls = vi.mocked(getWindowInstance().webContents.on).mock.calls as Array<[string, unknown]>;
        const handler = webContentsOnCalls.find(([eventName]) => eventName === 'before-input-event')?.[1];
        return handler as ((event: WindowEventWithPreventDefault, input: BeforeInputEvent) => void) | undefined;
    };

    const getSystemContextMenuHandler = () => {
        const handler = getWindowInstance()._listeners.get('system-context-menu');
        return handler as ((event: WindowEventWithPreventDefault) => void) | undefined;
    };

    const createEvent = (): WindowEventWithPreventDefault => ({
        preventDefault: vi.fn(),
    });

    it('registers before-input-event and system-context-menu handlers on Windows', () => {
        stubPlatform('win32');

        testWindow.createForTest();

        expect(getBeforeInputHandler()).toEqual(expect.any(Function));
        expect(getSystemContextMenuHandler()).toEqual(expect.any(Function));
    });

    it('does not register Windows-only handlers on non-win32 platforms', () => {
        stubPlatform('linux');

        testWindow.createForTest();

        expect(getBeforeInputHandler()).toBeUndefined();
        expect(getSystemContextMenuHandler()).toBeUndefined();
    });

    it('suppresses system context menu and sends Alt+Space when Alt was recently pressed', () => {
        stubPlatform('win32');
        testWindow.createForTest();

        const beforeInputHandler = getBeforeInputHandler()!;
        const systemContextMenuHandler = getSystemContextMenuHandler()!;

        beforeInputHandler(createEvent(), { key: 'Alt', type: 'keyDown' });

        const systemContextMenuEvent = createEvent();
        systemContextMenuHandler(systemContextMenuEvent);

        expect(systemContextMenuEvent.preventDefault).toHaveBeenCalledOnce();
        expect(getWindowInstance().webContents.send).toHaveBeenCalledWith(
            IPC_CHANNELS.HOTKEY_RECORDER_KEY_CAPTURED,
            'Alt+Space'
        );
    });

    it('does not suppress system context menu without a recent Alt press', () => {
        stubPlatform('win32');
        testWindow.createForTest();

        const systemContextMenuHandler = getSystemContextMenuHandler()!;
        const systemContextMenuEvent = createEvent();

        systemContextMenuHandler(systemContextMenuEvent);

        expect(systemContextMenuEvent.preventDefault).not.toHaveBeenCalled();
        expect(getWindowInstance().webContents.send).not.toHaveBeenCalled();
    });

    it('resets Alt tracking on Alt keyUp', () => {
        stubPlatform('win32');
        testWindow.createForTest();

        const beforeInputHandler = getBeforeInputHandler()!;
        const systemContextMenuHandler = getSystemContextMenuHandler()!;

        beforeInputHandler(createEvent(), { key: 'Alt', type: 'keyDown' });
        beforeInputHandler(createEvent(), { key: 'Alt', type: 'keyUp' });

        const systemContextMenuEvent = createEvent();
        systemContextMenuHandler(systemContextMenuEvent);

        expect(systemContextMenuEvent.preventDefault).not.toHaveBeenCalled();
        expect(getWindowInstance().webContents.send).not.toHaveBeenCalled();
    });

    it('does not suppress system context menu when Alt press is stale', () => {
        stubPlatform('win32');
        testWindow.createForTest();

        const beforeInputHandler = getBeforeInputHandler()!;
        const systemContextMenuHandler = getSystemContextMenuHandler()!;

        beforeInputHandler(createEvent(), { key: 'Alt', type: 'keyDown' });
        vi.advanceTimersByTime(1001);

        const systemContextMenuEvent = createEvent();
        systemContextMenuHandler(systemContextMenuEvent);

        expect(systemContextMenuEvent.preventDefault).not.toHaveBeenCalled();
        expect(getWindowInstance().webContents.send).not.toHaveBeenCalled();
    });
});

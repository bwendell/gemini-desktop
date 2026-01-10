/**
 * Unit tests for MainWindow navigation logic.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import MainWindow from '../../../../src/main/windows/mainWindow';
import { BrowserWindow } from 'electron';

// Mock Electron
vi.mock('electron', () => ({
    BrowserWindow: vi.fn(),
    app: {
        isPackaged: false,
        getAppPath: vi.fn().mockReturnValue('/app'),
    },
    shell: {
        openExternal: vi.fn(),
    },
    session: {
        defaultSession: {
            webRequest: {
                onCompleted: vi.fn(),
            },
        },
    },
}));

// Mock store
vi.mock('../../../../src/main/store', () => ({
    store: {
        get: vi.fn(),
        set: vi.fn(),
    },
}));

describe('MainWindow Navigation', () => {
    let mainWindow: MainWindow;
    let mockWebContents: any;
    let navigationHandler: (event: any, url: string) => void;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock webContents
        mockWebContents = {
            on: vi.fn((event, handler) => {
                if (event === 'will-navigate') {
                    navigationHandler = handler;
                }
            }),
            once: vi.fn(),
            loadURL: vi.fn(),
            loadFile: vi.fn(),
            setWindowOpenHandler: vi.fn(),
            send: vi.fn(),
            session: {
                webRequest: {
                    onHeadersReceived: vi.fn(),
                },
            },
        };

        // Setup mock BrowserWindow
        (BrowserWindow as unknown as Mock).mockImplementation(function () {
            return {
                webContents: mockWebContents,
                on: vi.fn(),
                once: vi.fn(),
                loadURL: vi.fn(),
                loadFile: vi.fn(),
                show: vi.fn(),
                hide: vi.fn(),
                close: vi.fn(),
                isDestroyed: vi.fn().mockReturnValue(false),
            };
        });

        // Initialize window
        mainWindow = new MainWindow();
        mainWindow.create();
    });

    const simulateNavigation = (url: string) => {
        const event = { preventDefault: vi.fn() };
        navigationHandler(event, url);
        return event;
    };

    it('allows navigation to localhost', () => {
        const event = simulateNavigation('http://localhost:1420/');
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('allows navigation to 127.0.0.1', () => {
        const event = simulateNavigation('http://127.0.0.1:1420/');
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('allows navigation to internal google domains', () => {
        const event = simulateNavigation('https://gemini.google.com/app');
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('allows navigation to accounts.google.com', () => {
        const event = simulateNavigation('https://accounts.google.com/signin');
        expect(event.preventDefault).not.toHaveBeenCalled();
    });

    it('blocks navigation to external domains', () => {
        const event = simulateNavigation('https://example.com');
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('blocks navigation to miscellaneous sites', () => {
        const event = simulateNavigation('https://malicious-site.com');
        expect(event.preventDefault).toHaveBeenCalled();
    });

    it('allows navigation to local files', () => {
        const event = simulateNavigation('file:///app/index.html');
        expect(event.preventDefault).not.toHaveBeenCalled();
    });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockApp, mockSession, mockBrowserWindow } = vi.hoisted(() => {
    const mockApp = {
        commandLine: {
            appendSwitch: vi.fn(),
            hasSwitch: vi.fn().mockReturnValue(false),
        },
        isPackaged: false,
        isReady: vi.fn().mockReturnValue(true),
        on: vi.fn(),
        whenReady: vi.fn().mockResolvedValue(undefined),
        requestSingleInstanceLock: vi.fn().mockReturnValue(true),
        exit: vi.fn(),
        quit: vi.fn(),
        setName: vi.fn(),
        setAppUserModelId: vi.fn(),
        setPath: vi.fn(),
        getPath: vi.fn().mockReturnValue('/mock/userData'),
        getVersion: vi.fn().mockReturnValue('1.0.0'),
    };

    const mockSession = {
        defaultSession: {
            webRequest: {
                onHeadersReceived: vi.fn(),
                onBeforeSendHeaders: vi.fn(),
                onCompleted: vi.fn(),
            },
        },
    };

    const mockBrowserWindow = {
        getAllWindows: vi.fn().mockReturnValue([]),
    };

    return { mockApp, mockSession, mockBrowserWindow };
});

vi.mock('electron', () => ({
    app: mockApp,
    session: mockSession,
    BrowserWindow: mockBrowserWindow,
    crashReporter: {
        start: vi.fn(),
    },
}));

vi.mock('../../../src/main/utils/logger');

const mockWaylandStatus = {
    isWayland: true,
    desktopEnvironment: 'kde' as const,
    deVersion: '6',
    portalAvailable: true,
    portalMethod: 'none' as const,
};

vi.mock('../../../src/main/utils/constants', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../src/main/utils/constants')>();
    return {
        ...actual,
        isLinux: true,
        isWindows: false,
        getWaylandPlatformStatus: vi.fn().mockReturnValue(mockWaylandStatus),
    };
});

vi.mock('../../../src/main/utils/paths', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../../src/main/utils/paths')>();
    return {
        ...actual,
        getDistHtmlPath: vi.fn().mockReturnValue('/mock/dist/index.html'),
        getIconPath: vi.fn().mockReturnValue('/mock/icon.png'),
    };
});

vi.mock('fs', () => ({
    existsSync: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../src/main/utils/security', () => ({
    setupHeaderStripping: vi.fn(),
    setupWebviewSecurity: vi.fn(),
    setupMediaPermissions: vi.fn(),
}));

vi.mock('../../../src/main/utils/sandboxInit', () => ({}));

vi.mock('../../../src/main/store', () => ({
    default: vi.fn(),
}));

vi.mock('../../../src/main/managers/windowManager', () => {
    return {
        default: class WindowManager {
            setQuitting = vi.fn();
            getMainWindow = vi.fn().mockReturnValue(null);
            getMainWindowInstance = vi.fn().mockReturnValue(null);
            createMainWindow = vi.fn();
            restoreFromTray = vi.fn();
            setAlwaysOnTop = vi.fn();
            isAlwaysOnTop = vi.fn().mockReturnValue(false);
            constructor() {
                return;
            }
        },
    };
});

vi.mock('../../../src/main/managers/ipcManager', () => {
    return {
        default: class IpcManager {
            setupIpcHandlers = vi.fn();
            setNotificationManager = vi.fn();
            initializeTextPrediction = vi.fn().mockResolvedValue(undefined);
            dispose = vi.fn();
            constructor() {
                return;
            }
        },
    };
});

vi.mock('../../../src/main/managers/hotkeyManager', () => {
    return {
        default: class HotkeyManager {
            registerShortcuts = vi.fn();
            unregisterAll = vi.fn();
            constructor() {
                return;
            }
        },
    };
});

vi.mock('../../../src/main/managers/trayManager', () => {
    return {
        default: class TrayManager {
            createTray = vi.fn();
            destroyTray = vi.fn();
            constructor() {
                return;
            }
        },
    };
});

vi.mock('../../../src/main/managers/badgeManager', () => {
    return {
        default: class BadgeManager {
            setMainWindow = vi.fn();
            constructor() {
                return;
            }
        },
    };
});

vi.mock('../../../src/main/managers/updateManager', () => {
    return {
        default: class UpdateManager {
            startPeriodicChecks = vi.fn();
            destroy = vi.fn();
            constructor() {
                return;
            }
        },
    };
});

vi.mock('../../../src/main/managers/exportManager', () => {
    return {
        default: class ExportManager {
            constructor() {
                return;
            }
        },
    };
});

vi.mock('../../../src/main/managers/llmManager', () => {
    return {
        default: class LlmManager {
            dispose = vi.fn();
            constructor() {
                return;
            }
        },
    };
});

vi.mock('../../../src/main/managers/notificationManager', () => {
    return {
        default: class NotificationManager {
            dispose = vi.fn();
            onResponseComplete = vi.fn();
            constructor() {
                return;
            }
        },
    };
});

vi.mock('../../../src/main/managers/menuManager', () => {
    return {
        default: class MenuManager {
            buildMenu = vi.fn();
            setupContextMenu = vi.fn();
            constructor() {
                return;
            }
        },
    };
});

describe('main.ts', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetModules();
    });

    it('queries Wayland platform status on startup', async () => {
        await import('../../../src/main/main');

        const constants = await import('../../../src/main/utils/constants');
        expect(vi.mocked(constants.getWaylandPlatformStatus)).toHaveBeenCalledTimes(1);
    });

    it('does not enable GlobalShortcutsPortal chromium flag', async () => {
        await import('../../../src/main/main');

        const appendCalls = vi.mocked(mockApp.commandLine.appendSwitch).mock.calls;
        const hasGlobalShortcutsPortal = appendCalls.some(
            ([flag, value]) => flag === 'enable-features' && value === 'GlobalShortcutsPortal'
        );
        expect(hasGlobalShortcutsPortal).toBe(false);
    });
});

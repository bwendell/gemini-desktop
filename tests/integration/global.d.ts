export {};

type ElectronExecute = {
    execute<R>(fn: (electron: typeof import('electron')) => R): Promise<R>;
    execute<R, A>(fn: (electron: typeof import('electron'), arg: A) => R, arg: A): Promise<R>;
    execute<R, T extends unknown[]>(fn: (...args: T) => R, ...args: T): Promise<R>;
};

declare global {
    namespace WebdriverIO {
        interface Browser {
            electron: {
                execute: ElectronExecute['execute'];
            };
        }
    }
}

declare global {
    interface Window {
        electronAPI?: {
            [key: string]: unknown;
            onToastShow?: (listener: (payload: unknown) => void) => () => void;
            onUpdateAvailable?: (listener: (payload: unknown) => void) => () => void;
            onUpdateDownloaded?: (listener: (payload: unknown) => void) => () => void;
            onUpdateError?: (listener: (message: string) => void) => () => void;
            devEmitUpdateEvent?: (eventName: string, payload: unknown) => void;
            devMockPlatform?: (platform: string, env: Record<string, string>) => void;
            getAutoUpdateEnabled?: () => boolean;
            setAutoUpdateEnabled?: (enabled: boolean) => void;
            checkForUpdates?: () => void;
            installUpdate?: () => void;
            devShowBadge?: (version: string) => void;
            devClearBadge?: () => void;
            getTrayTooltip?: () => string;
        };
        __testUpdateToast?: {
            showAvailable?: (version: string) => void;
            showDownloaded?: (version: string) => void;
            showError?: (message: string) => void;
            showProgress?: (percent: number) => void;
            showNotAvailable?: (version: string) => void;
            showManualAvailable?: (version: string) => void;
            hide?: () => void;
        };
        _toastCleanup?: () => void;
        _toastReceived?: unknown;
        _updateAvailablePromise?: Promise<unknown>;
        _updateDownloadedPromise?: Promise<unknown>;
        _updateErrorPromise?: Promise<string>;
        _updateAvailableReceived?: boolean;
        _updateDownloadedReceived?: boolean;
        _updateErrorReceived?: boolean;
        _updateAvailableCount?: number;
        _notAvailableReceived?: boolean;
        _notAvailableInfo?: unknown;
        _progressUpdates?: unknown[];
        _checkingPromise?: Promise<void>;
        _mainReceived?: unknown;
        _secondaryReceived?: unknown;
        _mainCleanup?: () => void;
        _secondaryCleanup?: () => void;
        _toastCleanupMain?: () => void;
        _toastCleanupSecondary?: () => void;
    }
}

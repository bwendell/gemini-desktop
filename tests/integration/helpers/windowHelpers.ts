import { browser } from '@wdio/globals';

import { waitForElectronState } from './waitAdapters';

type IntegrationBrowser = {
    waitUntil<T>(
        condition: () => Promise<T> | T,
        options?: { timeout?: number; timeoutMsg?: string; interval?: number }
    ): Promise<T>;
    electron: {
        execute<R, T extends unknown[]>(fn: (...args: T) => R, ...args: T): Promise<R>;
    };
};

const integrationBrowser = browser as unknown as IntegrationBrowser;

type GlobalWithAppContext = typeof globalThis & {
    appContext?: {
        windowManager?: {
            getMainWindow?: () => { isVisible: () => boolean } | null;
            createMainWindow?: () => void;
            restoreFromTray?: () => void;
            showQuickChat?: () => void;
            hideQuickChat?: () => void;
            getQuickChatWindow?: () => { isDestroyed: () => boolean; isVisible: () => boolean } | null;
        };
    };
};

export async function ensureMainWindowVisible(): Promise<void> {
    await integrationBrowser.electron.execute(() => {
        const globalWithApp = global as GlobalWithAppContext;
        const windowManager = globalWithApp.appContext?.windowManager;
        if (!windowManager) {
            return;
        }

        if (!windowManager.getMainWindow?.()) {
            windowManager.createMainWindow?.();
        }
        windowManager.restoreFromTray?.();
    });

    await waitForElectronState(
        () => {
            const globalWithApp = global as GlobalWithAppContext;
            const win = globalWithApp.appContext?.windowManager?.getMainWindow?.();
            return Boolean(win && win.isVisible());
        },
        { timeout: 5000, timeoutMsg: 'Main window did not become visible' }
    );
}

export async function waitForMainWindowHidden(timeout = 5000): Promise<void> {
    await waitForElectronState(
        () => {
            const globalWithApp = global as GlobalWithAppContext;
            const win = globalWithApp.appContext?.windowManager?.getMainWindow?.();
            return Boolean(win && !win.isVisible());
        },
        { timeout, timeoutMsg: 'Main window did not hide' }
    );
}

export async function waitForMainWindowVisible(timeout = 5000): Promise<void> {
    await waitForElectronState(
        () => {
            const globalWithApp = global as GlobalWithAppContext;
            const win = globalWithApp.appContext?.windowManager?.getMainWindow?.();
            return Boolean(win && win.isVisible());
        },
        { timeout, timeoutMsg: 'Main window did not become visible' }
    );
}

export async function showQuickChat(timeout = 5000): Promise<void> {
    await integrationBrowser.electron.execute(() => {
        const globalWithApp = global as GlobalWithAppContext;
        globalWithApp.appContext?.windowManager?.showQuickChat?.();
    });

    await waitForElectronState(
        () => {
            const globalWithApp = global as GlobalWithAppContext;
            const win = globalWithApp.appContext?.windowManager?.getQuickChatWindow?.();
            return Boolean(win && !win.isDestroyed() && win.isVisible());
        },
        { timeout, timeoutMsg: 'Quick Chat window did not appear' }
    );
}

export async function hideQuickChat(timeout = 5000): Promise<void> {
    await integrationBrowser.electron.execute(() => {
        const globalWithApp = global as GlobalWithAppContext;
        globalWithApp.appContext?.windowManager?.hideQuickChat?.();
    });

    await waitForElectronState(
        () => {
            const globalWithApp = global as GlobalWithAppContext;
            const win = globalWithApp.appContext?.windowManager?.getQuickChatWindow?.();
            return Boolean(!win || win.isDestroyed() || !win.isVisible());
        },
        { timeout, timeoutMsg: 'Quick Chat window did not hide' }
    );
}

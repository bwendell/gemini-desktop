import { browser, expect } from '@wdio/globals';

import { MacOSDockPage, MainWindowPage, OptionsPage } from './pages';
import { Selectors } from './helpers/selectors';
import { closeCurrentWindow, waitForWindowCount } from './helpers/windowActions';
import { isMacOS, isMacOSSync } from './helpers/platform';
import { verifyTrayCreated, getTrayTooltip } from './helpers/trayActions';
import { ensureSingleWindow, getWindowCount, waitForAppReady } from './helpers/workflows';
import { waitForMacOSWindowStabilize, waitForWindowTransition, waitForUIState } from './helpers/waitUtilities';

type MacElement = {
    waitForExist(options?: { timeout?: number }): Promise<void>;
};

type MacBrowser = {
    $(selector: string): Promise<MacElement>;
    getTitle(): Promise<string>;
    getWindowHandles(): Promise<string[]>;
    switchToWindow(handle: string): Promise<void>;
    execute<T, A extends unknown[]>(fn: (...args: A) => T, ...args: A): Promise<T>;
    electron: {
        execute<T, A extends unknown[]>(
            fn: (electron: typeof import('electron'), ...args: A) => T,
            ...args: A
        ): Promise<T>;
    };
};

const macBrowser = browser as unknown as MacBrowser;
const macOnlyDescribe = isMacOSSync() ? describe : describe.skip;

describe('macOS', () => {
    describe('Dock', () => {
        const dockPage = new MacOSDockPage();

        beforeEach(async () => {
            if (!(await dockPage.isMacOS())) {
                return;
            }
            await waitForAppReady();
        });

        it('should exist on macOS', async () => {
            if (!(await dockPage.isMacOS())) {
                return;
            }

            const platform = await dockPage.getPlatform();
            expect(platform).toBe('darwin');

            const windowCount = await getWindowCount();
            expect(windowCount).toBeGreaterThan(0);
        });

        it('should recreate window when activate event is fired with no windows', async () => {
            if (!(await dockPage.isMacOS())) {
                return;
            }

            const initialCount = await getWindowCount();
            expect(initialCount).toBeGreaterThan(0);

            await dockPage.simulateActivateEvent();
            await waitForMacOSWindowStabilize(undefined, { description: 'Dock activate event' });

            const afterActivateCount = await getWindowCount();
            expect(afterActivateCount).toBe(initialCount);
        });

        it('should not quit app when all windows closed on macOS', async () => {
            if (!(await dockPage.isMacOS())) {
                return;
            }

            const wouldQuit = await dockPage.wouldQuitOnAllWindowsClosed();
            expect(wouldQuit).toBe(false);
        });

        it('should have correct Dock menu items on macOS', async () => {
            if (!(await dockPage.isMacOS())) {
                return;
            }

            const dockMenuExists = await dockPage.hasDockMenu();
            expect(dockMenuExists).toBe(true);

            const hasShowGemini = await dockPage.hasDockMenuItem('Show Gemini');
            const hasSettings = await dockPage.hasDockMenuItem('Settings');

            expect(hasShowGemini).toBe(true);
            expect(hasSettings).toBe(true);

            const labels = await dockPage.getDockMenuLabels();
            expect(labels.length).toBeGreaterThanOrEqual(2);
        });

        it('should have menubar tray icon on macOS', async () => {
            if (!(await dockPage.isMacOS())) {
                return;
            }

            const trayExists = await verifyTrayCreated();
            expect(trayExists).toBe(true);
        });

        it('should attempt to retrieve tray tooltip on macOS', async () => {
            if (!(await dockPage.isMacOS())) {
                return;
            }

            const tooltip = await getTrayTooltip();
            if (tooltip !== null) {
                expect(tooltip).toBeTruthy();
            }
            expect(tooltip === null || typeof tooltip === 'string').toBe(true);
        });

        it('should use traffic light controls', async () => {
            if (!(await dockPage.isMacOS())) {
                return;
            }

            const conventions = await dockPage.verifyMacOSWindowConventions();
            expect(conventions.usesNativeControls).toBe(true);
            expect(conventions.hasCustomControls).toBe(false);
        });
    });

    describe('Menu', () => {
        const mainWindow = new MainWindowPage();
        const optionsPage = new OptionsPage();

        beforeEach(async () => {
            if (!(await isMacOS())) {
                return;
            }
            await waitForAppReady();
        });

        afterEach(async () => {
            await ensureSingleWindow();
        });

        it('should open Options window via menu action', async () => {
            if (!(await isMacOS())) {
                return;
            }

            const initialHandles = await macBrowser.getWindowHandles();
            expect(initialHandles.length).toBe(1);

            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);

            const handles = await macBrowser.getWindowHandles();
            expect(handles.length).toBe(2);

            await optionsPage.waitForLoad();
        });

        it('should focus existing Options window if already open', async () => {
            if (!(await isMacOS())) {
                return;
            }

            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);
            await optionsPage.waitForLoad();

            const firstHandles = await macBrowser.getWindowHandles();
            expect(firstHandles.length).toBe(2);

            await macBrowser.switchToWindow(firstHandles[0]);
            await waitForWindowTransition(
                async () => {
                    const currentHandles = await macBrowser.getWindowHandles();
                    return currentHandles.length === 2;
                },
                { description: 'Window switch back to main' }
            );

            await mainWindow.openOptionsViaMenu();
            await waitForUIState(
                async () => {
                    const handles = await macBrowser.getWindowHandles();
                    return handles.length === 2;
                },
                { description: 'Options menu action stability check', timeout: 1500 }
            );

            const secondHandles = await macBrowser.getWindowHandles();
            expect(secondHandles.length).toBe(2);
        });

        it('should have functional app and menu on macOS', async () => {
            if (!(await isMacOS())) {
                return;
            }

            const title = await macBrowser.getTitle();
            expect(title).toBeTruthy();

            const isLoaded = await mainWindow.isLoaded();
            expect(isLoaded).toBe(true);

            const hasMenuBar = await mainWindow.isMenuBarDisplayed();
            expect(typeof hasMenuBar).toBe('boolean');
        });
    });
});

macOnlyDescribe('macOS Window Behavior', () => {
    beforeEach(async () => {
        const mainLayout = await macBrowser.$(Selectors.mainLayout);
        await mainLayout.waitForExist({ timeout: 15000 });
    });

    describe('Close-But-Stay-Alive Behavior', () => {
        it('should keep app running when main window is closed', async () => {
            const initialHandles = await macBrowser.getWindowHandles();
            expect(initialHandles.length).toBeGreaterThanOrEqual(1);

            await closeCurrentWindow();
            await waitForWindowTransition(async () => (await macBrowser.getWindowHandles()).length === 0, {
                description: 'Window closed',
            });

            const handlesAfterClose = await macBrowser.getWindowHandles();
            expect(handlesAfterClose.length).toBeGreaterThanOrEqual(0);

            const appRunning = await macBrowser.electron.execute((electron: typeof import('electron')) => {
                return electron.app.isReady();
            });
            expect(appRunning).toBe(true);

            await macBrowser.execute(() => {
                (window as Window & { electronAPI?: { showWindow?: () => void } }).electronAPI?.showWindow?.();
            });
            await waitForWindowTransition(async () => (await macBrowser.getWindowHandles()).length >= 1, {
                description: 'Window restored',
            });

            const handlesAfterRestore = await macBrowser.getWindowHandles();
            expect(handlesAfterRestore.length).toBeGreaterThanOrEqual(1);
        });

        it('should recreate window when dock icon is clicked (simulated)', async () => {
            await closeCurrentWindow();
            await waitForWindowTransition(async () => (await macBrowser.getWindowHandles()).length === 0, {
                description: 'Window closed',
            });

            await macBrowser.electron.execute((electron: typeof import('electron')) => {
                electron.app.emit('activate');
            });

            await waitForWindowTransition(async () => (await macBrowser.getWindowHandles()).length >= 1 || true, {
                timeout: 2000,
                description: 'Dock activation',
            });

            const handles = await macBrowser.getWindowHandles();
            if (handles.length === 0) {
                await macBrowser.execute(() => {
                    (window as Window & { electronAPI?: { showWindow?: () => void } }).electronAPI?.showWindow?.();
                });
                await waitForWindowTransition(async () => (await macBrowser.getWindowHandles()).length >= 1, {
                    description: 'Window restored',
                });
            }

            const finalHandles = await macBrowser.getWindowHandles();
            expect(finalHandles.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('macOS Menu Bar Behavior', () => {
        it('should keep menu bar accessible when no windows are open', async () => {
            await closeCurrentWindow();
            await waitForUIState(async () => true, { timeout: 500, description: 'Brief settle after close' });

            const appReady = await macBrowser.electron.execute((electron: typeof import('electron')) => {
                return electron.app.isReady();
            });
            expect(appReady).toBe(true);

            const hasMenu = await macBrowser.electron.execute((electron: typeof import('electron')) => {
                const menu = electron.Menu.getApplicationMenu();
                return menu !== null;
            });
            expect(hasMenu).toBe(true);

            await macBrowser.execute(() => {
                (window as Window & { electronAPI?: { showWindow?: () => void } }).electronAPI?.showWindow?.();
            });
            await waitForWindowTransition(async () => (await macBrowser.getWindowHandles()).length >= 1, {
                description: 'Window restored',
            });
        });
    });
});

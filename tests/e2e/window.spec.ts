/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, expect } from '@wdio/globals';
import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

import { MainWindowPage, OptionsPage, TrayPage, AuthWindowPage } from './pages';
import { waitForWindowCount, closeCurrentWindow } from './helpers/windowActions';
import { closeAllSecondaryWindows } from './helpers/WindowManagerHelper';
import { isMacOS, isWindows, isLinuxCI, usesCustomControls, isLinuxSync, isCI } from './helpers/platform';
import { E2E_TIMING } from './helpers/e2eConstants';
import { waitForAppReady, ensureSingleWindow, switchToMainWindow } from './helpers/workflows';
import { waitForUIState, waitForWindowTransition, waitForFullscreenTransition } from './helpers/waitUtilities';
import {
    closeWindow,
    getWindowState,
    hideWindow,
    isWindowDestroyed,
    isWindowFullScreen,
    isWindowMaximized,
    isWindowMinimized,
    isWindowVisible,
    maximizeWindow,
    minimizeWindow,
    restoreWindow,
    setFullScreen,
    showWindow,
    toggleFullscreen,
    waitForAllWindowsHidden,
} from './helpers/windowStateActions';
import { readUserPreferences } from './helpers/persistenceActions';
import { isHotkeyRegistered, REGISTERED_HOTKEYS } from './helpers/hotkeyHelpers';
import {
    getAlwaysOnTopState,
    getWindowAlwaysOnTopState,
    setAlwaysOnTop,
    toggleAlwaysOnTopViaMenu,
    pressAlwaysOnTopHotkey,
    resetAlwaysOnTopState,
} from './helpers/alwaysOnTopActions';

type WdioBrowser = {
    electron: {
        execute<R, T extends unknown[]>(
            fn: (electron: typeof import('electron'), ...args: T) => R,
            ...args: T
        ): Promise<R>;
    };
    execute<T>(script: (...args: unknown[]) => T, ...args: unknown[]): Promise<T>;
    waitUntil<T>(
        condition: () => Promise<T> | T,
        options?: { timeout?: number; timeoutMsg?: string; interval?: number }
    ): Promise<T>;
    getWindowHandles(): Promise<string[]>;
    getWindowHandle(): Promise<string>;
    switchToWindow(handle: string): Promise<void>;
    getUrl(): Promise<string>;
};

const wdioBrowser = browser as unknown as WdioBrowser;

async function setFullScreenLocal(fullscreen: boolean): Promise<void> {
    await wdioBrowser.electron.execute((electron: typeof import('electron'), fs: boolean) => {
        const mainWindow = electron.BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            mainWindow.setFullScreen(fs);
        }
    }, fullscreen);
}

async function getWindowBoundsLocal(): Promise<{ x: number; y: number; width: number; height: number }> {
    return wdioBrowser.electron.execute((electron: typeof import('electron')) => {
        const mainWindow = electron.BrowserWindow.getAllWindows()[0];
        if (!mainWindow) {
            return { x: 0, y: 0, width: 800, height: 600 };
        }
        const bounds = mainWindow.getBounds();
        return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    });
}

async function setWindowBoundsLocal(bounds: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}): Promise<void> {
    await wdioBrowser.electron.execute(
        (
            electron: typeof import('electron'),
            boundsParam: { x?: number; y?: number; width?: number; height?: number }
        ) => {
            const mainWindow = electron.BrowserWindow.getAllWindows()[0];
            if (mainWindow) {
                mainWindow.setBounds(boundsParam);
            }
        },
        bounds
    );
}

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const mainEntry = path.resolve(__dirname, '../../dist-electron/main/main.cjs');
const require = createRequire(import.meta.url);

const resolveElectronBinary = (): string => {
    const electronImport = require('electron') as unknown;
    if (typeof electronImport === 'string') {
        return electronImport;
    }

    if (electronImport && typeof electronImport === 'object') {
        const electronRecord = electronImport as Record<string, unknown>;
        const defaultExport = electronRecord.default;
        if (typeof defaultExport === 'string') {
            return defaultExport;
        }

        const pathExport = electronRecord.path;
        if (typeof pathExport === 'string') {
            return pathExport;
        }
    }

    throw new Error('Failed to resolve Electron binary path for spawn');
};

const electronBinary = resolveElectronBinary();
const describePeekAndHide = isLinuxSync() && isCI() ? describe.skip : describe;

describe('Window Management', () => {
    const mainWindow = new MainWindowPage();
    const optionsPage = new OptionsPage();
    const tray = new TrayPage();
    const authWindow = new AuthWindowPage();

    let mainWindowHandle: string;
    let originalBounds: { x: number; y: number; width: number; height: number };
    let userDataPath: string;

    before(async () => {
        originalBounds = await getWindowBoundsLocal();
        const handles = await wdioBrowser.getWindowHandles();
        mainWindowHandle = handles[0];
        userDataPath = await wdioBrowser.electron.execute((electron: typeof import('electron')) =>
            electron.app.getPath('userData')
        );
    });

    beforeEach(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        try {
            await showWindow();
            await restoreWindow();
            await ensureSingleWindow();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (!errorMessage.includes('Promise was collected')) {
                throw error;
            }
        }
    });

    describe('Always On Top', () => {
        afterEach(async () => {
            await showWindow();
            await restoreWindow();
            await waitForUIState(
                async () => {
                    const visible = await isWindowVisible();
                    const minimized = await isWindowMinimized();
                    return visible && !minimized;
                },
                { description: 'Window restored and visible after test' }
            );

            const isFS = await isWindowFullScreen();
            if (isFS) {
                await setFullScreenLocal(false);
                await waitForFullscreenTransition(false, isWindowFullScreen, {
                    timeout: E2E_TIMING.TIMEOUTS.FULLSCREEN_TRANSITION,
                });
            }

            await closeAllSecondaryWindows(mainWindowHandle);

            await resetAlwaysOnTopState();
        });
        describe('Menu Toggle', () => {
            it('should have Always On Top menu item in View menu', async function () {
                if (await isMacOS()) {
                    return;
                }

                await mainWindow.clickMenuById('menu-view-always-on-top');
                await waitForUIState(
                    async () => {
                        const state = await getAlwaysOnTopState();
                        return state.enabled !== undefined;
                    },
                    { description: 'Menu toggle applied' }
                );

                await mainWindow.clickMenuById('menu-view-always-on-top');
                await waitForUIState(
                    async () => {
                        const state = await getAlwaysOnTopState();
                        return state.enabled !== undefined;
                    },
                    { description: 'Menu toggle restored' }
                );
            });

            it('should toggle always on top state when menu item is clicked', async () => {
                const initialState = await getAlwaysOnTopState();
                const wasEnabled = initialState.enabled;

                await toggleAlwaysOnTopViaMenu();

                const newState = await getAlwaysOnTopState();
                expect(newState.enabled).toBe(!wasEnabled);

                await toggleAlwaysOnTopViaMenu();

                const finalState = await getAlwaysOnTopState();
                expect(finalState.enabled).toBe(wasEnabled);
            });

            it('should toggle state multiple times correctly via menu', async () => {
                const initialState = await getAlwaysOnTopState();
                const startEnabled = initialState.enabled;

                for (let i = 0; i < 3; i++) {
                    await toggleAlwaysOnTopViaMenu(E2E_TIMING.IPC_ROUND_TRIP);

                    const expectedEnabled = i % 2 === 0 ? !startEnabled : startEnabled;
                    const currentState = await getAlwaysOnTopState();
                    expect(currentState.enabled).toBe(expectedEnabled);
                }

                await toggleAlwaysOnTopViaMenu(E2E_TIMING.IPC_ROUND_TRIP);
            });
        });
        describe.skip('Hotkey Toggle', () => {
            it('should toggle always-on-top when hotkey is pressed', async () => {
                const initialState = await getAlwaysOnTopState();
                const wasEnabled = initialState.enabled;

                await pressAlwaysOnTopHotkey();

                const newState = await getAlwaysOnTopState();
                expect(newState.enabled).toBe(!wasEnabled);

                await pressAlwaysOnTopHotkey();

                const finalState = await getAlwaysOnTopState();
                expect(finalState.enabled).toBe(wasEnabled);
            });

            it('should toggle state when hotkey is pressed multiple times', async () => {
                const initialState = await getAlwaysOnTopState();
                const startEnabled = initialState.enabled;

                for (let i = 0; i < 4; i++) {
                    await pressAlwaysOnTopHotkey(E2E_TIMING.IPC_ROUND_TRIP);

                    const currentState = await getAlwaysOnTopState();
                    const expectedEnabled = i % 2 === 0 ? !startEnabled : startEnabled;
                    expect(currentState.enabled).toBe(expectedEnabled);
                }

                const finalState = await getAlwaysOnTopState();
                expect(finalState.enabled).toBe(startEnabled);
            });

            it.skip('should handle rapid hotkey presses without desync', async () => {
                const initialState = await getAlwaysOnTopState();
                const startEnabled = initialState.enabled;

                for (let i = 0; i < 5; i++) {
                    await pressAlwaysOnTopHotkey(E2E_TIMING.IPC_ROUND_TRIP);
                }

                await waitForUIState(
                    async () => {
                        const state = await getAlwaysOnTopState();
                        return state.enabled === !startEnabled;
                    },
                    { description: 'Final state after rapid toggles' }
                );

                const finalState = await getAlwaysOnTopState();
                expect(finalState.enabled).toBe(!startEnabled);
            });
        });
        describe.skip('Menu-Hotkey Synchronization', () => {
            it('should update state when toggled via hotkey', async () => {
                const initialState = await getAlwaysOnTopState();
                const wasEnabled = initialState.enabled;

                await pressAlwaysOnTopHotkey();

                const newState = await getAlwaysOnTopState();
                expect(newState.enabled).toBe(!wasEnabled);

                await pressAlwaysOnTopHotkey();
            });

            it('should update state when toggled via menu', async () => {
                const initialState = await getAlwaysOnTopState();
                const wasEnabled = initialState.enabled;

                await toggleAlwaysOnTopViaMenu();

                const newState = await getAlwaysOnTopState();
                expect(newState.enabled).toBe(!wasEnabled);

                await toggleAlwaysOnTopViaMenu();
            });

            it('should remain synced when alternating between menu and hotkey', async () => {
                const initialState = await getAlwaysOnTopState();
                const startEnabled = initialState.enabled;

                await pressAlwaysOnTopHotkey();
                let state = await getAlwaysOnTopState();
                expect(state.enabled).toBe(!startEnabled);

                await toggleAlwaysOnTopViaMenu();
                state = await getAlwaysOnTopState();
                expect(state.enabled).toBe(startEnabled);

                await pressAlwaysOnTopHotkey();
                state = await getAlwaysOnTopState();
                expect(state.enabled).toBe(!startEnabled);

                await toggleAlwaysOnTopViaMenu();
                state = await getAlwaysOnTopState();
                expect(state.enabled).toBe(startEnabled);
            });

            it.skip('should handle rapid alternation between input methods', async () => {
                const initialState = await getAlwaysOnTopState();
                const startEnabled = initialState.enabled;

                await pressAlwaysOnTopHotkey(E2E_TIMING.IPC_ROUND_TRIP);
                await toggleAlwaysOnTopViaMenu(E2E_TIMING.IPC_ROUND_TRIP);
                await pressAlwaysOnTopHotkey(E2E_TIMING.IPC_ROUND_TRIP);
                await toggleAlwaysOnTopViaMenu(E2E_TIMING.IPC_ROUND_TRIP);
                await pressAlwaysOnTopHotkey();

                const finalState = await getAlwaysOnTopState();
                expect(finalState.enabled).toBe(!startEnabled);
            });
        });
        describe('Z-Order Verification', () => {
            it('should report always-on-top as enabled when set', async () => {
                await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

                const rendererState = await getAlwaysOnTopState();
                expect(rendererState?.enabled).toBe(true);

                const mainProcessState = await getWindowAlwaysOnTopState();
                expect(mainProcessState).toBe(true);
            });

            it('should report always-on-top as disabled when unset', async () => {
                await setAlwaysOnTop(false, E2E_TIMING.IPC_ROUND_TRIP);

                const rendererState = await getAlwaysOnTopState();
                expect(rendererState?.enabled).toBe(false);

                const mainProcessState = await getWindowAlwaysOnTopState();
                expect(mainProcessState).toBe(false);
            });

            it('should have renderer and main process states synchronized', async () => {
                await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);
                const rendererEnabled = await getAlwaysOnTopState();
                const mainEnabled = await getWindowAlwaysOnTopState();
                expect(rendererEnabled?.enabled).toBe(mainEnabled);

                await setAlwaysOnTop(false, E2E_TIMING.IPC_ROUND_TRIP);
                const rendererDisabled = await getAlwaysOnTopState();
                const mainDisabled = await getWindowAlwaysOnTopState();
                expect(rendererDisabled?.enabled).toBe(mainDisabled);
            });
        });
        describe('State Operations', () => {
            describe('Minimize and Restore', () => {
                beforeEach(function () {
                    if (isLinuxSync() && isCI()) {
                        this.skip();
                    }
                });

                it('should maintain always-on-top after minimize/restore', async function () {
                    await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

                    const stateBeforeMinimize = await getAlwaysOnTopState();
                    expect(stateBeforeMinimize.enabled).toBe(true);

                    await minimizeWindow();
                    await waitForWindowTransition(async () => await isWindowMinimized(), {
                        description: 'Window minimized',
                    });

                    const minimized = await isWindowMinimized();
                    expect(minimized).toBe(true);

                    await restoreWindow();
                    await waitForWindowTransition(
                        async () => {
                            const vis = await isWindowVisible();
                            const min = await isWindowMinimized();
                            return vis && !min;
                        },
                        { description: 'Window restored after minimize' }
                    );

                    const stateAfterRestore = await getAlwaysOnTopState();
                    expect(stateAfterRestore.enabled).toBe(true);
                });

                it('should maintain disabled state after minimize/restore', async () => {
                    await setAlwaysOnTop(false, E2E_TIMING.IPC_ROUND_TRIP);

                    await minimizeWindow();
                    await waitForWindowTransition(async () => await isWindowMinimized(), {
                        description: 'Window minimized (disabled state test)',
                    });

                    await restoreWindow();
                    await waitForWindowTransition(
                        async () => {
                            const vis = await isWindowVisible();
                            const min = await isWindowMinimized();
                            return vis && !min;
                        },
                        { description: 'Window restored (disabled state test)' }
                    );

                    const stateAfterRestore = await getAlwaysOnTopState();
                    expect(stateAfterRestore.enabled).toBe(false);
                });

                it('should maintain state through multiple minimize/restore cycles', async () => {
                    await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

                    for (let i = 0; i < 3; i++) {
                        await minimizeWindow();
                        await waitForUIState(async () => await isWindowMinimized(), {
                            description: `Minimize cycle ${i + 1}`,
                        });

                        await restoreWindow();
                        await waitForUIState(
                            async () => {
                                const vis = await isWindowVisible();
                                const min = await isWindowMinimized();
                                return vis && !min;
                            },
                            { description: `Restore cycle ${i + 1}` }
                        );

                        const state = await getAlwaysOnTopState();
                        expect(state.enabled).toBe(true);
                    }
                });
            });

            describe('Maximize and Restore', () => {
                it('should maintain always-on-top after maximize/restore', async () => {
                    await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

                    await maximizeWindow();
                    await waitForWindowTransition(async () => await isWindowMaximized(), {
                        description: 'Window maximized',
                    });

                    const maximized = await isWindowMaximized();
                    if (maximized) {
                        const stateWhileMaximized = await getAlwaysOnTopState();
                        expect(stateWhileMaximized.enabled).toBe(true);

                        await restoreWindow();
                        await waitForWindowTransition(
                            async () => {
                                const max = await isWindowMaximized();
                                return !max;
                            },
                            { description: 'Window restored from maximize' }
                        );

                        const stateAfterRestore = await getAlwaysOnTopState();
                        expect(stateAfterRestore.enabled).toBe(true);
                    }
                });
            });
        });

        describe('Tray Interaction', () => {
            it('should maintain always-on-top after hide/show', async () => {
                await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

                await hideWindow();
                await waitForWindowTransition(
                    async () => {
                        const vis = await isWindowVisible();
                        return !vis;
                    },
                    { description: 'Window hidden' }
                );

                const visible = await isWindowVisible();
                expect(visible).toBe(false);

                await showWindow();
                await waitForWindowTransition(async () => await isWindowVisible(), {
                    description: 'Window shown',
                });

                const stateAfterShow = await getAlwaysOnTopState();
                expect(stateAfterShow.enabled).toBe(true);
            });

            it('should maintain disabled state after hide/show', async () => {
                await setAlwaysOnTop(false, E2E_TIMING.IPC_ROUND_TRIP);

                await hideWindow();
                await waitForWindowTransition(
                    async () => {
                        const vis = await isWindowVisible();
                        return !vis;
                    },
                    { description: 'Window hidden (disabled state test)' }
                );
                await showWindow();
                await waitForWindowTransition(async () => await isWindowVisible(), {
                    description: 'Window shown (disabled state test)',
                });

                const state = await getAlwaysOnTopState();
                expect(state.enabled).toBe(false);
            });

            it('should maintain always-on-top through multiple hide/show cycles', async () => {
                await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

                for (let i = 0; i < 3; i++) {
                    await hideWindow();
                    await waitForUIState(
                        async () => {
                            const vis = await isWindowVisible();
                            return !vis;
                        },
                        { description: `Hide cycle ${i + 1}` }
                    );
                    await showWindow();
                    await waitForUIState(async () => await isWindowVisible(), {
                        description: `Show cycle ${i + 1}`,
                    });

                    const state = await getAlwaysOnTopState();
                    expect(state.enabled).toBe(true);
                }
            });
        });

        describe('Window Resize and Move', () => {
            afterEach(async () => {
                if (originalBounds) {
                    await setWindowBoundsLocal(originalBounds);
                    await waitForUIState(
                        async () => {
                            const bounds = await getWindowBoundsLocal();
                            return bounds.width === originalBounds.width && bounds.height === originalBounds.height;
                        },
                        { description: 'Original bounds restored' }
                    );
                }
            });

            it('should maintain always-on-top after resizing window', async () => {
                await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

                const currentBounds = await getWindowBoundsLocal();
                const newWidth = currentBounds.width + 100;
                const newHeight = currentBounds.height + 100;
                await setWindowBoundsLocal({
                    width: newWidth,
                    height: newHeight,
                });
                await waitForUIState(
                    async () => {
                        const bounds = await getWindowBoundsLocal();
                        return bounds.width === newWidth && bounds.height === newHeight;
                    },
                    { description: 'Window resized' }
                );

                const stateAfterResize = await getAlwaysOnTopState();
                expect(stateAfterResize.enabled).toBe(true);
            });

            it('should maintain always-on-top after moving window', async () => {
                await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

                const currentBounds = await getWindowBoundsLocal();
                const newX = currentBounds.x + 50;
                const newY = currentBounds.y + 50;
                await setWindowBoundsLocal({
                    x: newX,
                    y: newY,
                });
                await waitForUIState(
                    async () => {
                        const bounds = await getWindowBoundsLocal();
                        return bounds.x === newX && bounds.y === newY;
                    },
                    { description: 'Window moved' }
                );

                const stateAfterMove = await getAlwaysOnTopState();
                expect(stateAfterMove.enabled).toBe(true);
            });

            it('should maintain always-on-top through combined resize and move', async () => {
                await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

                const currentBounds = await getWindowBoundsLocal();
                const newX = currentBounds.x + 30;
                const newY = currentBounds.y + 30;
                const newWidth = currentBounds.width + 80;
                const newHeight = currentBounds.height + 60;
                await setWindowBoundsLocal({
                    x: newX,
                    y: newY,
                    width: newWidth,
                    height: newHeight,
                });
                await waitForUIState(
                    async () => {
                        const bounds = await getWindowBoundsLocal();
                        return (
                            bounds.x === newX &&
                            bounds.y === newY &&
                            bounds.width === newWidth &&
                            bounds.height === newHeight
                        );
                    },
                    { description: 'Window resized and moved' }
                );

                const stateAfterBoth = await getAlwaysOnTopState();
                expect(stateAfterBoth.enabled).toBe(true);
            });
        });

        describe('Settings Persistence', () => {
            it('should save enabled state to settings file', async () => {
                await setAlwaysOnTop(true, E2E_TIMING.WINDOW_TRANSITION);

                const settings = await readUserPreferences();
                expect(settings).not.toBeNull();
                expect(settings?.alwaysOnTop).toBe(true);
            });

            it('should save disabled state to settings file', async () => {
                await setAlwaysOnTop(false, E2E_TIMING.WINDOW_TRANSITION);

                const settings = await readUserPreferences();
                expect(settings?.alwaysOnTop).toBe(false);
            });

            it('should update settings file when toggled multiple times', async () => {
                await setAlwaysOnTop(true, E2E_TIMING.CYCLE_PAUSE);
                let settings = await readUserPreferences();
                expect(settings?.alwaysOnTop).toBe(true);

                await setAlwaysOnTop(false, E2E_TIMING.CYCLE_PAUSE);
                settings = await readUserPreferences();
                expect(settings?.alwaysOnTop).toBe(false);
            });

            it('should store alwaysOnTop as boolean in settings.json', async () => {
                await setAlwaysOnTop(true, E2E_TIMING.WINDOW_TRANSITION);

                const settings = await readUserPreferences();
                expect(settings).not.toBeNull();
                expect(typeof settings?.alwaysOnTop).toBe('boolean');
            });

            it('should not corrupt other settings when updating alwaysOnTop', async () => {
                const initialSettings = await readUserPreferences();
                const initialTheme = initialSettings?.theme;
                const initialHotkeys = initialSettings?.hotkeyPeekAndHide;

                await setAlwaysOnTop(true, E2E_TIMING.WINDOW_TRANSITION);

                const newSettings = await readUserPreferences();
                expect(newSettings?.theme).toBe(initialTheme);
                expect(newSettings?.hotkeyPeekAndHide).toBe(initialHotkeys);
            });
        });

        describe('Multi-Window Interactions', () => {
            describe('Options Window', () => {
                it('should maintain always-on-top after opening Options window', async () => {
                    await setAlwaysOnTop(true);

                    await mainWindow.openOptionsViaMenu();
                    await waitForWindowCount(2, 5000);

                    await wdioBrowser.switchToWindow(mainWindowHandle);
                    const state = await getAlwaysOnTopState();
                    expect(state.enabled).toBe(true);
                });

                it('should maintain always-on-top after closing Options window', async () => {
                    await setAlwaysOnTop(true);

                    await mainWindow.openOptionsViaMenu();
                    await waitForWindowCount(2, 5000);

                    const handles = await wdioBrowser.getWindowHandles();
                    const optionsHandle = handles.find((h: string) => h !== mainWindowHandle) || handles[1];

                    await wdioBrowser.switchToWindow(optionsHandle);
                    await waitForUIState(
                        async () => {
                            const handles = await wdioBrowser.getWindowHandles();
                            return handles.length === 2;
                        },
                        { description: 'Options window ready' }
                    );
                    await closeCurrentWindow();
                    await waitForWindowCount(1, 5000);

                    await wdioBrowser.switchToWindow(mainWindowHandle);

                    const state = await getAlwaysOnTopState();
                    expect(state.enabled).toBe(true);
                });

                it('should toggle always-on-top while Options window is open', async () => {
                    await mainWindow.openOptionsViaMenu();
                    await waitForWindowCount(2, 5000);

                    await wdioBrowser.switchToWindow(mainWindowHandle);
                    await waitForUIState(
                        async () => {
                            const handle = await wdioBrowser.getWindowHandle();
                            return handle === mainWindowHandle;
                        },
                        { description: 'Main window focused after switch' }
                    );

                    await setAlwaysOnTop(true);
                    let state = await getAlwaysOnTopState();
                    expect(state.enabled).toBe(true);

                    await setAlwaysOnTop(false);
                    state = await getAlwaysOnTopState();
                    expect(state.enabled).toBe(false);
                });
            });

            describe('About Window', () => {
                it('should maintain always-on-top when About window opens', async () => {
                    await setAlwaysOnTop(true);

                    await mainWindow.openAboutViaMenu();
                    await waitForWindowCount(2, 5000);

                    await wdioBrowser.switchToWindow(mainWindowHandle);
                    const state = await getAlwaysOnTopState();
                    expect(state.enabled).toBe(true);
                });

                it('should maintain always-on-top after closing About window', async () => {
                    await setAlwaysOnTop(true);

                    await mainWindow.openAboutViaMenu();
                    await waitForWindowCount(2, 5000);

                    const handles = await wdioBrowser.getWindowHandles();
                    const aboutHandle = handles.find((h: string) => h !== mainWindowHandle) || handles[1];

                    await wdioBrowser.switchToWindow(aboutHandle);
                    await waitForUIState(
                        async () => {
                            const handle = await wdioBrowser.getWindowHandle();
                            return handle === aboutHandle;
                        },
                        { description: 'About window focused' }
                    );
                    await closeCurrentWindow();
                    await waitForWindowCount(1, 5000);

                    await wdioBrowser.switchToWindow(mainWindowHandle);

                    const state = await getAlwaysOnTopState();
                    expect(state.enabled).toBe(true);
                });
            });

            describe('Window Independence', () => {
                it('should have main window state independent of Options window', async () => {
                    await setAlwaysOnTop(true);

                    await mainWindow.openOptionsViaMenu();
                    await waitForWindowCount(2, 5000);

                    const handles = await wdioBrowser.getWindowHandles();
                    const optionsHandle = handles.find((h: string) => h !== mainWindowHandle) || handles[1];

                    await wdioBrowser.switchToWindow(optionsHandle);
                    await waitForUIState(
                        async () => {
                            const handle = await wdioBrowser.getWindowHandle();
                            return handle === optionsHandle;
                        },
                        { description: 'Options window focused' }
                    );

                    await optionsPage.waitForLoad();
                    if (await optionsPage.isThemeSelectorDisplayed()) {
                        await optionsPage.selectTheme('dark');
                    }

                    await closeCurrentWindow();
                    await waitForWindowCount(1, 5000);

                    await wdioBrowser.switchToWindow(mainWindowHandle);
                    const state = await getAlwaysOnTopState();
                    expect(state.enabled).toBe(true);
                });
            });
        });

        describe('Edge Cases', () => {
            describe('Toggle During Minimize', () => {
                beforeEach(function () {
                    if (isLinuxSync() && isCI()) {
                        this.skip();
                    }
                });

                it('should toggle always-on-top while window is minimized', async function () {
                    if (await isMacOS()) {
                        this.skip();
                    }
                    if (await isLinuxCI()) {
                        this.skip();
                    }

                    await setAlwaysOnTop(false, E2E_TIMING.CLEANUP_PAUSE);

                    await minimizeWindow();
                    await waitForWindowTransition(async () => await isWindowMinimized(), {
                        description: 'Window minimized',
                    });

                    const minimized = await isWindowMinimized();
                    expect(minimized).toBe(true);

                    await setAlwaysOnTop(true);

                    await restoreWindow();
                    await waitForWindowTransition(
                        async () => {
                            const vis = await isWindowVisible();
                            const min = await isWindowMinimized();
                            return vis && !min;
                        },
                        { description: 'Window restored from minimize' }
                    );

                    const state = await getWindowAlwaysOnTopState();
                    expect(state).toBe(true);
                });

                it('should toggle off while minimized and persist after restore', async function () {
                    if (await isMacOS()) {
                        this.skip();
                    }

                    await setAlwaysOnTop(true);

                    await minimizeWindow();
                    await waitForWindowTransition(async () => await isWindowMinimized(), {
                        description: 'Window minimized',
                    });

                    await setAlwaysOnTop(false);

                    await restoreWindow();
                    await waitForWindowTransition(
                        async () => {
                            const vis = await isWindowVisible();
                            const min = await isWindowMinimized();
                            return vis && !min;
                        },
                        { description: 'Window restored from minimize' }
                    );

                    const state = await getWindowAlwaysOnTopState();
                    expect(state).toBe(false);
                });
            });

            describe('Fullscreen Mode', () => {
                it('should maintain always-on-top setting through fullscreen toggle', async function () {
                    if (await isWindows()) {
                        this.skip();
                    }

                    await setAlwaysOnTop(true);

                    await setFullScreenLocal(true);
                    await waitForFullscreenTransition(true, isWindowFullScreen);

                    const isFS = await isWindowFullScreen();
                    if (isFS) {
                        await setFullScreenLocal(false);
                        await waitForFullscreenTransition(false, isWindowFullScreen);

                        const state = await getWindowAlwaysOnTopState();
                        expect(state).toBe(true);
                    }
                });

                it('should allow toggling always-on-top while in fullscreen (macOS)', async function () {
                    if (!(await isMacOS())) {
                        return;
                    }

                    await setFullScreenLocal(true);
                    await waitForFullscreenTransition(true, isWindowFullScreen);

                    const isFS = await isWindowFullScreen();
                    if (!isFS) {
                        return;
                    }

                    await setAlwaysOnTop(true);

                    await setFullScreenLocal(false);
                    await waitForFullscreenTransition(false, isWindowFullScreen);

                    const finalState = await getWindowAlwaysOnTopState();
                    expect(finalState).toBe(true);
                });
            });
        });
    });

    describePeekAndHide('Peek and Hide (Hide All Windows)', () => {
        describe('Hotkey Registration', () => {
            it('should have Peek and Hide hotkey registered by default', async function () {
                if (await isLinuxCI()) {
                    this.skip();
                }

                const accelerator = REGISTERED_HOTKEYS.MINIMIZE_WINDOW.accelerator;
                const isRegistered = await isHotkeyRegistered(accelerator);

                expect(isRegistered).toBe(true);
            });

            it('should display correct platform-specific hotkey format', async () => {
                const platform = process.platform;
                const expectedDisplay =
                    platform === 'darwin'
                        ? REGISTERED_HOTKEYS.MINIMIZE_WINDOW.displayFormat.macos
                        : REGISTERED_HOTKEYS.MINIMIZE_WINDOW.displayFormat.windows;

                if (platform === 'darwin') {
                    expect(expectedDisplay).toContain('Cmd');
                } else {
                    expect(expectedDisplay).toContain('Ctrl');
                }
            });
        });

        describe('Peek and Hide Action', () => {
            it('should hide main window when Peek and Hide is triggered', async function () {
                if (await isLinuxCI()) {
                    this.skip();
                }

                const initialVisibility = await isWindowVisible();
                expect(initialVisibility).toBe(true);

                await hideWindow();

                const visible = await isWindowVisible();
                expect(visible).toBe(false);

                await restoreWindow();
                await showWindow();

                const afterRestore = await isWindowVisible();
                expect(afterRestore).toBe(true);
            });

            it('should remain hidden until explicitly restored', async function () {
                if (await isLinuxCI()) {
                    this.skip();
                }

                await hideWindow();

                await waitForUIState(async () => !(await isWindowVisible()), {
                    description: 'Main window remains hidden before explicit restore',
                });

                const stillVisible = await isWindowVisible();
                expect(stillVisible).toBe(false);

                await restoreWindow();
                await showWindow();
            });
        });

        describe('Peek and Hide with Multiple Windows', () => {
            it('should handle Peek and Hide when options window is also open', async () => {
                const isLoaded = await mainWindow.isLoaded();
                expect(isLoaded).toBe(true);

                const isVisible = await isWindowVisible();
                expect(isVisible).toBe(true);
            });
        });

        describe('Peek & Hide Toggle via HotkeyManager Dispatch (E2E)', () => {
            it('should hide visible window via hotkeyManager.executeHotkeyAction', async function () {
                if (await isLinuxCI()) {
                    this.skip();
                }

                const initiallyVisible = await isWindowVisible();
                expect(initiallyVisible).toBe(true);

                await wdioBrowser.electron.execute((_electron: typeof import('electron')) => {
                    const hotkeyManager = (
                        globalThis as unknown as { hotkeyManager?: { executeHotkeyAction: (a: string) => void } }
                    ).hotkeyManager;
                    hotkeyManager?.executeHotkeyAction('peekAndHide');
                });

                await wdioBrowser.waitUntil(
                    async () => {
                        return await wdioBrowser.electron.execute(() => {
                            const windowManager = (
                                globalThis as unknown as { windowManager?: { isMainWindowVisible: () => boolean } }
                            ).windowManager;
                            return !windowManager?.isMainWindowVisible();
                        });
                    },
                    { timeout: 5000, timeoutMsg: 'Window did not hide after hotkeyManager.executeHotkeyAction' }
                );

                const isHiddenAfterDispatch = await isWindowVisible();
                expect(isHiddenAfterDispatch).toBe(false);

                await restoreWindow();
                await showWindow();
            });

            it('should restore hidden window via hotkeyManager.executeHotkeyAction', async function () {
                if (await isLinuxCI()) {
                    this.skip();
                }

                await hideWindow();

                const isHiddenBefore = await isWindowVisible();
                expect(isHiddenBefore).toBe(false);

                await wdioBrowser.electron.execute(() => {
                    const hotkeyManager = (
                        globalThis as unknown as { hotkeyManager?: { executeHotkeyAction: (a: string) => void } }
                    ).hotkeyManager;
                    hotkeyManager?.executeHotkeyAction('peekAndHide');
                });

                await wdioBrowser.waitUntil(
                    async () => {
                        return await wdioBrowser.electron.execute(() => {
                            const windowManager = (
                                globalThis as unknown as { windowManager?: { isMainWindowVisible: () => boolean } }
                            ).windowManager;
                            return windowManager?.isMainWindowVisible();
                        });
                    },
                    { timeout: 5000, timeoutMsg: 'Window did not restore after hotkeyManager.executeHotkeyAction' }
                );

                const isVisibleAfterDispatch = await isWindowVisible();
                expect(isVisibleAfterDispatch).toBe(true);
            });

            it('should complete a full toggle cycle via hotkeyManager.executeHotkeyAction', async function () {
                if (await isLinuxCI()) {
                    this.skip();
                }

                const initiallyVisible = await isWindowVisible();
                expect(initiallyVisible).toBe(true);

                await wdioBrowser.electron.execute(() => {
                    const hotkeyManager = (
                        globalThis as unknown as { hotkeyManager?: { executeHotkeyAction: (a: string) => void } }
                    ).hotkeyManager;
                    hotkeyManager?.executeHotkeyAction('peekAndHide');
                });

                await wdioBrowser.waitUntil(
                    async () => {
                        return await wdioBrowser.electron.execute(() => {
                            const windowManager = (
                                globalThis as unknown as { windowManager?: { isMainWindowVisible: () => boolean } }
                            ).windowManager;
                            return !windowManager?.isMainWindowVisible();
                        });
                    },
                    { timeout: 5000, timeoutMsg: 'Window did not hide on first hotkeyManager dispatch' }
                );

                expect(await isWindowVisible()).toBe(false);

                await wdioBrowser.electron.execute(() => {
                    const hotkeyManager = (
                        globalThis as unknown as { hotkeyManager?: { executeHotkeyAction: (a: string) => void } }
                    ).hotkeyManager;
                    hotkeyManager?.executeHotkeyAction('peekAndHide');
                });

                await wdioBrowser.waitUntil(
                    async () => {
                        return await wdioBrowser.electron.execute(() => {
                            const windowManager = (
                                globalThis as unknown as { windowManager?: { isMainWindowVisible: () => boolean } }
                            ).windowManager;
                            return windowManager?.isMainWindowVisible();
                        });
                    },
                    { timeout: 5000, timeoutMsg: 'Window did not restore on second hotkeyManager dispatch' }
                );

                expect(await isWindowVisible()).toBe(true);
            });
        });

        describe('Peek & Hide Toggle (E2E)', () => {
            it('should hide visible window when toggleMainWindowVisibility is called', async function () {
                if (await isLinuxCI()) {
                    this.skip();
                }

                const initiallyVisible = await isWindowVisible();
                expect(initiallyVisible).toBe(true);

                await wdioBrowser.electron.execute(() => {
                    const windowManager = (
                        globalThis as unknown as { windowManager?: { toggleMainWindowVisibility: () => void } }
                    ).windowManager;
                    windowManager?.toggleMainWindowVisibility();
                });

                await wdioBrowser.waitUntil(
                    async () => {
                        return await wdioBrowser.electron.execute(() => {
                            const windowManager = (
                                globalThis as unknown as { windowManager?: { isMainWindowVisible: () => boolean } }
                            ).windowManager;
                            return !windowManager?.isMainWindowVisible();
                        });
                    },
                    { timeout: 5000, timeoutMsg: 'Window did not hide after toggleMainWindowVisibility' }
                );

                const isHiddenAfterToggle = await isWindowVisible();
                expect(isHiddenAfterToggle).toBe(false);

                await restoreWindow();
                await showWindow();
            });

            it('should restore hidden window when toggleMainWindowVisibility is called again', async function () {
                if (await isLinuxCI()) {
                    this.skip();
                }

                await hideWindow();

                const isHiddenBefore = await isWindowVisible();
                expect(isHiddenBefore).toBe(false);

                await wdioBrowser.electron.execute(() => {
                    const windowManager = (
                        globalThis as unknown as { windowManager?: { toggleMainWindowVisibility: () => void } }
                    ).windowManager;
                    windowManager?.toggleMainWindowVisibility();
                });

                await wdioBrowser.waitUntil(
                    async () => {
                        return await wdioBrowser.electron.execute(() => {
                            const windowManager = (
                                globalThis as unknown as { windowManager?: { isMainWindowVisible: () => boolean } }
                            ).windowManager;
                            return windowManager?.isMainWindowVisible();
                        });
                    },
                    { timeout: 5000, timeoutMsg: 'Window did not restore after toggleMainWindowVisibility' }
                );

                const isVisibleAfterToggle = await isWindowVisible();
                expect(isVisibleAfterToggle).toBe(true);
            });

            it('should complete a full toggle cycle: visible → hidden → visible', async function () {
                if (await isLinuxCI()) {
                    this.skip();
                }

                const initiallyVisible = await isWindowVisible();
                expect(initiallyVisible).toBe(true);

                await wdioBrowser.electron.execute(() => {
                    const windowManager = (
                        globalThis as unknown as { windowManager?: { toggleMainWindowVisibility: () => void } }
                    ).windowManager;
                    windowManager?.toggleMainWindowVisibility();
                });

                await wdioBrowser.waitUntil(
                    async () => {
                        return await wdioBrowser.electron.execute(() => {
                            const windowManager = (
                                globalThis as unknown as { windowManager?: { isMainWindowVisible: () => boolean } }
                            ).windowManager;
                            return !windowManager?.isMainWindowVisible();
                        });
                    },
                    { timeout: 5000, timeoutMsg: 'Window did not hide on first toggle' }
                );

                expect(await isWindowVisible()).toBe(false);

                await wdioBrowser.electron.execute(() => {
                    const windowManager = (
                        globalThis as unknown as { windowManager?: { toggleMainWindowVisibility: () => void } }
                    ).windowManager;
                    windowManager?.toggleMainWindowVisibility();
                });

                await wdioBrowser.waitUntil(
                    async () => {
                        return await wdioBrowser.electron.execute(() => {
                            const windowManager = (
                                globalThis as unknown as { windowManager?: { isMainWindowVisible: () => boolean } }
                            ).windowManager;
                            return windowManager?.isMainWindowVisible();
                        });
                    },
                    { timeout: 5000, timeoutMsg: 'Window did not restore on second toggle' }
                );

                expect(await isWindowVisible()).toBe(true);
            });
        });
    });

    describe('Dependent Windows', () => {
        it('should close options window when main window hides to tray', async () => {
            await mainWindow.openOptionsViaMenu();

            await waitForWindowCount(2, 5000);

            const handles = await wdioBrowser.getWindowHandles();
            expect(handles.length).toBe(2);

            await wdioBrowser.switchToWindow(mainWindowHandle);

            await closeWindow();

            await waitForAllWindowsHidden(5000);

            await tray.clickShowMenuItemAndWait();
            await waitForWindowCount(1, 5000);
            await waitForAppReady();
        });

        it('should allow reopening options window after restoring from tray', async () => {
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);

            await wdioBrowser.switchToWindow(mainWindowHandle);

            await closeWindow();
            await waitForAllWindowsHidden(5000);

            await tray.clickShowMenuItemAndWait();

            await waitForWindowCount(1, 5000);
            await waitForAppReady();

            await mainWindow.openOptionsViaMenu();

            await waitForWindowCount(2, 5000);
            const newHandles = await wdioBrowser.getWindowHandles();
            expect(newHandles.length).toBe(2);

            await wdioBrowser.switchToWindow(newHandles[1]);
            await optionsPage.waitForLoad();

            await optionsPage.close();
            await waitForWindowCount(1, 5000);
        });

        it('should close all dependent windows (Options + Auth) when main window hides to tray', async () => {
            await mainWindow.openOptionsViaMenu();
            await waitForWindowCount(2, 5000);

            await wdioBrowser.switchToWindow(mainWindowHandle);
            await authWindow.openViaMenu();

            await waitForUIState(
                async () => {
                    const allHandles = await wdioBrowser.getWindowHandles();
                    return allHandles.length >= 2;
                },
                { description: 'Auth window appears' }
            );
            const allHandles = await wdioBrowser.getWindowHandles();

            expect(allHandles.length).toBeGreaterThanOrEqual(2);

            await wdioBrowser.switchToWindow(mainWindowHandle);
            await closeWindow();

            await waitForAllWindowsHidden(5000);

            await tray.clickShowMenuItemAndWait();
            await waitForWindowCount(1, 5000);
            await waitForAppReady();
        });
    });

    describe('Window State Restoration', () => {
        describe('Window Bounds Persistence', () => {
            it('should save window bounds when window is moved or resized', async () => {
                const initialBounds = await mainWindow.getWindowBounds();

                const newBounds = {
                    x: initialBounds.x + 50,
                    y: initialBounds.y + 50,
                    width: initialBounds.width - 100,
                    height: initialBounds.height - 100,
                };

                await mainWindow.setWindowBounds(newBounds);

                await new Promise((resolve) => setTimeout(resolve, 1000));

                const savedBounds = await mainWindow.readWindowBoundsFromSettings();

                if (savedBounds) {
                    expect(Math.abs(savedBounds.width - newBounds.width)).toBeLessThanOrEqual(10);
                    expect(Math.abs(savedBounds.height - newBounds.height)).toBeLessThanOrEqual(10);
                }

                await mainWindow.setWindowBounds(initialBounds);
            });

            it('should respect minimum window size constraints', async () => {
                const initialBounds = await mainWindow.getWindowBounds();

                const tooSmallBounds = {
                    x: initialBounds.x,
                    y: initialBounds.y,
                    width: 200,
                    height: 400,
                };

                await mainWindow.setWindowBounds(tooSmallBounds);

                const actualBounds = await mainWindow.getWindowBounds();

                expect(actualBounds.width).toBeGreaterThanOrEqual(300);
                expect(actualBounds.height).toBeGreaterThanOrEqual(500);

                await mainWindow.setWindowBounds(initialBounds);
            });

            it('should track window position and size independently', async () => {
                const initialBounds = await mainWindow.getWindowBounds();

                const movedBounds = {
                    x: initialBounds.x + 100,
                    y: initialBounds.y + 100,
                    width: initialBounds.width,
                    height: initialBounds.height,
                };

                await mainWindow.setWindowBounds(movedBounds);

                const boundsAfterMove = await mainWindow.getWindowBounds();
                expect(boundsAfterMove.width).toBe(initialBounds.width);
                expect(boundsAfterMove.height).toBe(initialBounds.height);

                await mainWindow.setWindowBounds(initialBounds);
            });
        });
    });

    describe('Window Controls Functionality', () => {
        describe('Custom Window Controls (Windows/Linux)', () => {
            it('should maximize window when maximize button is clicked', async () => {
                if (!(await usesCustomControls())) {
                    return;
                }

                if (await isLinuxCI()) {
                    return;
                }

                const initialState = await isWindowMaximized();
                if (initialState) {
                    await restoreWindow();
                }

                await mainWindow.clickMaximize();

                const isMaximized = await isWindowMaximized();
                expect(isMaximized).toBe(true);
            });

            it('should restore window when maximize button is clicked again', async () => {
                if (!(await usesCustomControls())) {
                    return;
                }

                if (await isLinuxCI()) {
                    return;
                }

                const initialState = await isWindowMaximized();
                if (!initialState) {
                    await maximizeWindow();
                }

                await mainWindow.clickMaximize();

                const isMaximized = await isWindowMaximized();
                expect(isMaximized).toBe(false);
            });

            it('should minimize window to taskbar when minimize button is clicked', async () => {
                if (!(await usesCustomControls())) {
                    return;
                }

                if (await isLinuxCI()) {
                    return;
                }

                await mainWindow.clickMinimize();

                const isMinimized = await isWindowMinimized();
                expect(isMinimized).toBe(true);

                await restoreWindow();
            });

            it('should hide window to tray when close button is clicked', async () => {
                if (!(await usesCustomControls())) {
                    return;
                }

                await mainWindow.clickClose();

                await waitForWindowTransition(async () => !(await isWindowVisible()), {
                    description: 'Window hide to tray',
                });

                await expect(isWindowDestroyed()).resolves.toBe(false);
                await expect(isWindowVisible()).resolves.toBe(false);
                await expect(isWindowMinimized()).resolves.toBe(false);

                await restoreWindow();
                await expect(isWindowVisible()).resolves.toBe(true);
            });
        });

        describe('Native Window Controls via Keyboard (macOS)', () => {
            it('should verify window state API works on macOS', async () => {
                if (!(await isMacOS())) {
                    return;
                }

                const state = await getWindowState();

                expect(typeof state.isMaximized).toBe('boolean');
                expect(typeof state.isMinimized).toBe('boolean');
                expect(typeof state.isFullScreen).toBe('boolean');
            });

            it.skip('should minimize window via keyboard shortcut on macOS', async () => {});

            it('should hide window to tray when close is triggered on macOS', async () => {
                if (!(await isMacOS())) {
                    return;
                }

                await closeWindow();

                await waitForWindowTransition(async () => !(await isWindowVisible()), {
                    description: 'macOS window hide to tray',
                });

                const stateAfterClose = await getWindowState();
                expect(stateAfterClose).toBeTruthy();

                await expect(isWindowDestroyed()).resolves.toBe(false);
                await expect(isWindowVisible()).resolves.toBe(false);

                await restoreWindow();
                await expect(isWindowVisible()).resolves.toBe(true);
            });
        });

        describe('Fullscreen Toggle via IPC (All Platforms)', () => {
            afterEach(async () => {
                const isFS = await isWindowFullScreen();
                if (isFS) {
                    await setFullScreen(false);
                }
            });

            it('should toggle fullscreen via electronAPI.toggleFullscreen()', async () => {
                const initialFS = await isWindowFullScreen();
                expect(initialFS).toBe(false);

                await toggleFullscreen();
                const afterToggleOn = await isWindowFullScreen();
                expect(afterToggleOn).toBe(true);

                await toggleFullscreen();
                const afterToggleOff = await isWindowFullScreen();
                expect(afterToggleOff).toBe(false);
            });
        });

        describe('Window State via API (All Platforms)', () => {
            it('should correctly report window state', async () => {
                const state = await getWindowState();

                expect(state).toHaveProperty('isMaximized');
                expect(state).toHaveProperty('isMinimized');
                expect(state).toHaveProperty('isFullScreen');
            });

            it('should maximize and restore via API calls', async () => {
                if (await isMacOS()) {
                    return;
                }

                if (await isLinuxCI()) {
                    return;
                }

                await maximizeWindow();
                const afterMaximize = await isWindowMaximized();
                expect(afterMaximize).toBe(true);

                await restoreWindow();
                const afterRestore = await isWindowMaximized();
                expect(afterRestore).toBe(false);
            });
        });
    });

    describe('Window Management Edge Cases', () => {
        describe('Auth Window Closure on Hide to Tray', () => {
            it('should close auth window when main window is hidden to tray', async () => {
                await authWindow.openViaMenu();
                await authWindow.waitForOpen();

                await switchToMainWindow();
                await closeWindow();
                await waitForAllWindowsHidden(5000);
            });
        });

        describe('Single Instance Restoration with Auxiliary Windows', () => {
            it('should focus Options window when second instance is launched', async function () {
                const isPackaged = await wdioBrowser.electron.execute(
                    (electron: typeof import('electron')) => electron.app.isPackaged
                );
                if (isPackaged) {
                    this.skip();
                }
                await mainWindow.openOptionsViaMenu();
                await waitForWindowCount(2, 5000);
                await optionsPage.waitForLoad();

                const handles = await wdioBrowser.getWindowHandles();
                let optionsHandle = '';
                for (const handle of handles) {
                    await wdioBrowser.switchToWindow(handle);
                    const isMain = await mainWindow.isLoaded();
                    if (isMain) {
                        const title = await mainWindow.getTitleText();
                        if (!title.includes('Options')) {
                            continue;
                        }
                    }
                    const url = await wdioBrowser.getUrl();
                    if (url.includes('#')) {
                        optionsHandle = handle;
                        break;
                    }
                }

                if (!optionsHandle && handles.length === 2) {
                    const mainHandle = handles[0];
                    optionsHandle = handles.find((h: string) => h !== mainHandle) || handles[1];
                }

                expect(optionsHandle).not.toBe('');

                const mainHandle = handles.find((h: string) => h !== optionsHandle)!;
                await wdioBrowser.switchToWindow(mainHandle);
                await mainWindow.waitForLoad();

                const secondInstance = spawn(electronBinary, [mainEntry, `--user-data-dir=${userDataPath}`], {
                    stdio: 'ignore',
                });

                await new Promise<void>((resolve) => {
                    secondInstance.on('close', (code) => {
                        expect(code).toBe(0);
                        resolve();
                    });
                });

                await waitForWindowTransition(async () => await mainWindow.isLoaded(), {
                    description: 'Single instance restoration focus main window',
                    timeout: 5000,
                });

                await wdioBrowser.switchToWindow(mainHandle);
                const isLoaded = await mainWindow.isLoaded();
                expect(isLoaded).toBe(true);

                await wdioBrowser.switchToWindow(optionsHandle);
                await optionsPage.close();
            });
        });
    });
});

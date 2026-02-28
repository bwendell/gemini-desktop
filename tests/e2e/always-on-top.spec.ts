/**
 * E2E Test: Always On Top
 *
 * Consolidated tests for the "Always On Top" feature.
 * Tests all aspects of the feature including:
 * - Menu and hotkey toggle
 * - Menu-hotkey synchronization
 * - Z-order verification
 * - State operations (minimize, maximize, restore)
 * - Tray interaction
 * - Window resize and move
 * - Settings persistence
 * - Multi-window interactions
 * - Edge cases
 */

import { browser, expect } from '@wdio/globals';

type E2EBrowser = typeof browser & {
    electron: {
        execute<R, T extends unknown[]>(
            fn: (electron: typeof import('electron'), ...args: T) => R,
            ...args: T
        ): Promise<R>;
    };
    getWindowHandle(): Promise<string>;
    getWindowHandles(): Promise<string[]>;
    switchToWindow(handle: string): Promise<void>;
    pause(ms: number): Promise<void>;
};

const wdioBrowser = browser as unknown as E2EBrowser;
import { waitForWindowCount, closeCurrentWindow } from './helpers/windowActions';
import { closeAllSecondaryWindows, switchToMainWindowSafely } from './helpers/WindowManagerHelper';
import { waitForAppReady, waitForElectronBridgeReady } from './helpers/workflows';

import { MainWindowPage } from './pages/MainWindowPage';
import { OptionsPage } from './pages/OptionsPage';
import { isMacOS, isWindows, isLinuxCI } from './helpers/platform';
import { E2E_TIMING } from './helpers/e2eConstants';
import {
    executeElectronWithRetry,
    waitForUIState,
    waitForWindowTransition,
    waitForFullscreenTransition,
} from './helpers/waitUtilities';
import {
    getAlwaysOnTopState,
    getWindowAlwaysOnTopState,
    setAlwaysOnTop,
    toggleAlwaysOnTopViaMenu,
    pressAlwaysOnTopHotkey,
    resetAlwaysOnTopState,
} from './helpers/alwaysOnTopActions';
import {
    isWindowMinimized,
    isWindowMaximized,
    isWindowFullScreen,
    isWindowVisible,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    hideWindow,
    showWindow,
} from './helpers/windowStateActions';
import { readUserPreferences } from './helpers/persistenceActions';

// ============================================================================
// Local Helper Functions
// ============================================================================

/**
 * Set fullscreen mode.
 */
async function setFullScreen(fullscreen: boolean): Promise<void> {
    await executeElectronWithRetry(
        () =>
            wdioBrowser.electron.execute((electron: typeof import('electron'), isFullScreen: boolean) => {
                const mainWindow = electron.BrowserWindow.getAllWindows()[0];
                if (mainWindow) {
                    mainWindow.setFullScreen(isFullScreen);
                }
            }, fullscreen),
        { description: 'always-on-top electron execute' }
    );
}

/**
 * Get current window bounds.
 */
async function getWindowBounds(): Promise<{ x: number; y: number; width: number; height: number }> {
    return executeElectronWithRetry(
        () =>
            wdioBrowser.electron.execute((electron: typeof import('electron')) => {
                const mainWindow = electron.BrowserWindow.getAllWindows()[0];
                if (!mainWindow) {
                    return { x: 0, y: 0, width: 800, height: 600 };
                }
                const bounds = mainWindow.getBounds();
                return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
            }),
        { description: 'always-on-top electron execute' }
    );
}

/**
 * Set window bounds.
 */
async function setWindowBounds(bounds: { x?: number; y?: number; width?: number; height?: number }): Promise<void> {
    await executeElectronWithRetry(
        () =>
            wdioBrowser.electron.execute(
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
            ),
        { description: 'always-on-top electron execute' }
    );
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Always On Top', () => {
    const mainWindow = new MainWindowPage();
    const optionsPage = new OptionsPage();

    let mainWindowHandle: string;
    let originalBounds: { x: number; y: number; width: number; height: number };

    before(async () => {
        await waitForAppReady();
        await waitForElectronBridgeReady();
        originalBounds = await getWindowBounds();
        const handles = await wdioBrowser.getWindowHandles();
        mainWindowHandle = handles[0];
    });

    afterEach(async () => {
        await wdioBrowser.pause(E2E_TIMING.UI_STATE_PAUSE_MS);
        const handles = await wdioBrowser.getWindowHandles();
        if (handles.length === 0) {
            return;
        }

        if (!handles.includes(mainWindowHandle)) {
            mainWindowHandle = handles[0];
        }

        await switchToMainWindowSafely(mainWindowHandle);

        // Ensure window is visible and restored
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

        // Exit fullscreen if active
        const isFS = await isWindowFullScreen();
        if (isFS) {
            await setFullScreen(false);
            await waitForFullscreenTransition(false, isWindowFullScreen, {
                timeout: E2E_TIMING.TIMEOUTS.FULLSCREEN_TRANSITION,
            });
        }

        // Close any extra windows safely (uses browser.closeWindow() instead of IPC)
        await closeAllSecondaryWindows(mainWindowHandle);

        // Reset always-on-top state
        await resetAlwaysOnTopState();
    });

    // ==========================================================================
    // Menu Toggle
    // ==========================================================================

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

            // Toggle back to original state
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

            // Toggle back
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

            // Toggle back to original
            await toggleAlwaysOnTopViaMenu(E2E_TIMING.IPC_ROUND_TRIP);
        });
    });

    // ==========================================================================
    // Hotkey Toggle
    // ==========================================================================

    // NOTE: Skipped - WebDriver keys do not reliably trigger Electron Menu accelerators in this environment.
    // We verify the Feature via Menu clicks and the Registration via hotkey-toggle.spec.ts.
    describe.skip('Hotkey Toggle', () => {
        it('should toggle always-on-top when hotkey is pressed', async () => {
            const initialState = await getAlwaysOnTopState();
            const wasEnabled = initialState.enabled;

            await pressAlwaysOnTopHotkey();

            const newState = await getAlwaysOnTopState();
            expect(newState.enabled).toBe(!wasEnabled);

            // Toggle back
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

            // After 4 toggles, should be back to start
            const finalState = await getAlwaysOnTopState();
            expect(finalState.enabled).toBe(startEnabled);
        });

        it.skip('should handle rapid hotkey presses without desync', async () => {
            const initialState = await getAlwaysOnTopState();
            const startEnabled = initialState.enabled;

            // Rapidly press hotkey 5 times
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

            // 5 is odd, so final state should be opposite of start
            const finalState = await getAlwaysOnTopState();
            expect(finalState.enabled).toBe(!startEnabled);
        });
    });

    // ==========================================================================
    // Menu-Hotkey Synchronization
    // ==========================================================================

    // NOTE: Application hotkeys tested via focused window keys.
    describe.skip('Menu-Hotkey Synchronization', () => {
        it('should update state when toggled via hotkey', async () => {
            const initialState = await getAlwaysOnTopState();
            const wasEnabled = initialState.enabled;

            await pressAlwaysOnTopHotkey();

            const newState = await getAlwaysOnTopState();
            expect(newState.enabled).toBe(!wasEnabled);

            // Restore
            await pressAlwaysOnTopHotkey();
        });

        it('should update state when toggled via menu', async () => {
            const initialState = await getAlwaysOnTopState();
            const wasEnabled = initialState.enabled;

            await toggleAlwaysOnTopViaMenu();

            const newState = await getAlwaysOnTopState();
            expect(newState.enabled).toBe(!wasEnabled);

            // Restore
            await toggleAlwaysOnTopViaMenu();
        });

        it('should remain synced when alternating between menu and hotkey', async () => {
            const initialState = await getAlwaysOnTopState();
            const startEnabled = initialState.enabled;

            // 1. Toggle via hotkey
            await pressAlwaysOnTopHotkey();
            let state = await getAlwaysOnTopState();
            expect(state.enabled).toBe(!startEnabled);

            // 2. Toggle via menu
            await toggleAlwaysOnTopViaMenu();
            state = await getAlwaysOnTopState();
            expect(state.enabled).toBe(startEnabled);

            // 3. Toggle via hotkey again
            await pressAlwaysOnTopHotkey();
            state = await getAlwaysOnTopState();
            expect(state.enabled).toBe(!startEnabled);

            // 4. Toggle via menu to restore
            await toggleAlwaysOnTopViaMenu();
            state = await getAlwaysOnTopState();
            expect(state.enabled).toBe(startEnabled);
        });

        it.skip('should handle rapid alternation between input methods', async () => {
            const initialState = await getAlwaysOnTopState();
            const startEnabled = initialState.enabled;

            // Rapidly alternate: hotkey, menu, hotkey, menu, hotkey
            await pressAlwaysOnTopHotkey(E2E_TIMING.IPC_ROUND_TRIP);
            await toggleAlwaysOnTopViaMenu(E2E_TIMING.IPC_ROUND_TRIP);
            await pressAlwaysOnTopHotkey(E2E_TIMING.IPC_ROUND_TRIP);
            await toggleAlwaysOnTopViaMenu(E2E_TIMING.IPC_ROUND_TRIP);
            await pressAlwaysOnTopHotkey();

            // After 5 toggles, should be opposite of start
            const finalState = await getAlwaysOnTopState();
            expect(finalState.enabled).toBe(!startEnabled);
        });
    });

    // ==========================================================================
    // Z-Order Verification
    // ==========================================================================

    describe('Z-Order Verification', () => {
        it('should report always-on-top as enabled when set', async () => {
            await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

            // Verify via renderer API
            const rendererState = await getAlwaysOnTopState();
            expect(rendererState?.enabled).toBe(true);

            // Verify via main process BrowserWindow API
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
            // Test enabled
            await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);
            const rendererEnabled = await getAlwaysOnTopState();
            const mainEnabled = await getWindowAlwaysOnTopState();
            expect(rendererEnabled?.enabled).toBe(mainEnabled);

            // Test disabled
            await setAlwaysOnTop(false, E2E_TIMING.IPC_ROUND_TRIP);
            const rendererDisabled = await getAlwaysOnTopState();
            const mainDisabled = await getWindowAlwaysOnTopState();
            expect(rendererDisabled?.enabled).toBe(mainDisabled);
        });
    });

    // ==========================================================================
    // State Operations
    // ==========================================================================

    describe('State Operations', () => {
        describe('Minimize and Restore', () => {
            it('should maintain always-on-top after minimize/restore', async function () {
                // Skip on Linux CI - Xvfb doesn't support window minimize detection
                if (await isLinuxCI()) {
                    this.skip();
                }

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

    // ==========================================================================
    // Tray Interaction
    // ==========================================================================

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

    // ==========================================================================
    // Window Resize and Move
    // ==========================================================================

    describe('Window Resize and Move', () => {
        afterEach(async () => {
            // Restore original bounds
            if (originalBounds) {
                await setWindowBounds(originalBounds);
                await waitForUIState(
                    async () => {
                        const bounds = await getWindowBounds();
                        return bounds.width === originalBounds.width && bounds.height === originalBounds.height;
                    },
                    { description: 'Original bounds restored' }
                );
            }
        });

        it('should maintain always-on-top after resizing window', async () => {
            await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

            const currentBounds = await getWindowBounds();
            const newWidth = currentBounds.width + 100;
            const newHeight = currentBounds.height + 100;
            await setWindowBounds({
                width: newWidth,
                height: newHeight,
            });
            await waitForUIState(
                async () => {
                    const bounds = await getWindowBounds();
                    return bounds.width === newWidth && bounds.height === newHeight;
                },
                { description: 'Window resized' }
            );

            const stateAfterResize = await getAlwaysOnTopState();
            expect(stateAfterResize.enabled).toBe(true);
        });

        it('should maintain always-on-top after moving window', async () => {
            await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

            const currentBounds = await getWindowBounds();
            const newX = currentBounds.x + 50;
            const newY = currentBounds.y + 50;
            await setWindowBounds({
                x: newX,
                y: newY,
            });
            await waitForUIState(
                async () => {
                    const bounds = await getWindowBounds();
                    return bounds.x === newX && bounds.y === newY;
                },
                { description: 'Window moved' }
            );

            const stateAfterMove = await getAlwaysOnTopState();
            expect(stateAfterMove.enabled).toBe(true);
        });

        it('should maintain always-on-top through combined resize and move', async () => {
            await setAlwaysOnTop(true, E2E_TIMING.IPC_ROUND_TRIP);

            const currentBounds = await getWindowBounds();
            const newX = currentBounds.x + 30;
            const newY = currentBounds.y + 30;
            const newWidth = currentBounds.width + 80;
            const newHeight = currentBounds.height + 60;
            await setWindowBounds({
                x: newX,
                y: newY,
                width: newWidth,
                height: newHeight,
            });
            await waitForUIState(
                async () => {
                    const bounds = await getWindowBounds();
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

    // ==========================================================================
    // Settings Persistence
    // ==========================================================================

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
            // Toggle ON
            await setAlwaysOnTop(true, E2E_TIMING.CYCLE_PAUSE);
            let settings = await readUserPreferences();
            expect(settings?.alwaysOnTop).toBe(true);

            // Toggle OFF
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

    // ==========================================================================
    // Multi-Window Interactions
    // ==========================================================================

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

                // Interact with Options window using Page Object
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

    // ==========================================================================
    // Edge Cases
    // ==========================================================================

    describe('Edge Cases', () => {
        // NOTE: macOS Dock minimization doesn't support window property changes while minimized.
        // Toggling alwaysOnTop while minimized works on Windows/Linux but not macOS.
        describe('Toggle During Minimize', () => {
            it('should toggle always-on-top while window is minimized', async function () {
                if (await isMacOS()) {
                    this.skip();
                }
                // Skip on Linux CI - Xvfb doesn't support window minimize detection
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

                // Enable while minimized
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
            // Windows doesn't preserve alwaysOnTop state through fullscreen transitions.
            // This is a known platform limitation, not an application bug.
            it('should maintain always-on-top setting through fullscreen toggle', async function () {
                if (await isWindows()) {
                    this.skip();
                }

                await setAlwaysOnTop(true);

                await setFullScreen(true);
                await waitForFullscreenTransition(true, isWindowFullScreen);

                const isFS = await isWindowFullScreen();
                if (isFS) {
                    await setFullScreen(false);
                    await waitForFullscreenTransition(false, isWindowFullScreen);

                    const state = await getWindowAlwaysOnTopState();
                    expect(state).toBe(true);
                }
            });

            it('should allow toggling always-on-top while in fullscreen (macOS)', async function () {
                if (!(await isMacOS())) {
                    return;
                }

                await setFullScreen(true);
                await waitForFullscreenTransition(true, isWindowFullScreen);

                const isFS = await isWindowFullScreen();
                if (!isFS) {
                    return;
                }

                await setAlwaysOnTop(true);

                await setFullScreen(false);
                await waitForFullscreenTransition(false, isWindowFullScreen);

                const finalState = await getWindowAlwaysOnTopState();
                expect(finalState).toBe(true);
            });
        });
    });
});

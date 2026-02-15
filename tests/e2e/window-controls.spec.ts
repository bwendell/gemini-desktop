/**
 * E2E Test: Window Controls Functionality
 *
 * Tests that window control buttons (minimize, maximize, close) actually
 * change window state, not just that they exist.
 *
 * ## Platform Behavior
 * - **Windows/Linux**: Tests custom HTML button clicks
 * - **macOS**: Tests keyboard shortcuts + API verification (native controls can't be clicked)
 *
 * @module window-controls.spec
 */

import { expect } from '@wdio/globals';
import { MainWindowPage } from './pages';
import { usesCustomControls, isMacOS, isLinuxCI } from './helpers/platform';
import { E2ELogger } from './helpers/logger';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { waitForWindowTransition } from './helpers/waitUtilities';
import {
    isWindowMaximized,
    isWindowMinimized,
    isWindowVisible,
    isWindowDestroyed,
    isWindowFullScreen,
    getWindowState,
    maximizeWindow,
    restoreWindow,
    closeWindow,
    showWindow,
    toggleFullscreen,
    setFullScreen,
} from './helpers/windowStateActions';

describe('Window Controls Functionality', () => {
    const mainWindow = new MainWindowPage();

    beforeEach(async () => {
        await waitForAppReady();
    });

    afterEach(async () => {
        // Ensure window is visible and restored for next test
        // Wrapped in try-catch to handle "Promise was collected" errors that can occur
        // when the WebSocket connection closes during cleanup after the final test
        try {
            await restoreWindow();
            await showWindow();
            await ensureSingleWindow();
        } catch (error) {
            // Ignore "Promise was collected" errors during cleanup - these occur when
            // the test framework tears down the WebSocket before cleanup completes
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (!errorMessage.includes('Promise was collected')) {
                throw error;
            }
            E2ELogger.info('window-controls', 'Cleanup interrupted by test teardown (safe to ignore)');
        }
    });

    // =========================================================================
    // Windows/Linux: Custom Button Tests
    // =========================================================================

    describe('Custom Window Controls (Windows/Linux)', () => {
        it('should maximize window when maximize button is clicked', async () => {
            if (!(await usesCustomControls())) {
                E2ELogger.info('window-controls', 'Skipping - macOS uses native controls');
                return;
            }

            // Skip on Linux CI - Xvfb doesn't have a real window manager
            if (await isLinuxCI()) {
                E2ELogger.info('window-controls', 'Skipping - Linux CI uses headless Xvfb without window manager');
                return;
            }

            // 1. Verify not maximized initially (or restore if it is)
            const initialState = await isWindowMaximized();
            if (initialState) {
                await restoreWindow();
            }

            // 2. Click maximize button via Page Object
            await mainWindow.clickMaximize();

            // 3. Verify window is now maximized
            const isMaximized = await isWindowMaximized();
            expect(isMaximized).toBe(true);

            E2ELogger.info('window-controls', 'Maximize button click verified');
        });

        it('should restore window when maximize button is clicked again', async () => {
            if (!(await usesCustomControls())) {
                return;
            }

            // 1. Ensure window is maximized first
            const initialState = await isWindowMaximized();
            if (!initialState) {
                await maximizeWindow();
            }

            // 2. Click maximize button again to restore via Page Object
            await mainWindow.clickMaximize();

            // 3. Verify window is restored (not maximized)
            const isMaximized = await isWindowMaximized();
            expect(isMaximized).toBe(false);

            E2ELogger.info('window-controls', 'Restore via maximize button verified');
        });

        it('should minimize window to taskbar when minimize button is clicked', async () => {
            if (!(await usesCustomControls())) {
                return;
            }

            // Skip on Linux CI or WSL (no window manager)
            if (await isLinuxCI()) {
                E2ELogger.info('window-controls', 'Skipping - Linux CI/WSL uses headless Xvfb without window manager');
                return;
            }

            // 1. Click minimize button via Page Object
            await mainWindow.clickMinimize();

            // 2. Verify window is minimized (Standard behavior)
            const isMinimized = await isWindowMinimized();
            expect(isMinimized).toBe(true);

            // 3. Restore window for subsequent tests
            await restoreWindow();

            E2ELogger.info('window-controls', 'Minimize button click verified');
        });

        it('should hide window to tray when close button is clicked', async () => {
            if (!(await usesCustomControls())) {
                return;
            }

            // 1. Click close button via Page Object
            await mainWindow.clickClose();

            // 2. Wait for window to transition (become hidden)
            await waitForWindowTransition(async () => !(await isWindowVisible()), {
                description: 'Window hide to tray',
            });

            // 3. Verify window behavior:
            // - Not destroyed (app still running)
            // - Not visible (hidden to tray)
            // - Not minimized (just hidden)
            await expect(isWindowDestroyed()).resolves.toBe(false);
            await expect(isWindowVisible()).resolves.toBe(false);
            await expect(isWindowMinimized()).resolves.toBe(false);

            // 4. Restore window via API (simulating tray click)
            await restoreWindow();
            await expect(isWindowVisible()).resolves.toBe(true);

            E2ELogger.info('window-controls', 'Close-to-tray verified');
        });
    });

    // =========================================================================
    // macOS: Keyboard Shortcut Tests
    // =========================================================================

    describe('Native Window Controls via Keyboard (macOS)', () => {
        it('should verify window state API works on macOS', async () => {
            if (!(await isMacOS())) {
                E2ELogger.info('window-controls', 'Skipping macOS-specific test');
                return;
            }

            // Just verify we can read window state on macOS
            const state = await getWindowState();

            expect(typeof state.isMaximized).toBe('boolean');
            expect(typeof state.isMinimized).toBe('boolean');
            expect(typeof state.isFullScreen).toBe('boolean');

            E2ELogger.info('window-controls', `macOS window state: ${JSON.stringify(state)}`);
        });

        it.skip('should minimize window via keyboard shortcut on macOS', async () => {
            // SKIPPED: This test cannot work in E2E environments on macOS.
            //
            // REASON: Keyboard shortcuts like Cmd+M are handled at the OS level
            // on macOS. WebDriver's browser.keys() sends synthetic events to web
            // content, NOT to the operating system's window management system.
            //
            // ALTERNATIVE: The shortcut registration and callback logic are tested
            // in unit tests (hotkeyManager.test.ts), which is sufficient for
            // verifying this functionality works correctly.
            //
            // CONTEXT: This is a known limitation of E2E testing with WebDriver
            // and applies to all OS-level global keyboard shortcuts.
        });

        it('should hide window to tray when close is triggered on macOS', async () => {
            if (!(await isMacOS())) {
                return;
            }

            // Use the close API instead of Cmd+W keyboard shortcut
            // WebDriver sends keyboard events to web content, NOT to the OS,
            // so Cmd+W won't actually trigger the window close on macOS.
            await closeWindow();

            // Wait for window to transition (become hidden)
            await waitForWindowTransition(async () => !(await isWindowVisible()), {
                description: 'macOS window hide to tray',
            });

            // Log state for debugging
            const stateAfterClose = await getWindowState();
            E2ELogger.info('window-controls', `macOS state after close: ${JSON.stringify(stateAfterClose)}`);

            // Verify close-to-tray behavior on macOS:
            // - Not destroyed (app still running)
            // - Not visible (hidden/minimized to Dock)
            await expect(isWindowDestroyed()).resolves.toBe(false);
            await expect(isWindowVisible()).resolves.toBe(false);

            // Restore window
            await restoreWindow();
            await expect(isWindowVisible()).resolves.toBe(true);

            E2ELogger.info('window-controls', 'macOS close-to-tray verified');
        });
    });

    // =========================================================================
    // Fullscreen Toggle via IPC
    // =========================================================================

    describe('Fullscreen Toggle via IPC (All Platforms)', () => {
        afterEach(async () => {
            // Always exit fullscreen after each test
            const isFS = await isWindowFullScreen();
            if (isFS) {
                await setFullScreen(false);
            }
        });

        it('should toggle fullscreen via electronAPI.toggleFullscreen()', async () => {
            // 1. Verify not in fullscreen initially
            const initialFS = await isWindowFullScreen();
            expect(initialFS).toBe(false);

            // 2. Toggle fullscreen ON via IPC
            await toggleFullscreen();
            const afterToggleOn = await isWindowFullScreen();
            expect(afterToggleOn).toBe(true);

            E2ELogger.info('window-controls', 'Fullscreen entered via toggleFullscreen()');

            // 3. Toggle fullscreen OFF via IPC
            await toggleFullscreen();
            const afterToggleOff = await isWindowFullScreen();
            expect(afterToggleOff).toBe(false);

            E2ELogger.info('window-controls', 'Fullscreen exited via toggleFullscreen()');
        });
    });

    // =========================================================================
    // Cross-Platform: API-Based Tests
    // =========================================================================

    describe('Window State via API (All Platforms)', () => {
        it('should correctly report window state', async () => {
            const state = await getWindowState();

            // State should be an object with expected properties
            expect(state).toHaveProperty('isMaximized');
            expect(state).toHaveProperty('isMinimized');
            expect(state).toHaveProperty('isFullScreen');

            E2ELogger.info('window-controls', `Cross-platform state check: ${JSON.stringify(state)}`);
        });

        it('should maximize and restore via API calls', async () => {
            // Skip on macOS - maximize() doesn't work reliably
            if (await isMacOS()) {
                E2ELogger.info(
                    'window-controls',
                    'Skipping maximize test - macOS uses zoom/fullscreen instead of traditional maximize'
                );
                return;
            }

            // Skip on Linux CI - Xvfb doesn't support window manager operations
            if (await isLinuxCI()) {
                E2ELogger.info('window-controls', 'Skipping - Linux CI uses headless Xvfb');
                return;
            }

            // 2. Maximize via API
            await maximizeWindow();
            const afterMaximize = await isWindowMaximized();
            expect(afterMaximize).toBe(true);

            // 3. Restore via API
            await restoreWindow();
            const afterRestore = await isWindowMaximized();
            expect(afterRestore).toBe(false);

            E2ELogger.info('window-controls', 'API-based maximize/restore verified');
        });
    });
});

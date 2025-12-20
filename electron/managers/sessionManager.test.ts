/**
 * Integration tests for session and cookie persistence.
 * 
 * These tests verify that:
 * 1. Auth window shares session with main window (cookies are accessible to both)
 * 2. Cookies persist across app restarts (via Electron's persistent session)
 * 
 * Note: These tests mock Electron's session API to verify the expected behavior
 * without actually requiring Google login.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserWindow, session } from 'electron';

// Import the window manager and configs
import WindowManager from '../managers/windowManager';
import { AUTH_WINDOW_CONFIG, MAIN_WINDOW_CONFIG } from '../utils/constants';

describe('Session Sharing', () => {
    let windowManager: WindowManager;

    beforeEach(() => {
        vi.clearAllMocks();
        (BrowserWindow as any)._reset?.();
        windowManager = new WindowManager();
    });

    afterEach(() => {
        (BrowserWindow as any)._reset?.();
    });

    describe('Auth window session sharing', () => {
        it('auth window should not have a session partition (shares default session)', () => {
            // The auth window config must NOT have a partition
            // This ensures cookies set during auth are available to main window
            const webPrefs = AUTH_WINDOW_CONFIG.webPreferences;
            expect(webPrefs?.partition).toBeUndefined();
        });

        it('main window should not have a session partition (uses default session)', () => {
            // Main window also uses default session
            const webPrefs = MAIN_WINDOW_CONFIG.webPreferences;
            expect(webPrefs?.partition).toBeUndefined();
        });

        it('both windows use same session so cookies are shared', () => {
            // Create main window
            windowManager.createMainWindow();
            const mainWindow = windowManager.getMainWindow();
            expect(mainWindow).toBeTruthy();

            // Create auth window
            const authWindow = windowManager.createAuthWindow('https://accounts.google.com');
            expect(authWindow).toBeTruthy();

            // Both should have webContents (in real Electron, they'd share session)
            expect(mainWindow!.webContents).toBeDefined();
            expect(authWindow.webContents).toBeDefined();

            // The key point: neither has a custom partition, so they share default session
            // This is verified by the config tests above
        });
    });

    describe('Cookie-based authentication flow', () => {
        it('auth window closes after navigation to Gemini, allowing main window to access cookies', () => {
            // Create main window first
            windowManager.createMainWindow();
            const mainWindow = windowManager.getMainWindow();

            // Create auth window
            const authWindow = windowManager.createAuthWindow('https://accounts.google.com');

            // Get the did-navigate handler
            const navigateCall = authWindow.webContents.on.mock.calls.find(
                (c: any) => c[0] === 'did-navigate'
            );
            expect(navigateCall).toBeDefined();
            const navigateHandler = navigateCall![1];

            // Simulate successful login - navigation to Gemini
            navigateHandler({}, 'https://gemini.google.com/app');

            // Auth window should close
            expect(authWindow.close).toHaveBeenCalled();

            // Main window should still be available
            expect(windowManager.getMainWindow()).toBeTruthy();

            // After this, the frontend calls window.location.reload()
            // to pick up the new cookies from the shared session
        });
    });
});

describe('Cookie Persistence', () => {
    /**
     * These tests verify that cookies are configured to persist.
     * 
     * In Electron, the default session persists cookies to disk automatically.
     * The key requirements are:
     * 1. Use the default session (no partition prefix like 'persist:' or 'inmemory:')
     * 2. Don't use incognito/private mode
     * 3. Cookies are stored in the app's userData directory
     */

    it('AUTH_WINDOW_CONFIG uses default session for persistent cookies', () => {
        // No partition = default session = persistent by default
        expect(AUTH_WINDOW_CONFIG.webPreferences?.partition).toBeUndefined();

        // If there was a partition, it would need 'persist:' prefix for persistence
        // No partition means using default persistent session
    });

    it('MAIN_WINDOW_CONFIG uses default session for persistent cookies', () => {
        expect(MAIN_WINDOW_CONFIG.webPreferences?.partition).toBeUndefined();
    });

    it('session mock has cookie management interface', () => {
        // Verify our mock includes cookie management
        // In production, Electron's session.cookies provides:
        // - get() - retrieve cookies
        // - set() - set a cookie
        // - remove() - delete a cookie
        expect(session.defaultSession.cookies).toBeDefined();
        expect(session.defaultSession.cookies.get).toBeDefined();
        expect(session.defaultSession.cookies.set).toBeDefined();
        expect(session.defaultSession.cookies.remove).toBeDefined();
    });

    describe('Cookie persistence behavior documentation', () => {
        /**
         * This test documents the expected cookie persistence behavior.
         * Since we can't actually restart the app in unit tests, we verify
         * the configuration is correct for Electron's default behavior.
         */
        it('documents that cookies persist across app restarts by default', () => {
            // Electron's default session behavior:
            // 1. Cookies are stored in: app.getPath('userData')/Cookies
            // 2. Session storage is cleared on restart, but cookies persist
            // 3. To use in-memory only, you'd need: partition: 'inmemory:somekey'

            // Our configuration is correct because:
            // - No partition is set (uses default persistent session)
            // - contextIsolation is true (secure)
            // - nodeIntegration is false (secure)

            const authConfig = AUTH_WINDOW_CONFIG.webPreferences;

            // Verify we're NOT using an in-memory partition
            expect(authConfig?.partition).not.toBe('inmemory:auth');
            expect(authConfig?.partition).not.toBeDefined();

            // Verify security settings are correct
            expect(authConfig?.contextIsolation).toBe(true);
            expect(authConfig?.nodeIntegration).toBe(false);
        });
    });
});

describe('Session cookie flow integration', () => {
    let windowManager: WindowManager;

    beforeEach(() => {
        vi.clearAllMocks();
        (BrowserWindow as any)._reset?.();
        windowManager = new WindowManager();
    });

    afterEach(() => {
        (BrowserWindow as any)._reset?.();
    });

    it('complete auth flow: open auth window, login, auto-close, main window reloads', async () => {
        // 1. Create main window
        windowManager.createMainWindow();
        const mainWindow = windowManager.getMainWindow();
        expect(mainWindow).toBeTruthy();

        // 2. Simulate user clicking "Sign in to Google" menu item
        // This creates auth window that shares session with main window
        const authWindow = windowManager.createAuthWindow('https://accounts.google.com');
        expect(authWindow).toBeTruthy();
        expect(authWindow.loadURL).toHaveBeenCalledWith('https://accounts.google.com');

        // 3. User logs in (Google sets auth cookies in shared session)
        // We can't actually set cookies in unit tests, but we verify:
        // - Both windows share session (no partition)
        expect(AUTH_WINDOW_CONFIG.webPreferences?.partition).toBeUndefined();
        expect(MAIN_WINDOW_CONFIG.webPreferences?.partition).toBeUndefined();

        // 4. After login, Google redirects to gemini.google.com
        const navigateHandler = authWindow.webContents.on.mock.calls.find(
            (c: any) => c[0] === 'did-navigate'
        )![1];

        navigateHandler({}, 'https://gemini.google.com/app');

        // 5. Auth window auto-closes
        expect(authWindow.close).toHaveBeenCalled();

        // 6. Main window is still available for reload
        // (Frontend will call window.location.reload() after auth promise resolves)
        expect(windowManager.getMainWindow()).toBeTruthy();

        // 7. On next app startup, cookies from step 3 will still be present
        // (verified by lack of partition = persistent default session)
    });

    it('cookies survive auth window closure', () => {
        // Create auth window
        const authWindow = windowManager.createAuthWindow('https://accounts.google.com');

        // Get the closed handler
        const closedCall = authWindow.on.mock.calls.find((c: any) => c[0] === 'closed');
        expect(closedCall).toBeDefined();

        // Simulate auth window closing
        const closedHandler = closedCall![1];
        closedHandler();

        // Auth window is closed, but session (and cookies) persist
        // because we're using the default session which writes to disk

        // Verify we're not using an ephemeral session
        expect(AUTH_WINDOW_CONFIG.webPreferences?.partition).toBeUndefined();
    });
});

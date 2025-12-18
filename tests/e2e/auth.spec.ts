/**
 * E2E Test: Authentication Flow
 * 
 * Verifies that the "Sign in to Google" menu item opens the authentication window.
 * This is a critical user workflow.
 */

import { browser, expect } from '@wdio/globals';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForWindowCount, closeCurrentWindow } from './helpers/windowActions';

describe('Authentication Flow', () => {
    it('should open Google Sign-in window when clicking Sign In menu item', async () => {
        // 1. Initial state: just one window (Main)
        const initialHandles = await browser.getWindowHandles();
        expect(initialHandles.length).toBe(1);

        // 2. Click "Sign in to Google" using ID (no hardcoded mapping needed!)
        await clickMenuItemById('menu-file-signin');

        // 3. Wait for the new auth window to appear
        // The implementation creates a new BrowserWindow for auth
        await waitForWindowCount(2, 5000);

        const newHandles = await browser.getWindowHandles();
        expect(newHandles.length).toBe(2);

        // 4. Identify the new window
        const newWindowHandle = newHandles.find(h => h !== initialHandles[0]);
        if (!newWindowHandle) throw new Error('Could not find new window handle');

        // 5. Switch to the new window and verify properties
        await browser.switchToWindow(newWindowHandle);

        // Check URL contains google accounts
        const url = await browser.getUrl();
        expect(url).toContain('accounts.google.com');

        // 6. Cleanup: Close the auth window
        await closeCurrentWindow();

        // Verify we're back to 1 window
        await waitForWindowCount(1);
    });
});

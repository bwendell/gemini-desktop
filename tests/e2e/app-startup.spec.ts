/**
 * E2E Test: Application Startup
 * 
 * This test validates that:
 * 1. The app starts successfully
 * 2. There is 1 main window
 * 3. The main window contains a Gemini webview
 * 4. The main window contains a custom titlebar
 * 
 * Platform-aware: On macOS, custom window controls and menu bar are not rendered.
 */

import { browser, $, expect } from '@wdio/globals';
import { getPlatform, usesCustomControls } from './helpers/platform';
import { Selectors } from './helpers/selectors';
import { E2ELogger } from './helpers/logger';

describe('Application Startup', () => {
    beforeEach(async () => {
        // Wait for the main layout to be ready
        const mainLayout = await $(Selectors.mainLayout);
        await mainLayout.waitForExist({ timeout: 15000 });
    });

    it('should have a custom titlebar with the correct title', async () => {
        // Wait for the app to fully load
        const titlebar = await $(Selectors.titlebar);
        await titlebar.waitForExist({ timeout: 10000 });

        // Verify titlebar exists
        await expect(titlebar).toBeExisting();

        // Verify titlebar contains title text
        const titleText = await $(Selectors.titlebarTitle);
        await expect(titleText).toBeExisting();
        await expect(titleText).toHaveText('Gemini Desktop');
    });

    it('should have window control buttons (Windows/Linux only)', async () => {
        if (!(await usesCustomControls())) {
            // Verify buttons DON'T exist on macOS
            const minimize = await $(Selectors.minimizeButton);
            await expect(minimize).not.toBeExisting();
            E2ELogger.info('app-startup', 'Custom controls correctly hidden on macOS');
            return;
        }

        // Windows/Linux: Verify custom controls exist
        const minimizeBtn = await $(Selectors.minimizeButton);
        await expect(minimizeBtn).toBeExisting();

        const maximizeBtn = await $(Selectors.maximizeButton);
        await expect(maximizeBtn).toBeExisting();

        const closeBtn = await $(Selectors.closeButton);
        await expect(closeBtn).toBeExisting();
    });

    it('should have a menu bar with File, View, and Help menus (Windows/Linux only)', async () => {
        if (!(await usesCustomControls())) {
            // Verify menu bar doesn't exist on macOS
            const menuBar = await $(Selectors.menuBar);
            await expect(menuBar).not.toBeExisting();
            E2ELogger.info('app-startup', 'Custom menu bar correctly hidden on macOS');
            return;
        }

        // Windows/Linux: Verify menu bar exists
        const menuBar = await $(Selectors.menuBar);
        await expect(menuBar).toBeExisting();

        // Check for File menu button
        const fileMenu = await $(Selectors.menuButton('File'));
        await expect(fileMenu).toBeExisting();

        // Check for View menu button
        const viewMenu = await $(Selectors.menuButton('View'));
        await expect(viewMenu).toBeExisting();

        // Check for Help menu button
        const helpMenu = await $(Selectors.menuButton('Help'));
        await expect(helpMenu).toBeExisting();
    });

    it('should have a webview container', async () => {
        // Check for the webview container 
        const webviewContainer = await $(Selectors.webviewContainer);
        await expect(webviewContainer).toBeExisting();
    });
});

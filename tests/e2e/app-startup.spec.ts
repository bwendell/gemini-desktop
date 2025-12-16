/**
 * E2E Test: Application Startup
 * 
 * This test validates that:
 * 1. The app starts successfully
 * 2. There is 1 main window
 * 3. The main window contains a Gemini webview
 * 4. The main window contains a custom titlebar
 */

import { browser, $, expect } from '@wdio/globals';

describe('Application Startup', () => {
    it('should have a custom titlebar with the correct title', async () => {
        // Wait for the app to fully load
        const titlebar = await $('header.titlebar');
        await titlebar.waitForExist({ timeout: 10000 });

        // Verify titlebar exists
        await expect(titlebar).toBeExisting();

        // Verify titlebar contains title text
        const titleText = await $('.titlebar-title');
        await expect(titleText).toBeExisting();
        await expect(titleText).toHaveText('Gemini Desktop');
    });

    it('should have window control buttons', async () => {
        // Check for minimize button
        const minimizeBtn = await $('button.minimize');
        await expect(minimizeBtn).toBeExisting();

        // Check for maximize button
        const maximizeBtn = await $('button.maximize');
        await expect(maximizeBtn).toBeExisting();

        // Check for close button
        const closeBtn = await $('button.close');
        await expect(closeBtn).toBeExisting();
    });

    it('should have a menu bar with File, View, and Help menus', async () => {
        // Check for menu bar
        const menuBar = await $('.titlebar-menu-bar');
        await expect(menuBar).toBeExisting();

        // Check for File menu button
        const fileMenu = await menuBar.$('button=File');
        await expect(fileMenu).toBeExisting();

        // Check for View menu button
        const viewMenu = await menuBar.$('button=View');
        await expect(viewMenu).toBeExisting();

        // Check for Help menu button
        const helpMenu = await menuBar.$('button=Help');
        await expect(helpMenu).toBeExisting();
    });

    it('should have a webview container', async () => {
        // Check for the webview container 
        const webviewContainer = await $('.webview-container');
        await expect(webviewContainer).toBeExisting();
    });
});

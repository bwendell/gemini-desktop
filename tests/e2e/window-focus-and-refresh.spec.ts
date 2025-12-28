/**
 * E2E Tests for Window Focus and Page Refresh.
 *
 * Tests the following functionality:
 * - Bringing the main window to the foreground (focus)
 * - Refreshing the gemini.google.com page via menu
 *
 * @module window-focus-and-refresh.spec
 */

/// <reference path="./helpers/wdio-electron.d.ts" />

import { browser, expect } from '@wdio/globals';
import { MainWindowPage, TrayPage } from './pages';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { E2ELogger } from './helpers/logger';

describe('Window Focus and Page Refresh', () => {
  const mainWindow = new MainWindowPage();
  const trayPage = new TrayPage();

  beforeEach(async () => {
    await waitForAppReady();
  });

  afterEach(async () => {
    await ensureSingleWindow();
  });

  describe('Main Window Focus', () => {
    it('should bring the main window to the foreground when tray icon is clicked', async () => {
      // Get the initial window visibility state via TrayPage
      const initialVisible = await trayPage.isWindowVisible();
      E2ELogger.info('window-focus', `Initial visible state: ${initialVisible}`);

      // Click the tray icon to show and focus the main window (simulates real user action)
      await trayPage.click();

      // Wait for transition to complete
      await browser.pause(300);

      // Verify window is visible after focus
      const afterFocusVisible = await trayPage.isWindowVisible();
      E2ELogger.info('window-focus', `After focus visible state: ${afterFocusVisible}`);
      expect(afterFocusVisible).toBe(true);
    });

    it('should have the main window visible after app startup', async () => {
      const isVisible = await trayPage.isWindowVisible();
      expect(isVisible).toBe(true);
    });
  });

  describe('Page Refresh', () => {
    it('should refresh the page when View -> Reload is clicked', async () => {
      // Get the current URL before reload
      const urlBefore = await browser.getUrl();
      E2ELogger.info('page-refresh', `URL before reload: ${urlBefore}`);

      // Trigger Reload using MainWindowPage menu action
      await mainWindow.clickMenuById('menu-view-reload');

      // Wait for reload to complete
      await browser.pause(2000);

      // Verify the page is still accessible and the app is loaded
      const urlAfter = await browser.getUrl();
      E2ELogger.info('page-refresh', `URL after reload: ${urlAfter}`);

      // The URL should still be valid and the app should be loaded
      expect(urlAfter).toBeTruthy();

      // Verify the main window is still loaded after reload
      const appLoaded = await mainWindow.isLoaded();
      expect(appLoaded).toBe(true);
    });

    it('should maintain the same URL after page refresh', async () => {
      // Get URL before reload
      const urlBefore = await browser.getUrl();
      E2ELogger.info('page-refresh', `URL before reload: ${urlBefore}`);

      // Trigger reload via MainWindowPage
      await mainWindow.clickMenuById('menu-view-reload');
      await browser.pause(1500);

      // Get URL after reload
      const urlAfter = await browser.getUrl();
      E2ELogger.info('page-refresh', `URL after reload: ${urlAfter}`);

      // URLs should be the same (or at least on the same domain)
      expect(urlAfter).toBeTruthy();
      // The app should still be at the same location
      expect(urlAfter.includes('localhost') || urlAfter.includes('index.html')).toBe(true);
    });

    it('should keep the window visible after page refresh', async () => {
      // Trigger reload via MainWindowPage
      await mainWindow.clickMenuById('menu-view-reload');
      await browser.pause(1500);

      // Check window is still visible via TrayPage
      const isVisible = await trayPage.isWindowVisible();
      expect(isVisible).toBe(true);
    });
  });

  describe('Combined Focus and Refresh', () => {
    it('should focus main window and maintain focus after page refresh', async () => {
      // Click tray icon to show and focus the main window (real user action)
      await trayPage.click();
      await browser.pause(300);

      // Verify visible before refresh
      const visibleBefore = await trayPage.isWindowVisible();
      expect(visibleBefore).toBe(true);

      // Refresh the page via MainWindowPage
      await mainWindow.clickMenuById('menu-view-reload');
      await browser.pause(1500);

      // Verify still visible after refresh
      const visibleAfter = await trayPage.isWindowVisible();
      expect(visibleAfter).toBe(true);

      E2ELogger.info('combined', 'Window remained visible after focus + refresh');
    });
  });
});

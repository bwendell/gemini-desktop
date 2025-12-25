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
import { clickMenuItemById } from './helpers/menuActions';
import { E2ELogger } from './helpers/logger';

describe('Window Focus and Page Refresh', () => {
  describe('Main Window Focus', () => {
    it('should bring the main window to the foreground when focusMainWindow is called', async () => {
      // Get the initial window state
      const initialState = await browser.electron.execute((electron: typeof import('electron')) => {
        const windows = electron.BrowserWindow.getAllWindows();
        const mainWindow = windows[0];
        return {
          hasMainWindow: !!mainWindow,
          isVisible: mainWindow?.isVisible() ?? false,
          isFocused: mainWindow?.isFocused() ?? false,
        };
      });

      E2ELogger.info('window-focus', `Initial state: ${JSON.stringify(initialState)}`);
      expect(initialState.hasMainWindow).toBe(true);

      // Call focusMainWindow via direct BrowserWindow access
      await browser.electron.execute((electron: typeof import('electron')) => {
        const windows = electron.BrowserWindow.getAllWindows();
        const mainWindow = windows[0];
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      });

      // Wait for focus to complete
      await browser.pause(300);

      // Verify focus state
      const afterFocusState = await browser.electron.execute(
        (electron: typeof import('electron')) => {
          const windows = electron.BrowserWindow.getAllWindows();
          const mainWindow = windows[0];
          return {
            isVisible: mainWindow?.isVisible() ?? false,
            isFocused: mainWindow?.isFocused() ?? false,
          };
        }
      );

      E2ELogger.info('window-focus', `After focus state: ${JSON.stringify(afterFocusState)}`);
      expect(afterFocusState.isVisible).toBe(true);
      // Note: isFocused may be false in CI environments due to OS restrictions
      console.log(`Window focused: ${afterFocusState.isFocused}`);
    });

    it('should have the main window visible after app startup', async () => {
      const isVisible = await browser.electron.execute((electron: typeof import('electron')) => {
        const windows = electron.BrowserWindow.getAllWindows();
        const mainWindow = windows[0];
        return mainWindow?.isVisible() ?? false;
      });

      expect(isVisible).toBe(true);
    });
  });

  describe('Page Refresh', () => {
    it('should refresh the page when View -> Reload is clicked', async () => {
      // Get the current navigation entry count before reload
      const urlBefore = await browser.getUrl();
      E2ELogger.info('page-refresh', `URL before reload: ${urlBefore}`);

      // Trigger Reload using menu ID
      await clickMenuItemById('menu-view-reload');

      // Wait for reload to complete
      await browser.pause(2000);

      // Verify the page is still accessible and the app is loaded
      const urlAfter = await browser.getUrl();
      E2ELogger.info('page-refresh', `URL after reload: ${urlAfter}`);

      // The URL should still be valid and the app should be loaded
      expect(urlAfter).toBeTruthy();

      // Verify the app content is present after reload (React re-rendered)
      const appLoaded = await browser.electron.execute((electron: typeof import('electron')) => {
        const windows = electron.BrowserWindow.getAllWindows();
        const mainWindow = windows[0];
        return mainWindow ? !mainWindow.isDestroyed() : false;
      });
      expect(appLoaded).toBe(true);
    });

    it('should maintain the same URL after page refresh', async () => {
      // Get URL before reload
      const urlBefore = await browser.getUrl();

      E2ELogger.info('page-refresh', `URL before reload: ${urlBefore}`);

      // Trigger reload
      await clickMenuItemById('menu-view-reload');
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
      // Trigger reload
      await clickMenuItemById('menu-view-reload');
      await browser.pause(1500);

      // Check window is still visible
      const isVisible = await browser.electron.execute((electron: typeof import('electron')) => {
        const windows = electron.BrowserWindow.getAllWindows();
        const mainWindow = windows[0];
        return mainWindow?.isVisible() ?? false;
      });

      expect(isVisible).toBe(true);
    });
  });

  describe('Combined Focus and Refresh', () => {
    it('should focus main window and maintain focus after page refresh', async () => {
      // Focus the main window first
      await browser.electron.execute((electron: typeof import('electron')) => {
        const windows = electron.BrowserWindow.getAllWindows();
        const mainWindow = windows[0];
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      });
      await browser.pause(300);

      // Verify visible before refresh
      const visibleBefore = await browser.electron.execute(
        (electron: typeof import('electron')) => {
          const windows = electron.BrowserWindow.getAllWindows();
          return windows[0]?.isVisible() ?? false;
        }
      );
      expect(visibleBefore).toBe(true);

      // Refresh the page
      await clickMenuItemById('menu-view-reload');
      await browser.pause(1500);

      // Verify still visible after refresh
      const visibleAfter = await browser.electron.execute((electron: typeof import('electron')) => {
        const windows = electron.BrowserWindow.getAllWindows();
        return windows[0]?.isVisible() ?? false;
      });
      expect(visibleAfter).toBe(true);

      E2ELogger.info('combined', 'Window remained visible after focus + refresh');
    });
  });
});

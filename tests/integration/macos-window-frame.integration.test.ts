/// <reference path="../e2e/helpers/wdio-electron.d.ts" />

/**
 * Integration test for macOS window frame behavior.
 *
 * Verifies that on macOS, the window frame, titlebar, tab bar, and content area
 * are correctly positioned and sized, with proper visibility of UI elements.
 * Tests are skipped on non-macOS platforms.
 */

import { browser, expect } from '@wdio/globals';

describe('macOS Window Frame Integration Tests', () => {
    before(async () => {
        await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);
    });

    it('should have correct window frame structure on macOS', async () => {
        // Get platform from Electron
        const platform = await browser.execute(() => {
            return (window as any).electronAPI?.platform;
        });

        // Skip if not on macOS
        if (platform !== 'darwin') {
            console.log('Skipping macOS-specific window frame test on non-macOS platform');
            return;
        }

        // Check main-content has non-zero height (takes up space below titlebar)
        const mainContentHeight = await browser.execute(() => {
            const mainContent = document.querySelector('.main-content');
            return mainContent ? (mainContent as HTMLElement).offsetHeight : 0;
        });

        expect(mainContentHeight).toBeGreaterThan(0);

        // Check tab-bar exists and has height
        const tabBar = await browser.$('.tab-bar');
        await expect(tabBar).toBeExisting();

        const tabBarHeight = await browser.execute(() => {
            const tabBar = document.querySelector('.tab-bar');
            return tabBar ? (tabBar as HTMLElement).offsetHeight : 0;
        });

        expect(tabBarHeight).toBeGreaterThan(0);

        // Check webview-container exists and has non-zero size
        const webviewContainer = await browser.$('.webview-container');
        await expect(webviewContainer).toBeExisting();

        const webviewSize = await browser.execute(() => {
            const container = document.querySelector('.webview-container');
            if (!container) return { width: 0, height: 0 };
            return {
                width: (container as HTMLElement).offsetWidth,
                height: (container as HTMLElement).offsetHeight,
            };
        });

        expect(webviewSize.width).toBeGreaterThan(0);
        expect(webviewSize.height).toBeGreaterThan(0);

        // Check gemini-iframe (inside webview-container) exists and has size
        const geminiIframe = await browser.$('.webview-container .gemini-iframe');
        await expect(geminiIframe).toBeExisting();

        const iframeSize = await browser.execute(() => {
            const iframe = document.querySelector('iframe.gemini-iframe');
            if (!iframe) return { width: 0, height: 0 };
            return {
                width: (iframe as HTMLElement).offsetWidth,
                height: (iframe as HTMLElement).offsetHeight,
            };
        });

        expect(iframeSize.width).toBeGreaterThan(0);
        expect(iframeSize.height).toBeGreaterThan(0);
    });

    it('should have proper window frame layout with visibility on macOS', async () => {
        // Get platform from Electron
        const platform = await browser.execute(() => {
            return (window as any).electronAPI?.platform;
        });

        // Skip if not on macOS
        if (platform !== 'darwin') {
            console.log('Skipping macOS window frame layout test on non-macOS platform');
            return;
        }

        // Verify main-layout exists and fills viewport
        const mainLayout = await browser.$('.main-layout');
        await expect(mainLayout).toBeExisting();

        const layoutDimensions = await browser.execute(() => {
            const layout = document.querySelector('.main-layout');
            if (!layout) return { width: 0, height: 0 };
            return {
                width: (layout as HTMLElement).offsetWidth,
                height: (layout as HTMLElement).offsetHeight,
                windowWidth: window.innerWidth,
                windowHeight: window.innerHeight,
            };
        });

        // Layout should match viewport
        expect(layoutDimensions.width).toBe(layoutDimensions.windowWidth);
        expect(layoutDimensions.height).toBe(layoutDimensions.windowHeight);

        const mainContentInfo = await browser.execute(() => {
            const mainContent = document.querySelector('.main-content');
            if (!mainContent) {
                return { display: null, height: 0 };
            }
            const style = window.getComputedStyle(mainContent);
            return { display: style.display, height: (mainContent as HTMLElement).offsetHeight };
        });

        expect(mainContentInfo.display).not.toBeNull();
        expect(mainContentInfo.display).not.toBe('none');
        expect(mainContentInfo.height).toBeGreaterThan(0);

        // Verify webview-container is absolutely positioned (fills main-content)
        const webviewPosition = await browser.execute(() => {
            const container = document.querySelector('.webview-container');
            return container ? window.getComputedStyle(container).position : null;
        });

        expect(webviewPosition).toBe('absolute');
    });

    it('should have visible frame controls on non-macOS platforms (conditionally)', async () => {
        // Get platform from Electron
        const platform = await browser.execute(() => {
            return (window as any).electronAPI?.platform;
        });

        // Only test on non-macOS platforms
        if (platform === 'darwin') {
            console.log('Skipping non-macOS frame test on macOS platform');
            return;
        }

        // Check that titlebar exists (frames controls)
        const titlebar = await browser.$('.titlebar');
        await expect(titlebar).toBeExisting();

        // Verify it's visible
        const titlebarVisible = await browser.execute(() => {
            const titlebar = document.querySelector('.titlebar');
            return titlebar ? window.getComputedStyle(titlebar).display !== 'none' : false;
        });

        expect(titlebarVisible).toBe(true);
    });
});

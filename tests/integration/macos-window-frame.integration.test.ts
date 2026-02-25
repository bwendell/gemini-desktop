/// <reference path="../e2e/helpers/wdio-electron.d.ts" />

/**
 * Integration test for macOS window frame behavior.
 *
 * Verifies that on macOS, the window frame, titlebar, tab bar, and content area
 * are correctly positioned and sized, with proper visibility of UI elements.
 * Tests are skipped on non-macOS platforms.
 */

import { browser, expect } from '@wdio/globals';

const browserWithElectron = browser as unknown as {
    execute<T>(script: string | ((...args: unknown[]) => T), ...args: unknown[]): Promise<T>;
    waitUntil<T>(
        condition: () => Promise<T> | T,
        options?: { timeout?: number; timeoutMsg?: string; interval?: number }
    ): Promise<T>;
    $(selector: string): Promise<WebdriverIO.Element>;
    getWindowHandles(): Promise<string[]>;
};

describe('macOS Window Frame Integration Tests', () => {
    before(async () => {
        await browserWithElectron.waitUntil(async () => (await browserWithElectron.getWindowHandles()).length > 0);
    });

    it('should have correct window frame structure on macOS', async () => {
        // Get platform from Electron
        const platform = await browserWithElectron.execute(() => {
            return (window as any).electronAPI?.platform;
        });

        // Skip if not on macOS
        if (platform !== 'darwin') {
            console.log('Skipping macOS-specific window frame test on non-macOS platform');
            return;
        }

        // Check main-content has non-zero height (takes up space below titlebar)
        const mainContentHeight = await browserWithElectron.execute(() => {
            const mainContent = document.querySelector('.main-content');
            return mainContent ? (mainContent as HTMLElement).offsetHeight : 0;
        });

        expect(mainContentHeight).toBeGreaterThan(0);

        // Check tab-bar exists and has height
        const tabBar = await browserWithElectron.$('.tab-bar');
        await expect(tabBar).toBeExisting();

        const tabBarHeight = await browserWithElectron.execute(() => {
            const tabBar = document.querySelector('.tab-bar');
            return tabBar ? (tabBar as HTMLElement).offsetHeight : 0;
        });

        expect(tabBarHeight).toBeGreaterThan(0);

        // Check webview-container exists and has non-zero size
        const webviewContainer = await browserWithElectron.$('.webview-container');
        await expect(webviewContainer).toBeExisting();

        const webviewSize = await browserWithElectron.execute(() => {
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
        const geminiIframe = await browserWithElectron.$('.webview-container .gemini-iframe');
        await expect(geminiIframe).toBeExisting();

        const iframeSize = await browserWithElectron.execute(() => {
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
        const platform = await browserWithElectron.execute(() => {
            return (window as any).electronAPI?.platform;
        });

        // Skip if not on macOS
        if (platform !== 'darwin') {
            console.log('Skipping macOS window frame layout test on non-macOS platform');
            return;
        }

        // Verify main-layout exists and fills viewport
        const mainLayout = await browserWithElectron.$('.main-layout');
        await expect(mainLayout).toBeExisting();

        const layoutDimensions = await browserWithElectron.execute(() => {
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

        // Verify main-content is flex child
        const mainContentDisplay = await browserWithElectron.execute(() => {
            const mainContent = document.querySelector('.main-content');
            return mainContent ? window.getComputedStyle(mainContent).display : null;
        });

        expect(mainContentDisplay).toBe('flex');

        // Verify webview-container is absolutely positioned (fills main-content)
        const webviewPosition = await browserWithElectron.execute(() => {
            const container = document.querySelector('.webview-container');
            return container ? window.getComputedStyle(container).position : null;
        });

        expect(webviewPosition).toBe('absolute');
    });

    it('should have visible frame controls on non-macOS platforms (conditionally)', async () => {
        // Get platform from Electron
        const platform = await browserWithElectron.execute(() => {
            return (window as any).electronAPI?.platform;
        });

        // Only test on non-macOS platforms
        if (platform === 'darwin') {
            console.log('Skipping non-macOS frame test on macOS platform');
            return;
        }

        // Check that titlebar exists (frames controls)
        const titlebar = await browserWithElectron.$('.titlebar');
        await expect(titlebar).toBeExisting();

        // Verify it's visible
        const titlebarVisible = await browserWithElectron.execute(() => {
            const titlebar = document.querySelector('.titlebar');
            return titlebar ? window.getComputedStyle(titlebar).display !== 'none' : false;
        });

        expect(titlebarVisible).toBe(true);
    });
});

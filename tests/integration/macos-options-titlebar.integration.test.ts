/**
 * Integration test for macOS options window titlebar styling.
 *
 * Verifies that the options window titlebar correctly handles macOS traffic light button spacing
 * by applying the appropriate CSS class and padding.
 */

import { browser, expect } from '@wdio/globals';

describe('macOS Options Titlebar Integration Tests', () => {
    let mainWindowHandle: string;

    before(async () => {
        await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);

        // Store main window handle
        const handles = await browser.getWindowHandles();
        mainWindowHandle = handles[0];
    });

    afterEach(async () => {
        // Close options window if open
        await browser.electron.execute(() => {
            // @ts-expect-error
            const { BrowserWindow } = require('electron');
            const mainWin = global.windowManager.getMainWindow();
            BrowserWindow.getAllWindows().forEach((win: any) => {
                if (win !== mainWin && !win.isDestroyed()) {
                    win.close();
                }
            });
        });

        await browser.pause(300);

        // Switch back to main window
        const handles = await browser.getWindowHandles();
        if (handles.length > 0) {
            await browser.switchToWindow(handles[0]);
        }
    });

    it('should have correct options titlebar structure on macOS', async () => {
        // Get platform from Electron
        const platform = await browser.execute(() => {
            return (window as any).electronAPI?.platform;
        });

        // Skip if not on macOS (test will pass but not really run the assertions)
        if (platform !== 'darwin') {
            console.log('Skipping macOS-specific test on non-macOS platform');
            return;
        }

        // Open options window
        await browser.electron.execute(() => {
            // @ts-expect-error
            global.windowManager.createOptionsWindow();
        });

        // Wait for window to appear
        await browser.waitUntil(
            async () => {
                const handles = await browser.getWindowHandles();
                return handles.length === 2;
            },
            { timeout: 5000, timeoutMsg: 'Options window did not appear' }
        );

        // Switch to options window
        const handles = await browser.getWindowHandles();
        const optionsHandle = handles.find((h) => h !== mainWindowHandle);
        if (optionsHandle) {
            await browser.switchToWindow(optionsHandle);
        }

        // Check titlebar exists
        const titlebar = await browser.$('.options-titlebar');
        await expect(titlebar).toBeExisting();

        // Verify macOS class is applied
        const hasMacOsClass = await browser.execute(() => {
            const titlebar = document.querySelector('.options-titlebar');
            return titlebar?.classList.contains('macos');
        });
        expect(hasMacOsClass).toBe(true);

        // Verify padding is applied (check computed style)
        const paddingLeft = await browser.execute(() => {
            // Logic for querying the icon or checking styles
            // In CSS we added: .options-titlebar.macos .options-titlebar-icon { margin-left: 70px; }
            const icon = document.querySelector('.options-titlebar-icon');
            return icon ? window.getComputedStyle(icon).marginLeft : null;
        });

        // Should be 70px as defined in CSS
        expect(paddingLeft).toBe('70px');
    });

    it('should not have macOS class on Windows/Linux', async () => {
        // Get platform from Electron
        const platform = await browser.execute(() => {
            return (window as any).electronAPI?.platform;
        });

        // Skip if on macOS
        if (platform === 'darwin') {
            console.log('Skipping Windows/Linux-specific test on macOS platform');
            return;
        }

        // Open options window
        await browser.electron.execute(() => {
            // @ts-expect-error
            global.windowManager.createOptionsWindow();
        });

        // Wait for window to appear
        await browser.waitUntil(
            async () => {
                const handles = await browser.getWindowHandles();
                return handles.length === 2;
            },
            { timeout: 5000 }
        );

        // Switch to options window
        const handles = await browser.getWindowHandles();
        const optionsHandle = handles.find((h) => h !== mainWindowHandle);
        if (optionsHandle) {
            await browser.switchToWindow(optionsHandle);
        }

        // Check titlebar exists
        const titlebar = await browser.$('.options-titlebar');
        await expect(titlebar).toBeExisting();

        // Verify macOS class is NOT applied
        const hasMacOsClass = await browser.execute(() => {
            const titlebar = document.querySelector('.options-titlebar');
            return titlebar?.classList.contains('macos');
        });
        expect(hasMacOsClass).toBe(false);

        // Verify default margin is applied (12px)
        // CSS: .options-titlebar-icon { margin-left: 12px; }
        const marginLeft = await browser.execute(() => {
            const icon = document.querySelector('.options-titlebar-icon');
            return icon ? window.getComputedStyle(icon).marginLeft : null;
        });

        expect(marginLeft).toBe('12px');
    });
});

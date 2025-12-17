
import { browser, $, expect } from '@wdio/globals';

describe('Theme Feature', () => {
    it('should apply correct text colors to Options titlebar in light and dark modes', async () => {
        // 1. Open Options Window
        const menuBar = await $('.titlebar-menu-bar');
        await menuBar.waitForExist();
        const fileButton = await $('[data-testid="menu-button-File"]');
        await fileButton.click();
        const optionsItem = await $('[data-testid="menu-item-Options"]');
        await optionsItem.waitForExist();
        await optionsItem.click();

        // Wait for Options Window
        await browser.waitUntil(async () => {
            return (await browser.getWindowHandles()).length === 2;
        });

        const handles = await browser.getWindowHandles();
        const mainWindowHandle = handles[0];
        const optionsWindowHandle = handles[1];

        // Switch to Options Window
        await browser.switchToWindow(optionsWindowHandle);

        // Wait for titlebar to be present
        const titleElement = await $('[data-testid="options-titlebar-title"]');
        await titleElement.waitForExist();

        // Select Light Theme (using new card-based selector)
        const lightThemeCard = await $('[data-testid="theme-card-light"]');
        await lightThemeCard.click();

        // Small delay for CSS to apply
        await browser.pause(500);

        // Debug: Log all CSS variable and computed style info for LIGHT theme
        const lightDebugInfo = await browser.execute(() => {
            const titleEl = document.querySelector('[data-testid="options-titlebar-title"]');
            const htmlEl = document.documentElement;
            const bodyEl = document.body;

            if (!titleEl) {
                return { error: 'Title element not found' };
            }

            const computedStyle = window.getComputedStyle(titleEl);
            const htmlStyle = window.getComputedStyle(htmlEl);
            const bodyStyle = window.getComputedStyle(bodyEl);

            return {
                dataTheme: htmlEl.getAttribute('data-theme'),
                titleColor: computedStyle.color,
                titleBackgroundColor: computedStyle.backgroundColor,
                titleFontSize: computedStyle.fontSize,
                bodyColor: bodyStyle.color,
                bodyBackgroundColor: bodyStyle.backgroundColor,
                // Check CSS variable resolution
                cssVarTextPrimary: htmlStyle.getPropertyValue('--text-primary').trim(),
                cssVarBgPrimary: htmlStyle.getPropertyValue('--bg-primary').trim(),
                cssVarTitlebarText: htmlStyle.getPropertyValue('--titlebar-text').trim(),
                cssVarTitlebarBg: htmlStyle.getPropertyValue('--titlebar-bg').trim(),
                // Check if stylesheets are loaded
                styleSheetCount: document.styleSheets.length,
                // HTML element classes/attributes
                htmlClasses: htmlEl.className,
                bodyClasses: bodyEl.className,
            };
        });

        console.log('=== DEBUG: Light Theme Title Bar Info ===');
        console.log(JSON.stringify(lightDebugInfo, null, 2));

        // Verify the data-theme attribute is set
        expect(lightDebugInfo.dataTheme).toBe('light');

        // In light mode, title color should be dark (black-ish)
        // rgb(32, 33, 36) is #202124 which is --text-primary in light mode
        // The color should NOT be rgb(232, 234, 237) which is #e8eaed (light/white text)
        console.log(`Light mode - Title computed color: ${lightDebugInfo.titleColor}`);
        console.log(`Light mode - CSS var --text-primary: ${lightDebugInfo.cssVarTextPrimary}`);
        console.log(`Light mode - Body color: ${lightDebugInfo.bodyColor}`);

        // Assert that the color is NOT the dark theme color (light gray/white text)
        expect(lightDebugInfo.titleColor).not.toBe('rgb(232, 234, 237)'); // Dark theme text color
        expect(lightDebugInfo.titleColor).not.toBe('rgb(204, 204, 204)'); // Old hardcoded color #cccccc

        // The color should be the light theme text color (dark)
        // #202124 = rgb(32, 33, 36)
        expect(lightDebugInfo.titleColor).toBe('rgb(32, 33, 36)');

        // Now switch to dark theme and verify (using new card-based selector)
        const darkThemeCard = await $('[data-testid="theme-card-dark"]');
        await darkThemeCard.click();
        await browser.pause(500);

        const darkDebugInfo = await browser.execute(() => {
            const titleEl = document.querySelector('[data-testid="options-titlebar-title"]');
            const htmlEl = document.documentElement;
            const computedStyle = window.getComputedStyle(titleEl!);
            const htmlStyle = window.getComputedStyle(htmlEl);

            return {
                dataTheme: htmlEl.getAttribute('data-theme'),
                titleColor: computedStyle.color,
                cssVarTextPrimary: htmlStyle.getPropertyValue('--text-primary').trim(),
            };
        });

        console.log('=== DEBUG: Dark Theme Title Bar Info ===');
        console.log(JSON.stringify(darkDebugInfo, null, 2));
        console.log(`Dark mode - Title computed color: ${darkDebugInfo.titleColor}`);

        expect(darkDebugInfo.dataTheme).toBe('dark');
        // In dark mode, text should be light: #e8eaed = rgb(232, 234, 237)
        expect(darkDebugInfo.titleColor).toBe('rgb(232, 234, 237)');

        // Verify main window also synced
        await browser.switchToWindow(mainWindowHandle);
        const mainWindowTheme = await browser.execute(() => {
            return document.documentElement.getAttribute('data-theme');
        });
        expect(mainWindowTheme).toBe('dark');

        // Close Options Window
        await browser.switchToWindow(optionsWindowHandle);
        const closeBtn = await $('[data-testid="options-close-button"]');
        await closeBtn.click();
    });
});


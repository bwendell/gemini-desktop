/**
 * E2E Test: Theme Feature
 *
 * Tests theme switching and color verification.
 *
 * Platform-aware: Uses Page Object Model for cleaner test structure.
 */

import { browser, expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage } from './pages';
import { waitForWindowCount } from './helpers/windowActions';

describe('Theme Feature', () => {
  // Create page object instances
  const mainWindow = new MainWindowPage();
  const optionsPage = new OptionsPage();

  it('should apply correct text colors to Options titlebar in light and dark modes', async () => {
    // 1. Open Options Window via menu
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2);
    await optionsPage.waitForLoad();

    // Wait for titlebar to be present
    const titleElement = await browser.$('[data-testid="options-titlebar-title"]');
    await titleElement.waitForExist();

    // 2. Select Light Theme using Page Object
    await optionsPage.selectTheme('light');

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

    // Verify theme using Page Object
    const lightTheme = await optionsPage.getCurrentTheme();
    expect(lightTheme).toBe('light');

    // In light mode, title color should be dark (black-ish)
    // rgb(32, 33, 36) is #202124 which is --text-primary in light mode
    console.log(`Light mode - Title computed color: ${lightDebugInfo.titleColor}`);
    console.log(`Light mode - CSS var --text-primary: ${lightDebugInfo.cssVarTextPrimary}`);
    console.log(`Light mode - Body color: ${lightDebugInfo.bodyColor}`);

    // Assert that the color is NOT the dark theme color (light gray/white text)
    expect(lightDebugInfo.titleColor).not.toBe('rgb(232, 234, 237)'); // Dark theme text color
    expect(lightDebugInfo.titleColor).not.toBe('rgb(204, 204, 204)'); // Old hardcoded color #cccccc

    // The color should be the light theme text color (dark)
    // #202124 = rgb(32, 33, 36)
    expect(lightDebugInfo.titleColor).toBe('rgb(32, 33, 36)');

    // 3. Switch to dark theme using Page Object
    await optionsPage.selectTheme('dark');
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

    // Verify theme using Page Object
    const darkTheme = await optionsPage.getCurrentTheme();
    expect(darkTheme).toBe('dark');

    // In dark mode, text should be light: #e8eaed = rgb(232, 234, 237)
    expect(darkDebugInfo.titleColor).toBe('rgb(232, 234, 237)');

    // 4. Verify main window also synced
    const handles = await browser.getWindowHandles();
    await browser.switchToWindow(handles[0]);
    const mainWindowTheme = await browser.execute(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(mainWindowTheme).toBe('dark');

    // 5. Switch back to Options Window and close using Page Object
    await browser.switchToWindow(handles[1]);
    await optionsPage.close();
  });
});

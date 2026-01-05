/**
 * E2E tests for the enhanced Theme Selector component.
 *
 * Tests visual elements, animations, and selection behavior
 * of the new card-based theme selector.
 *
 * Platform-aware: Uses Page Objects and workflow helpers.
 */

import { browser, $, $$, expect } from '@wdio/globals';
import { MainWindowPage, OptionsPage } from './pages';
import { waitForAppReady, ensureSingleWindow } from './helpers/workflows';
import { expectElementDisplayed, expectThemeApplied } from './helpers/assertions';
import { waitForWindowCount } from './helpers/windowActions';

describe('Theme Selector Visual Verification', () => {
  const mainWindow = new MainWindowPage();
  const optionsPage = new OptionsPage();

  beforeEach(async () => {
    await waitForAppReady();
  });

  afterEach(async () => {
    await ensureSingleWindow();
  });

  it('should display three theme cards with visual previews', async () => {
    // Open options window via menu
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2);
    await optionsPage.waitForLoad();

    // Verify theme selector container exists
    await expectElementDisplayed('[data-testid="theme-selector"]');

    // Verify all three theme cards are displayed
    await expectElementDisplayed(optionsPage.themeCardSelector('system'));
    await expectElementDisplayed(optionsPage.themeCardSelector('light'));
    await expectElementDisplayed(optionsPage.themeCardSelector('dark'));

    // Verify each card has a preview element
    const previews = await $$('.theme-card__preview');
    expect(previews.length).toBe(3);

    // Verify each card has a label with icon
    const labels = await $$('.theme-card__label');
    expect(labels.length).toBe(3);

    // Verify labels text content
    const systemCard = await $(optionsPage.themeCardSelector('system'));
    const lightCard = await $(optionsPage.themeCardSelector('light'));
    const darkCard = await $(optionsPage.themeCardSelector('dark'));

    const systemText = await systemCard.$('.theme-card__text');
    const lightText = await lightCard.$('.theme-card__text');
    const darkText = await darkCard.$('.theme-card__text');

    await expect(systemText).toHaveText('System');
    await expect(lightText).toHaveText('Light');
    await expect(darkText).toHaveText('Dark');

    await optionsPage.close();
  });

  it('should show checkmark indicator on currently selected theme', async () => {
    // Open options window via menu
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2);
    await optionsPage.waitForLoad();

    // Click light theme
    await optionsPage.selectTheme('light');

    // Verify checkmark appears on light card
    await expectElementDisplayed('[data-testid="theme-checkmark-light"]');

    // Verify no checkmark on other cards
    const systemCheckmark = await $('[data-testid="theme-checkmark-system"]');
    const darkCheckmark = await $('[data-testid="theme-checkmark-dark"]');
    await expect(systemCheckmark).not.toExist();
    await expect(darkCheckmark).not.toExist();

    // Now click dark theme
    await optionsPage.selectTheme('dark');

    // Verify checkmark moved to dark card
    await expectElementDisplayed('[data-testid="theme-checkmark-dark"]');

    // Light checkmark should be gone
    const newLightCheckmark = await $('[data-testid="theme-checkmark-light"]');
    await expect(newLightCheckmark).not.toExist();

    await optionsPage.close();
  });

  it('should apply selected class and styling on clicked card', async () => {
    // Open options window via menu
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2);
    await optionsPage.waitForLoad();

    // Click light theme
    await optionsPage.selectTheme('light');

    // Verify selected class is applied
    const hasSelectedClass = await browser.execute((selector: string) => {
      const el = document.querySelector(selector);
      return el?.classList.contains('theme-card--selected') ?? false;
    }, '[data-testid="theme-card-light"]');

    expect(hasSelectedClass).toBe(true);

    // Verify aria-checked is true
    const lightCard = await $(optionsPage.themeCardSelector('light'));
    await expect(lightCard).toHaveAttribute('aria-checked', 'true');

    // Other cards should not have selected class
    const darkCard = await $(optionsPage.themeCardSelector('dark'));
    await expect(darkCard).toHaveAttribute('aria-checked', 'false');

    await optionsPage.close();
  });

  it('should apply theme change immediately to both windows', async () => {
    // Open options window via menu
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2);
    await optionsPage.waitForLoad();

    // Click light theme
    await optionsPage.selectTheme('light');

    // Verify Options window has light theme
    await expectThemeApplied('light');

    // Switch to main window and verify theme
    const handles = await browser.getWindowHandles();
    await browser.switchToWindow(handles[0]);
    await expectThemeApplied('light');

    // Switch back to options window before cleanup
    await browser.switchToWindow(handles[1]);
    // Set back to dark
    await optionsPage.selectTheme('dark');

    await optionsPage.close();
  });

  it('should display correct preview colors for each theme', async () => {
    // Open options window via menu
    await mainWindow.openOptionsViaMenu();
    await waitForWindowCount(2);
    await optionsPage.waitForLoad();

    // Get preview background colors
    const previewColors = await browser.execute(() => {
      const cards = document.querySelectorAll('.theme-card');
      const results: Record<string, string> = {};

      cards.forEach((card) => {
        const testId = card.getAttribute('data-testid');
        const preview = card.querySelector('.theme-card__preview') as HTMLElement;
        if (testId && preview) {
          results[testId] = preview.style.background || window.getComputedStyle(preview).background;
        }
      });

      return results;
    });

    // System card should have a gradient (light/dark split)
    expect(previewColors['theme-card-system']).toContain('gradient');

    // Light and dark cards should have solid colors
    // Light: #ffffff, Dark: #1a1a1a
    expect(previewColors['theme-card-light']).toContain('rgb(255, 255, 255)');
    expect(previewColors['theme-card-dark']).toContain('rgb(26, 26, 26)');

    await optionsPage.close();
  });
});

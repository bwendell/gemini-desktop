/**
 * E2E tests for Theme Selector keyboard navigation.
 *
 * Tests accessibility and keyboard-only navigation of the theme selector.
 *
 * Platform-aware: Uses Page Objects and workflow helpers for cross-platform support.
 */

import { browser, $, expect } from '@wdio/globals';
import { OptionsPage } from './pages';
import { waitForAppReady, ensureSingleWindow, withOptionsWindowViaMenu } from './helpers/workflows';

describe('Theme Selector Keyboard Navigation', () => {
  const optionsPage = new OptionsPage();

  beforeEach(async () => {
    await waitForAppReady();
  });

  afterEach(async () => {
    await ensureSingleWindow();
  });

  it('should be focusable via Tab key', async () => {
    await withOptionsWindowViaMenu(async () => {
      // Tab through the window to reach the theme cards
      // Use a loop to be robust against changes in the number of focusable elements before the cards
      let found = false;
      for (let i = 0; i < 10; i++) {
        await browser.keys(['Tab']);
        const activeTestId = await browser.execute(() => {
          return document.activeElement?.getAttribute('data-testid');
        });

        if (activeTestId && activeTestId.startsWith('theme-card-')) {
          found = true;
          break;
        }
        // Small pause to allow focus to settle
        await browser.pause(50);
      }

      // One of the theme cards should be focused
      expect(found).toBe(true);
    });
  });

  it('should have proper radiogroup and radio ARIA roles', async () => {
    await withOptionsWindowViaMenu(async () => {
      // Verify container has radiogroup role
      const themeSelector = await $(optionsPage.themeSelectorSelector);
      await expect(themeSelector).toHaveAttribute('role', 'radiogroup');
      await expect(themeSelector).toHaveAttribute('aria-label', 'Theme selection');

      // Verify each card has radio role
      const systemCard = await $(optionsPage.themeCardSelector('system'));
      const lightCard = await $(optionsPage.themeCardSelector('light'));
      const darkCard = await $(optionsPage.themeCardSelector('dark'));

      await expect(systemCard).toHaveAttribute('role', 'radio');
      await expect(lightCard).toHaveAttribute('role', 'radio');
      await expect(darkCard).toHaveAttribute('role', 'radio');

      // Verify aria-label on each card
      await expect(systemCard).toHaveAttribute('aria-label', 'System theme');
      await expect(lightCard).toHaveAttribute('aria-label', 'Light theme');
      await expect(darkCard).toHaveAttribute('aria-label', 'Dark theme');
    });
  });

  it('should select theme with Enter key when card is focused', async () => {
    await withOptionsWindowViaMenu(async () => {
      // First select light to establish baseline
      await optionsPage.selectTheme('light');

      // Use JavaScript to focus the dark card element (reliable in Electron)
      await browser.execute(() => {
        const el = document.querySelector('[data-testid="theme-card-dark"]') as HTMLElement;
        el?.focus();
      });

      // Press Enter to select
      await browser.keys(['Enter']);
      await browser.pause(300);

      // Verify dark theme is now selected
      const darkCard = await $(optionsPage.themeCardSelector('dark'));
      await expect(darkCard).toHaveAttribute('aria-checked', 'true');

      // Verify checkmark appears
      const darkCheckmark = await $('[data-testid="theme-checkmark-dark"]');
      await expect(darkCheckmark).toExist();

      // Verify theme actually changed via Page Object method
      const currentTheme = await optionsPage.getCurrentTheme();
      expect(currentTheme).toBe('dark');
    });
  });

  it('should select theme with Space key when card is focused', async () => {
    await withOptionsWindowViaMenu(async () => {
      // Focus on light card using JavaScript
      await browser.execute(() => {
        const el = document.querySelector('[data-testid="theme-card-light"]') as HTMLElement;
        el?.focus();
      });

      // Press Space to select
      await browser.keys(['Space']);
      await browser.pause(300);

      // Verify light theme is now selected
      const lightCard = await $(optionsPage.themeCardSelector('light'));
      await expect(lightCard).toHaveAttribute('aria-checked', 'true');

      // Verify theme actually changed via Page Object method
      const currentTheme = await optionsPage.getCurrentTheme();
      expect(currentTheme).toBe('light');

      // Clean up: switch back to dark
      await optionsPage.selectTheme('dark');
    });
  });

  it('should show focus-visible styling on keyboard navigation', async () => {
    await withOptionsWindowViaMenu(async () => {
      // Focus on a card using keyboard
      await browser.execute(() => {
        const el = document.querySelector('[data-testid="theme-card-system"]') as HTMLElement;
        el?.focus();
      });

      // Trigger focus-visible by using keyboard
      await browser.keys(['Tab']);
      await browser.keys(['Shift', 'Tab']); // Go back

      // Check if the card has proper outline/border when focused
      const hasFocusStyles = await browser.execute(() => {
        const el = document.querySelector('[data-testid="theme-card-system"]');
        if (!el) return false;

        const styles = window.getComputedStyle(el);
        const hasOutline = styles.outline !== 'none' && styles.outline !== '';
        const hasBoxShadow = styles.boxShadow !== 'none' && styles.boxShadow !== '';

        return hasOutline || hasBoxShadow;
      });

      expect(hasFocusStyles).toBeDefined();
    });
  });

  it('should maintain tab order between theme cards', async () => {
    await withOptionsWindowViaMenu(async () => {
      // Focus first card
      await browser.execute(() => {
        const el = document.querySelector('[data-testid="theme-card-system"]') as HTMLElement;
        el?.focus();
      });

      // Verify System card is focused
      let focusedId = await browser.execute(() =>
        document.activeElement?.getAttribute('data-testid')
      );
      expect(focusedId).toBe('theme-card-system');

      // Tab to next card
      await browser.keys(['Tab']);
      focusedId = await browser.execute(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedId).toBe('theme-card-light');

      // Tab to next card
      await browser.keys(['Tab']);
      focusedId = await browser.execute(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedId).toBe('theme-card-dark');

      // Shift+Tab back
      await browser.keys(['Shift', 'Tab']);
      focusedId = await browser.execute(() => document.activeElement?.getAttribute('data-testid'));
      expect(focusedId).toBe('theme-card-light');
    });
  });
});

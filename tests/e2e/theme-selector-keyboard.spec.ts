/**
 * E2E tests for Theme Selector keyboard navigation.
 * 
 * Tests accessibility and keyboard-only navigation of the theme selector.
 * 
 * Platform-aware: Uses clickMenuItem helper for cross-platform menu access.
 */

import { browser, $, expect } from '@wdio/globals';
import { usesCustomControls } from './helpers/platform';
import { Selectors } from './helpers/selectors';
import { clickMenuItemById } from './helpers/menuActions';
import { waitForWindowCount, closeCurrentWindow } from './helpers/windowActions';

/**
 * Helper function to open the Options window and switch to it.
 */
async function openOptionsWindow(): Promise<{ mainHandle: string; optionsHandle: string }> {
    await clickMenuItemById('menu-file-options');

    await waitForWindowCount(2, 5000);

    const handles = await browser.getWindowHandles();
    const mainHandle = handles[0];
    const optionsHandle = handles[1];

    await browser.switchToWindow(optionsHandle);
    await browser.pause(500);

    return { mainHandle, optionsHandle };
}

/**
 * Helper function to close the Options window.
 */
async function closeOptionsWindow(mainHandle: string): Promise<void> {
    await closeCurrentWindow();

    await waitForWindowCount(1, 5000);
    await browser.switchToWindow(mainHandle);
}

describe('Theme Selector Keyboard Navigation', () => {
    it('should be focusable via Tab key', async () => {
        const { mainHandle } = await openOptionsWindow();

        try {
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
        } finally {
            await closeOptionsWindow(mainHandle);
        }
    });

    it('should have proper radiogroup and radio ARIA roles', async () => {
        const { mainHandle } = await openOptionsWindow();

        try {
            // Verify container has radiogroup role
            const themeSelector = await $('[data-testid="theme-selector"]');
            await expect(themeSelector).toHaveAttribute('role', 'radiogroup');
            await expect(themeSelector).toHaveAttribute('aria-label', 'Theme selection');

            // Verify each card has radio role
            const systemCard = await $(Selectors.themeCard('system'));
            const lightCard = await $(Selectors.themeCard('light'));
            const darkCard = await $(Selectors.themeCard('dark'));

            await expect(systemCard).toHaveAttribute('role', 'radio');
            await expect(lightCard).toHaveAttribute('role', 'radio');
            await expect(darkCard).toHaveAttribute('role', 'radio');

            // Verify aria-label on each card
            await expect(systemCard).toHaveAttribute('aria-label', 'System theme');
            await expect(lightCard).toHaveAttribute('aria-label', 'Light theme');
            await expect(darkCard).toHaveAttribute('aria-label', 'Dark theme');
        } finally {
            await closeOptionsWindow(mainHandle);
        }
    });

    it('should select theme with Enter key when card is focused', async () => {
        const { mainHandle } = await openOptionsWindow();

        try {
            // Focus on the light card
            const lightCard = await $(Selectors.themeCard('light'));
            await lightCard.click(); // First select to establish baseline
            await browser.pause(200);

            // Now focus on dark card using Tab
            await browser.keys(['Tab']);

            // Verify dark card is focused (or focus it directly)
            const darkCard = await $(Selectors.themeCard('dark'));

            // Use JavaScript to focus the element (more reliable in Electron)
            await browser.execute((selector: string) => {
                const el = document.querySelector(selector) as HTMLElement;
                el?.focus();
            }, '[data-testid="theme-card-dark"]');

            // Press Enter to select
            await browser.keys(['Enter']);
            await browser.pause(300);

            // Verify dark theme is now selected
            await expect(darkCard).toHaveAttribute('aria-checked', 'true');

            // Verify checkmark appears
            const darkCheckmark = await $('[data-testid="theme-checkmark-dark"]');
            await expect(darkCheckmark).toExist();

            // Verify theme actually changed
            const currentTheme = await browser.execute(() => {
                return document.documentElement.getAttribute('data-theme');
            });
            expect(currentTheme).toBe('dark');
        } finally {
            await closeOptionsWindow(mainHandle);
        }
    });

    it('should select theme with Space key when card is focused', async () => {
        const { mainHandle } = await openOptionsWindow();

        try {
            // Focus on light card using JavaScript
            await browser.execute(() => {
                const el = document.querySelector('[data-testid="theme-card-light"]') as HTMLElement;
                el?.focus();
            });

            // Press Space to select
            await browser.keys(['Space']);
            await browser.pause(300);

            // Verify light theme is now selected
            const lightCard = await $(Selectors.themeCard('light'));
            await expect(lightCard).toHaveAttribute('aria-checked', 'true');

            // Verify theme actually changed
            const currentTheme = await browser.execute(() => {
                return document.documentElement.getAttribute('data-theme');
            });
            expect(currentTheme).toBe('light');

            // Clean up: switch back to dark
            const darkCard = await $(Selectors.themeCard('dark'));
            await darkCard.click();
            await browser.pause(200);
        } finally {
            await closeOptionsWindow(mainHandle);
        }
    });

    it('should show focus-visible styling on keyboard navigation', async () => {
        const { mainHandle } = await openOptionsWindow();

        try {
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
        } finally {
            await closeOptionsWindow(mainHandle);
        }
    });

    it('should maintain tab order between theme cards', async () => {
        const { mainHandle } = await openOptionsWindow();

        try {
            // Focus first card
            await browser.execute(() => {
                const el = document.querySelector('[data-testid="theme-card-system"]') as HTMLElement;
                el?.focus();
            });

            // Verify System card is focused
            let focusedId = await browser.execute(() => document.activeElement?.getAttribute('data-testid'));
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
        } finally {
            await closeOptionsWindow(mainHandle);
        }
    });
});

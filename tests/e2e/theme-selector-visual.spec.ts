/**
 * E2E tests for the enhanced Theme Selector component.
 * 
 * Tests visual elements, animations, and selection behavior
 * of the new card-based theme selector.
 */

import { browser, $, $$, expect } from '@wdio/globals';

/**
 * Helper function to open the Options window and switch to it.
 * Returns the window handles for cleanup.
 */
async function openOptionsWindow(): Promise<{ mainHandle: string; optionsHandle: string }> {
    // Open File menu
    const menuBar = await $('.titlebar-menu-bar');
    await menuBar.waitForExist();

    const fileButton = await $('[data-testid="menu-button-File"]');
    await fileButton.click();

    // Click Options
    const optionsItem = await $('[data-testid="menu-item-Options"]');
    await optionsItem.waitForExist();
    await optionsItem.click();

    // Wait for Options window to open
    await browser.waitUntil(async () => {
        return (await browser.getWindowHandles()).length === 2;
    }, { timeout: 5000, timeoutMsg: 'Options window did not open' });

    const handles = await browser.getWindowHandles();
    const mainHandle = handles[0];
    const optionsHandle = handles[1];

    // Switch to Options window and wait for content to load
    await browser.switchToWindow(optionsHandle);
    await browser.pause(500);

    return { mainHandle, optionsHandle };
}

/**
 * Helper function to close the Options window.
 */
async function closeOptionsWindow(mainHandle: string): Promise<void> {
    const closeBtn = await $('[data-testid="options-close-button"]');
    await closeBtn.click();

    await browser.waitUntil(async () => {
        return (await browser.getWindowHandles()).length === 1;
    }, { timeout: 5000 });

    await browser.switchToWindow(mainHandle);
}

describe('Theme Selector Visual Verification', () => {
    it('should display three theme cards with visual previews', async () => {
        const { mainHandle } = await openOptionsWindow();

        try {
            // Verify theme selector container exists
            const themeSelector = await $('[data-testid="theme-selector"]');
            await expect(themeSelector).toExist();

            // Verify all three theme cards are displayed
            const systemCard = await $('[data-testid="theme-card-system"]');
            const lightCard = await $('[data-testid="theme-card-light"]');
            const darkCard = await $('[data-testid="theme-card-dark"]');

            await expect(systemCard).toBeDisplayed();
            await expect(lightCard).toBeDisplayed();
            await expect(darkCard).toBeDisplayed();

            // Verify each card has a preview element
            const previews = await $$('.theme-card__preview');
            expect(previews.length).toBe(3);

            // Verify each card has a label with icon
            const labels = await $$('.theme-card__label');
            expect(labels.length).toBe(3);

            // Verify labels text content
            const systemText = await systemCard.$('.theme-card__text');
            const lightText = await lightCard.$('.theme-card__text');
            const darkText = await darkCard.$('.theme-card__text');

            await expect(systemText).toHaveText('System');
            await expect(lightText).toHaveText('Light');
            await expect(darkText).toHaveText('Dark');
        } finally {
            await closeOptionsWindow(mainHandle);
        }
    });

    it('should show checkmark indicator on currently selected theme', async () => {
        const { mainHandle } = await openOptionsWindow();

        try {
            // Click light theme
            const lightCard = await $('[data-testid="theme-card-light"]');
            await lightCard.click();
            await browser.pause(300); // Wait for animation

            // Verify checkmark appears on light card
            const lightCheckmark = await $('[data-testid="theme-checkmark-light"]');
            await expect(lightCheckmark).toBeDisplayed();

            // Verify no checkmark on other cards
            const systemCheckmark = await $('[data-testid="theme-checkmark-system"]');
            const darkCheckmark = await $('[data-testid="theme-checkmark-dark"]');
            await expect(systemCheckmark).not.toExist();
            await expect(darkCheckmark).not.toExist();

            // Now click dark theme
            const darkCard = await $('[data-testid="theme-card-dark"]');
            await darkCard.click();
            await browser.pause(300);

            // Verify checkmark moved to dark card
            const newDarkCheckmark = await $('[data-testid="theme-checkmark-dark"]');
            await expect(newDarkCheckmark).toBeDisplayed();

            // Light checkmark should be gone
            const newLightCheckmark = await $('[data-testid="theme-checkmark-light"]');
            await expect(newLightCheckmark).not.toExist();
        } finally {
            await closeOptionsWindow(mainHandle);
        }
    });

    it('should apply selected class and styling on clicked card', async () => {
        const { mainHandle } = await openOptionsWindow();

        try {
            const lightCard = await $('[data-testid="theme-card-light"]');
            await lightCard.click();
            await browser.pause(300);

            // Verify selected class is applied
            const hasSelectedClass = await browser.execute((selector: string) => {
                const el = document.querySelector(selector);
                return el?.classList.contains('theme-card--selected') ?? false;
            }, '[data-testid="theme-card-light"]');

            expect(hasSelectedClass).toBe(true);

            // Verify aria-checked is true
            await expect(lightCard).toHaveAttribute('aria-checked', 'true');

            // Other cards should not have selected class
            const darkCard = await $('[data-testid="theme-card-dark"]');
            await expect(darkCard).toHaveAttribute('aria-checked', 'false');
        } finally {
            await closeOptionsWindow(mainHandle);
        }
    });

    it('should apply theme change immediately to both windows', async () => {
        const { mainHandle, optionsHandle } = await openOptionsWindow();

        try {
            // Click light theme
            const lightCard = await $('[data-testid="theme-card-light"]');
            await lightCard.click();
            await browser.pause(500);

            // Verify Options window has light theme
            const optionsTheme = await browser.execute(() => {
                return document.documentElement.getAttribute('data-theme');
            });
            expect(optionsTheme).toBe('light');

            // Switch to main window and verify theme
            await browser.switchToWindow(mainHandle);
            const mainTheme = await browser.execute(() => {
                return document.documentElement.getAttribute('data-theme');
            });
            expect(mainTheme).toBe('light');

            // Clean up: set back to dark
            await browser.switchToWindow(optionsHandle);
            const darkCard = await $('[data-testid="theme-card-dark"]');
            await darkCard.click();
            await browser.pause(300);
        } finally {
            await browser.switchToWindow(optionsHandle);
            await closeOptionsWindow(mainHandle);
        }
    });

    it('should display correct preview colors for each theme', async () => {
        const { mainHandle } = await openOptionsWindow();

        try {
            // Get preview background colors
            const previewColors = await browser.execute(() => {
                const cards = document.querySelectorAll('.theme-card');
                const results: Record<string, string> = {};

                cards.forEach(card => {
                    const testId = card.getAttribute('data-testid');
                    const preview = card.querySelector('.theme-card__preview') as HTMLElement;
                    if (testId && preview) {
                        results[testId] = preview.style.background ||
                            window.getComputedStyle(preview).background;
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
        } finally {
            await closeOptionsWindow(mainHandle);
        }
    });
});

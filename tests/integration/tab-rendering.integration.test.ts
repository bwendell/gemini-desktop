import { browser, expect } from '@wdio/globals';

describe('Tab Rendering (Integration)', () => {
    before(async () => {
        await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0, {
            timeout: 30000,
            timeoutMsg: 'No window handles found after 30s',
        });
    });

    it('renders tab bar and default tab on startup', async () => {
        const tabBar = await browser.$('[data-testid="tab-bar"]');
        await tabBar.waitForDisplayed({ timeout: 10000 });

        const triggerTabCount = await browser.execute(() => {
            return document.querySelectorAll('.tab .tab__trigger').length;
        });

        expect(triggerTabCount).toBeGreaterThanOrEqual(1);
    });

    it('keeps tab bar below the titlebar and exposes new-tab button', async () => {
        const titlebar = await browser.$('[data-testid="titlebar"]');
        const tabBar = await browser.$('[data-testid="tab-bar"]');
        const newTabButton = await browser.$('[data-testid="tab-new-button"]');

        await titlebar.waitForDisplayed({ timeout: 10000 });
        await tabBar.waitForDisplayed({ timeout: 10000 });
        await newTabButton.waitForDisplayed({ timeout: 10000 });

        const titlebarY = (await titlebar.getLocation('y')) ?? 0;
        const tabBarY = (await tabBar.getLocation('y')) ?? 0;

        expect(tabBarY).toBeGreaterThanOrEqual(titlebarY);
        expect(await newTabButton.isClickable()).toBe(true);
    });

    it('renders at least one Gemini iframe within the tab panel', async () => {
        const tabPanel = await browser.$('[data-testid="tab-panel"]');
        await tabPanel.waitForDisplayed({ timeout: 10000 });

        const iframeCount = await browser.execute(() => {
            return document.querySelectorAll('iframe[src*="gemini.google.com"]').length;
        });

        expect(iframeCount).toBeGreaterThanOrEqual(1);
    });
});

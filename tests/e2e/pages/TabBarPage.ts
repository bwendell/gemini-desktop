import { Selectors } from '../helpers/selectors';
import { BasePage } from './BasePage';

export class TabBarPage extends BasePage {
    constructor() {
        super('TabBarPage');
    }

    get tabBarSelector(): string {
        return Selectors.tabBar;
    }

    get newTabButtonSelector(): string {
        return Selectors.tabNewButton;
    }

    tabSelector(id: string): string {
        return Selectors.tab(id);
    }

    tabCloseSelector(id: string): string {
        return Selectors.tabClose(id);
    }

    async waitForTabBar(timeout = 10000): Promise<void> {
        await this.waitForElement(this.tabBarSelector, timeout);
    }

    async getTabCount(): Promise<number> {
        return this.execute(() => document.querySelectorAll('.tab-bar__tabs .tab').length);
    }

    async waitForTabCount(expected: number, options: { timeout?: number; timeoutMsg?: string } = {}): Promise<void> {
        await this.waitUntil(async () => (await this.getTabCount()) === expected, {
            timeout: options.timeout ?? 5000,
            timeoutMsg: options.timeoutMsg ?? `Expected tab count to be ${expected}`,
        });
    }

    async waitForTabCountAtLeast(
        minimum: number,
        options: { timeout?: number; timeoutMsg?: string } = {}
    ): Promise<void> {
        await this.waitUntil(async () => (await this.getTabCount()) >= minimum, {
            timeout: options.timeout ?? 5000,
            timeoutMsg: options.timeoutMsg ?? `Expected tab count to be >= ${minimum}`,
        });
    }

    async getActiveTabId(): Promise<string | null> {
        return this.execute(() => {
            const active = document.querySelector('.tab.tab--active .tab__trigger');
            return active?.getAttribute('data-testid') ?? null;
        });
    }

    async clickNewTab(): Promise<void> {
        await this.clickElement(this.newTabButtonSelector);
    }

    async clickTab(index: number): Promise<void> {
        await this.execute((tabIndex) => {
            const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.tab .tab__trigger'));
            tabs[tabIndex]?.click();
        }, index);
    }

    async closeTab(index: number): Promise<void> {
        await this.execute((tabIndex) => {
            const closeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.tab .tab__close'));
            closeButtons[tabIndex]?.click();
        }, index);
    }

    async middleClickTab(index: number): Promise<void> {
        await this.execute((tabIndex) => {
            const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('.tab .tab__trigger'));
            const target = tabs[tabIndex];
            if (!target) {
                return;
            }
            const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 1 });
            target.dispatchEvent(event);
        }, index);
    }

    async getTabTitles(): Promise<string[]> {
        return this.execute(() => {
            return Array.from(document.querySelectorAll('.tab .tab__title')).map((el) => el.textContent?.trim() ?? '');
        });
    }

    async getGeminiIframeCount(): Promise<number> {
        return this.execute(() => document.querySelectorAll('iframe[src*="gemini.google.com"]').length);
    }
}

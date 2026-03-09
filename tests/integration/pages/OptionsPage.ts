import { browser } from '@wdio/globals';

import { waitForIPCRoundTrip, waitForRendererState } from '../helpers/waitAdapters';

type OptionsToggle = 'launch-at-startup' | 'start-minimized' | 'response-notifications' | 'text-prediction-enable';

type BrowserElement = {
    isExisting(): Promise<boolean>;
    isDisplayed(): Promise<boolean>;
    getAttribute(name: string): Promise<string | null>;
    getText(): Promise<string>;
    click(): Promise<void>;
};

type IntegrationBrowser = {
    $(selector: string): Promise<BrowserElement>;
};

const integrationBrowser = browser as unknown as IntegrationBrowser;

const TOGGLE_SELECTORS: Record<OptionsToggle, string> = {
    'launch-at-startup': '[data-testid="launch-at-startup-toggle-switch"]',
    'start-minimized': '[data-testid="start-minimized-toggle-switch"]',
    'response-notifications': '[data-testid="response-notifications-toggle-switch"]',
    'text-prediction-enable': '[data-testid="text-prediction-enable-toggle-switch"]',
};

export class OptionsPage {
    readonly startupSectionSelector = '[data-testid="options-startup"]';

    readonly notificationSectionSelector = '[data-testid="notification-settings"]';

    readonly textPredictionSectionSelector = '[data-testid="text-prediction-settings"]';

    readonly textPredictionStatusTextSelector = '[data-testid="text-prediction-status-text"]';

    async waitForLoad(timeout = 5000): Promise<void> {
        await waitForRendererState(
            async () => {
                const element = await integrationBrowser.$('[data-testid="options-content"]');
                return element.isExisting();
            },
            { timeout, timeoutMsg: 'Options content did not render' }
        );
    }

    async isSectionDisplayed(selector: string): Promise<boolean> {
        const section = await integrationBrowser.$(selector);
        return section.isDisplayed();
    }

    async isToggleEnabled(toggle: OptionsToggle): Promise<boolean> {
        const element = await integrationBrowser.$(TOGGLE_SELECTORS[toggle]);
        return (await element.getAttribute('aria-checked')) === 'true';
    }

    async isStartMinimizedDisabled(): Promise<boolean> {
        const toggle = await integrationBrowser.$(TOGGLE_SELECTORS['start-minimized']);
        const ariaDisabled = await toggle.getAttribute('aria-disabled');
        const disabled = await toggle.getAttribute('disabled');
        return ariaDisabled === 'true' || disabled !== null;
    }

    async toggle(toggle: OptionsToggle): Promise<void> {
        const selector = TOGGLE_SELECTORS[toggle];
        const element = await integrationBrowser.$(selector);
        const before = await element.getAttribute('aria-checked');

        await waitForIPCRoundTrip(
            async () => {
                await element.click();
            },
            async () => {
                const current = await (await integrationBrowser.$(selector)).getAttribute('aria-checked');
                return current !== before;
            },
            { timeout: 4000, timeoutMsg: `Toggle ${toggle} did not update state` }
        );
    }

    async textPredictionStatusIncludes(expected: string, timeout = 8000): Promise<void> {
        await waitForRendererState(
            async () => {
                const statusElement = await integrationBrowser.$(this.textPredictionStatusTextSelector);
                if (!(await statusElement.isExisting())) {
                    return false;
                }

                const statusText = await statusElement.getText();
                return statusText.includes(expected);
            },
            {
                timeout,
                timeoutMsg: `Text prediction status did not include "${expected}" within ${timeout}ms`,
            }
        );
    }
}

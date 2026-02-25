/**
 * Options Page Object.
 *
 * Encapsulates all selectors and interactions for the Options window.
 * Includes Settings and About tabs, theme controls, and hotkey settings.
 *
 * @module OptionsPage
 */

/// <reference path="../helpers/wdio-electron.d.ts" />

import { BasePage } from './BasePage';
import { Selectors } from '../helpers/selectors';
import { browser } from '@wdio/globals';
import { navigateToOptionsTab, closeOptionsWindow, waitForOptionsWindow } from '../helpers/optionsWindowActions';
import { E2E_TIMING } from '../helpers/e2eConstants';
import { waitForIPCRoundTrip } from '../helpers/waitUtilities';

type OPElement = {
    getAttribute(attr: string): Promise<string | null>;
    click(): Promise<void>;
    isExisting(): Promise<boolean>;
    isDisplayed(): Promise<boolean>;
    getText(): Promise<string>;
    getProperty(name: string): Promise<unknown>;
    $(selector: string): Promise<WebdriverIO.Element>;
    $$(selector: string): Promise<WebdriverIO.Element[]>;
};
type OPBrowser = {
    waitUntil<T>(
        condition: () => Promise<T> | T,
        options?: { timeout?: number; timeoutMsg?: string; interval?: number }
    ): Promise<T>;
    getUrl(): Promise<string>;
};
const opBrowser = browser as unknown as OPBrowser;
function toOPEl(el: WebdriverIO.Element): OPElement {
    return el as unknown as OPElement;
}
/**
 * Page Object for the Options Window.
 * Provides methods to interact with settings, themes, hotkeys, and about section.
 */
export class OptionsPage extends BasePage {
    constructor() {
        super('OptionsPage');
    }

    private async waitForIpcPropagation(
        action: () => Promise<void>,
        verification?: () => Promise<boolean>
    ): Promise<void> {
        try {
            await waitForIPCRoundTrip(action, {
                timeout: E2E_TIMING.TIMEOUTS?.WINDOW_TRANSITION ?? 5000,
                verification,
            });
        } catch (error) {
            this.log(`IPC verification timed out, using fallback pause: ${String(error)}`);
            await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
        }
    }

    // ===========================================================================
    // LOCATORS
    // ===========================================================================

    /** Selector for the options content container */
    get contentSelector(): string {
        return '[data-testid="options-content"]';
    }

    /** Selector for the Settings tab */
    get settingsTabSelector(): string {
        return '[data-testid="options-tab-settings"]';
    }

    /** Selector for the About tab */
    get aboutTabSelector(): string {
        return '[data-testid="options-tab-about"]';
    }

    /** Selector for the theme selector section */
    get themeSelectorSelector(): string {
        return '[data-testid="theme-selector"]';
    }

    /** Selector for the about section */
    get aboutSectionSelector(): string {
        return '[data-testid="about-section"]';
    }

    /** Selector for the version text element */
    get versionSelector(): string {
        return '[data-testid="about-version"]';
    }

    /** Selector for the disclaimer section */
    get disclaimerSelector(): string {
        return '[data-testid="about-disclaimer"]';
    }

    /** Selector for the license link */
    get licenseLinkSelector(): string {
        return '[data-testid="about-license-link"]';
    }

    /** Selector for the options window titlebar */
    get titlebarSelector(): string {
        return '.options-titlebar';
    }

    /** Selector for the titlebar icon */
    get titlebarIconSelector(): string {
        return '[data-testid="app-icon"]';
    }

    /** Selector for the window controls container */
    get windowControlsSelector(): string {
        return '.options-window-controls';
    }

    /** Selector for the minimize button */
    get minimizeButtonSelector(): string {
        return '[data-testid="options-minimize-button"]';
    }

    /** Selector for the close button */
    get closeButtonSelector(): string {
        return '[data-testid="options-close-button"]';
    }

    /** Selector for the maximize button (should not exist in options window) */
    get maximizeButtonSelector(): string {
        return '[data-testid="options-maximize-button"]';
    }

    /**
     * Get selector for a specific theme card.
     * @param theme - Theme ID (e.g., 'light', 'dark', 'system')
     */
    themeCardSelector(theme: string): string {
        return Selectors.themeCard(theme);
    }

    /**
     * Get selector for a specific hotkey toggle switch button.
     * Targets the switch element where aria-checked is defined.
     * @param hotkeyId - Hotkey ID (e.g., 'alwaysOnTop', 'quickChat', 'peekAndHide')
     */
    hotkeyToggleSelector(hotkeyId: string): string {
        return `[data-testid="hotkey-toggle-${hotkeyId}-switch"]`;
    }

    /**
     * Get selector for a specific hotkey row.
     * @param hotkeyId - Hotkey ID
     */
    hotkeyRowSelector(hotkeyId: string): string {
        return `[data-testid="hotkey-row-${hotkeyId}"]`;
    }

    /**
     * Get selector for the accelerator container within a hotkey row.
     * @param hotkeyId - Hotkey ID (e.g., 'alwaysOnTop', 'quickChat', 'peekAndHide')
     */
    acceleratorContainerSelector(hotkeyId: string): string {
        return `[data-testid="hotkey-row-${hotkeyId}"] .keycap-container`;
    }

    /**
     * Get selector for the recording prompt within a hotkey row.
     * @param hotkeyId - Hotkey ID
     */
    recordingPromptSelector(hotkeyId: string): string {
        return `[data-testid="hotkey-row-${hotkeyId}"] .recording-prompt`;
    }

    /**
     * Get selector for the reset button within a hotkey row.
     * @param hotkeyId - Hotkey ID
     */
    resetButtonSelector(hotkeyId: string): string {
        return `[data-testid="hotkey-row-${hotkeyId}"] .reset-button`;
    }

    /** Selector for the master hotkey toggle switch (uses alwaysOnTop as representative toggle) */
    get masterHotkeyToggleSelector(): string {
        return '[data-testid="hotkey-toggle-alwaysOnTop-switch"]';
    }

    // ===========================================================================
    // TAB NAVIGATION
    // ===========================================================================

    /**
     * Navigate to the Settings tab.
     */
    async navigateToSettings(): Promise<void> {
        this.log('Navigating to Settings tab');
        await navigateToOptionsTab('settings');
    }

    /**
     * Navigate to the About tab.
     */
    async navigateToAbout(): Promise<void> {
        this.log('Navigating to About tab');
        await navigateToOptionsTab('about');
    }

    /**
     * Check if the Settings tab is currently active.
     */
    async isSettingsTabActive(): Promise<boolean> {
        const tab = await this.$(this.settingsTabSelector);
        const ariaSelected = await toOPEl(tab).getAttribute('aria-selected');
        const dataActive = await toOPEl(tab).getAttribute('data-active');
        return ariaSelected === 'true' || dataActive === 'true';
    }

    /**
     * Check if the About tab is currently active.
     */
    async isAboutTabActive(): Promise<boolean> {
        const tab = await this.$(this.aboutTabSelector);
        const ariaSelected = await toOPEl(tab).getAttribute('aria-selected');
        const dataActive = await toOPEl(tab).getAttribute('data-active');
        return ariaSelected === 'true' || dataActive === 'true';
    }

    // ===========================================================================
    // THEME ACTIONS
    // ===========================================================================

    /**
     * Select a theme.
     * @param theme - Theme to select ('light', 'dark', or 'system')
     */
    async selectTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
        this.log(`Selecting theme: ${theme}`);
        const themeCard = await this.waitForElement(this.themeCardSelector(theme));
        await this.waitForIpcPropagation(
            async () => {
                await toOPEl(themeCard).click();
            },
            async () => (await this.getCurrentTheme()) === theme
        );
        await this.pause();
    }

    /**
     * Get the currently active theme from the document's data-theme attribute.
     */
    async getCurrentTheme(): Promise<string | null> {
        return this.execute(() => {
            return document.documentElement.getAttribute('data-theme');
        });
    }

    /**
     * Check if the theme selector is displayed.
     */
    async isThemeSelectorDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.themeSelectorSelector);
    }

    // ===========================================================================
    // HOTKEY ACTIONS
    // ===========================================================================

    /**
     * Get the hotkey toggle element.
     * @param hotkeyId - Hotkey ID (e.g., 'alwaysOnTop', 'quickChat', 'stealthMode')
     */
    async getHotkeyToggle(hotkeyId: string): Promise<WebdriverIO.Element> {
        return this.waitForElement(this.hotkeyToggleSelector(hotkeyId));
    }

    /**
     * Check if a hotkey is enabled (toggle is on).
     * @param hotkeyId - Hotkey ID
     */
    async isHotkeyEnabled(hotkeyId: string): Promise<boolean> {
        const toggle = await this.getHotkeyToggle(hotkeyId);
        const checked = await toOPEl(toggle).getAttribute('aria-checked');
        const dataChecked = await toOPEl(toggle).getAttribute('data-checked');
        return checked === 'true' || dataChecked === 'true';
    }

    /**
     * Toggle a hotkey on or off.
     * @param hotkeyId - Hotkey ID
     */
    async toggleHotkey(hotkeyId: string): Promise<void> {
        this.log(`Toggling hotkey: ${hotkeyId}`);
        const toggle = await this.getHotkeyToggle(hotkeyId);
        const stateBefore = await toOPEl(toggle).getAttribute('aria-checked');
        await this.waitForIpcPropagation(
            async () => {
                await toOPEl(toggle).click();
            },
            async () => (await toOPEl(toggle).getAttribute('aria-checked')) !== stateBefore
        );
    }

    /**
     * Enable a hotkey (if not already enabled).
     * @param hotkeyId - Hotkey ID
     */
    async enableHotkey(hotkeyId: string): Promise<void> {
        const isEnabled = await this.isHotkeyEnabled(hotkeyId);
        if (!isEnabled) {
            await this.toggleHotkey(hotkeyId);
        }
    }

    /**
     * Disable a hotkey (if not already disabled).
     * @param hotkeyId - Hotkey ID
     */
    async disableHotkey(hotkeyId: string): Promise<void> {
        const isEnabled = await this.isHotkeyEnabled(hotkeyId);
        if (isEnabled) {
            await this.toggleHotkey(hotkeyId);
        }
    }

    /**
     * Check if the master hotkey toggle is enabled.
     */
    async isMasterHotkeyEnabled(): Promise<boolean> {
        const toggle = await this.waitForElement(this.masterHotkeyToggleSelector);
        const checked = await toOPEl(toggle).getAttribute('aria-checked');
        const dataChecked = await toOPEl(toggle).getAttribute('data-checked');
        return checked === 'true' || dataChecked === 'true';
    }

    /**
     * Toggle the master hotkey on/off switch.
     */
    async toggleMasterHotkey(): Promise<void> {
        this.log('Toggling master hotkey');
        const toggle = await this.waitForElement(this.masterHotkeyToggleSelector);
        const stateBefore = await toOPEl(toggle).getAttribute('aria-checked');
        await this.waitForIpcPropagation(
            async () => {
                await toOPEl(toggle).click();
            },
            async () => (await toOPEl(toggle).getAttribute('aria-checked')) !== stateBefore
        );
    }

    /**
     * Get the hotkey row element.
     * @param hotkeyId - Hotkey ID
     */
    async getHotkeyRow(hotkeyId: string): Promise<WebdriverIO.Element> {
        return this.waitForElement(this.hotkeyRowSelector(hotkeyId));
    }

    /**
     * Click the accelerator input to start recording mode.
     * @param hotkeyId - Hotkey ID (e.g., 'alwaysOnTop', 'quickChat', 'peekAndHide')
     */
    async clickAcceleratorInput(hotkeyId: string): Promise<void> {
        this.log(`Clicking accelerator input for: ${hotkeyId}`);
        const container = await this.waitForElement(this.acceleratorContainerSelector(hotkeyId));
        await this.waitForIpcPropagation(
            async () => {
                await toOPEl(container).click();
            },
            async () => await this.isRecordingModeActive(hotkeyId)
        );
    }

    /**
     * Check if recording mode is active for a specific hotkey.
     * @param hotkeyId - Hotkey ID
     */
    async isRecordingModeActive(hotkeyId: string): Promise<boolean> {
        const prompt = await this.$(this.recordingPromptSelector(hotkeyId));
        if (!(await toOPEl(prompt).isExisting())) {
            return false;
        }
        return await toOPEl(prompt).isDisplayed();
    }

    /**
     * Get current accelerator text for a specific hotkey.
     * @param hotkeyId - Hotkey ID
     */
    async getCurrentAccelerator(hotkeyId: string): Promise<string> {
        const container = await this.$(this.acceleratorContainerSelector(hotkeyId));
        return await toOPEl(container).getText();
    }

    /**
     * Click reset button to restore default accelerator.
     * @param hotkeyId - Hotkey ID
     */
    async clickResetButton(hotkeyId: string): Promise<void> {
        this.log(`Clicking reset button for: ${hotkeyId}`);
        const button = await this.waitForElement(this.resetButtonSelector(hotkeyId));
        await waitForIPCRoundTrip(async () => {
            await toOPEl(button).click();
        }, {});
    }

    /**
     * Check if reset button is visible for a specific hotkey.
     * @param hotkeyId - Hotkey ID
     */
    async isResetButtonVisible(hotkeyId: string): Promise<boolean> {
        const button = await this.$(this.resetButtonSelector(hotkeyId));
        if (!(await toOPEl(button).isExisting())) {
            return false;
        }
        return await toOPEl(button).isDisplayed();
    }

    // ===========================================================================
    // AUTO-UPDATE TOGGLE
    // ===========================================================================

    /** Selector for the Updates section */
    get updatesSectionSelector(): string {
        return '[data-testid="options-updates"]';
    }

    /** Selector for the auto-update toggle container */
    get autoUpdateToggleSelector(): string {
        return '[data-testid="auto-update-toggle"]';
    }

    /** Selector for the auto-update toggle switch (the actual button with role="switch") */
    get autoUpdateSwitchSelector(): string {
        return '[data-testid="auto-update-toggle-switch-switch"]';
    }

    /** Selector for the auto-update loading indicator */
    get autoUpdateLoadingSelector(): string {
        return '[data-testid="auto-update-toggle-loading"]';
    }

    /**
     * Check if the Updates section is displayed.
     */
    async isUpdatesSectionDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.updatesSectionSelector);
    }

    /**
     * Get the Updates section heading text.
     */
    async getUpdatesSectionHeading(): Promise<string> {
        const section = await this.$(this.updatesSectionSelector);
        const heading = await toOPEl(section).$('h2');
        return toOPEl(heading as WebdriverIO.Element).getText();
    }

    /**
     * Check if the auto-update toggle is displayed.
     */
    async isAutoUpdateToggleDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.autoUpdateToggleSelector);
    }

    /**
     * Get the auto-update toggle text (label and description).
     */
    async getAutoUpdateToggleText(): Promise<string> {
        return this.getElementText(this.autoUpdateToggleSelector);
    }

    /**
     * Check if the auto-update switch has role="switch".
     */
    async getAutoUpdateSwitchRole(): Promise<string | null> {
        const toggle = await this.$(this.autoUpdateSwitchSelector);
        return toOPEl(toggle).getAttribute('role');
    }

    /**
     * Check if auto-update is enabled.
     * Waits for the toggle to finish loading before reading state.
     */
    async isAutoUpdateEnabled(): Promise<boolean> {
        // Wait for loading state to complete (loading element should not exist)
        try {
            await opBrowser.waitUntil(
                async () => {
                    const loadingEl = await this.$(this.autoUpdateLoadingSelector);
                    return !(await toOPEl(loadingEl).isExisting());
                },
                { timeout: 5000, timeoutMsg: 'Auto-update toggle did not finish loading' }
            );
        } catch {
            this.log('Warning: Auto-update toggle may still be loading');
        }

        // Now wait for the switch to exist and be displayed
        const toggle = await this.waitForElementToExist(this.autoUpdateSwitchSelector, 5000);
        const checked = await toOPEl(toggle).getAttribute('aria-checked');
        return checked === 'true';
    }

    /**
     * Toggle auto-update on or off.
     */
    async toggleAutoUpdate(): Promise<void> {
        this.log('Toggling auto-update');
        const toggle = await this.waitForElement(this.autoUpdateSwitchSelector);
        const stateBefore = await toOPEl(toggle).getAttribute('aria-checked');
        await this.waitForIpcPropagation(
            async () => {
                await toOPEl(toggle).click();
            },
            async () => (await toOPEl(toggle).getAttribute('aria-checked')) !== stateBefore
        );
    }

    /**
     * Enable auto-update (if not already enabled).
     */
    async enableAutoUpdate(): Promise<void> {
        const isEnabled = await this.isAutoUpdateEnabled();
        if (!isEnabled) {
            await this.toggleAutoUpdate();
        }
    }

    /**
     * Disable auto-update (if not already disabled).
     */
    async disableAutoUpdate(): Promise<void> {
        const isEnabled = await this.isAutoUpdateEnabled();
        if (isEnabled) {
            await this.toggleAutoUpdate();
        }
    }

    // ===========================================================================
    // TEXT PREDICTION SETTINGS
    // ===========================================================================

    /** Selector for the text prediction settings section */
    get textPredictionSectionSelector(): string {
        return '[data-testid="text-prediction-settings"]';
    }

    /** Selector for the text prediction enable toggle switch */
    get textPredictionEnableToggleSelector(): string {
        return '[data-testid="text-prediction-enable-toggle-switch"]';
    }

    /** Selector for the text prediction GPU toggle switch */
    get textPredictionGpuToggleSelector(): string {
        return '[data-testid="text-prediction-gpu-toggle-switch"]';
    }

    /** Selector for the text prediction status container */
    get textPredictionStatusSelector(): string {
        return '[data-testid="text-prediction-status"]';
    }

    /** Selector for the text prediction status text element */
    get textPredictionStatusTextSelector(): string {
        return '[data-testid="text-prediction-status-text"]';
    }

    /** Selector for the text prediction progress bar container */
    get textPredictionProgressSelector(): string {
        return '[data-testid="text-prediction-progress"]';
    }

    /** Selector for the text prediction retry button */
    get textPredictionRetryButtonSelector(): string {
        return '[data-testid="text-prediction-retry-button"]';
    }

    /**
     * Check if the text prediction section is displayed.
     */
    async isTextPredictionSectionDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.textPredictionSectionSelector);
    }

    /**
     * Check if text prediction is enabled.
     */
    async isTextPredictionEnabled(): Promise<boolean> {
        const toggle = await this.$(this.textPredictionEnableToggleSelector);
        if (!(await toOPEl(toggle).isExisting())) {
            return false;
        }
        const checked = await toOPEl(toggle).getAttribute('aria-checked');
        return checked === 'true';
    }

    /**
     * Toggle text prediction on or off.
     */
    async toggleTextPrediction(): Promise<void> {
        this.log('Toggling text prediction');
        const toggle = await this.waitForElement(this.textPredictionEnableToggleSelector);
        const stateBefore = await toOPEl(toggle).getAttribute('aria-checked');
        await this.waitForIpcPropagation(
            async () => {
                await toOPEl(toggle).click();
            },
            async () => (await toOPEl(toggle).getAttribute('aria-checked')) !== stateBefore
        );
    }

    /**
     * Enable text prediction (if not already enabled).
     */
    async enableTextPrediction(): Promise<void> {
        const isEnabled = await this.isTextPredictionEnabled();
        if (!isEnabled) {
            await this.toggleTextPrediction();
        }
    }

    /**
     * Disable text prediction (if not already disabled).
     */
    async disableTextPrediction(): Promise<void> {
        const isEnabled = await this.isTextPredictionEnabled();
        if (isEnabled) {
            await this.toggleTextPrediction();
        }
    }

    /**
     * Check if the text prediction status indicator is displayed.
     */
    async isTextPredictionStatusDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.textPredictionStatusSelector);
    }

    /**
     * Get the current text prediction status text.
     */
    async getTextPredictionStatusText(): Promise<string> {
        const statusText = await this.$(this.textPredictionStatusTextSelector);
        if (!(await toOPEl(statusText).isExisting())) {
            return '';
        }
        return toOPEl(statusText).getText();
    }

    /**
     * Check if the text prediction progress bar is displayed.
     */
    async isTextPredictionProgressDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.textPredictionProgressSelector);
    }

    /**
     * Check if the text prediction GPU toggle is displayed.
     */
    async isTextPredictionGpuToggleDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.textPredictionGpuToggleSelector);
    }

    /**
     * Check if text prediction GPU acceleration is enabled.
     */
    async isTextPredictionGpuEnabled(): Promise<boolean> {
        const toggle = await this.$(this.textPredictionGpuToggleSelector);
        if (!(await toOPEl(toggle).isExisting())) {
            return false;
        }
        const checked = await toOPEl(toggle).getAttribute('aria-checked');
        return checked === 'true';
    }

    /**
     * Toggle text prediction GPU acceleration on or off.
     */
    async toggleTextPredictionGpu(): Promise<void> {
        this.log('Toggling text prediction GPU');
        const toggle = await this.waitForElement(this.textPredictionGpuToggleSelector);
        const stateBefore = await toOPEl(toggle).getAttribute('aria-checked');
        await this.waitForIpcPropagation(
            async () => {
                await toOPEl(toggle).click();
            },
            async () => (await toOPEl(toggle).getAttribute('aria-checked')) !== stateBefore
        );
    }

    /**
     * Enable text prediction GPU acceleration (if not already enabled).
     */
    async enableTextPredictionGpu(): Promise<void> {
        const isEnabled = await this.isTextPredictionGpuEnabled();
        if (!isEnabled) {
            await this.toggleTextPredictionGpu();
        }
    }

    /**
     * Disable text prediction GPU acceleration (if not already disabled).
     */
    async disableTextPredictionGpu(): Promise<void> {
        const isEnabled = await this.isTextPredictionGpuEnabled();
        if (isEnabled) {
            await this.toggleTextPredictionGpu();
        }
    }

    /**
     * Wait for the text prediction status to change to a specific value.
     * @param expectedStatus - Expected status text to wait for
     * @param timeout - Timeout in milliseconds (default: 10000)
     */
    async waitForTextPredictionStatus(expectedStatus: string, timeout = 10000): Promise<void> {
        await opBrowser.waitUntil(
            async () => {
                const status = await this.getTextPredictionStatusText();
                return status.includes(expectedStatus);
            },
            { timeout, timeoutMsg: `Text prediction status did not change to "${expectedStatus}"` }
        );
    }

    /** Selector for the text prediction simulate error button (dev mode only) */
    get textPredictionSimulateErrorButtonSelector(): string {
        return '[data-testid="text-prediction-simulate-error-button"]';
    }

    /**
     * Check if the text prediction retry button is displayed.
     */
    async isTextPredictionRetryButtonDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.textPredictionRetryButtonSelector);
    }

    /**
     * Click the text prediction retry button.
     */
    async clickTextPredictionRetryButton(): Promise<void> {
        this.log('Clicking text prediction retry button');
        const button = await this.waitForElement(this.textPredictionRetryButtonSelector);
        await this.waitForIpcPropagation(
            async () => {
                await toOPEl(button).click();
            },
            async () => await this.isTextPredictionStatusDisplayed()
        );
    }

    /**
     * Check if the simulate error button exists (dev mode only).
     */
    async isSimulateErrorButtonDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.textPredictionSimulateErrorButtonSelector);
    }

    /**
     * Click the simulate error button to trigger an error state (dev mode only).
     */
    async clickSimulateErrorButton(): Promise<void> {
        this.log('Clicking simulate error button');
        const button = await this.waitForElement(this.textPredictionSimulateErrorButtonSelector);
        await this.waitForIpcPropagation(
            async () => {
                await toOPEl(button).click();
            },
            async () => await this.isTextPredictionInErrorState()
        );
    }

    /**
     * Check if the text prediction status shows an error.
     */
    async isTextPredictionInErrorState(): Promise<boolean> {
        const statusText = await this.getTextPredictionStatusText();
        return statusText.includes('Error');
    }

    // ===========================================================================
    // RESPONSE NOTIFICATION SETTINGS
    // ===========================================================================

    /** Selector for the notifications settings section */
    get notificationSettingsSectionSelector(): string {
        return '[data-testid="notification-settings"]';
    }

    /** Selector for the response notifications toggle switch (the actual button with role="switch") */
    get responseNotificationsSwitchSelector(): string {
        return '[data-testid="response-notifications-toggle-switch"]';
    }

    /** Selector for the response notifications loading indicator */
    get responseNotificationsLoadingSelector(): string {
        return '[data-testid="notification-settings-loading"]';
    }

    /**
     * Check if the Notifications settings section is displayed.
     */
    async isNotificationsSectionDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.notificationSettingsSectionSelector);
    }

    /**
     * Get the Notifications section text (label and description).
     */
    async getNotificationsSectionText(): Promise<string> {
        return this.getElementText(this.notificationSettingsSectionSelector);
    }

    /**
     * Check if response notifications toggle is enabled.
     * Waits for the toggle to finish loading before reading state.
     */
    async isResponseNotificationsEnabled(): Promise<boolean> {
        // Wait for loading state to complete (loading element should not exist)
        try {
            await opBrowser.waitUntil(
                async () => {
                    const loadingEl = await this.$(this.responseNotificationsLoadingSelector);
                    return !(await toOPEl(loadingEl).isExisting());
                },
                { timeout: 5000, timeoutMsg: 'Response notifications toggle did not finish loading' }
            );
        } catch {
            this.log('Warning: Response notifications toggle may still be loading');
        }

        // Now wait for the switch to exist and be displayed
        const toggle = await this.waitForElementToExist(this.responseNotificationsSwitchSelector, 5000);
        const checked = await toOPEl(toggle).getAttribute('aria-checked');
        return checked === 'true';
    }

    /**
     * Toggle response notifications on or off.
     */
    async toggleResponseNotifications(): Promise<void> {
        this.log('Toggling response notifications');
        const toggle = await this.waitForElement(this.responseNotificationsSwitchSelector);
        const stateBefore = await toOPEl(toggle).getAttribute('aria-checked');
        await this.waitForIpcPropagation(
            async () => {
                await toOPEl(toggle).click();
            },
            async () => (await toOPEl(toggle).getAttribute('aria-checked')) !== stateBefore
        );
    }

    /**
     * Enable response notifications (if not already enabled).
     */
    async enableResponseNotifications(): Promise<void> {
        const isEnabled = await this.isResponseNotificationsEnabled();
        if (!isEnabled) {
            await this.toggleResponseNotifications();
        }
    }

    /**
     * Disable response notifications (if not already disabled).
     */
    async disableResponseNotifications(): Promise<void> {
        const isEnabled = await this.isResponseNotificationsEnabled();
        if (isEnabled) {
            await this.toggleResponseNotifications();
        }
    }

    /**
     * Check if the response notifications toggle switch is displayed.
     */
    async isResponseNotificationsToggleDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.responseNotificationsSwitchSelector);
    }

    // ===========================================================================
    // ABOUT TAB QUERIES
    // ===========================================================================

    /**
     * Get the version text displayed in the About tab.
     */
    async getVersionText(): Promise<string> {
        return this.getElementText(this.versionSelector);
    }

    /**
     * Get the text content of the about section.
     */
    async getAboutSectionText(): Promise<string> {
        return this.getElementText(this.aboutSectionSelector);
    }

    /**
     * Check if the about section is displayed.
     */
    async isAboutSectionDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.aboutSectionSelector);
    }

    /**
     * Check if the disclaimer is displayed.
     */
    async isDisclaimerDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.disclaimerSelector);
    }

    /**
     * Check if the license link is present and clickable.
     */
    async isLicenseLinkPresent(): Promise<boolean> {
        return this.isElementExisting(this.licenseLinkSelector);
    }

    // ===========================================================================
    // TITLEBAR AND WINDOW CONTROLS
    // ===========================================================================

    /**
     * Check if the titlebar is displayed.
     */
    async isTitlebarDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.titlebarSelector);
    }

    /**
     * Get the titlebar element.
     */
    async getTitlebar(): Promise<WebdriverIO.Element> {
        return this.waitForElement(this.titlebarSelector);
    }

    /**
     * Check if the titlebar icon is displayed with valid src.
     */
    async isTitlebarIconValid(): Promise<{ exists: boolean; hasValidSrc: boolean; width: number }> {
        // Query the titlebar, then find the icon within it
        const titlebar = await this.getTitlebar();
        const icon = await toOPEl(titlebar).$(this.titlebarIconSelector);
        const exists = await toOPEl(icon as WebdriverIO.Element).isExisting();
        if (!exists) {
            return { exists: false, hasValidSrc: false, width: 0 };
        }
        const src = await toOPEl(icon as WebdriverIO.Element).getAttribute('src');
        const hasValidSrc = src ? /icon(-.*)?\.png/.test(src) : false;
        const width = (await toOPEl(icon as WebdriverIO.Element).getProperty('naturalWidth')) as number;
        return { exists: true, hasValidSrc, width: Number(width) };
    }

    /**
     * Check if window controls container is displayed.
     */
    async isWindowControlsDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.windowControlsSelector);
    }

    /**
     * Get the count of buttons in the window controls container.
     */
    async getWindowControlButtonCount(): Promise<number> {
        const container = await this.$(this.windowControlsSelector);
        const buttons = await toOPEl(container).$$('button');
        return buttons.length;
    }

    /**
     * Check if the minimize button is displayed.
     */
    async isMinimizeButtonDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.minimizeButtonSelector);
    }

    /**
     * Check if the close button is displayed.
     */
    async isCloseButtonDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.closeButtonSelector);
    }

    /**
     * Check if the maximize button exists (should NOT exist in options window).
     */
    async isMaximizeButtonExisting(): Promise<boolean> {
        return this.isElementExisting(this.maximizeButtonSelector);
    }

    /**
     * Click the close button.
     */
    async clickCloseButton(): Promise<void> {
        this.log('Clicking close button');
        await this.clickElement(this.closeButtonSelector);
    }

    // ===========================================================================
    // WINDOW LIFECYCLE
    // ===========================================================================

    /**
     * Wait for the options window to fully load.
     * @param timeout - Timeout in milliseconds (default: 10000)
     */
    async waitForLoad(timeout = 10000): Promise<void> {
        this.log('Waiting for Options window to load');
        await waitForOptionsWindow(timeout);
    }

    /**
     * Close the options window and switch back to the main window.
     */
    async close(): Promise<void> {
        this.log('Closing Options window');
        await closeOptionsWindow();
    }

    // ===========================================================================
    // UTILITY METHODS
    // ===========================================================================

    /**
     * Get the current URL hash (for tab state verification).
     */
    async getUrlHash(): Promise<string> {
        const url = await opBrowser.getUrl();
        const hashIndex = url.indexOf('#');
        return hashIndex >= 0 ? url.substring(hashIndex) : '';
    }
}

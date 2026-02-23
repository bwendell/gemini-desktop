/**
 * Update Toast Page Object.
 *
 * Encapsulates all selectors and interactions for the Update Toast component.
 * Uses test helpers exposed on window.__testUpdateToast for triggering toast states.
 *
 * @module UpdateToastPage
 */

/// <reference path="../helpers/wdio-electron.d.ts" />

import { BasePage } from './BasePage';
import { browser as wdioBrowser } from '@wdio/globals';
import { E2E_TIMING } from '../helpers/e2eConstants';

/**
 * Page Object for the Update Toast component.
 * Provides methods to trigger toast states and interact with toast UI.
 */
export class UpdateToastPage extends BasePage {
    private readonly browser = wdioBrowser as unknown as {
        execute<R, TArgs extends unknown[]>(script: string | ((...args: TArgs) => R), ...args: TArgs): Promise<R>;
        pause(ms: number): Promise<void>;
    };
    constructor() {
        super('UpdateToastPage');
    }

    // ===========================================================================
    // SELECTORS
    // ===========================================================================

    /** Toast container selector */
    get toastSelector(): string {
        return '[data-testid="toast"]';
    }

    /** Toast title selector */
    get titleSelector(): string {
        return '[data-testid="toast-title"]';
    }

    /** Toast message selector */
    get messageSelector(): string {
        return '[data-testid="toast-message"]';
    }

    /** Dismiss button selector (for non-downloaded toasts) */
    get dismissButtonSelector(): string {
        return '[data-testid="toast-dismiss"]';
    }

    /** Restart Now button selector (for downloaded toast) */
    get restartButtonSelector(): string {
        return '[data-testid="toast-action-0"]';
    }

    /** Later button selector (for downloaded toast) */
    get laterButtonSelector(): string {
        return '[data-testid="toast-action-1"]';
    }

    get releaseNotesPrimarySelector(): string {
        return '[data-testid="toast-action-0"]';
    }

    get releaseNotesDownloadedSelector(): string {
        return '[data-testid="toast-action-2"]';
    }

    /** Update badge selector */
    get badgeSelector(): string {
        return '[data-testid="update-badge"]';
    }

    /** Progress bar container selector */
    get progressBarSelector(): string {
        return '[role="progressbar"]';
    }

    /** Progress bar inner element selector */
    get progressBarInnerSelector(): string {
        return '.toast__progress-bar';
    }

    // ===========================================================================
    // TOAST TRIGGER METHODS (use test helpers)
    // ===========================================================================

    /**
     * Show "Update Available" toast via test helper.
     * @param version - Version string to display
     */
    async showAvailable(version: string): Promise<void> {
        this.log(`Showing available toast for version ${version}`);
        await this.browser.execute((v: string) => {
            // @ts-expect-error - test helper
            window.__testUpdateToast.showAvailable(v);
        }, version);
        await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    }

    /**
     * Show "Update Downloaded" toast via test helper.
     * @param version - Version string to display
     */
    async showDownloaded(version: string): Promise<void> {
        this.log(`Showing downloaded toast for version ${version}`);
        await this.browser.execute((v: string) => {
            // @ts-expect-error - test helper
            window.__testUpdateToast.showDownloaded(v);
        }, version);
        await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    }

    /**
     * Show "Update Error" toast via test helper.
     * @param errorMessage - Error message to display
     */
    async showError(errorMessage: string | null): Promise<void> {
        this.log(`Showing error toast: ${errorMessage}`);
        await this.browser.execute((msg: string | null) => {
            // @ts-expect-error - test helper
            window.__testUpdateToast.showError(msg);
        }, errorMessage);
        await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    }

    /**
     * Show "Download Progress" toast via test helper.
     * @param percent - Progress percentage (0-100)
     */
    async showProgress(percent: number): Promise<void> {
        this.log(`Showing progress toast: ${percent}%`);
        await this.browser.execute((p: number) => {
            // @ts-expect-error - test helper
            window.__testUpdateToast.showProgress(p);
        }, percent);
        await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    }

    /**
     * Show "Not Available" (up to date) toast via test helper.
     * @param currentVersion - Current version string
     */
    async showNotAvailable(currentVersion: string): Promise<void> {
        this.log(`Showing not-available toast for version ${currentVersion}`);
        await this.browser.execute((v: string) => {
            // @ts-expect-error - test helper
            window.__testUpdateToast.showNotAvailable(v);
        }, currentVersion);
        await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    }

    /**
     * Hide any visible toast via test helper.
     */
    async hide(): Promise<void> {
        this.log('Hiding toast');
        await this.browser.execute(() => {
            // @ts-expect-error - test helper
            if (window.__testUpdateToast?.hide) {
                // @ts-expect-error
                window.__testUpdateToast.hide();
            }
        });
        await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    }

    // ===========================================================================
    // WAIT OPERATIONS
    // ===========================================================================

    /**
     * Wait for the toast to become visible.
     * @param timeout - Timeout in milliseconds (default: 5000)
     */
    async waitForVisible(timeout = 5000): Promise<void> {
        this.log('Waiting for toast to be visible');
        await this.waitForElement(this.toastSelector, timeout);
    }

    /**
     * Wait for the toast to be hidden.
     * Checks DOM existence to determine if toast has been removed.
     * Falls back to waitForDisplayed reverse check for AnimatePresence states.
     * @param timeout - Timeout in milliseconds (default: 5000)
     */
    async waitForHidden(timeout = 5000): Promise<void> {
        this.log('Waiting for toast to be hidden');
        // Use the original waitForDisplayed reverse check which handles:
        // 1. Element not in DOM (AnimatePresence completed exit)
        // 2. Element in DOM but not visible (exit animation in progress, opacity=0)
        await this.waitForElementToDisappear(this.toastSelector, timeout);
    }

    /**
     * Wait for entry animation to complete before interacting.
     * The toast animation takes ~200ms, so we wait 500ms (ANIMATION_SETTLE) to be safe.
     */
    async waitForAnimationComplete(): Promise<void> {
        await this.browser.pause(E2E_TIMING.ANIMATION_SETTLE);
    }

    // ===========================================================================
    // BUTTON ACTIONS
    // ===========================================================================

    /**
     * Click the dismiss button (for non-downloaded toasts).
     * Waits for entry animation before clicking.
     */
    async dismiss(): Promise<void> {
        this.log('Clicking dismiss button');
        await this.waitForAnimationComplete();
        const dismissBtn = (await this.$(this.dismissButtonSelector)) as WebdriverIO.Element & {
            waitForClickable: (options?: { timeout?: number }) => Promise<boolean>;
        };
        await dismissBtn.waitForClickable({ timeout: 2000 });
        await this.clickElement(this.dismissButtonSelector);
        // Allow React state update and exit animation to begin
        await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    }

    /**
     * Click the "Restart Now" button (for downloaded toast).
     */
    async clickRestartNow(): Promise<void> {
        this.log('Clicking Restart Now button');
        const restartBtn = (await this.$(this.restartButtonSelector)) as WebdriverIO.Element & {
            waitForClickable: (options?: { timeout?: number }) => Promise<boolean>;
        };
        await restartBtn.waitForClickable({ timeout: 2000 });
        await this.clickElement(this.restartButtonSelector);
    }

    /**
     * Click the "Later" button (for downloaded toast).
     */
    async clickLater(): Promise<void> {
        this.log('Clicking Later button');
        await this.waitForAnimationComplete();
        const laterBtn = (await this.$(this.laterButtonSelector)) as WebdriverIO.Element & {
            waitForClickable: (options?: { timeout?: number }) => Promise<boolean>;
        };
        await laterBtn.waitForClickable({ timeout: 2000 });
        await this.clickElement(this.laterButtonSelector);
        // Allow React state update and exit animation to begin
        await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    }

    async clickReleaseNotesPrimary(): Promise<void> {
        this.log('Clicking View Release Notes button (primary)');
        const releaseNotesBtn = (await this.$(this.releaseNotesPrimarySelector)) as WebdriverIO.Element & {
            waitForClickable: (options?: { timeout?: number }) => Promise<boolean>;
        };
        await releaseNotesBtn.waitForClickable({ timeout: 2000 });
        await this.clickElement(this.releaseNotesPrimarySelector);
    }

    async clickReleaseNotesDownloaded(): Promise<void> {
        this.log('Clicking View Release Notes button (downloaded)');
        const releaseNotesBtn = (await this.$(this.releaseNotesDownloadedSelector)) as WebdriverIO.Element & {
            waitForClickable: (options?: { timeout?: number }) => Promise<boolean>;
        };
        await releaseNotesBtn.waitForClickable({ timeout: 2000 });
        await this.clickElement(this.releaseNotesDownloadedSelector);
    }

    // ===========================================================================
    // STATE QUERIES
    // ===========================================================================

    /**
     * Check if the toast is currently displayed.
     */
    async isDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.toastSelector);
    }

    /**
     * Get the toast title text.
     */
    async getTitle(): Promise<string> {
        return this.getElementText(this.titleSelector);
    }

    /**
     * Get the toast message text.
     */
    async getMessage(): Promise<string> {
        return this.getElementText(this.messageSelector);
    }

    /**
     * Check if the Restart Now button is displayed.
     */
    async isRestartButtonDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.restartButtonSelector);
    }

    /**
     * Check if the Restart Now button exists in the DOM.
     */
    async isRestartButtonExisting(): Promise<boolean> {
        if (!(await this.isElementExisting(this.restartButtonSelector))) {
            return false;
        }

        const text = await this.getElementText(this.restartButtonSelector);
        return /restart/i.test(text);
    }

    /**
     * Check if the Later button is displayed.
     */
    async isLaterButtonDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.laterButtonSelector);
    }

    /**
     * Check if the Later button exists in the DOM.
     */
    async isLaterButtonExisting(): Promise<boolean> {
        return this.isElementExisting(this.laterButtonSelector);
    }

    async isReleaseNotesPrimaryExisting(): Promise<boolean> {
        return this.isElementExisting(this.releaseNotesPrimarySelector);
    }

    async isReleaseNotesDownloadedExisting(): Promise<boolean> {
        return this.isElementExisting(this.releaseNotesDownloadedSelector);
    }

    async getReleaseNotesPrimaryText(): Promise<string> {
        return this.getElementText(this.releaseNotesPrimarySelector);
    }

    async getReleaseNotesDownloadedText(): Promise<string> {
        return this.getElementText(this.releaseNotesDownloadedSelector);
    }

    /**
     * Check if the dismiss button exists in the DOM.
     */
    async isDismissButtonExisting(): Promise<boolean> {
        return this.isElementExisting(this.dismissButtonSelector);
    }

    /**
     * Get the Restart Now button text.
     */
    async getRestartButtonText(): Promise<string> {
        return this.getElementText(this.restartButtonSelector);
    }

    /**
     * Check if the progress bar is displayed.
     */
    async isProgressBarDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.progressBarSelector);
    }

    /**
     * Get the progress bar value (aria-valuenow attribute).
     */
    async getProgressValue(): Promise<string | null> {
        return this.getElementAttribute(this.progressBarSelector, 'aria-valuenow');
    }

    /**
     * Get the progress bar width style (e.g., "width: 75%").
     */
    async getProgressBarStyle(): Promise<string | null> {
        return this.getElementAttribute(this.progressBarInnerSelector, 'style');
    }

    // ===========================================================================
    // BADGE AND TRAY METHODS
    // ===========================================================================

    /**
     * Show the update badge via dev helper.
     * @param version - Version string for the badge
     */
    async showBadge(version: string): Promise<void> {
        this.log(`Showing badge for version ${version}`);
        await this.browser.execute((v: string) => {
            // @ts-expect-error - electronAPI exposed at runtime
            window.electronAPI.devShowBadge(v);
        }, version);
    }

    /**
     * Clear the update badge via dev helper.
     */
    async clearBadge(): Promise<void> {
        this.log('Clearing badge');
        await this.browser.execute(() => {
            // @ts-expect-error - electronAPI exposed at runtime
            window.electronAPI.devClearBadge();
        });
    }

    /**
     * Check if the update badge is displayed.
     */
    async isBadgeDisplayed(): Promise<boolean> {
        return this.isElementDisplayed(this.badgeSelector);
    }

    /**
     * Check if the update badge exists in the DOM.
     */
    async isBadgeExisting(): Promise<boolean> {
        return this.isElementExisting(this.badgeSelector);
    }

    /**
     * Get the tray tooltip text.
     */
    async getTrayTooltip(): Promise<string> {
        // @ts-expect-error - electronAPI exposed at runtime
        return this.browser.execute(() => window.electronAPI.getTrayTooltip());
    }

    // ===========================================================================
    // COMPOUND ACTIONS
    // ===========================================================================

    /**
     * Clear any existing toasts and badges (for test setup).
     *
     * Calls hide() twice with pauses to handle IPC race conditions:
     * Previous tests may trigger async IPC events (e.g., installUpdate() failing)
     * that arrive after the first hide(), re-showing the toast.
     */
    async clearAll(): Promise<void> {
        this.log('Clearing all toasts and badges');
        await this.clearBadge();
        // First hide() to clear any currently visible toast
        await this.hide();
        // Pause to allow any late IPC events to arrive and re-show the toast
        await this.browser.pause(E2E_TIMING.ANIMATION_SETTLE);
        // Second hide() to catch any toast re-shown by late IPC events
        await this.hide();
        // Final pause for animation settle
        await this.browser.pause(E2E_TIMING.ANIMATION_SETTLE);
    }
}

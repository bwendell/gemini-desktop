/**
 * Toast Page Object.
 *
 * Encapsulates all selectors and interactions for the generic Toast component.
 * Uses test helpers exposed on window.__toastTestHelpers for triggering toast states.
 *
 * @module ToastPage
 */

/// <reference path="../helpers/wdio-electron.d.ts" />

import { BasePage } from './BasePage';
import { browser } from '@wdio/globals';
import { E2E_TIMING } from '../helpers/e2eConstants';

/**
 * Toast type options
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'progress';

/**
 * Options for showing a toast
 */
export interface ShowToastOptions {
  id?: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number | null;
  progress?: number;
  persistent?: boolean;
}

/**
 * Page Object for the generic Toast component.
 * Provides methods to trigger toast states and interact with toast UI.
 */
export class ToastPage extends BasePage {
  constructor() {
    super('ToastPage');
  }

  // ===========================================================================
  // SELECTORS
  // ===========================================================================

  /** Toast container selector */
  get containerSelector(): string {
    return '[data-testid="toast-container"]';
  }

  /** Individual toast selector */
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

  /** Dismiss button selector */
  get dismissButtonSelector(): string {
    return '[data-testid="toast-dismiss"]';
  }

  /** Action button selector (by index) */
  actionButtonSelector(index: number): string {
    return `[data-testid="toast-action-${index}"]`;
  }

  /** Progress bar container selector */
  get progressBarSelector(): string {
    return '[role="progressbar"]';
  }

  /** Progress bar inner element selector */
  get progressBarInnerSelector(): string {
    return '.toast__progress-bar';
  }

  /** Toast by type selector */
  toastByTypeSelector(type: ToastType): string {
    return `[data-testid="toast"].toast--${type}`;
  }

  /** Toast by ID selector */
  toastByIdSelector(id: string): string {
    return `[data-toast-id="${id}"]`;
  }

  // ===========================================================================
  // TOAST TRIGGER METHODS (use test helpers)
  // ===========================================================================

  /**
   * Show a toast via test helper.
   * @param options - Toast options
   * @returns Toast ID
   */
  async showToast(options: ShowToastOptions): Promise<string> {
    this.log(`Showing toast: type=${options.type}, message=${options.message}`);
    const id = await browser.execute((opts: ShowToastOptions) => {
      // @ts-ignore - test helper
      return window.__toastTestHelpers.showToast(opts);
    }, options);
    await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    return id;
  }

  /**
   * Show a success toast via test helper.
   * @param message - Toast message
   * @param options - Additional options
   * @returns Toast ID
   */
  async showSuccess(message: string, options?: Partial<ShowToastOptions>): Promise<string> {
    this.log(`Showing success toast: ${message}`);
    const id = await browser.execute(
      (msg: string, opts: Partial<ShowToastOptions> | undefined) => {
        // @ts-ignore - test helper
        return window.__toastTestHelpers.showSuccess(msg, opts);
      },
      message,
      options
    );
    await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    return id;
  }

  /**
   * Show an error toast via test helper.
   * @param message - Toast message
   * @param options - Additional options
   * @returns Toast ID
   */
  async showError(message: string, options?: Partial<ShowToastOptions>): Promise<string> {
    this.log(`Showing error toast: ${message}`);
    const id = await browser.execute(
      (msg: string, opts: Partial<ShowToastOptions> | undefined) => {
        // @ts-ignore - test helper
        return window.__toastTestHelpers.showError(msg, opts);
      },
      message,
      options
    );
    await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    return id;
  }

  /**
   * Show an info toast via test helper.
   * @param message - Toast message
   * @param options - Additional options
   * @returns Toast ID
   */
  async showInfo(message: string, options?: Partial<ShowToastOptions>): Promise<string> {
    this.log(`Showing info toast: ${message}`);
    const id = await browser.execute(
      (msg: string, opts: Partial<ShowToastOptions> | undefined) => {
        // @ts-ignore - test helper
        return window.__toastTestHelpers.showInfo(msg, opts);
      },
      message,
      options
    );
    await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    return id;
  }

  /**
   * Show a warning toast via test helper.
   * @param message - Toast message
   * @param options - Additional options
   * @returns Toast ID
   */
  async showWarning(message: string, options?: Partial<ShowToastOptions>): Promise<string> {
    this.log(`Showing warning toast: ${message}`);
    const id = await browser.execute(
      (msg: string, opts: Partial<ShowToastOptions> | undefined) => {
        // @ts-ignore - test helper
        return window.__toastTestHelpers.showWarning(msg, opts);
      },
      message,
      options
    );
    await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    return id;
  }

  /**
   * Show a progress toast via test helper.
   * @param message - Toast message
   * @param progress - Progress percentage (0-100)
   * @param options - Additional options
   * @returns Toast ID
   */
  async showProgress(
    message: string,
    progress: number,
    options?: Partial<ShowToastOptions>
  ): Promise<string> {
    this.log(`Showing progress toast: ${message} (${progress}%)`);
    const id = await browser.execute(
      (msg: string, prog: number, opts: Partial<ShowToastOptions> | undefined) => {
        // @ts-ignore - test helper
        return window.__toastTestHelpers.showToast({
          type: 'progress',
          message: msg,
          progress: prog,
          persistent: true,
          ...opts,
        });
      },
      message,
      progress,
      options
    );
    await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    return id;
  }

  /**
   * Dismiss a specific toast by ID via test helper.
   * @param id - Toast ID
   */
  async dismissToastById(id: string): Promise<void> {
    this.log(`Dismissing toast by ID: ${id}`);
    await browser.execute((toastId: string) => {
      // @ts-ignore - test helper
      window.__toastTestHelpers.dismissToast(toastId);
    }, id);
    await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
  }

  /**
   * Dismiss all toasts via test helper.
   */
  async dismissAll(): Promise<void> {
    this.log('Dismissing all toasts');
    await browser.execute(() => {
      // @ts-ignore - test helper
      window.__toastTestHelpers.dismissAll();
    });
    await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
  }

  /**
   * Get the current toasts from the context.
   */
  async getToasts(): Promise<Array<{ id: string; type: ToastType; message: string }>> {
    return browser.execute(() => {
      // @ts-ignore - test helper
      return window.__toastTestHelpers.getToasts();
    });
  }

  // ===========================================================================
  // WAIT OPERATIONS
  // ===========================================================================

  /**
   * Wait for the toast container to be visible.
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  async waitForContainerVisible(timeout = 5000): Promise<void> {
    this.log('Waiting for toast container to be visible');
    await this.waitForElement(this.containerSelector, timeout);
  }

  /**
   * Wait for at least one toast to be visible.
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  async waitForToastVisible(timeout = 5000): Promise<void> {
    this.log('Waiting for toast to be visible');
    await this.waitForElement(this.toastSelector, timeout);
  }

  /**
   * Wait for a specific toast type to be visible.
   * @param type - Toast type to wait for
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  async waitForToastType(type: ToastType, timeout = 5000): Promise<void> {
    this.log(`Waiting for ${type} toast to be visible`);
    await this.waitForElement(this.toastByTypeSelector(type), timeout);
  }

  /**
   * Wait for all toasts to be dismissed.
   * @param timeout - Timeout in milliseconds (default: 3000)
   */
  async waitForAllToastsDismissed(timeout = 3000): Promise<void> {
    this.log('Waiting for all toasts to be dismissed');
    await this.waitForElementToDisappear(this.toastSelector, timeout);
  }

  /**
   * Wait for entry animation to complete before interacting.
   * The toast animation takes ~200ms, so we wait 500ms (ANIMATION_SETTLE) to be safe.
   */
  async waitForAnimationComplete(): Promise<void> {
    await browser.pause(E2E_TIMING.ANIMATION_SETTLE);
  }

  /**
   * Wait for a toast to appear, optionally filtering by type.
   * @param type - Optional toast type to wait for
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  async waitForToast(type?: ToastType, timeout = 5000): Promise<void> {
    if (type) {
      await this.waitForToastType(type, timeout);
    } else {
      await this.waitForToastVisible(timeout);
    }
  }

  /**
   * Wait for a specific toast (by index) to be dismissed.
   * @param index - 0-based index of the toast to wait for dismissal
   * @param timeout - Timeout in milliseconds (default: 5000)
   */
  async waitForToastDismissed(index: number, timeout = 5000): Promise<void> {
    this.log(`Waiting for toast at index ${index} to be dismissed`);
    const initialCount = await this.getToastCount();
    if (initialCount <= index) {
      this.log('Toast already dismissed or index out of range');
      return;
    }

    await browser.waitUntil(
      async () => {
        const currentCount = await this.getToastCount();
        return currentCount < initialCount;
      },
      {
        timeout,
        timeoutMsg: `Toast at index ${index} still visible after ${timeout}ms`,
      }
    );
  }

  // ===========================================================================
  // TOAST RETRIEVAL BY INDEX
  // ===========================================================================

  /**
   * Get a toast element by index.
   * Index 0 is the newest (top) toast.
   * @param index - 0-based index
   * @returns The toast element or null if not found
   */
  async getToastByIndex(index: number): Promise<WebdriverIO.Element | null> {
    const toasts = await this.$$(this.toastSelector);
    if (index >= toasts.length) {
      this.log(`No toast at index ${index}, only ${toasts.length} toasts`);
      return null;
    }
    return toasts[index];
  }

  /**
   * Get the title and message text of a toast at a specific index.
   * @param index - 0-based index of the toast
   * @returns Object with title (optional) and message
   */
  async getToastText(index: number): Promise<{ title?: string; message: string }> {
    const toast = await this.getToastByIndex(index);
    if (!toast) {
      throw new Error(`Cannot get text: no toast at index ${index}`);
    }

    let title: string | undefined;
    const titleEl = await toast.$(this.titleSelector);
    if (await titleEl.isExisting()) {
      title = await titleEl.getText();
    }

    const messageEl = await toast.$(this.messageSelector);
    const message = await messageEl.getText();

    return { title, message };
  }

  // ===========================================================================
  // BUTTON ACTIONS
  // ===========================================================================

  /**
   * Click the dismiss button on the first visible toast.
   * Waits for entry animation before clicking.
   */
  async clickDismiss(): Promise<void> {
    this.log('Clicking dismiss button');
    await this.waitForAnimationComplete();
    const dismissBtn = await this.$(this.dismissButtonSelector);
    await dismissBtn.waitForClickable({ timeout: 2000 });
    await this.clickElement(this.dismissButtonSelector);
  }

  /**
   * Dismiss a toast at a specific index by clicking its dismiss button.
   * @param index - 0-based index of the toast to dismiss
   */
  async dismissToast(index: number): Promise<void> {
    this.log(`Dismissing toast at index ${index}`);
    await this.waitForAnimationComplete();

    const toast = await this.getToastByIndex(index);
    if (!toast) {
      throw new Error(`Cannot dismiss: no toast at index ${index}`);
    }

    const dismissBtn = await toast.$(this.dismissButtonSelector);
    await dismissBtn.waitForClickable({ timeout: 2000 });
    await dismissBtn.click();
  }

  /**
   * Click an action button by index (0-based).
   * @param index - Action button index
   */
  async clickAction(index: number): Promise<void> {
    this.log(`Clicking action button ${index}`);
    await this.waitForAnimationComplete();
    const selector = this.actionButtonSelector(index);
    const actionBtn = await this.$(selector);
    await actionBtn.waitForClickable({ timeout: 2000 });
    await this.clickElement(selector);
  }

  /**
   * Click an action button on a specific toast.
   * @param toastIndex - 0-based index of the toast
   * @param actionIndex - 0-based index of the action button
   * @param label - Optional label to verify button text
   */
  async clickActionOnToast(toastIndex: number, actionIndex: number, label?: string): Promise<void> {
    this.log(
      `Clicking action ${actionIndex}${label ? ` ("${label}")` : ''} on toast at index ${toastIndex}`
    );
    await this.waitForAnimationComplete();

    const toast = await this.getToastByIndex(toastIndex);
    if (!toast) {
      throw new Error(`Cannot click action: no toast at index ${toastIndex}`);
    }

    const actionBtn = await toast.$(this.actionButtonSelector(actionIndex));

    // Verify label if provided
    if (label) {
      const btnText = await actionBtn.getText();
      if (!btnText.includes(label)) {
        throw new Error(
          `Action button text "${btnText}" does not contain expected label "${label}"`
        );
      }
    }

    await actionBtn.waitForClickable({ timeout: 2000 });
    await actionBtn.click();
  }

  // ===========================================================================
  // STATE QUERIES
  // ===========================================================================

  /**
   * Check if the toast container is displayed.
   */
  async isContainerDisplayed(): Promise<boolean> {
    return this.isElementDisplayed(this.containerSelector);
  }

  /**
   * Check if any toast is currently displayed.
   */
  async isToastDisplayed(): Promise<boolean> {
    return this.isElementDisplayed(this.toastSelector);
  }

  /**
   * Check if a specific toast type is displayed.
   * @param type - Toast type to check
   */
  async isToastTypeDisplayed(type: ToastType): Promise<boolean> {
    return this.isElementDisplayed(this.toastByTypeSelector(type));
  }

  /**
   * Get the number of visible toasts.
   */
  async getToastCount(): Promise<number> {
    const toasts = await this.$$(this.toastSelector);
    return toasts.length;
  }

  /**
   * Get the first toast's title text.
   */
  async getTitle(): Promise<string> {
    return this.getElementText(this.titleSelector);
  }

  /**
   * Get the first toast's message text.
   */
  async getMessage(): Promise<string> {
    return this.getElementText(this.messageSelector);
  }

  /**
   * Check if the dismiss button is displayed.
   */
  async isDismissButtonDisplayed(): Promise<boolean> {
    return this.isElementDisplayed(this.dismissButtonSelector);
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
   * Get the toast icon text (emoji).
   */
  async getToastIcon(): Promise<string> {
    const iconElement = await this.$('.toast__icon');
    return iconElement.getText();
  }

  /**
   * Get the role attribute of the first toast.
   */
  async getToastRole(): Promise<string | null> {
    return this.getElementAttribute(this.toastSelector, 'role');
  }

  /**
   * Get the aria-live attribute of the first toast.
   */
  async getToastAriaLive(): Promise<string | null> {
    return this.getElementAttribute(this.toastSelector, 'aria-live');
  }

  /**
   * Get the toast type class (e.g., 'toast--success').
   */
  async getToastTypeClass(): Promise<string | null> {
    const toast = await this.$(this.toastSelector);
    const className = await toast.getAttribute('class');
    const match = className?.match(/toast--(\w+)/);
    return match ? match[1] : null;
  }

  /**
   * Check if the toast is positioned in the bottom-left corner.
   * Verifies the container has the expected fixed positioning.
   */
  async isPositionedBottomLeft(): Promise<boolean> {
    const container = await this.$(this.containerSelector);
    const position = await container.getCSSProperty('position');
    const bottom = await container.getCSSProperty('bottom');
    const left = await container.getCSSProperty('left');

    // Position should be fixed, bottom and left should be small values (not auto)
    const isFixed = position.value === 'fixed';
    const hasBottom =
      bottom.value !== 'auto' && parseInt(String(bottom.parsed?.value ?? 0), 10) >= 0;
    const hasLeft = left.value !== 'auto' && parseInt(String(left.parsed?.value ?? 0), 10) >= 0;

    return isFixed && hasBottom && hasLeft;
  }

  /**
   * Check if the toast exists in the DOM (not just visible).
   */
  async isToastInDOM(): Promise<boolean> {
    return this.isElementExisting(this.toastSelector);
  }

  // ===========================================================================
  // COMPOUND ACTIONS
  // ===========================================================================

  /**
   * Clear all toasts (for test setup).
   */
  async clearAll(): Promise<void> {
    this.log('Clearing all toasts');
    await this.dismissAll();
    await this.pause();
  }

  // ===========================================================================
  // STACKING HELPERS (for E2E stacking tests)
  // ===========================================================================

  /**
   * Get toast IDs in DOM order (first = topmost in the visual stack).
   * With flex-direction: column-reverse, first in DOM appears at bottom visually,
   * but with our implementation, newest toasts are added last and display at top.
   */
  async getToastIdsInOrder(): Promise<string[]> {
    const ids = await browser.execute((selector: string) => {
      const toasts = document.querySelectorAll(selector);
      return Array.from(toasts).map((toast) => {
        return (toast as HTMLElement).getAttribute('data-toast-id') || '';
      });
    }, this.toastSelector);
    return ids;
  }

  /**
   * Get toast messages in DOM order.
   */
  async getToastMessagesInOrder(): Promise<string[]> {
    const messages = await browser.execute(
      (toastSelector: string, msgSelector: string) => {
        const toasts = document.querySelectorAll(toastSelector);
        return Array.from(toasts).map((toast) => {
          const msgEl = toast.querySelector(msgSelector);
          return msgEl?.textContent || '';
        });
      },
      this.toastSelector,
      this.messageSelector
    );
    return messages;
  }

  /**
   * Get the bounding rect of each toast for verifying vertical stacking.
   */
  async getToastPositions(): Promise<
    Array<{ x: number; y: number; width: number; height: number }>
  > {
    const positions = await browser.execute((selector: string) => {
      const toasts = document.querySelectorAll(selector);
      return Array.from(toasts).map((toast) => {
        const rect = (toast as HTMLElement).getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });
    }, this.toastSelector);
    return positions;
  }

  /**
   * Show multiple toasts rapidly for testing stacking behavior.
   * @param count - Number of toasts to create
   * @param delayMs - Delay between each toast (default: 50ms)
   * @param options - Toast options
   * @returns Array of toast IDs
   */
  async showMultipleToasts(
    count: number,
    delayMs = 50,
    options?: { type?: ToastType; persistent?: boolean }
  ): Promise<string[]> {
    this.log(`Showing ${count} toasts with ${delayMs}ms delay`);
    const type = options?.type || 'info';

    const ids: string[] = [];
    for (let i = 0; i < count; i++) {
      const id = await browser.execute(
        (t: ToastType, msg: string, opts: typeof options) => {
          // @ts-ignore - test helper
          return window.__toastTestHelpers.showToast({
            type: t,
            message: msg,
            persistent: opts?.persistent ?? true, // Prevent auto-dismiss during test
          });
        },
        type,
        `Toast ${i + 1}`,
        options
      );
      ids.push(id);

      if (delayMs > 0 && i < count - 1) {
        await browser.pause(delayMs);
      }
    }

    // Wait for final toast to render
    await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    return ids;
  }

  /**
   * Dismiss a toast by its index in the DOM (0 = first toast).
   * Uses the dismiss button click to simulate real user interaction.
   * @param index - Index of the toast to dismiss
   */
  async dismissToastByIndex(index: number): Promise<void> {
    this.log(`Dismissing toast at index ${index}`);
    await this.waitForAnimationComplete();

    await browser.execute(
      (toastSelector: string, dismissSelector: string, idx: number) => {
        const toasts = document.querySelectorAll(toastSelector);
        if (idx >= toasts.length) throw new Error(`Toast index ${idx} out of range`);
        const dismissBtn = toasts[idx].querySelector(dismissSelector) as HTMLElement;
        if (!dismissBtn) throw new Error(`Dismiss button not found on toast ${idx}`);
        dismissBtn.click();
      },
      this.toastSelector,
      this.dismissButtonSelector,
      index
    );

    await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
  }

  /**
   * Check if toasts are stacked vertically with proper spacing.
   * Verifies that each toast's top position is greater than the previous one.
   * @returns true if toasts are properly stacked vertically
   */
  async areToastsStackedVertically(): Promise<boolean> {
    const positions = await this.getToastPositions();
    if (positions.length < 2) return true; // Single toast is trivially stacked

    // With flex-direction: column-reverse, newer toasts appear at top (smaller y)
    // So we check that y values are ascending (or allow for overlap during animation)
    for (let i = 1; i < positions.length; i++) {
      // Each subsequent toast should be below the previous one (larger y)
      // Allow for some margin/gap between toasts
      if (positions[i].y <= positions[i - 1].y) {
        return false;
      }
    }
    return true;
  }

  // ===========================================================================
  // ACTION CLICK TRACKING (for E2E testing action button callbacks)
  // ===========================================================================

  /**
   * Get the last clicked action button info (set by action callbacks).
   * This is used to verify action button callbacks were invoked.
   * @returns Object with label and index of last clicked action, or null if none clicked
   */
  async getLastActionClicked(): Promise<{ label: string; index: number } | null> {
    return browser.execute(() => {
      // @ts-ignore - test tracking
      return window.__lastActionClicked ?? null;
    });
  }

  /**
   * Clear the action click tracking.
   * Call this before tests that need to verify action button clicks.
   */
  async clearActionClickTracking(): Promise<void> {
    await browser.execute(() => {
      // @ts-ignore - test tracking
      delete window.__lastActionClicked;
    });
  }

  /**
   * Trigger a toast with action buttons that track clicks.
   * The actions will set window.__lastActionClicked when clicked, which can
   * be retrieved with getLastActionClicked().
   *
   * @param type - Toast type
   * @param message - Toast message
   * @param actions - Array of action button definitions
   * @param options - Additional toast options
   * @returns Toast ID
   */
  async showToastWithActions(
    type: 'success' | 'error' | 'info' | 'warning',
    message: string,
    actions: Array<{ label: string; primary?: boolean }>,
    options?: Partial<ShowToastOptions>
  ): Promise<string> {
    this.log(`Showing ${type} toast with ${actions.length} action(s): ${message}`);

    const id = await browser.execute(
      (
        toastType: string,
        msg: string,
        actionDefs: Array<{ label: string; primary?: boolean }>,
        opts: Partial<ShowToastOptions> | undefined
      ) => {
        // @ts-ignore - test helper
        const helpers = window.__toastTestHelpers;
        if (!helpers) {
          throw new Error('Toast test helpers not found. Is the app running in dev mode?');
        }

        // Add click tracking to action handlers
        const actionsWithTracking = actionDefs.map(
          (action: { label: string; primary?: boolean }, index: number) => ({
            ...action,
            onClick: () => {
              // @ts-ignore - test tracking
              window.__lastActionClicked = { label: action.label, index };
            },
          })
        );

        return helpers.showToast({
          type: toastType,
          message: msg,
          persistent: true, // Use persistent to control timing in tests
          actions: actionsWithTracking,
          ...opts,
        });
      },
      type,
      message,
      actions,
      options
    );

    await this.pause(E2E_TIMING.IPC_ROUND_TRIP);
    return id;
  }
}

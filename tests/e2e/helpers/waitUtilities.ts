/**
 * E2E Wait Utilities for Deterministic Test Waits.
 *
 * Replaces static browser.pause() calls with condition-based polling waits.
 * Each utility targets a specific pause category from E2E_TIMING.
 *
 * @module waitUtilities
 * @see E2E_TIMING for timeout and polling interval constants
 */

/// <reference path="./wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import { E2ELogger } from './logger';
import { E2E_TIMING } from './e2eConstants';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Options for waitForUIState.
 */
export interface WaitForUIStateOptions {
    /** Maximum time to wait in milliseconds (default: 5000) */
    timeout?: number;
    /** Polling interval in milliseconds (default: 50) */
    interval?: number;
    /** Description for logging */
    description?: string;
}

/**
 * Options for waitForIPCRoundTrip.
 */
export interface WaitForIPCRoundTripOptions {
    /** Maximum time to wait in milliseconds (default: 3000) */
    timeout?: number;
    /** Optional verification function to confirm state change */
    verification?: () => Promise<boolean>;
}

/**
 * Options for waitForWindowTransition.
 */
export interface WaitForWindowTransitionOptions {
    /** Maximum time to wait in milliseconds (default: 5000) */
    timeout?: number;
    /** Time window must be stable before considering complete (default: 200) */
    stableDuration?: number;
    /** Polling interval in milliseconds (default: 100) */
    interval?: number;
    /** Description for logging */
    description?: string;
}

/**
 * Options for waitForAnimationSettle.
 */
export interface WaitForAnimationSettleOptions {
    /** Maximum time to wait in milliseconds (default: 3000) */
    timeout?: number;
    /** CSS property to check for stability (default: 'transform') */
    property?: string;
    /** Polling interval in milliseconds (default: 50) */
    interval?: number;
}

/**
 * Options for waitForFullscreenTransition.
 */
export interface WaitForFullscreenTransitionOptions {
    /** Maximum time to wait in milliseconds (default: 10000) */
    timeout?: number;
    /** Polling interval in milliseconds (default: 100) */
    interval?: number;
    /** Duration state must be stable before considering transition complete (default: 300) */
    stableDuration?: number;
}

/**
 * Options for waitForMacOSWindowStabilize.
 */
export interface WaitForMacOSWindowStabilizeOptions {
    /** Maximum time to wait in milliseconds (default: 5000) */
    timeout?: number;
    /** Polling interval in milliseconds (default: 100) */
    interval?: number;
    /** Description for logging */
    description?: string;
}

/**
 * Options for waitForCleanup.
 */
export interface WaitForCleanupOptions {
    /** Maximum time to wait in milliseconds (default: 2000) */
    timeout?: number;
}

/**
 * Options for waitForCycle.
 */
export interface WaitForCycleOptions {
    /** Maximum time per operation in milliseconds (default: 3000) */
    timeoutPerOperation?: number;
    /** Maximum retries for the entire cycle (default: 3) */
    maxRetries?: number;
}

// =============================================================================
// Core Wait Utilities
// =============================================================================

/**
 * Waits for a UI state condition to be met using polling.
 * Replaces: browser.pause(E2E_TIMING.UI_STATE_PAUSE_MS)
 *
 * @param condition - Async function that returns true when condition is met
 * @param options - Configuration options
 * @returns Promise<boolean> - True if condition met, false if timeout
 *
 * @example
 * await waitForUIState(async () => {
 *   const element = await browser.$('.toast');
 *   return await element.isDisplayed();
 * }, { description: 'Toast to appear' });
 */
export async function waitForUIState(
    condition: () => Promise<boolean>,
    options: WaitForUIStateOptions = {}
): Promise<boolean> {
    const {
        timeout = E2E_TIMING.TIMEOUTS?.UI_STATE ?? 5000,
        interval = E2E_TIMING.POLLING?.UI_STATE ?? 50,
        description = 'UI state condition',
    } = options;

    const startTime = Date.now();
    const logPrefix = description ? `[${description}] ` : '';

    E2ELogger.info('waitUtilities', `${logPrefix}Waiting for UI state (timeout: ${timeout}ms)`);

    while (Date.now() - startTime < timeout) {
        try {
            if (await condition()) {
                const elapsed = Date.now() - startTime;
                E2ELogger.info('waitUtilities', `${logPrefix}✓ Condition met after ${elapsed}ms`);
                return true;
            }
        } catch (error) {
            // Condition threw error, treat as not met and continue polling
            E2ELogger.info('waitUtilities', `${logPrefix}Condition check error: ${error}`);
        }

        await browser.pause(interval);
    }

    E2ELogger.info('waitUtilities', `${logPrefix}✗ Timeout waiting for UI state after ${timeout}ms`);
    return false;
}

/**
 * Executes an action and waits for IPC round-trip completion with optional verification.
 * Replaces: browser.pause(E2E_TIMING.IPC_ROUND_TRIP)
 *
 * @param action - Async function to execute (triggers IPC)
 * @param options - Configuration options
 *
 * @example
 * await waitForIPCRoundTrip(
 *   async () => await setAlwaysOnTop(true),
 *   { verification: async () => (await getAlwaysOnTopState()).enabled }
 * );
 */
export async function waitForIPCRoundTrip(
    action: () => Promise<void>,
    options: WaitForIPCRoundTripOptions = {}
): Promise<void> {
    const { timeout = E2E_TIMING.TIMEOUTS?.IPC_OPERATION ?? 3000, verification } = options;

    E2ELogger.info('waitUtilities', `Executing IPC action (timeout: ${timeout}ms)`);

    // Execute the action
    await action();

    // If no verification provided, use a brief safety delay (legacy behavior)
    if (!verification) {
        await browser.pause(Math.min(100, timeout));
        return;
    }

    // Wait for verification condition
    const startTime = Date.now();
    const pollInterval = E2E_TIMING.POLLING?.IPC ?? 50;

    while (Date.now() - startTime < timeout) {
        try {
            if (await verification()) {
                const elapsed = Date.now() - startTime;
                E2ELogger.info('waitUtilities', `✓ IPC round-trip complete after ${elapsed}ms`);
                return;
            }
        } catch {
            // Verification threw error, continue polling
        }

        await browser.pause(pollInterval);
    }

    E2ELogger.info('waitUtilities', `✗ IPC verification timeout after ${timeout}ms`);
    throw new Error(`IPC round-trip verification failed after ${timeout}ms`);
}

/**
 * Waits for a window transition to complete by polling a condition.
 * Includes stability check to ensure state has settled.
 * Replaces: browser.pause(E2E_TIMING.WINDOW_TRANSITION)
 *
 * @param condition - Async function that returns true when transition is complete
 * @param options - Configuration options
 * @returns Promise<boolean> - True if transition complete, false if timeout
 *
 * @example
 * await waitForWindowTransition(
 *   async () => await isWindowMinimized(),
 *   { description: 'Window minimize' }
 * );
 */
export async function waitForWindowTransition(
    condition: () => Promise<boolean>,
    options: WaitForWindowTransitionOptions = {}
): Promise<boolean> {
    const {
        timeout = E2E_TIMING.TIMEOUTS?.WINDOW_TRANSITION ?? 5000,
        stableDuration = 200,
        interval = E2E_TIMING.POLLING?.WINDOW_STATE ?? 100,
        description = 'Window transition',
    } = options;

    const startTime = Date.now();
    let conditionMetTime: number | null = null;

    E2ELogger.info('waitUtilities', `[${description}] Waiting for window transition (timeout: ${timeout}ms)`);

    while (Date.now() - startTime < timeout) {
        try {
            const conditionResult = await condition();

            if (conditionResult) {
                const now = Date.now();

                if (conditionMetTime === null) {
                    conditionMetTime = now;
                    E2ELogger.info('waitUtilities', `[${description}] Condition met, checking stability...`);
                } else if (now - conditionMetTime >= stableDuration) {
                    const elapsed = now - startTime;
                    E2ELogger.info(
                        'waitUtilities',
                        `[${description}] ✓ Transition complete and stable after ${elapsed}ms`
                    );
                    return true;
                }
            } else {
                // Condition no longer met, reset stability timer
                if (conditionMetTime !== null) {
                    E2ELogger.info('waitUtilities', `[${description}] Condition unstable, resetting stability check`);
                    conditionMetTime = null;
                }
            }
        } catch (_error) {
            // Condition threw error, treat as not met
            conditionMetTime = null;
        }

        await browser.pause(interval);
    }

    E2ELogger.info('waitUtilities', `[${description}] ✗ Window transition timeout after ${timeout}ms`);
    return false;
}

/**
 * Waits for CSS animations to settle by checking element stability.
 * Replaces: browser.pause(E2E_TIMING.ANIMATION_SETTLE)
 *
 * @param selector - CSS selector for the animated element
 * @param options - Configuration options
 * @returns Promise<boolean> - True if animation settled, false if timeout
 *
 * @example
 * await waitForAnimationSettle('[data-testid="toast"]', { property: 'opacity' });
 */
export async function waitForAnimationSettle(
    selector: string,
    options: WaitForAnimationSettleOptions = {}
): Promise<boolean> {
    const {
        timeout = E2E_TIMING.TIMEOUTS?.ANIMATION_SETTLE ?? 3000,
        property = 'transform',
        interval = E2E_TIMING.POLLING?.ANIMATION ?? 50,
    } = options;

    const startTime = Date.now();
    let lastValue: string | null = null;
    let stableCount = 0;
    const requiredStableChecks = 3; // Must be stable for 3 consecutive checks

    E2ELogger.info(
        'waitUtilities',
        `Waiting for animation to settle on "${selector}" (property: ${property}, timeout: ${timeout}ms)`
    );

    while (Date.now() - startTime < timeout) {
        try {
            const element = await browser.$(selector);
            const currentValue = await element.getCSSProperty(property);
            const currentValueStr = currentValue?.value ?? 'null';

            if (currentValueStr === lastValue) {
                stableCount++;

                if (stableCount >= requiredStableChecks) {
                    const elapsed = Date.now() - startTime;
                    E2ELogger.info(
                        'waitUtilities',
                        `✓ Animation settled after ${elapsed}ms (stable for ${stableCount} checks)`
                    );
                    return true;
                }
            } else {
                stableCount = 0;
                lastValue = currentValueStr;
            }
        } catch (_error) {
            // Element not found or error getting property
            stableCount = 0;
            lastValue = null;
        }

        await browser.pause(interval);
    }

    E2ELogger.info('waitUtilities', `✗ Animation settle timeout after ${timeout}ms`);
    return false;
}

/**
 * Waits for fullscreen transition to complete.
 * Replaces: browser.pause(E2E_TIMING.FULLSCREEN_TRANSITION)
 *
 * @param targetState - Desired fullscreen state (true = fullscreen, false = windowed)
 * @param getFullscreenState - Function to check current fullscreen state
 * @param options - Configuration options
 * @returns Promise<boolean> - True if transition complete, false if timeout
 *
 * @example
 * await waitForFullscreenTransition(
 *   true,
 *   async () => await isWindowFullScreen()
 * );
 */
export async function waitForFullscreenTransition(
    targetState: boolean,
    getFullscreenState: () => Promise<boolean>,
    options: WaitForFullscreenTransitionOptions = {}
): Promise<boolean> {
    const {
        timeout = E2E_TIMING.TIMEOUTS?.FULLSCREEN_TRANSITION ?? 10000,
        interval = 100,
        stableDuration = 300,
    } = options;

    const stateName = targetState ? 'fullscreen' : 'windowed';
    E2ELogger.info(
        'waitUtilities',
        `Waiting for fullscreen transition to ${stateName} (timeout: ${timeout}ms, stableDuration: ${stableDuration}ms)`
    );

    const startTime = Date.now();
    let stableStartTime: number | null = null;

    while (Date.now() - startTime < timeout) {
        try {
            const currentState = await getFullscreenState();

            if (currentState === targetState) {
                const now = Date.now();

                if (stableStartTime === null) {
                    stableStartTime = now;
                    E2ELogger.info('waitUtilities', `[${stateName}] State matched, checking stability...`);
                } else if (now - stableStartTime >= stableDuration) {
                    const elapsed = now - startTime;
                    E2ELogger.info(
                        'waitUtilities',
                        `✓ Fullscreen transition to ${stateName} complete and stable after ${elapsed}ms`
                    );
                    return true;
                }
            } else {
                if (stableStartTime !== null) {
                    E2ELogger.info('waitUtilities', `[${stateName}] State unstable, resetting stability check`);
                    stableStartTime = null;
                }
            }
        } catch {
            stableStartTime = null;
        }

        await browser.pause(interval);
    }

    E2ELogger.info('waitUtilities', `✗ Fullscreen transition timeout after ${timeout}ms`);
    return false;
}

/**
 * Waits for macOS window operations to stabilize.
 * Only executes on macOS; no-op on other platforms.
 * Replaces: browser.pause(E2E_TIMING.MACOS_WINDOW_STABILIZE)
 *
 * @param condition - Optional condition to verify (in addition to platform check)
 * @param options - Configuration options
 * @returns Promise<boolean> - True if stabilized (or not macOS), false if timeout
 *
 * @example
 * await waitForMacOSWindowStabilize(
 *   async () => await isWindowVisible(),
 *   { description: 'Window show' }
 * );
 */
export async function waitForMacOSWindowStabilize(
    condition?: () => Promise<boolean>,
    options: WaitForMacOSWindowStabilizeOptions = {}
): Promise<boolean> {
    const { timeout = E2E_TIMING.TIMEOUTS?.MACOS_WINDOW_STABILIZE ?? 5000, description = 'macOS window' } = options;

    // Check if we're on macOS
    const isMacOS = await browser.execute(() => {
        return navigator.platform.toLowerCase().includes('mac');
    });

    if (!isMacOS) {
        E2ELogger.info('waitUtilities', `[${description}] Skipping macOS stabilization (not on macOS)`);
        return true;
    }

    // If no condition provided, use a minimum stabilization delay
    if (!condition) {
        const stabilizationDelay = Math.min(500, timeout);
        E2ELogger.info('waitUtilities', `[${description}] Waiting ${stabilizationDelay}ms for macOS stabilization`);
        await browser.pause(stabilizationDelay);
        return true;
    }

    // Wait for condition with extended timeout for macOS
    const result = await waitForUIState(condition, {
        timeout,
        interval: 100,
        description: `${description} (macOS)`,
    });

    if (result) {
        // Additional stabilization delay after condition met
        const extraDelay = Math.min(250, timeout * 0.1);
        await browser.pause(extraDelay);
    }

    return result;
}

/**
 * Executes cleanup actions with timeout protection.
 * Replaces: browser.pause(E2E_TIMING.CLEANUP_PAUSE)
 *
 * @param actions - Array of async cleanup functions to execute
 * @param options - Configuration options
 * @returns Promise<void>
 *
 * @example
 * await waitForCleanup([
 *   async () => await clearAll(),
 *   async () => await ensureSingleWindow()
 * ]);
 */
export async function waitForCleanup(
    actions: Array<() => Promise<void>>,
    options: WaitForCleanupOptions = {}
): Promise<void> {
    const { timeout = E2E_TIMING.TIMEOUTS?.CLEANUP ?? 2000 } = options;

    E2ELogger.info('waitUtilities', `Executing ${actions.length} cleanup actions (timeout: ${timeout}ms per action)`);

    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        const actionStartTime = Date.now();

        try {
            // Wrap action in timeout
            const timeoutPromise = new Promise<void>((_, reject) => {
                setTimeout(() => reject(new Error(`Cleanup action ${i + 1} timed out`)), timeout);
            });

            await Promise.race([action(), timeoutPromise]);

            const elapsed = Date.now() - actionStartTime;
            E2ELogger.info('waitUtilities', `✓ Cleanup action ${i + 1}/${actions.length} completed in ${elapsed}ms`);
        } catch (error) {
            const elapsed = Date.now() - actionStartTime;
            E2ELogger.info(
                'waitUtilities',
                `✗ Cleanup action ${i + 1}/${actions.length} failed after ${elapsed}ms: ${error}`
            );
            // Continue with next cleanup action even if one fails
        }
    }

    E2ELogger.info('waitUtilities', `✓ All cleanup actions processed`);
}

/**
 * Executes a cycle of operations with retry logic for each.
 * Replaces: browser.pause(E2E_TIMING.CYCLE_PAUSE)
 *
 * @param operations - Array of async functions returning boolean (success/failure)
 * @param options - Configuration options
 * @returns Promise<boolean[]> - Results for each operation (true = success)
 *
 * @example
 * const results = await waitForCycle([
 *   async () => await operation1(),
 *   async () => await operation2(),
 *   async () => await operation3()
 * ]);
 * expect(results.every(r => r)).toBe(true);
 */
export async function waitForCycle(
    operations: Array<() => Promise<boolean>>,
    options: WaitForCycleOptions = {}
): Promise<boolean[]> {
    const { timeoutPerOperation = E2E_TIMING.TIMEOUTS?.CYCLE_PER_OPERATION ?? 3000, maxRetries = 3 } = options;

    E2ELogger.info(
        'waitUtilities',
        `Executing cycle of ${operations.length} operations (timeout: ${timeoutPerOperation}ms, maxRetries: ${maxRetries})`
    );

    const results: boolean[] = [];

    for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        let attempt = 0;
        let success = false;

        while (attempt < maxRetries && !success) {
            attempt++;
            const operationStartTime = Date.now();

            try {
                // Wrap operation in timeout
                const timeoutPromise = new Promise<boolean>((_, reject) => {
                    setTimeout(() => reject(new Error(`Operation ${i + 1} timed out`)), timeoutPerOperation);
                });

                success = await Promise.race([operation(), timeoutPromise]);

                const elapsed = Date.now() - operationStartTime;
                E2ELogger.info(
                    'waitUtilities',
                    `✓ Operation ${i + 1}/${operations.length} ${success ? 'succeeded' : 'returned false'} in ${elapsed}ms (attempt ${attempt}/${maxRetries})`
                );
            } catch (error) {
                const elapsed = Date.now() - operationStartTime;
                E2ELogger.info(
                    'waitUtilities',
                    `✗ Operation ${i + 1}/${operations.length} failed on attempt ${attempt}/${maxRetries} after ${elapsed}ms: ${error}`
                );

                if (attempt < maxRetries) {
                    // Brief pause before retry
                    await browser.pause(100);
                }
            }
        }

        results.push(success);
    }

    const _allSucceeded = results.every((r) => r);
    E2ELogger.info(
        'waitUtilities',
        `✓ Cycle complete: ${results.filter((r) => r).length}/${operations.length} operations succeeded`
    );

    return results;
}

// =============================================================================
// Specialized Wait Utilities
// =============================================================================

/**
 * Waits for an element to be both displayed and clickable.
 * Combines waitForDisplayed + waitForClickable for reliable interaction.
 *
 * @param selector - CSS selector for the element
 * @param timeout - Maximum time to wait (default: 5000)
 * @returns Promise<WebdriverIO.Element> - The ready element
 *
 * @example
 * const button = await waitForElementClickable('[data-testid="submit"]');
 * await button.click();
 */
export async function waitForElementClickable(selector: string, timeout = 5000): Promise<WebdriverIO.Element> {
    const element = await browser.$(selector);

    await element.waitForDisplayed({ timeout, timeoutMsg: `Element "${selector}" not displayed within ${timeout}ms` });
    await element.waitForClickable({
        timeout,
        timeoutMsg: `Element "${selector}" not clickable within ${timeout}ms`,
    });

    E2ELogger.info('waitUtilities', `✓ Element "${selector}" is displayed and clickable`);
    return element;
}

/**
 * Waits for window count to reach expected number.
 * Useful for tests that open/close windows.
 *
 * @param expectedCount - Expected number of windows
 * @param timeout - Maximum time to wait (default: 5000)
 * @returns Promise<boolean> - True if count matched, false if timeout
 *
 * @example
 * await waitForWindowCount(2); // Wait for 2 windows
 * await waitForWindowCount(1); // Wait for back to 1 window
 */
export async function waitForWindowCount(expectedCount: number, timeout = 5000): Promise<boolean> {
    const startTime = Date.now();
    const interval = 100;

    E2ELogger.info('waitUtilities', `Waiting for window count to be ${expectedCount} (timeout: ${timeout}ms)`);

    while (Date.now() - startTime < timeout) {
        const handles = await browser.getWindowHandles();

        if (handles.length === expectedCount) {
            const elapsed = Date.now() - startTime;
            E2ELogger.info('waitUtilities', `✓ Window count is ${expectedCount} after ${elapsed}ms`);
            return true;
        }

        await browser.pause(interval);
    }

    const finalCount = (await browser.getWindowHandles()).length;
    E2ELogger.info(
        'waitUtilities',
        `✗ Timeout waiting for window count. Expected ${expectedCount}, found ${finalCount}`
    );
    return false;
}

/**
 * Waits for a specific duration (use sparingly - prefer condition-based waits).
 * This is for intentional delays like auto-dismiss testing.
 *
 * @param durationMs - Duration to wait in milliseconds
 * @param description - Description for logging
 * @returns Promise<void>
 *
 * @example
 * await waitForDuration(5500, 'Toast auto-dismiss'); // Intentional wait for auto-dismiss
 */
export async function waitForDuration(durationMs: number, description?: string): Promise<void> {
    const logPrefix = description ? `[${description}] ` : '';
    E2ELogger.info('waitUtilities', `${logPrefix}Waiting ${durationMs}ms (intentional duration wait)`);

    await browser.pause(durationMs);

    E2ELogger.info('waitUtilities', `${logPrefix}✓ Duration wait complete`);
}

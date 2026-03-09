/**
 * E2E Wait Utilities for Deterministic Test Waits.
 *
 * Replaces static browser.pause() calls with condition-based polling waits.
 * Each utility targets a specific pause category from E2E_TIMING.
 *
 * @module waitUtilities
 * @see E2E_TIMING for timeout and polling interval constants
 *
 * NOTE: Implementations have been extracted to tests/shared/wait-utilities.ts.
 * This file re-exports everything for backward compatibility.
 */

/// <reference path="./wdio-electron.d.ts" />

// Re-export all wait functions and types from shared module
export {
    waitForUIState,
    waitForIPCRoundTrip,
    waitForWindowTransition,
    waitForAnimationSettle,
    waitForFullscreenTransition,
    waitForMacOSWindowStabilize,
    waitForWindowCount,
    waitForDuration,
} from '../../shared/wait-utilities';

export type {
    WaitForUIStateOptions,
    WaitForIPCRoundTripOptions,
    WaitForWindowTransitionOptions,
    WaitForAnimationSettleOptions,
    WaitForFullscreenTransitionOptions,
    WaitForMacOSWindowStabilizeOptions,
} from '../../shared/wait-utilities';

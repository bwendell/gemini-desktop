/**
 * Shared Timing Constants for E2E and Integration Tests
 *
 * Centralized timing values for deterministic waits.
 * Values are in milliseconds.
 *
 * @module timing-constants
 */

/**
 * Delays and timeouts used in E2E and integration tests.
 * Values are in milliseconds.
 */
export const E2E_TIMING = {
    /** Delay before clicking the submit button after text injection */
    SUBMIT_DELAY_MS: 200,

    /** Standard pause for UI state changes (e.g., window visibility) */
    UI_STATE_PAUSE_MS: 300,

    /** Extended pause for slow operations (e.g., iframe loading) */
    EXTENDED_PAUSE_MS: 500,

    /** Time to wait for Quick Chat window to appear */
    QUICK_CHAT_SHOW_DELAY_MS: 500,

    /** Time to wait for Quick Chat window to hide */
    QUICK_CHAT_HIDE_DELAY_MS: 200,

    /** Initial wait time for iframe to load */
    IFRAME_LOAD_WAIT_MS: 2000,

    /** Time to wait for window animations/transitions (e.g. minimize/maximize) */
    WINDOW_TRANSITION: 500,

    /** Short pause for quick restore operations or state updates */
    QUICK_RESTORE: 300,

    /** Short pause for state cleanup between tests */
    CLEANUP_PAUSE: 200,

    /** Pause for IPC round-trip and state propagation */
    IPC_ROUND_TRIP: 300,

    /** Pause for window hide/show operations (tray interactions) */
    WINDOW_HIDE_SHOW: 500,

    /** Extended pause for macOS window operations that need WebSocket stabilization */
    MACOS_WINDOW_STABILIZE: 750,

    /** Pause for multiple operation cycles */
    CYCLE_PAUSE: 400,

    /** Extended wait for fullscreen transitions */
    FULLSCREEN_TRANSITION: 1000,

    /** Pause for multi-window operations */
    MULTI_WINDOW_PAUSE: 1000,

    /** Timeout for waitUntil conditions expecting window state changes */
    WINDOW_STATE_TIMEOUT: 5000,

    /** Interval for polling window state */
    WINDOW_STATE_POLL_INTERVAL: 200,

    /** Time to wait for animation settling */
    ANIMATION_SETTLE: 500,

    // =========================================================================
    // TIMEOUTS: Maximum wait times for deterministic waits (waitFor* functions)
    // These replace static pauses with condition-based polling
    // =========================================================================
    TIMEOUTS: {
        /** Max time to wait for UI state change (e.g., toggle, theme update) */
        UI_STATE: 5000,
        /** Max time to wait for IPC operation to complete */
        IPC_OPERATION: 3000,
        /** Max time to wait for window transition (minimize/maximize/restore) */
        WINDOW_TRANSITION: 5000,
        /** Max time to wait for CSS animation to settle */
        ANIMATION_SETTLE: 3000,
        /** Max time to wait for fullscreen transition */
        FULLSCREEN_TRANSITION: 10000,
        /** Max time for macOS window stabilization */
        MACOS_WINDOW_STABILIZE: 5000,
        /** Max time for cleanup operations */
        CLEANUP: 2000,
        /** Max time per cycle operation */
        CYCLE_PER_OPERATION: 3000,
    },

    // =========================================================================
    // POLLING: Intervals for condition checking in waitFor* functions
    // Smaller values = more responsive but higher CPU; larger = more efficient
    // =========================================================================
    POLLING: {
        /** Interval for UI state checks (ms) */
        UI_STATE: 50,
        /** Interval for window state checks (ms) */
        WINDOW_STATE: 100,
        /** Interval for animation stability checks (ms) */
        ANIMATION: 50,
        /** Interval for IPC verification checks (ms) */
        IPC: 50,
    },
} as const;

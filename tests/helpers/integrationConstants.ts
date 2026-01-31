/**
 * Integration Test Constants.
 *
 * Centralizes timing configuration for integration tests.
 * These constants are used by integrationWaitUtilities.ts and test files
 * to ensure consistent, deterministic waits.
 */

/** Default timeout for wait operations (ms) */
export const DEFAULT_TIMEOUT = 5000;

/** Default polling interval for wait operations (ms) */
export const DEFAULT_INTERVAL = 100;

/**
 * Timing configuration for integration tests.
 * Use these instead of hardcoded values in test files.
 */
export const INTEGRATION_TIMING = {
    // =========================================================================
    // TIMEOUTS: Maximum wait times for deterministic waits
    // =========================================================================
    TIMEOUTS: {
        /** Max time to wait for UI state change (toggle, button) */
        UI_STATE: 5000,
        /** Max time to wait for IPC operation to complete */
        IPC_OPERATION: 3000,
        /** Max time to wait for zoom level change */
        ZOOM_LEVEL: 3000,
        /** Max time to wait for window transition */
        WINDOW_TRANSITION: 5000,
        /** Max time to wait for store persistence */
        STORE_PERSISTENCE: 3000,
        /** Max time to wait for content loading */
        CONTENT_READY: 10000,
        /** Max time for window cleanup operations */
        CLEANUP: 5000,
        /** Max time for notification state change */
        NOTIFICATION_STATE: 3000,
        /** Max time for update state change */
        UPDATE_STATE: 5000,
    },

    // =========================================================================
    // POLLING: Intervals for condition checking
    // =========================================================================
    POLLING: {
        /** Interval for UI state checks (ms) */
        UI_STATE: 50,
        /** Interval for zoom factor checks (ms) */
        ZOOM: 50,
        /** Interval for IPC verification checks (ms) */
        IPC: 50,
        /** Interval for store persistence checks (ms) */
        STORE: 100,
        /** Interval for window state checks (ms) */
        WINDOW: 100,
    },
} as const;

/** Type for INTEGRATION_TIMING for type-safe access */
export type IntegrationTimingConfig = typeof INTEGRATION_TIMING;

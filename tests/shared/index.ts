// Barrel export for shared test utilities
// Provides timing constants, logger, and wait utilities for e2e and integration tests
// This file enables both e2e and integration tests to import from a centralized location

export { TestLogger, type LogLevel } from './test-logger';
export { E2E_TIMING } from './timing-constants';

// Wait utilities
export {
    waitForUIState,
    waitForIPCRoundTrip,
    waitForWindowTransition,
    waitForAnimationSettle,
    waitForFullscreenTransition,
    waitForMacOSWindowStabilize,
    waitForWindowCount,
    waitForDuration,
} from './wait-utilities';
export type {
    WaitForUIStateOptions,
    WaitForIPCRoundTripOptions,
    WaitForWindowTransitionOptions,
    WaitForAnimationSettleOptions,
    WaitForFullscreenTransitionOptions,
    WaitForMacOSWindowStabilizeOptions,
} from './wait-utilities';

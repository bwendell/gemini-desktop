/**
 * Test harness utilities barrel export.
 *
 * This module provides convenient utilities for common test setup patterns
 * like fake timers and platform stubbing.
 *
 * @example
 * import { useFakeTimers, stubPlatform } from 'tests/helpers/harness';
 *
 * beforeEach(() => {
 *   useFakeTimers('2025-01-15T12:00:00Z');
 *   stubPlatform('darwin');
 * });
 */

export {
  useFakeTimers,
  advanceTimers,
  advanceTimersAsync,
  runAllTimers,
  runAllTimersAsync,
  runOnlyPendingTimers,
  useRealTimers,
  setupTimerCleanup,
} from './timers';

export {
  stubPlatform,
  restorePlatform,
  eachPlatform,
  stubPlatformAll,
  setupPlatformCleanup,
  ALL_PLATFORMS,
  type Platform,
} from './platform';

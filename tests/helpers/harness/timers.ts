/**
 * Test harness utilities for managing fake timers in vitest tests.
 *
 * Provides convenient wrappers around vitest's timer functions with
 * automatic cleanup and common patterns for setting system time.
 */
import { vi, afterEach } from 'vitest';

/**
 * Tracks whether fake timers are currently active.
 * Used by automatic cleanup to avoid restoring real timers twice.
 */
let fakeTimersActive = false;

/**
 * Enables fake timers with an optional system time.
 *
 * @param date - Optional date to set as the system time. Can be a Date object
 *               or an ISO 8601 date string (e.g., '2025-01-15T12:00:00Z').
 *
 * @example
 * // Use fake timers with current time
 * useFakeTimers();
 *
 * @example
 * // Use fake timers with a specific date
 * useFakeTimers('2025-01-15T12:00:00Z');
 * useFakeTimers(new Date(2025, 0, 15, 12, 0, 0));
 */
export function useFakeTimers(date?: string | Date): void {
  vi.useFakeTimers();
  fakeTimersActive = true;

  if (date !== undefined) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    vi.setSystemTime(dateObj);
  }
}

/**
 * Advances timers by the specified number of milliseconds.
 *
 * This runs any timers that would fire during this period,
 * including nested timers that are scheduled as a result.
 *
 * @param ms - Number of milliseconds to advance timers
 *
 * @example
 * advanceTimers(1000); // Advance by 1 second
 */
export function advanceTimers(ms: number): void {
  vi.advanceTimersByTime(ms);
}

/**
 * Advances timers by the specified number of milliseconds asynchronously.
 *
 * Like `advanceTimers`, but handles async timer callbacks properly.
 * Use this when your timers trigger async operations.
 *
 * @param ms - Number of milliseconds to advance timers
 *
 * @example
 * await advanceTimersAsync(1000); // Advance by 1 second, awaiting async callbacks
 */
export async function advanceTimersAsync(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms);
}

/**
 * Runs all pending timers until none remain.
 *
 * Use with caution - this can cause infinite loops if timers
 * schedule new timers indefinitely.
 *
 * @example
 * runAllTimers(); // Run all pending timers
 */
export function runAllTimers(): void {
  vi.runAllTimers();
}

/**
 * Runs all pending timers until none remain, asynchronously.
 *
 * Like `runAllTimers`, but handles async timer callbacks properly.
 *
 * @example
 * await runAllTimersAsync(); // Run all pending timers, awaiting async callbacks
 */
export async function runAllTimersAsync(): Promise<void> {
  await vi.runAllTimersAsync();
}

/**
 * Runs only the currently pending timers, not any new ones scheduled during execution.
 *
 * Safer than `runAllTimers` as it won't cause infinite loops.
 *
 * @example
 * runOnlyPendingTimers();
 */
export function runOnlyPendingTimers(): void {
  vi.runOnlyPendingTimers();
}

/**
 * Restores real timers.
 *
 * This is called automatically in afterEach when using the automatic cleanup,
 * but can be called manually if needed.
 *
 * @example
 * useRealTimers(); // Restore real timer behavior
 */
export function useRealTimers(): void {
  vi.useRealTimers();
  fakeTimersActive = false;
}

/**
 * Sets up automatic cleanup of fake timers after each test.
 *
 * Call this once at the beginning of your test file or in a setup file
 * to automatically restore real timers after each test completes.
 *
 * @example
 * // In a test file or setup file
 * import { setupTimerCleanup } from 'tests/helpers/harness/timers';
 * setupTimerCleanup();
 */
export function setupTimerCleanup(): void {
  afterEach(() => {
    if (fakeTimersActive) {
      vi.useRealTimers();
      fakeTimersActive = false;
    }
  });
}

/**
 * Test harness utilities for managing platform stubs in vitest tests.
 *
 * Provides convenient wrappers for stubbing process.platform to test
 * cross-platform behavior without actually running on different platforms.
 */
import { vi, afterEach } from 'vitest';

/**
 * Supported platform identifiers for stubbing.
 */
export type Platform = 'darwin' | 'win32' | 'linux';

/**
 * All supported platforms for use with stubPlatformAll.
 */
export const ALL_PLATFORMS: readonly Platform[] = ['darwin', 'win32', 'linux'] as const;

/**
 * Tracks whether platform stub is currently active.
 * Used by automatic cleanup to avoid restoring twice.
 */
let platformStubActive = false;

/**
 * Stubs process.platform to the specified platform.
 *
 * This allows testing platform-specific behavior without actually running
 * on that platform. The stub preserves all other process properties.
 *
 * @param platform - The platform to stub ('darwin', 'win32', or 'linux')
 *
 * @example
 * stubPlatform('darwin');
 * expect(process.platform).toBe('darwin');
 * // ... run macOS-specific tests
 * restorePlatform();
 */
export function stubPlatform(platform: Platform): void {
  vi.stubGlobal('process', { ...process, platform });
  platformStubActive = true;
}

/**
 * Restores the platform to its original value.
 *
 * This is called automatically in afterEach when using the automatic cleanup,
 * but can be called manually if needed within a test.
 *
 * @example
 * stubPlatform('darwin');
 * // ... test macOS behavior
 * restorePlatform();
 * // ... test default behavior
 */
export function restorePlatform(): void {
  vi.unstubAllGlobals();
  platformStubActive = false;
}

/**
 * Helper for running the same test on all platforms.
 *
 * This is designed to work with vitest's describe.each or it.each pattern.
 * Use this to get the list of platforms for parameterized tests.
 *
 * @returns Array of platforms for use with .each()
 *
 * @example
 * describe.each(eachPlatform())('on %s', (platform) => {
 *   beforeEach(() => {
 *     stubPlatform(platform);
 *   });
 *
 *   it('should work correctly', () => {
 *     // Test runs for darwin, win32, and linux
 *   });
 * });
 */
export function eachPlatform(): Platform[] {
  return [...ALL_PLATFORMS];
}

/**
 * Runs a test function on all platforms.
 *
 * This is a convenience wrapper that stubs the platform, runs the test,
 * and restores the platform for each platform in sequence.
 *
 * @param testFn - The test function to run for each platform
 *
 * @example
 * await stubPlatformAll(async (platform) => {
 *   const result = getPlatformSpecificValue();
 *   expect(result).toBeDefined();
 * });
 */
export async function stubPlatformAll(
  testFn: (platform: Platform) => void | Promise<void>
): Promise<void> {
  for (const platform of ALL_PLATFORMS) {
    stubPlatform(platform);
    try {
      await testFn(platform);
    } finally {
      restorePlatform();
    }
  }
}

/**
 * Sets up automatic cleanup of platform stubs after each test.
 *
 * Call this once at the beginning of your test file or in a setup file
 * to automatically restore the real platform after each test completes.
 *
 * @example
 * // In a test file or setup file
 * import { setupPlatformCleanup } from 'tests/helpers/harness/platform';
 * setupPlatformCleanup();
 */
export function setupPlatformCleanup(): void {
  afterEach(() => {
    if (platformStubActive) {
      vi.unstubAllGlobals();
      platformStubActive = false;
    }
  });
}

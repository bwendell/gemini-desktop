/**
 * Manual mock for the logger module.
 *
 * Vitest automatically uses files in __mocks__ directories when vi.mock() is called
 * for the parent module. This provides a centralized mock that all tests share.
 *
 * Usage in tests:
 * ```typescript
 * vi.mock('../../src/main/utils/logger'); // Uses this __mocks__ file automatically
 * import { mockLogger } from '../../src/main/utils/logger'; // Import for assertions
 *
 * // In test:
 * expect(mockLogger.warn).toHaveBeenCalledWith('some message');
 * ```
 *
 * @module src/main/utils/__mocks__/logger
 */
import { vi, beforeEach } from 'vitest';

/**
 * Mock logger instance with all logging methods.
 * Tests can import this directly to make assertions.
 */
export const mockLogger = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

/**
 * Mock createLogger function that returns the shared mockLogger.
 * This mirrors the real logger module's API.
 */
export const createLogger = vi.fn().mockReturnValue(mockLogger);

/**
 * Resets all mock functions. Call in beforeEach if needed.
 */
export function resetMockLogger(): void {
  mockLogger.log.mockClear();
  mockLogger.error.mockClear();
  mockLogger.warn.mockClear();
  createLogger.mockClear();
}

// Auto-reset between tests when this module is imported
beforeEach(() => {
  resetMockLogger();
});

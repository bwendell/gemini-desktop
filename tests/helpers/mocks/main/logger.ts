/**
 * Shared mock factory for the logger module.
 *
 * Usage in tests:
 * ```typescript
 * import { createMockLogger, mockLoggerModule, hoistedMockLogger } from 'tests/helpers/mocks';
 *
 * // For vi.mock() calls (use hoisted version):
 * const mockLogger = vi.hoisted(() => hoistedMockLogger());
 * const mockCreateLogger = vi.hoisted(() => vi.fn().mockReturnValue(mockLogger));
 * vi.mock('../../src/main/utils/logger', () => ({ createLogger: mockCreateLogger }));
 *
 * // Or use the auto-setup in vitest config setupFilesAfterEnv
 * ```
 *
 * @module tests/helpers/mocks/main/logger
 */
import { vi } from 'vitest';

/**
 * Interface for the mock logger object.
 */
export interface MockLogger {
    log: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    debug: ReturnType<typeof vi.fn>;
    _reset: () => void;
}

/**
 * Creates a fresh mock logger instance.
 * Each call returns a new instance with independent mock functions.
 *
 * @returns A mock logger with log, error, warn methods and _reset utility
 */
export function createMockLogger(): MockLogger {
    const logger: MockLogger = {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        _reset() {
            logger.log.mockClear();
            logger.error.mockClear();
            logger.warn.mockClear();
            logger.debug.mockClear();
        },
    };
    return logger;
}

/**
 * Factory function for use with vi.hoisted().
 * Returns a plain object (not dependent on vi at call time) for hoisting compatibility.
 *
 * Usage:
 * ```typescript
 * const mockLogger = vi.hoisted(() => hoistedMockLogger());
 * ```
 */
export function hoistedMockLogger() {
    return {
        log: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    };
}

/**
 * Pre-configured module mock for the logger.
 * Use with vi.mock():
 *
 * ```typescript
 * vi.mock('../../src/main/utils/logger', () => mockLoggerModule);
 * ```
 */
export const mockLoggerModule = {
    createLogger: vi.fn().mockReturnValue(createMockLogger()),
};

/**
 * Resets all mock functions in the mockLoggerModule.
 * Call this in beforeEach() if using mockLoggerModule directly.
 */
export function resetMockLoggerModule(): void {
    mockLoggerModule.createLogger.mockClear();
    const logger = mockLoggerModule.createLogger.mock.results[0]?.value;
    if (logger?._reset) {
        logger._reset();
    }
}

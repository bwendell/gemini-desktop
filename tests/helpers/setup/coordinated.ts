/**
 * Coordinated test setup file.
 * Provides shared setup for all coordinated tests.
 *
 * NOTE: Logger mocking is NOT done here because tests use vi.hoisted()
 * to create local mock references for assertions. The vi.hoisted() pattern
 * in test files must define both the mock AND the vi.mock() call together.
 *
 * This file is loaded via vitest's setupFiles configuration.
 *
 * @module tests/helpers/setup/coordinated
 */
import { vi, beforeEach, afterEach } from 'vitest';

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
    Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: () => {},
            removeListener: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => false,
        }),
    });
}

// Reset and restore mocks between tests
beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

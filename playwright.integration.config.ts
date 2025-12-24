import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for integration tests.
 * These tests launch real Electron applications to verify component interactions.
 */
export default defineConfig({
    testDir: './tests/integration',
    testMatch: '**/*.test.ts',
    // Filter to only Playwright-based tests (those importing @playwright/test)
    testIgnore: ['**/badge-integration.test.ts', '**/menu-integration.test.ts'],
    fullyParallel: false, // Electron tests should run sequentially
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: 1, // Single worker to avoid conflicts with Electron instances
    reporter: 'list',
    timeout: 60000, // 60 seconds per test
    use: {
        trace: 'on-first-retry',
    },
});

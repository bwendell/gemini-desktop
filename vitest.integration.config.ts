import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for integration tests.
 * These tests verify component interactions but still use mocked Electron APIs.
 */
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./electron/test/setup.ts'],
        include: [
            'tests/integration/badge-integration.test.ts',
            'tests/integration/menu-integration.test.ts',
        ],
        exclude: ['node_modules', 'dist'],
        alias: {
            electron: path.resolve(__dirname, 'electron/test/electron-mock.ts'),
        },
        // Integration tests don't contribute to coverage metrics
        coverage: {
            enabled: false,
        },
    },
});

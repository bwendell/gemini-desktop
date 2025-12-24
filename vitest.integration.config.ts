import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for integration tests.
 * Uses Node environment for testing component interactions.
 */
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./electron/test/setup.ts'],
        include: ['tests/integration/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        alias: {
            electron: path.resolve(__dirname, 'electron/test/electron-mock.ts'),
        },
        testTimeout: 30000, // Integration tests may need longer timeouts
    },
});

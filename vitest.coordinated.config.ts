import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for coordinated unit tests.
 * Tests multi-component coordination with mocked Electron APIs.
 */
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./electron/test/setup.ts'],
        include: ['tests/coordinated/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        alias: {
            electron: path.resolve(__dirname, 'electron/test/electron-mock.ts'),
        },
        testTimeout: 30000, // Integration tests may need longer timeouts
    },
});

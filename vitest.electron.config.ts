import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Vitest configuration for Electron main process tests.
 * Uses Node environment since these are server-side modules.
 */
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./electron/test/setup.ts'],
        include: ['electron/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        alias: {
            electron: path.resolve(__dirname, 'electron/test/electron-mock.ts'),
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportsDirectory: 'coverage-electron',
            include: ['electron/**/*.ts'],
            exclude: [
                'electron/main.ts',         // Entry point, tested by E2E
                'electron/preload.ts',      // contextBridge, tested by E2E
                'electron/types.ts',        // Type definitions only
                'electron/test/**',         // Test files themselves
                'electron/**/*.test.ts',    // Test files
            ],
            thresholds: {
                lines: 90,
                branches: 80,
                functions: 90,
                statements: 90,
            },
        },
    },
});

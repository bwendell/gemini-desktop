import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

/**
 * Vitest configuration for coordinated unit tests.
 * Tests multi-component coordination with mocked Electron APIs.
 */
export default defineConfig({
    test: {
        root: projectRoot,
        globals: true,
        environment: 'node',
        setupFiles: ['electron/test/setup.ts'],
        include: ['tests/coordinated/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        alias: {
            electron: path.resolve(projectRoot, 'electron/test/electron-mock.ts'),
        },
        testTimeout: 30000, // Integration tests may need longer timeouts
    },
});

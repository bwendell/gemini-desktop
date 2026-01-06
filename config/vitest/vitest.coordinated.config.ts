import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import packageJson from '../../package.json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

/**
 * Vitest configuration for coordinated unit tests.
 * Tests multi-component coordination with mocked Electron APIs.
 */
export default defineConfig({
    plugins: [react()],

    // Inject version from package.json at test time (matches vite.config.ts)
    define: {
        __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    test: {
        root: projectRoot,
        globals: true,
        environment: 'jsdom',
        setupFiles: ['tests/unit/main/test/setup.ts', 'tests/helpers/setup/coordinated.ts'],
        include: ['tests/coordinated/**/*.test.{ts,tsx}'],
        exclude: ['node_modules', 'dist'],
        alias: {
            '@': path.resolve(projectRoot, 'src/renderer'),
            electron: path.resolve(projectRoot, 'tests/unit/main/test/electron-mock.ts'),
        },
        testTimeout: 30000, // Integration tests may need longer timeouts
    },
});

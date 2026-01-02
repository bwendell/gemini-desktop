import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

/**
 * Vitest configuration for Electron main process tests.
 * Uses Node environment since these are server-side modules.
 */
export default defineConfig({
  test: {
    root: projectRoot,
    globals: true,
    environment: 'node',
    setupFiles: ['tests/unit/main/test/setup.ts'],
    include: [
      'tests/unit/main/**/*.test.ts',
      'tests/unit/shared/**/*.test.ts',
      'tests/unit/preload/**/*.test.ts',
    ],
    exclude: ['node_modules', 'dist'],
    alias: {
      electron: path.resolve(projectRoot, 'tests/unit/main/test/electron-mock.ts'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage-electron',
      include: ['src/main/**/*.ts', 'src/preload/**/*.ts'],
      exclude: [
        'src/main/main.ts', // Entry point, tested by E2E
        'src/preload/preload.ts', // contextBridge, tested by E2E
        'src/main/types.ts', // Type definitions only
        'tests/unit/main/test/**', // Test files themselves
        'tests/unit/main/**/*.test.ts', // Test files
        'src/main/**/index.ts', // Barrel files (exports only)
      ],
      thresholds: {
        lines: 90,
        branches: 82,
        functions: 90,
        statements: 90,
      },
    },
  },
});

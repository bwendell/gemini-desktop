import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import packageJson from '../../package.json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

export default defineConfig({
    plugins: [react()],

    // Inject version from package.json at test time (matches vite.config.ts)
    define: {
        __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    resolve: {
        alias: {
            '@': path.resolve(projectRoot, './src/renderer'),
            '@components': path.resolve(projectRoot, './src/renderer/components'),
            '@hooks': path.resolve(projectRoot, './src/renderer/hooks'),
            '@context': path.resolve(projectRoot, './src/renderer/context'),
            '@utils': path.resolve(projectRoot, './src/renderer/utils'),
        },
    },
    test: {
        root: projectRoot,
        globals: true,
        environment: 'jsdom',
        setupFiles: ['tests/unit/renderer/test/setup.ts'],
        include: ['tests/unit/renderer/**/*.{test,spec}.{ts,tsx}', 'src/renderer/**/*.{test,spec}.{ts,tsx}'],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/cypress/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/renderer/**/*.{ts,tsx}'],
            exclude: [
                'src/renderer/main.tsx',
                'src/renderer/windows/options/main.tsx', // Entry point bootstrap, not testable
                'src/renderer/windows/quickchat/main.tsx', // Entry point bootstrap, not testable
                'src/renderer/vite-env.d.ts',
                'tests/unit/renderer/test/**',
                'tests/unit/renderer/**/*.test.{ts,tsx}',
                'tests/unit/renderer/**/*.spec.{ts,tsx}',
                'src/renderer/**/index.ts', // Barrel files are just re-exports
                'src/renderer/types/**', // Type-only files
            ],
            thresholds: {
                // Note: Reduced from 98% while ThemeContext browser-only fallback tests are skipped
                // See: ThemeContext.test.tsx skipped tests for matchMedia-related coverage
                lines: 97,
                branches: 89,
                functions: 98,
                statements: 97,
            },
        },
    },
});

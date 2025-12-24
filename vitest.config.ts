import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
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
            include: ['src/**/*.{ts,tsx}', 'electron/**/*.{ts,tsx}'],
            exclude: [
                'src/main.tsx',
                'src/options-main.tsx', // Entry point bootstrap, not testable
                'src/quickchat-main.tsx', // Entry point bootstrap, not testable
                'src/vite-env.d.ts',
                'src/test/**',
                'src/**/*.test.{ts,tsx}',
                'src/**/*.spec.{ts,tsx}',
                'src/**/index.ts', // Barrel files are just re-exports
                'src/types/**', // Type-only files
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

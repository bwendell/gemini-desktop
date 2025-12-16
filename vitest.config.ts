import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: [
                'src/main.tsx',
                'src/options-main.tsx', // Entry point bootstrap, not testable
                'src/vite-env.d.ts',
                'src/test/**',
                'src/**/*.test.{ts,tsx}',
                'src/**/*.spec.{ts,tsx}',
                'src/**/index.ts', // Barrel files are just re-exports
                'src/types/**', // Type-only files
            ],
            thresholds: {
                lines: 100,
                // Branch coverage threshold set to 90% to accommodate:
                // - Defensive error handling paths (try-catch blocks)
                // - JSDOM limitations (iframe errors, matchMedia variations)
                // - Legacy format fallback code paths
                branches: 90,
                functions: 100,
                // Statement coverage 99% to accommodate defensive paths
                statements: 99,
            },
        },
    },
});

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
                // Branch coverage is 96.77% due to JSDOM limitations:
                // - App.tsx line 55: Error state can't be tested (iframe errors don't fire in JSDOM)
                // - TitlebarMenu.tsx line 59: Defensive null check (refs always populated)
                branches: 95,
                functions: 100,
                statements: 100,
            },
        },
    },
});

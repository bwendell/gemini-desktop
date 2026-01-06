import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import packageJson from './package.json';

// https://vite.dev/config/
export default defineConfig(async () => ({
    plugins: [react()],

    // Inject version from package.json at build time
    define: {
        __APP_VERSION__: JSON.stringify(packageJson.version),
    },

    // Path aliases matching tsconfig.json
    resolve: {
        alias: {
            '@': resolve(__dirname, './src/renderer'),
            '@components': resolve(__dirname, './src/renderer/components'),
            '@hooks': resolve(__dirname, './src/renderer/hooks'),
            '@context': resolve(__dirname, './src/renderer/context'),
            '@utils': resolve(__dirname, './src/renderer/utils'),
        },
    },

    // Use relative paths for Electron file:// protocol compatibility
    base: './',

    // Multi-page app configuration for options and quick chat windows
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                options: resolve(__dirname, 'src/renderer/windows/options/options.html'),
                quickchat: resolve(__dirname, 'src/renderer/windows/quickchat/quickchat.html'),
            },
        },
    },

    // Vite options for Electron development
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        watch: {
            ignored: ['**/src/main/**', '**/dist/**'],
        },
    },
}));

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Use relative paths for Electron file:// protocol compatibility
  base: './',

  // Multi-page app configuration for options window
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        options: resolve(__dirname, 'options.html'),
      },
    },
  },

  // Vite options for Electron development
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/electron/**", "**/dist/**"],
    },
  },
}));


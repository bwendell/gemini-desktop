/**
 * WebdriverIO configuration for Electron E2E testing.
 *
 * Platform Support:
 * - Windows: ✅ Fully supported
 * - Linux: ✅ Fully supported
 * - macOS: ✅ Fully supported
 *
 * @see https://webdriver.io/docs/desktop-testing/electron
 */

import { baseConfig } from './wdio.base.conf.js';

if (!process.env.E2E_GROUP || process.env.E2E_GROUP === 'unknown') {
    process.env.E2E_GROUP = 'full';
}

export const config = {
    ...baseConfig,
    specs: [
        // =========================================================================
        // Startup & Initialization
        // =========================================================================
        '../../tests/e2e/app-startup.spec.ts',
        '../../tests/e2e/first-run.spec.ts',
        '../../tests/e2e/auto-update-init.spec.ts',

        // =========================================================================
        // Window Management
        // =========================================================================
        '../../tests/e2e/always-on-top.spec.ts',
        '../../tests/e2e/boss-key.spec.ts',
        '../../tests/e2e/dependent-windows.spec.ts',
        '../../tests/e2e/window-bounds.spec.ts',
        '../../tests/e2e/window-controls.spec.ts',
        '../../tests/e2e/window-state.spec.ts',
        '../../tests/e2e/window-titlebar.spec.ts',
        '../../tests/e2e/window-management-edge-cases.spec.ts',

        // =========================================================================
        // Menu & Context Menu
        // =========================================================================
        '../../tests/e2e/menu_bar.spec.ts',
        '../../tests/e2e/menu-actions.spec.ts',
        '../../tests/e2e/menu-interactions.spec.ts',
        '../../tests/e2e/context-menu.spec.ts',

        // =========================================================================
        // Hotkeys
        // =========================================================================
        '../../tests/e2e/hotkeys.spec.ts',
        '../../tests/e2e/hotkey-registration.spec.ts',
        '../../tests/e2e/hotkey-toggle.spec.ts',

        // =========================================================================
        // Quick Chat
        // =========================================================================
        '../../tests/e2e/quick-chat.spec.ts',
        '../../tests/e2e/quick-chat-full-workflow.spec.ts',

        // =========================================================================
        // Options & Settings
        // =========================================================================
        '../../tests/e2e/options-window.spec.ts',
        '../../tests/e2e/options-tabs.spec.ts',
        '../../tests/e2e/settings-persistence.spec.ts',

        // =========================================================================
        // Theme
        // =========================================================================
        '../../tests/e2e/theme.spec.ts',
        '../../tests/e2e/theme-selector-visual.spec.ts',
        '../../tests/e2e/theme-selector-keyboard.spec.ts',

        // =========================================================================
        // Authentication & External Links
        // =========================================================================
        '../../tests/e2e/auth.spec.ts',
        '../../tests/e2e/oauth-links.spec.ts',
        '../../tests/e2e/external-links.spec.ts',

        // =========================================================================
        // Tray & Minimize
        // =========================================================================
        '../../tests/e2e/tray.spec.ts',
        '../../tests/e2e/tray-quit.spec.ts',
        '../../tests/e2e/minimize-to-tray.spec.ts',

        // =========================================================================
        // Auto-Update
        // =========================================================================
        '../../tests/e2e/auto-update-error-recovery.spec.ts',
        '../../tests/e2e/auto-update-happy-path.spec.ts',
        '../../tests/e2e/auto-update-interactions.spec.ts',
        '../../tests/e2e/auto-update-persistence.spec.ts',
        '../../tests/e2e/auto-update-platform.spec.ts',
        '../../tests/e2e/auto-update-startup.spec.ts',
        '../../tests/e2e/auto-update-toggle.spec.ts',
        '../../tests/e2e/auto-update-tray.spec.ts',

        // =========================================================================
        // Error Recovery & Stability
        // =========================================================================
        '../../tests/e2e/fatal-error-recovery.spec.ts',
        '../../tests/e2e/offline-behavior.spec.ts',

        // =========================================================================
        // Session & Persistence
        // =========================================================================
        '../../tests/e2e/session-persistence.spec.ts',
        '../../tests/e2e/single-instance.spec.ts',

        // =========================================================================
        // Webview & Content
        // =========================================================================
        '../../tests/e2e/webview-content.spec.ts',

        // =========================================================================
        // Platform-Specific (macOS) - Self-skip on other platforms
        // =========================================================================
        '../../tests/e2e/macos-dock.spec.ts',
        '../../tests/e2e/macos-menu.spec.ts',
        '../../tests/e2e/macos-window-behavior.spec.ts',

        // =========================================================================
        // System Integration
        // =========================================================================
        '../../tests/e2e/microphone-permission.spec.ts',
    ],
};

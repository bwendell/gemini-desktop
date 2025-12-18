import type { MenuDefinition } from './menuTypes';

// Re-export types for consumers
export type { MenuDefinition, MenuItem } from './menuTypes';

/**
 * Default menu definitions for the titlebar.
 * Styled after VS Code's menu structure.
 * 
 * IMPORTANT: The `id` fields must match the IDs in `MenuManager.ts`
 * to enable consistent E2E testing across platforms.
 * 
 * Note: Edit menu removed as it doesn't affect the embedded Gemini webview.
 */
export function useMenuDefinitions(): MenuDefinition[] {
    return [
        {
            label: 'File',
            items: [
                {
                    id: 'menu-file-newwindow',
                    label: 'New Window',
                    shortcut: 'Ctrl+Shift+N',
                    disabled: true, // Placeholder for future
                },
                { separator: true },
                {
                    id: 'menu-file-signin',
                    label: 'Sign in to Google',
                    action: async () => {
                        await window.electronAPI?.openGoogleSignIn();
                        // Reload the page to pick up the new auth cookies
                        window.location.reload();
                    },
                },
                {
                    id: 'menu-file-options',
                    label: 'Options',
                    shortcut: 'Ctrl+,',
                    disabled: false,
                    action: () => {
                        window.electronAPI?.openOptions();
                    },
                },
                { separator: true },
                {
                    id: 'menu-file-exit',
                    label: 'Exit',
                    shortcut: 'Alt+F4',
                    action: () => {
                        window.electronAPI?.closeWindow();
                    },
                },
            ],
        },
        {
            label: 'View',
            items: [
                {
                    id: 'menu-view-reload',
                    label: 'Reload',
                    shortcut: 'Ctrl+R',
                    action: () => window.location.reload(),
                },
                { separator: true },
                {
                    id: 'menu-view-fullscreen',
                    label: 'Toggle Fullscreen',
                    shortcut: 'F11',
                    disabled: true, // Will need IPC for fullscreen toggle
                },
            ],
        },
        {
            label: 'Help',
            items: [
                {
                    id: 'menu-help-about',
                    label: 'About Gemini Desktop',
                    action: () => {
                        window.electronAPI?.openOptions('about');
                    },
                },
            ],
        },
    ];
}


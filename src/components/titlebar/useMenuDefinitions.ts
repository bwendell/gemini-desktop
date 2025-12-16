import type { MenuDefinition } from './menuTypes';

// Re-export types for consumers
export type { MenuDefinition, MenuItem } from './menuTypes';

/**
 * Default menu definitions for the titlebar.
 * Styled after VS Code's menu structure.
 * Note: Edit menu removed as it doesn't affect the embedded Gemini webview.
 */
export function useMenuDefinitions(): MenuDefinition[] {
    return [
        {
            label: 'File',
            items: [
                {
                    label: 'New Window',
                    shortcut: 'Ctrl+Shift+N',
                    disabled: true, // Placeholder for future
                },
                { separator: true },
                {
                    label: 'Options...',
                    shortcut: 'Ctrl+,',
                    disabled: true, // Will be implemented later
                },
                { separator: true },
                {
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
                    label: 'Reload',
                    shortcut: 'Ctrl+R',
                    action: () => window.location.reload(),
                },
                { separator: true },
                {
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
                    label: 'About Gemini Desktop',
                    action: () => {
                        // Simple alert for now - can be enhanced later
                        alert('Gemini Desktop v0.1.0\nAn unofficial desktop client for Gemini.');
                    },
                },
            ],
        },
    ];
}

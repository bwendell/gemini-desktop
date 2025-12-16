import { Window } from '@tauri-apps/api/window';
import { exit } from '@tauri-apps/plugin-process';
import { message } from '@tauri-apps/plugin-dialog';
import { useMemo } from 'react';
import type { MenuDefinition } from './menuTypes';

// Re-export types for consumers
export type { MenuDefinition, MenuItem } from './menuTypes';

/**
 * Default menu definitions for the titlebar.
 * Styled after VS Code's menu structure.
 * Note: Edit menu removed as it doesn't affect the embedded Gemini webview.
 */
export function useMenuDefinitions(): MenuDefinition[] {
    // Memoize window reference to avoid repeated getCurrent() calls
    const appWindow = useMemo(() => Window.getCurrent(), []);

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
                    label: 'Exit',
                    shortcut: 'Alt+F4',
                    action: async () => {
                        await exit(0);
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
                    action: async () => {
                        const isFullscreen = await appWindow.isFullscreen();
                        await appWindow.setFullscreen(!isFullscreen);
                    },
                },
            ],
        },
        {
            label: 'Help',
            items: [
                {
                    label: 'About Gemini Desktop',
                    action: async () => {
                        await message('Gemini Desktop v0.1.0\nAn unofficial desktop client for Gemini.', {
                            title: 'About Gemini Desktop',
                            kind: 'info',
                            okLabel: 'Close'
                        });
                    },
                },
            ],
        },
    ];
}

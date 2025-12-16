import { Window } from '@tauri-apps/api/window';
import { exit } from '@tauri-apps/plugin-process';
import { message } from '@tauri-apps/plugin-dialog';
import type { MenuDefinition } from './menuTypes';

// Re-export types for consumers
export type { MenuDefinition, MenuItem } from './menuTypes';

/**
 * Default menu definitions for the titlebar.
 * Styled after VS Code's menu structure.
 */
export function useMenuDefinitions(): MenuDefinition[] {
    const appWindow = Window.getCurrent();

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
            label: 'Edit',
            items: [
                {
                    label: 'Undo',
                    shortcut: 'Ctrl+Z',
                    action: () => document.execCommand('undo'),
                },
                {
                    label: 'Redo',
                    shortcut: 'Ctrl+Y',
                    action: () => document.execCommand('redo'),
                },
                { separator: true },
                {
                    label: 'Cut',
                    shortcut: 'Ctrl+X',
                    action: () => document.execCommand('cut'),
                },
                {
                    label: 'Copy',
                    shortcut: 'Ctrl+C',
                    action: () => document.execCommand('copy'),
                },
                {
                    label: 'Paste',
                    shortcut: 'Ctrl+V',
                    action: () => document.execCommand('paste'),
                },
                { separator: true },
                {
                    label: 'Select All',
                    shortcut: 'Ctrl+A',
                    action: () => document.execCommand('selectAll'),
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

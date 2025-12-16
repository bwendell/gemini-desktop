/**
 * Unit tests for useMenuDefinitions hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Window } from '@tauri-apps/api/window';
import { exit } from '@tauri-apps/plugin-process';
import { message } from '@tauri-apps/plugin-dialog';
import { useMenuDefinitions } from './useMenuDefinitions';

// Mock dependencies
const mockWindow = {
    isFullscreen: vi.fn(),
    setFullscreen: vi.fn(),
};

vi.mock('@tauri-apps/api/window', () => ({
    Window: {
        getCurrent: vi.fn(() => mockWindow),
    },
}));

vi.mock('@tauri-apps/plugin-process', () => ({
    exit: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    message: vi.fn(),
}));

describe('useMenuDefinitions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockWindow.isFullscreen.mockResolvedValue(false);
        mockWindow.setFullscreen.mockResolvedValue(undefined);
    });

    it('returns correct menu structure', () => {
        const { result } = renderHook(() => useMenuDefinitions());
        const menus = result.current;

        expect(menus).toHaveLength(4);
        expect(menus[0].label).toBe('File');
        expect(menus[1].label).toBe('Edit');
        expect(menus[2].label).toBe('View');
        expect(menus[3].label).toBe('Help');
    });

    describe('File menu', () => {
        it('has New Window item (disabled placeholder)', () => {
            const { result } = renderHook(() => useMenuDefinitions());
            const fileMenu = result.current[0];
            const newWindowItem = fileMenu.items[0];

            expect(newWindowItem).toHaveProperty('label', 'New Window');
            expect(newWindowItem).toHaveProperty('disabled', true);
            expect(newWindowItem).toHaveProperty('shortcut', 'Ctrl+Shift+N');
        });

        it('has separator after New Window', () => {
            const { result } = renderHook(() => useMenuDefinitions());
            const fileMenu = result.current[0];

            expect(fileMenu.items[1]).toEqual({ separator: true });
        });

        it('Exit action calls exit(0)', async () => {
            const { result } = renderHook(() => useMenuDefinitions());
            const fileMenu = result.current[0];
            const exitItem = fileMenu.items[2];

            expect(exitItem).toHaveProperty('label', 'Exit');
            expect(exitItem).toHaveProperty('action');

            if ('action' in exitItem && exitItem.action) {
                await exitItem.action();
                expect(exit).toHaveBeenCalledWith(0);
            }
        });
    });

    describe('Edit menu', () => {
        it('has all standard edit actions', () => {
            const { result } = renderHook(() => useMenuDefinitions());
            const editMenu = result.current[1];
            const labels = editMenu.items
                .filter(item => 'label' in item)
                .map(item => ('label' in item ? item.label : ''));

            expect(labels).toContain('Undo');
            expect(labels).toContain('Redo');
            expect(labels).toContain('Cut');
            expect(labels).toContain('Copy');
            expect(labels).toContain('Paste');
            expect(labels).toContain('Select All');
        });

        it('Undo action calls document.execCommand', () => {
            const execCommandSpy = vi.spyOn(document, 'execCommand').mockReturnValue(true);
            const { result } = renderHook(() => useMenuDefinitions());
            const editMenu = result.current[1];
            const undoItem = editMenu.items[0];

            if ('action' in undoItem && undoItem.action) {
                undoItem.action();
                expect(execCommandSpy).toHaveBeenCalledWith('undo');
            }

            execCommandSpy.mockRestore();
        });

        it('Redo action calls document.execCommand', () => {
            const execCommandSpy = vi.spyOn(document, 'execCommand').mockReturnValue(true);
            const { result } = renderHook(() => useMenuDefinitions());
            const editMenu = result.current[1];
            const redoItem = editMenu.items[1];

            if ('action' in redoItem && redoItem.action) {
                redoItem.action();
                expect(execCommandSpy).toHaveBeenCalledWith('redo');
            }

            execCommandSpy.mockRestore();
        });

        it('Cut action calls document.execCommand', () => {
            const execCommandSpy = vi.spyOn(document, 'execCommand').mockReturnValue(true);
            const { result } = renderHook(() => useMenuDefinitions());
            const editMenu = result.current[1];
            // Cut is after separator, so index 3
            const cutItem = editMenu.items[3];

            if ('action' in cutItem && cutItem.action) {
                cutItem.action();
                expect(execCommandSpy).toHaveBeenCalledWith('cut');
            }

            execCommandSpy.mockRestore();
        });

        it('Copy action calls document.execCommand', () => {
            const execCommandSpy = vi.spyOn(document, 'execCommand').mockReturnValue(true);
            const { result } = renderHook(() => useMenuDefinitions());
            const editMenu = result.current[1];
            const copyItem = editMenu.items[4];

            if ('action' in copyItem && copyItem.action) {
                copyItem.action();
                expect(execCommandSpy).toHaveBeenCalledWith('copy');
            }

            execCommandSpy.mockRestore();
        });

        it('Paste action calls document.execCommand', () => {
            const execCommandSpy = vi.spyOn(document, 'execCommand').mockReturnValue(true);
            const { result } = renderHook(() => useMenuDefinitions());
            const editMenu = result.current[1];
            const pasteItem = editMenu.items[5];

            if ('action' in pasteItem && pasteItem.action) {
                pasteItem.action();
                expect(execCommandSpy).toHaveBeenCalledWith('paste');
            }

            execCommandSpy.mockRestore();
        });

        it('Select All action calls document.execCommand', () => {
            const execCommandSpy = vi.spyOn(document, 'execCommand').mockReturnValue(true);
            const { result } = renderHook(() => useMenuDefinitions());
            const editMenu = result.current[1];
            // Select All is after another separator, so index 7
            const selectAllItem = editMenu.items[7];

            if ('action' in selectAllItem && selectAllItem.action) {
                selectAllItem.action();
                expect(execCommandSpy).toHaveBeenCalledWith('selectAll');
            }

            execCommandSpy.mockRestore();
        });
    });

    describe('View menu', () => {
        it('Reload action calls window.location.reload', () => {
            const reloadSpy = vi.fn();
            const originalLocation = window.location;
            // @ts-expect-error - mocking location
            delete window.location;
            window.location = { ...originalLocation, reload: reloadSpy };

            const { result } = renderHook(() => useMenuDefinitions());
            const viewMenu = result.current[2];
            const reloadItem = viewMenu.items[0];

            if ('action' in reloadItem && reloadItem.action) {
                reloadItem.action();
                expect(reloadSpy).toHaveBeenCalled();
            }

            window.location = originalLocation;
        });

        it('Toggle Fullscreen enters fullscreen when not fullscreen', async () => {
            mockWindow.isFullscreen.mockResolvedValue(false);

            const { result } = renderHook(() => useMenuDefinitions());
            const viewMenu = result.current[2];
            // Toggle Fullscreen is after separator, so index 2
            const toggleItem = viewMenu.items[2];

            if ('action' in toggleItem && toggleItem.action) {
                await toggleItem.action();
                expect(mockWindow.isFullscreen).toHaveBeenCalled();
                expect(mockWindow.setFullscreen).toHaveBeenCalledWith(true);
            }
        });

        it('Toggle Fullscreen exits fullscreen when fullscreen', async () => {
            mockWindow.isFullscreen.mockResolvedValue(true);

            const { result } = renderHook(() => useMenuDefinitions());
            const viewMenu = result.current[2];
            const toggleItem = viewMenu.items[2];

            if ('action' in toggleItem && toggleItem.action) {
                await toggleItem.action();
                expect(mockWindow.isFullscreen).toHaveBeenCalled();
                expect(mockWindow.setFullscreen).toHaveBeenCalledWith(false);
            }
        });
    });

    describe('Help menu', () => {
        it('About action shows message dialog', async () => {
            const { result } = renderHook(() => useMenuDefinitions());
            const helpMenu = result.current[3];
            const aboutItem = helpMenu.items[0];

            expect(aboutItem).toHaveProperty('label', 'About Gemini Desktop');

            if ('action' in aboutItem && aboutItem.action) {
                await aboutItem.action();
                expect(message).toHaveBeenCalledWith(
                    'Gemini Desktop v0.1.0\nAn unofficial desktop client for Gemini.',
                    {
                        title: 'About Gemini Desktop',
                        kind: 'info',
                        okLabel: 'Close',
                    }
                );
            }
        });
    });
});

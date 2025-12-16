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

        // Edit menu removed - only 3 menus now
        expect(menus).toHaveLength(3);
        expect(menus[0].label).toBe('File');
        expect(menus[1].label).toBe('View');
        expect(menus[2].label).toBe('Help');
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

    // Note: Edit menu was removed as it doesn't affect the embedded Gemini webview

    describe('View menu', () => {
        it('Reload action calls window.location.reload', () => {
            const reloadSpy = vi.fn();
            const originalLocation = window.location;
            // @ts-expect-error - mocking location
            delete window.location;
            window.location = { ...originalLocation, reload: reloadSpy };

            const { result } = renderHook(() => useMenuDefinitions());
            // View is now at index 1 (was index 2 before Edit menu removal)
            const viewMenu = result.current[1];
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
            const viewMenu = result.current[1];
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
            const viewMenu = result.current[1];
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
            // Help is now at index 2 (was index 3 before Edit menu removal)
            const helpMenu = result.current[2];
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

/**
 * Unit tests for useMenuDefinitions hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMenuDefinitions } from './useMenuDefinitions';
import { mockElectronAPI } from '../../test/setup';

describe('useMenuDefinitions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

        it('has Sign in to Google item and action works', async () => {
            const reloadSpy = vi.fn();
            const originalLocation = window.location;

            Object.defineProperty(window, 'location', {
                value: { ...originalLocation, reload: reloadSpy },
                writable: true,
            });

            const { result } = renderHook(() => useMenuDefinitions());
            const fileMenu = result.current[0];
            const signInItem = fileMenu.items[2];

            expect(signInItem).toHaveProperty('label', 'Sign in to Google');
            expect(signInItem).toHaveProperty('action');

            // Call the async action to cover lines 25-27
            if ('action' in signInItem && signInItem.action) {
                await signInItem.action();
                expect(mockElectronAPI.openGoogleSignIn).toHaveBeenCalledTimes(1);
                expect(reloadSpy).toHaveBeenCalled();
            }

            // Restore original location
            Object.defineProperty(window, 'location', {
                value: originalLocation,
                writable: true,
            });
        });

        it('has Options item', () => {
            const { result } = renderHook(() => useMenuDefinitions());
            const fileMenu = result.current[0];
            const optionsItem = fileMenu.items[3];

            expect(optionsItem).toHaveProperty('label', 'Options');
            expect(optionsItem).toHaveProperty('disabled', false);
            expect(optionsItem).toHaveProperty('shortcut', 'Ctrl+,');

            if ('action' in optionsItem && optionsItem.action) {
                optionsItem.action();
                expect(mockElectronAPI.openOptions).toHaveBeenCalledTimes(1);
            }
        });

        it('has separator after Options', () => {
            const { result } = renderHook(() => useMenuDefinitions());
            const fileMenu = result.current[0];

            expect(fileMenu.items[4]).toEqual({ separator: true });
        });

        it('Exit action calls electronAPI.closeWindow()', () => {
            const { result } = renderHook(() => useMenuDefinitions());
            const fileMenu = result.current[0];
            const exitItem = fileMenu.items[5];

            expect(exitItem).toHaveProperty('label', 'Exit');

            if ('action' in exitItem && exitItem.action) {
                exitItem.action();
                expect(mockElectronAPI.closeWindow).toHaveBeenCalledTimes(1);
            }
        });
    });

    describe('View menu', () => {
        it('Reload action calls window.location.reload', () => {
            const reloadSpy = vi.fn();
            const originalLocation = window.location;

            Object.defineProperty(window, 'location', {
                value: { ...originalLocation, reload: reloadSpy },
                writable: true,
            });

            const { result } = renderHook(() => useMenuDefinitions());
            const viewMenu = result.current[1];
            const reloadItem = viewMenu.items[0];

            if ('action' in reloadItem && reloadItem.action) {
                reloadItem.action();
                expect(reloadSpy).toHaveBeenCalled();
            }

            // Restore original location
            Object.defineProperty(window, 'location', {
                value: originalLocation,
                writable: true,
            });
        });

        it('Toggle Fullscreen is disabled', () => {
            const { result } = renderHook(() => useMenuDefinitions());
            const viewMenu = result.current[1];
            const toggleItem = viewMenu.items[2];

            expect(toggleItem).toHaveProperty('label', 'Toggle Fullscreen');
            expect(toggleItem).toHaveProperty('disabled', true);
        });
    });

    describe('Help menu', () => {
        it('About action opens options window', () => {
            const { result } = renderHook(() => useMenuDefinitions());
            const helpMenu = result.current[2];
            const aboutItem = helpMenu.items[0];

            expect(aboutItem).toHaveProperty('label', 'About Gemini Desktop');

            if ('action' in aboutItem && aboutItem.action) {
                aboutItem.action();
                expect(mockElectronAPI.openOptions).toHaveBeenCalledWith('about');
            }
        });
    });
});

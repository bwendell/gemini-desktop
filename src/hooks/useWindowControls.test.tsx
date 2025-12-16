/**
 * Unit tests for useWindowControls hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWindowControls } from './useWindowControls';
import { mockElectronAPI } from '../test/setup';

describe('useWindowControls', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('minimize', () => {
        it('calls electronAPI.minimizeWindow()', () => {
            const { result } = renderHook(() => useWindowControls());

            act(() => {
                result.current.minimize();
            });

            expect(mockElectronAPI.minimizeWindow).toHaveBeenCalledTimes(1);
        });
    });

    describe('maximize', () => {
        it('calls electronAPI.maximizeWindow()', async () => {
            const { result } = renderHook(() => useWindowControls());

            await act(async () => {
                await result.current.maximize();
            });

            expect(mockElectronAPI.maximizeWindow).toHaveBeenCalledTimes(1);
        });
    });

    describe('close', () => {
        it('calls electronAPI.closeWindow()', () => {
            const { result } = renderHook(() => useWindowControls());

            act(() => {
                result.current.close();
            });

            expect(mockElectronAPI.closeWindow).toHaveBeenCalledTimes(1);
        });
    });

    describe('when API is not available', () => {
        it('logs warning when minimize is called without API', () => {
            const originalAPI = window.electronAPI;
            // @ts-ignore - Testing undefined case
            delete window.electronAPI;

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            const { result } = renderHook(() => useWindowControls());

            act(() => {
                result.current.minimize();
            });

            expect(consoleSpy).toHaveBeenCalledWith('Window controls not available');
            consoleSpy.mockRestore();

            // Restore API
            window.electronAPI = originalAPI;
        });

        it('logs warning when maximize is called without API', () => {
            const originalAPI = window.electronAPI;
            // @ts-ignore - Testing undefined case
            delete window.electronAPI;

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            const { result } = renderHook(() => useWindowControls());

            act(() => {
                result.current.maximize();
            });

            expect(consoleSpy).toHaveBeenCalledWith('Window controls not available');
            consoleSpy.mockRestore();

            // Restore API
            window.electronAPI = originalAPI;
        });

        it('logs warning when close is called without API', () => {
            const originalAPI = window.electronAPI;
            // @ts-ignore - Testing undefined case
            delete window.electronAPI;

            const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            const { result } = renderHook(() => useWindowControls());

            act(() => {
                result.current.close();
            });

            expect(consoleSpy).toHaveBeenCalledWith('Window controls not available');
            consoleSpy.mockRestore();

            // Restore API
            window.electronAPI = originalAPI;
        });
    });
});

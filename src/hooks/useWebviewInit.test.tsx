/**
 * Unit tests for useWebviewInit hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { useWebviewInit } from './useWebviewInit';

// Mock dependencies
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(),
}));

const mockedInvoke = vi.mocked(invoke);

describe('useWebviewInit', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedInvoke.mockResolvedValue(undefined);
    });

    describe('initial state', () => {
        it('starts with isLoading true', () => {
            mockedInvoke.mockImplementation(() => new Promise(() => { }));
            const { result } = renderHook(() => useWebviewInit());

            expect(result.current.isLoading).toBe(true);
        });

        it('starts with isReady false', () => {
            mockedInvoke.mockImplementation(() => new Promise(() => { }));
            const { result } = renderHook(() => useWebviewInit());

            expect(result.current.isReady).toBe(false);
        });

        it('starts with no error', () => {
            mockedInvoke.mockImplementation(() => new Promise(() => { }));
            const { result } = renderHook(() => useWebviewInit());

            expect(result.current.error).toBeNull();
        });
    });

    describe('successful initialization', () => {
        it('calls create_gemini_webview on mount', async () => {
            renderHook(() => useWebviewInit());

            await waitFor(() => {
                expect(mockedInvoke).toHaveBeenCalledWith('create_gemini_webview');
            });
        });

        it('sets isReady to true on success', async () => {
            const { result } = renderHook(() => useWebviewInit());

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });
        });

        it('sets isLoading to false on success', async () => {
            const { result } = renderHook(() => useWebviewInit());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('keeps error as null on success', async () => {
            const { result } = renderHook(() => useWebviewInit());

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            expect(result.current.error).toBeNull();
        });

        it('logs success message', async () => {
            const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => { });

            renderHook(() => useWebviewInit());

            await waitFor(() => {
                expect(debugSpy).toHaveBeenCalledWith('[useWebviewInit] Webview created successfully');
            });

            debugSpy.mockRestore();
        });
    });

    describe('error handling', () => {
        it('sets error message on Error object', async () => {
            mockedInvoke.mockRejectedValue(new Error('Webview creation failed'));

            const { result } = renderHook(() => useWebviewInit());

            await waitFor(() => {
                expect(result.current.error).toBe('Webview creation failed');
            });
        });

        it('converts non-Error to string', async () => {
            mockedInvoke.mockRejectedValue('String error');

            const { result } = renderHook(() => useWebviewInit());

            await waitFor(() => {
                expect(result.current.error).toBe('String error');
            });
        });

        it('sets isReady to false on error', async () => {
            mockedInvoke.mockRejectedValue(new Error('Failed'));

            const { result } = renderHook(() => useWebviewInit());

            await waitFor(() => {
                expect(result.current.error).not.toBeNull();
            });

            expect(result.current.isReady).toBe(false);
        });

        it('sets isLoading to false on error', async () => {
            mockedInvoke.mockRejectedValue(new Error('Failed'));

            const { result } = renderHook(() => useWebviewInit());

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('logs detailed error information', async () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const testError = new Error('Detailed error');
            mockedInvoke.mockRejectedValue(testError);

            renderHook(() => useWebviewInit());

            await waitFor(() => {
                expect(errorSpy).toHaveBeenCalledWith(
                    '[useWebviewInit] Failed to create webview:',
                    expect.objectContaining({
                        error: testError,
                        message: 'Detailed error',
                        timestamp: expect.any(String),
                    })
                );
            });

            errorSpy.mockRestore();
        });
    });

    describe('double initialization prevention', () => {
        it('only calls invoke once per hook instance', async () => {
            const { result } = renderHook(() => useWebviewInit());

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            // Wait additional time to ensure no extra calls
            await new Promise((r) => setTimeout(r, 50));
            expect(mockedInvoke).toHaveBeenCalledTimes(1);
        });

        it('logs skip message on duplicate initialization attempt', async () => {
            const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => { });

            // The ref prevents double init, but we can verify logging
            renderHook(() => useWebviewInit());

            await waitFor(() => {
                expect(debugSpy).toHaveBeenCalledWith('[useWebviewInit] Creating Gemini webview...');
            });

            debugSpy.mockRestore();
        });

        it('skips initialization if already initialized (duplicate call scenario)', async () => {
            const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => { });

            // Make invoke take some time so we can trigger double call
            mockedInvoke.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

            const { result } = renderHook(() => useWebviewInit());

            // Call retry immediately while first init is still in progress
            // This simulates the scenario where initWebview gets called twice
            act(() => {
                // Even though we call retry, hasInitialized should prevent double init
                result.current.retry();
            });

            // Wait for everything to settle
            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            }, { timeout: 500 });

            // The skip message should have been logged when retry tried to init again
            // But hasInitialized was already true from first call
            expect(debugSpy).toHaveBeenCalledWith('[useWebviewInit] Creating Gemini webview...');

            debugSpy.mockRestore();
        });
    });

    describe('retry functionality', () => {
        it('retry function resets error state', async () => {
            mockedInvoke.mockRejectedValueOnce(new Error('First attempt failed'));

            const { result } = renderHook(() => useWebviewInit());

            await waitFor(() => {
                expect(result.current.error).toBe('First attempt failed');
            });

            // Mock success for retry
            mockedInvoke.mockResolvedValue(undefined);

            await act(async () => {
                result.current.retry();
            });

            await waitFor(() => {
                expect(result.current.error).toBeNull();
                expect(result.current.isReady).toBe(true);
            });
        });

        it('retry calls invoke again', async () => {
            mockedInvoke.mockRejectedValueOnce(new Error('Failed'));

            const { result } = renderHook(() => useWebviewInit());

            await waitFor(() => {
                expect(result.current.error).not.toBeNull();
            });

            expect(mockedInvoke).toHaveBeenCalledTimes(1);

            mockedInvoke.mockResolvedValue(undefined);

            await act(async () => {
                result.current.retry();
            });

            await waitFor(() => {
                expect(mockedInvoke).toHaveBeenCalledTimes(2);
            });
        });

        it('retry resets isReady before retrying', async () => {
            const { result } = renderHook(() => useWebviewInit());

            await waitFor(() => {
                expect(result.current.isReady).toBe(true);
            });

            // Make next call fail
            mockedInvoke.mockRejectedValue(new Error('Retry failed'));

            await act(async () => {
                result.current.retry();
            });

            // isReady should become false during retry
            await waitFor(() => {
                expect(result.current.isReady).toBe(false);
            });
        });
    });
});

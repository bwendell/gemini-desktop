/**
 * Unit tests for UpdateToastContext.
 *
 * Tests the context provider and useUpdateToast hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { UpdateToastProvider, useUpdateToast } from './UpdateToastContext';
import { ToastProvider } from './ToastContext';
import { mockElectronAPI } from '../../../tests/unit/renderer/test/setup';
import React from 'react';
import { getReleaseNotesUrl } from '../../shared/utils/releaseNotes';

/**
 * Helper wrapper that includes both ToastProvider and UpdateToastProvider
 */
function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <UpdateToastProvider>{children}</UpdateToastProvider>
        </ToastProvider>
    );
}

describe('UpdateToastContext', () => {
    const createWindowOpenSpy = () => vi.spyOn(window, 'open').mockImplementation(() => null);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('UpdateToastProvider', () => {
        it('renders children', () => {
            render(
                <TestWrapper>
                    <div data-testid="child">Child content</div>
                </TestWrapper>
            );

            expect(screen.getByTestId('child')).toBeInTheDocument();
        });

        it('renders toast when update is available', async () => {
            let capturedCallback: ((info: { version: string }) => void) | undefined;
            mockElectronAPI.onUpdateAvailable.mockImplementation((cb) => {
                capturedCallback = cb;
                return () => {};
            });

            render(
                <TestWrapper>
                    <div>Child</div>
                </TestWrapper>
            );

            // Simulate update available
            capturedCallback?.({ version: '2.0.0' });

            await waitFor(() => {
                expect(screen.getByTestId('toast')).toBeInTheDocument();
            });
        });

        it('renders Restart Now and Later buttons for downloaded state', async () => {
            let capturedCallback: ((info: { version: string }) => void) | undefined;
            mockElectronAPI.onUpdateDownloaded.mockImplementation((cb) => {
                capturedCallback = cb;
                return () => {};
            });

            render(
                <TestWrapper>
                    <div>Child</div>
                </TestWrapper>
            );

            // Simulate update downloaded
            capturedCallback?.({ version: '2.0.0' });

            await waitFor(() => {
                // Check for action buttons using the generic toast test IDs
                expect(screen.getByTestId('toast-action-0')).toHaveTextContent('Restart Now');
                expect(screen.getByTestId('toast-action-1')).toHaveTextContent('Later');
            });
        });

        it('adds View Release Notes as primary action for available updates', async () => {
            let capturedCallback: ((info: { version: string }) => void) | undefined;
            mockElectronAPI.onUpdateAvailable.mockImplementation((cb) => {
                capturedCallback = cb;
                return () => {};
            });

            const openSpy = createWindowOpenSpy();

            render(
                <TestWrapper>
                    <div>Child</div>
                </TestWrapper>
            );

            capturedCallback?.({ version: '2.0.0' });

            await waitFor(() => {
                expect(screen.getByTestId('toast-action-0')).toHaveTextContent('View Release Notes');
            });

            fireEvent.click(screen.getByTestId('toast-action-0'));
            expect(openSpy).toHaveBeenCalledWith(getReleaseNotesUrl('2.0.0'));

            openSpy.mockRestore();
        });

        it('clicking Restart Now calls installUpdate', async () => {
            let capturedCallback: ((info: { version: string }) => void) | undefined;
            mockElectronAPI.onUpdateDownloaded.mockImplementation((cb) => {
                capturedCallback = cb;
                return () => {};
            });

            render(
                <TestWrapper>
                    <div>Child</div>
                </TestWrapper>
            );

            capturedCallback?.({ version: '2.0.0' });

            await waitFor(() => {
                expect(screen.getByTestId('toast-action-0')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('toast-action-0'));

            expect(mockElectronAPI.installUpdate).toHaveBeenCalledTimes(1);
        });

        it('adds View Release Notes as third action for downloaded updates', async () => {
            let capturedCallback: ((info: { version: string }) => void) | undefined;
            mockElectronAPI.onUpdateDownloaded.mockImplementation((cb) => {
                capturedCallback = cb;
                return () => {};
            });

            const openSpy = createWindowOpenSpy();

            render(
                <TestWrapper>
                    <div>Child</div>
                </TestWrapper>
            );

            capturedCallback?.({ version: '2.1.0' });

            await waitFor(() => {
                expect(screen.getByTestId('toast-action-0')).toHaveTextContent('Restart Now');
                expect(screen.getByTestId('toast-action-1')).toHaveTextContent('Later');
                expect(screen.getByTestId('toast-action-2')).toHaveTextContent('View Release Notes');
            });

            fireEvent.click(screen.getByTestId('toast-action-2'));
            expect(openSpy).toHaveBeenCalledWith(getReleaseNotesUrl('2.1.0'));

            openSpy.mockRestore();
        });

        it('clicking Later hides toast but keeps pending state', async () => {
            let capturedCallback: ((info: { version: string }) => void) | undefined;
            mockElectronAPI.onUpdateDownloaded.mockImplementation((cb) => {
                capturedCallback = cb;
                return () => {};
            });

            render(
                <TestWrapper>
                    <div>Child</div>
                </TestWrapper>
            );

            capturedCallback?.({ version: '2.0.0' });

            await waitFor(() => {
                expect(screen.getByTestId('toast-action-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('toast-action-1'));

            // Toast should be hidden
            await waitFor(() => {
                expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
            });
        });

        it('adds View Release Notes for not-available updates', async () => {
            let capturedCallback: ((info: { version: string }) => void) | undefined;
            mockElectronAPI.onUpdateNotAvailable.mockImplementation((cb) => {
                capturedCallback = cb;
                return () => {};
            });

            const openSpy = createWindowOpenSpy();

            render(
                <TestWrapper>
                    <div>Child</div>
                </TestWrapper>
            );

            capturedCallback?.({ version: '3.0.0' });

            await waitFor(() => {
                expect(screen.getByTestId('toast-action-0')).toHaveTextContent('View Release Notes');
            });

            fireEvent.click(screen.getByTestId('toast-action-0'));
            expect(openSpy).toHaveBeenCalledWith(getReleaseNotesUrl('3.0.0'));

            openSpy.mockRestore();
        });

        it('clicking dismiss hides toast for available type', async () => {
            let capturedCallback: ((info: { version: string }) => void) | undefined;
            mockElectronAPI.onUpdateAvailable.mockImplementation((cb) => {
                capturedCallback = cb;
                return () => {};
            });

            render(
                <TestWrapper>
                    <div>Child</div>
                </TestWrapper>
            );

            capturedCallback?.({ version: '2.0.0' });

            await waitFor(() => {
                expect(screen.getByTestId('toast-dismiss')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('toast-dismiss'));

            await waitFor(() => {
                expect(screen.queryByTestId('toast')).not.toBeInTheDocument();
            });
        });

        it('does not add View Release Notes for error updates', async () => {
            let capturedCallback: ((error: string) => void) | undefined;
            mockElectronAPI.onUpdateError.mockImplementation((cb) => {
                capturedCallback = cb;
                return () => {};
            });

            render(
                <TestWrapper>
                    <div>Child</div>
                </TestWrapper>
            );

            capturedCallback?.('Network error');

            await waitFor(() => {
                expect(screen.queryByText('View Release Notes')).not.toBeInTheDocument();
            });
        });

        it('does not add View Release Notes for progress updates', async () => {
            let capturedCallback: ((progress: number) => void) | undefined;
            mockElectronAPI.onDownloadProgress.mockImplementation((cb) => {
                capturedCallback = cb;
                return () => {};
            });

            render(
                <TestWrapper>
                    <div>Child</div>
                </TestWrapper>
            );

            capturedCallback?.(25);

            await waitFor(() => {
                expect(screen.queryByText('View Release Notes')).not.toBeInTheDocument();
            });
        });
    });

    describe('useUpdateToast', () => {
        it('throws error when used outside provider', () => {
            // Need to wrap with ToastProvider but NOT UpdateToastProvider
            expect(() => {
                renderHook(() => useUpdateToast(), {
                    wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
                });
            }).toThrow('useUpdateToast must be used within an UpdateToastProvider');
        });

        it('returns context value when used inside provider', () => {
            const wrapper = ({ children }: { children: React.ReactNode }) => <TestWrapper>{children}</TestWrapper>;

            const { result } = renderHook(() => useUpdateToast(), { wrapper });

            expect(result.current.hasPendingUpdate).toBe(false);
            expect(typeof result.current.installUpdate).toBe('function');
        });
    });
});

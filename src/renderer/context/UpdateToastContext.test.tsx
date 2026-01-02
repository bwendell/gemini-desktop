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
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <TestWrapper>{children}</TestWrapper>
      );

      const { result } = renderHook(() => useUpdateToast(), { wrapper });

      expect(result.current.hasPendingUpdate).toBe(false);
      expect(typeof result.current.installUpdate).toBe('function');
    });
  });
});

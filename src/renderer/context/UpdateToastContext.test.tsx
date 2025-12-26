/**
 * Unit tests for UpdateToastContext.
 *
 * Tests the context provider and useUpdateToast hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { UpdateToastProvider, useUpdateToast } from './UpdateToastContext';
import { mockElectronAPI } from '../../../tests/unit/renderer/test/setup';
import React from 'react';

describe('UpdateToastContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UpdateToastProvider', () => {
    it('renders children', () => {
      render(
        <UpdateToastProvider>
          <div data-testid="child">Child content</div>
        </UpdateToastProvider>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('renders UpdateToast when update is available', async () => {
      let capturedCallback: ((info: { version: string }) => void) | undefined;
      mockElectronAPI.onUpdateAvailable.mockImplementation((cb) => {
        capturedCallback = cb;
        return () => {};
      });

      render(
        <UpdateToastProvider>
          <div>Child</div>
        </UpdateToastProvider>
      );

      // Simulate update available
      capturedCallback?.({ version: '2.0.0' });

      await waitFor(() => {
        expect(screen.getByTestId('update-toast')).toBeInTheDocument();
      });
    });

    it('renders Restart Now and Later buttons for downloaded state', async () => {
      let capturedCallback: ((info: { version: string }) => void) | undefined;
      mockElectronAPI.onUpdateDownloaded.mockImplementation((cb) => {
        capturedCallback = cb;
        return () => {};
      });

      render(
        <UpdateToastProvider>
          <div>Child</div>
        </UpdateToastProvider>
      );

      // Simulate update downloaded
      capturedCallback?.({ version: '2.0.0' });

      await waitFor(() => {
        expect(screen.getByTestId('update-toast-restart')).toBeInTheDocument();
        expect(screen.getByTestId('update-toast-later')).toBeInTheDocument();
      });
    });

    it('clicking Restart Now calls installUpdate', async () => {
      let capturedCallback: ((info: { version: string }) => void) | undefined;
      mockElectronAPI.onUpdateDownloaded.mockImplementation((cb) => {
        capturedCallback = cb;
        return () => {};
      });

      render(
        <UpdateToastProvider>
          <div>Child</div>
        </UpdateToastProvider>
      );

      capturedCallback?.({ version: '2.0.0' });

      await waitFor(() => {
        expect(screen.getByTestId('update-toast-restart')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('update-toast-restart'));

      expect(mockElectronAPI.installUpdate).toHaveBeenCalledTimes(1);
    });

    it('clicking Later hides toast but keeps pending state', async () => {
      let capturedCallback: ((info: { version: string }) => void) | undefined;
      mockElectronAPI.onUpdateDownloaded.mockImplementation((cb) => {
        capturedCallback = cb;
        return () => {};
      });

      render(
        <UpdateToastProvider>
          <div>Child</div>
        </UpdateToastProvider>
      );

      capturedCallback?.({ version: '2.0.0' });

      await waitFor(() => {
        expect(screen.getByTestId('update-toast-later')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('update-toast-later'));

      // Toast should be hidden
      await waitFor(() => {
        expect(screen.queryByTestId('update-toast')).not.toBeInTheDocument();
      });
    });

    it('clicking dismiss hides toast for available type', async () => {
      let capturedCallback: ((info: { version: string }) => void) | undefined;
      mockElectronAPI.onUpdateAvailable.mockImplementation((cb) => {
        capturedCallback = cb;
        return () => {};
      });

      render(
        <UpdateToastProvider>
          <div>Child</div>
        </UpdateToastProvider>
      );

      capturedCallback?.({ version: '2.0.0' });

      await waitFor(() => {
        expect(screen.getByTestId('update-toast-dismiss')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('update-toast-dismiss'));

      await waitFor(() => {
        expect(screen.queryByTestId('update-toast')).not.toBeInTheDocument();
      });
    });
  });

  describe('useUpdateToast', () => {
    it('throws error when used outside provider', () => {
      expect(() => {
        renderHook(() => useUpdateToast());
      }).toThrow('useUpdateToast must be used within an UpdateToastProvider');
    });

    it('returns context value when used inside provider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <UpdateToastProvider>{children}</UpdateToastProvider>
      );

      const { result } = renderHook(() => useUpdateToast(), { wrapper });

      expect(result.current.hasPendingUpdate).toBe(false);
      expect(typeof result.current.installUpdate).toBe('function');
    });
  });
});

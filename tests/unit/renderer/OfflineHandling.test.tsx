/**
 * Coordinated tests for offline handling.
 * Tests the integration between App, OfflineOverlay, and hooks.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../../../src/renderer/App';
import { useNetworkStatus } from '../../../src/renderer/hooks/useNetworkStatus';

// Mock the network status hook
vi.mock('../../../src/renderer/hooks/useNetworkStatus', () => ({
  useNetworkStatus: vi.fn(),
}));

// Mock window.location.reload
delete (window as any).location;
(window as any).location = { reload: vi.fn() };

describe('Offline Handling (Coordinated)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to online
    (useNetworkStatus as Mock).mockReturnValue(true);
  });

  describe('offline overlay integration', () => {
    it('shows OfflineOverlay when network is offline', async () => {
      (useNetworkStatus as Mock).mockReturnValue(false);

      await act(async () => {
        render(<App />);
      });

      const overlay = screen.getByTestId('offline-overlay');
      expect(overlay).toBeInTheDocument();
    });

    it('hides OfflineOverlay when network is online', async () => {
      (useNetworkStatus as Mock).mockReturnValue(true);

      await act(async () => {
        render(<App />);
      });

      expect(screen.queryByTestId('offline-overlay')).not.toBeInTheDocument();
    });

    it('renders retry button in overlay when offline', async () => {
      (useNetworkStatus as Mock).mockReturnValue(false);

      await act(async () => {
        render(<App />);
      });

      const retryButton = screen.getByTestId('offline-retry-button');
      expect(retryButton).toBeInTheDocument();
    });

    it('calls retry function (reloads page) when retry button is clicked', async () => {
      (useNetworkStatus as Mock).mockReturnValue(false);

      await act(async () => {
        render(<App />);
      });

      const retryButton = screen.getByTestId('offline-retry-button');

      await act(async () => {
        fireEvent.click(retryButton);
      });

      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('network status transitions', () => {
    it('shows overlay when transitioning from online to offline', async () => {
      const { rerender } = await act(async () => {
        (useNetworkStatus as Mock).mockReturnValue(true);
        return render(<App />);
      });

      expect(screen.queryByTestId('offline-overlay')).not.toBeInTheDocument();

      await act(async () => {
        (useNetworkStatus as Mock).mockReturnValue(false);
        rerender(<App />);
      });

      expect(screen.getByTestId('offline-overlay')).toBeInTheDocument();
    });

    it('hides overlay when transitioning from offline to online', async () => {
      const { rerender } = await act(async () => {
        (useNetworkStatus as Mock).mockReturnValue(false);
        return render(<App />);
      });

      expect(screen.getByTestId('offline-overlay')).toBeInTheDocument();

      await act(async () => {
        (useNetworkStatus as Mock).mockReturnValue(true);
        rerender(<App />);
      });

      expect(screen.queryByTestId('offline-overlay')).not.toBeInTheDocument();
    });
  });

  describe('offline overlay content', () => {
    it('displays wifi-off icon when offline', async () => {
      (useNetworkStatus as Mock).mockReturnValue(false);

      await act(async () => {
        render(<App />);
      });

      const icon = screen.getByTestId('offline-icon');
      expect(icon).toBeInTheDocument();
    });

    it('displays network unavailable message when offline', async () => {
      (useNetworkStatus as Mock).mockReturnValue(false);

      await act(async () => {
        render(<App />);
      });

      expect(screen.getByText(/network unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/please check your internet connection/i)).toBeInTheDocument();
    });
  });
});

/**
 * Integration tests for offline mode functionality.
 * Tests the full offline workflow in a more integrated environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import App from '../../../src/renderer/App';

// Mock window.location.reload
const mockReload = vi.fn();
delete (window as any).location;
(window as any).location = { reload: mockReload };

describe('Offline Mode Integration', () => {
  let onlineGetter: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock navigator.onLine
    onlineGetter = vi.spyOn(navigator, 'onLine', 'get');
    onlineGetter.mockReturnValue(true);
  });

  afterEach(() => {
    onlineGetter.mockRestore();
  });

  describe('initial offline state', () => {
    it('shows offline overlay when app starts offline', async () => {
      onlineGetter.mockReturnValue(false);

      await act(async () => {
        render(<App />);
      });

      const overlay = screen.getByTestId('offline-overlay');
      expect(overlay).toBeInTheDocument();
    });

    it('does not show offline overlay when app starts online', async () => {
      onlineGetter.mockReturnValue(true);

      await act(async () => {
        render(<App />);
      });

      expect(screen.queryByTestId('offline-overlay')).not.toBeInTheDocument();
    });
  });

  describe('offline to online transition', () => {
    it('removes overlay when connection is restored', async () => {
      onlineGetter.mockReturnValue(false);

      await act(async () => {
        render(<App />);
      });

      expect(screen.getByTestId('offline-overlay')).toBeInTheDocument();

      // Simulate going online
      await act(async () => {
        onlineGetter.mockReturnValue(true);
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(screen.queryByTestId('offline-overlay')).not.toBeInTheDocument();
      });
    });
  });

  describe('online to offline transition', () => {
    it('shows overlay when connection is lost', async () => {
      onlineGetter.mockReturnValue(true);

      await act(async () => {
        render(<App />);
      });

      expect(screen.queryByTestId('offline-overlay')).not.toBeInTheDocument();

      // Simulate going offline
      await act(async () => {
        onlineGetter.mockReturnValue(false);
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('offline-overlay')).toBeInTheDocument();
      });
    });
  });

  describe('retry functionality', () => {
    it('retry button triggers page reload', async () => {
      onlineGetter.mockReturnValue(false);

      await act(async () => {
        render(<App />);
      });

      const retryButton = screen.getByTestId('offline-retry-button');
      
      await act(async () => {
        fireEvent.click(retryButton);
      });

      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });

  describe('overlay UI elements', () => {
    it('displays all expected UI elements when offline', async () => {
      onlineGetter.mockReturnValue(false);

      await act(async () => {
        render(<App />);
      });

      // Check for icon
      expect(screen.getByTestId('offline-icon')).toBeInTheDocument();
      
      // Check for heading
      expect(screen.getByRole('heading', { name: /network unavailable/i })).toBeInTheDocument();
      
      // Check for message
      expect(screen.getByText(/please check your internet connection/i)).toBeInTheDocument();
      
      // Check for retry button
      expect(screen.getByTestId('offline-retry-button')).toBeInTheDocument();
    });
  });
});

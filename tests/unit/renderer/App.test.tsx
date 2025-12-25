/**
 * Unit tests for App component.
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../../../src/renderer/App';
import { useNetworkStatus } from '../../../src/renderer/hooks/useNetworkStatus';

// Mock the network status hook
vi.mock('../../../src/renderer/hooks/useNetworkStatus', () => ({
  useNetworkStatus: vi.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to online
    (useNetworkStatus as Mock).mockReturnValue(true);
  });

  describe('loading state', () => {
    it('shows loading state initially', async () => {
      await act(async () => {
        render(<App />);
      });

      expect(screen.getByText('Loading Gemini...')).toBeInTheDocument();
      const spinner = document.querySelector('.webview-loading-spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('hides loading when iframe loads', async () => {
      await act(async () => {
        render(<App />);
      });

      const iframe = screen.getByTestId('gemini-iframe');
      await act(async () => {
        fireEvent.load(iframe);
      });

      expect(screen.queryByText('Loading Gemini...')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    // Note: The iframe onError handler cannot be tested in JSDOM because
    // fireEvent.error() doesn't trigger React's synthetic onError for iframes.
    // This has been manually verified to work in the actual Electron environment.
    it.skip('shows error message when iframe errors (manual test only)', () => {
      // This test is skipped because JSDOM cannot properly simulate iframe errors
    });
  });

  describe('layout structure', () => {
    it('renders MainLayout container', async () => {
      await act(async () => {
        render(<App />);
      });

      const layout = document.querySelector('.main-layout');
      expect(layout).toBeInTheDocument();
    });

    it('renders webview-container', async () => {
      await act(async () => {
        render(<App />);
      });

      const container = document.querySelector('.webview-container');
      expect(container).toBeInTheDocument();
    });

    it('renders Titlebar via MainLayout', async () => {
      await act(async () => {
        render(<App />);
      });

      const titlebar = document.querySelector('.titlebar');
      expect(titlebar).toBeInTheDocument();
    });

    it('renders iframe with correct src', async () => {
      await act(async () => {
        render(<App />);
      });

      const iframe = screen.getByTestId('gemini-iframe') as HTMLIFrameElement;
      expect(iframe).toBeInTheDocument();
      expect(iframe.src).toBe('https://gemini.google.com/app');
    });

    it('renders iframe with media permission attributes', async () => {
      await act(async () => {
        render(<App />);
      });

      const iframe = screen.getByTestId('gemini-iframe') as HTMLIFrameElement;
      const allowAttr = iframe.getAttribute('allow');
      expect(allowAttr).toBe('microphone; camera; display-capture');
    });
  });

  describe('theme integration', () => {
    it('applies data-theme attribute to root element', async () => {
      await act(async () => {
        render(<App />);
      });

      // Allow theme effect to run
      await act(async () => {});

      // Verify the data-theme attribute was set (default should be 'system' which resolves to 'dark' or 'light')
      const themeAttr = document.documentElement.getAttribute('data-theme');
      expect(themeAttr).toBeTruthy();
    });

    describe('offline state', () => {
      it('renders OfflineOverlay when offline', async () => {
        (useNetworkStatus as Mock).mockReturnValue(false);

        await act(async () => {
          render(<App />);
        });

        const overlay = screen.getByTestId('offline-overlay');
        expect(overlay).toBeInTheDocument();

        // Verify it's inside main-layout
        const layout = screen.getByTestId('main-layout');
        expect(layout).toContainElement(overlay);
      });

      it('does not render OfflineOverlay when online', async () => {
        (useNetworkStatus as Mock).mockReturnValue(true);

        await act(async () => {
          render(<App />);
        });

        expect(screen.queryByTestId('offline-overlay')).not.toBeInTheDocument();
      });
    });
  });
});

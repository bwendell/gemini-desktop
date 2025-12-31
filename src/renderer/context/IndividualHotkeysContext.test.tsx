/**
 * Unit tests for IndividualHotkeysContext.
 *
 * Tests the React context that manages individual hotkey enabled states.
 *
 * @module IndividualHotkeysContext.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { IndividualHotkeysProvider, useIndividualHotkeys } from './IndividualHotkeysContext';

// ============================================================================
// Test Helper Component
// ============================================================================

function TestConsumer() {
  const { settings, setEnabled } = useIndividualHotkeys();
  return (
    <div>
      <span data-testid="alwaysOnTop">{settings.alwaysOnTop.toString()}</span>
      <span data-testid="bossKey">{settings.bossKey.toString()}</span>
      <span data-testid="quickChat">{settings.quickChat.toString()}</span>
      <button onClick={() => setEnabled('quickChat', false)} data-testid="disable-quickchat">
        Disable Quick Chat
      </button>
    </div>
  );
}

// ============================================================================
// Test Suite
// ============================================================================

describe('IndividualHotkeysContext', () => {
  let originalElectronAPI: typeof window.electronAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    originalElectronAPI = window.electronAPI;
  });

  afterEach(() => {
    window.electronAPI = originalElectronAPI;
  });

  describe('initialization', () => {
    it('should initialize with defaults when Electron API is unavailable', async () => {
      window.electronAPI = undefined;

      render(
        <IndividualHotkeysProvider>
          <TestConsumer />
        </IndividualHotkeysProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('alwaysOnTop')).toHaveTextContent('true');
        expect(screen.getByTestId('bossKey')).toHaveTextContent('true');
        expect(screen.getByTestId('quickChat')).toHaveTextContent('true');
      });
    });

    it('should initialize from Electron API when available', async () => {
      window.electronAPI = {
        ...window.electronAPI,
        getIndividualHotkeys: vi.fn().mockResolvedValue({
          alwaysOnTop: false,
          bossKey: true,
          quickChat: false,
          printToPdf: true,
        }),
        onIndividualHotkeysChanged: vi.fn().mockReturnValue(() => {}),
      } as any;

      render(
        <IndividualHotkeysProvider>
          <TestConsumer />
        </IndividualHotkeysProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('alwaysOnTop')).toHaveTextContent('false');
        expect(screen.getByTestId('bossKey')).toHaveTextContent('true');
        expect(screen.getByTestId('quickChat')).toHaveTextContent('false');
      });
    });

    it('should handle API errors gracefully', async () => {
      window.electronAPI = {
        ...window.electronAPI,
        getIndividualHotkeys: vi.fn().mockRejectedValue(new Error('API error')),
        onIndividualHotkeysChanged: vi.fn().mockReturnValue(() => {}),
      } as any;

      render(
        <IndividualHotkeysProvider>
          <TestConsumer />
        </IndividualHotkeysProvider>
      );

      // Should still render with defaults
      await waitFor(() => {
        expect(screen.getByTestId('alwaysOnTop')).toHaveTextContent('true');
      });
    });

    it('should handle invalid settings format from API', async () => {
      window.electronAPI = {
        ...window.electronAPI,
        getIndividualHotkeys: vi.fn().mockResolvedValue({ invalid: 'data' }),
        onIndividualHotkeysChanged: vi.fn().mockReturnValue(() => {}),
      } as any;

      render(
        <IndividualHotkeysProvider>
          <TestConsumer />
        </IndividualHotkeysProvider>
      );

      // Should still use defaults when data is invalid
      await waitFor(() => {
        expect(screen.getByTestId('alwaysOnTop')).toHaveTextContent('true');
        expect(screen.getByTestId('bossKey')).toHaveTextContent('true');
        expect(screen.getByTestId('quickChat')).toHaveTextContent('true');
      });
    });
  });

  describe('setEnabled', () => {
    it('should call Electron API when setting individual hotkey', async () => {
      const mockSetIndividualHotkey = vi.fn();
      window.electronAPI = {
        ...window.electronAPI,
        getIndividualHotkeys: vi.fn().mockResolvedValue({
          alwaysOnTop: true,
          bossKey: true,
          quickChat: true,
          printToPdf: true,
        }),
        setIndividualHotkey: mockSetIndividualHotkey,
        onIndividualHotkeysChanged: vi.fn().mockReturnValue(() => {}),
      } as any;

      render(
        <IndividualHotkeysProvider>
          <TestConsumer />
        </IndividualHotkeysProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('quickChat')).toHaveTextContent('true');
      });

      await act(async () => {
        screen.getByTestId('disable-quickchat').click();
      });

      expect(mockSetIndividualHotkey).toHaveBeenCalledWith('quickChat', false);
      expect(screen.getByTestId('quickChat')).toHaveTextContent('false');
    });

    it('should handle setEnabled errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      window.electronAPI = {
        ...window.electronAPI,
        getIndividualHotkeys: vi.fn().mockResolvedValue({
          alwaysOnTop: true,
          bossKey: true,
          quickChat: true,
          printToPdf: true,
        }),
        setIndividualHotkey: vi.fn().mockImplementation(() => {
          throw new Error('Set error');
        }),
        onIndividualHotkeysChanged: vi.fn().mockReturnValue(() => {}),
      } as any;

      render(
        <IndividualHotkeysProvider>
          <TestConsumer />
        </IndividualHotkeysProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('quickChat')).toHaveTextContent('true');
      });

      // Should still update local state even if API call fails
      await act(async () => {
        screen.getByTestId('disable-quickchat').click();
      });

      expect(screen.getByTestId('quickChat')).toHaveTextContent('false');
      consoleError.mockRestore();
    });

    it('should work when Electron API is unavailable', async () => {
      window.electronAPI = undefined;

      render(
        <IndividualHotkeysProvider>
          <TestConsumer />
        </IndividualHotkeysProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('quickChat')).toHaveTextContent('true');
      });

      // Should still update local state
      await act(async () => {
        screen.getByTestId('disable-quickchat').click();
      });

      expect(screen.getByTestId('quickChat')).toHaveTextContent('false');
    });
  });

  describe('external updates', () => {
    it('should update when receiving external changes', async () => {
      let changeCallback: ((settings: any) => void) | null = null;

      window.electronAPI = {
        ...window.electronAPI,
        getIndividualHotkeys: vi.fn().mockResolvedValue({
          alwaysOnTop: true,
          bossKey: true,
          quickChat: true,
          printToPdf: true,
        }),
        onIndividualHotkeysChanged: vi.fn((cb) => {
          changeCallback = cb;
          return () => {};
        }),
      } as any;

      render(
        <IndividualHotkeysProvider>
          <TestConsumer />
        </IndividualHotkeysProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('bossKey')).toHaveTextContent('true');
      });

      // Simulate external change
      await act(async () => {
        changeCallback?.({
          alwaysOnTop: true,
          bossKey: false,
          quickChat: true,
          printToPdf: true,
        });
      });

      expect(screen.getByTestId('bossKey')).toHaveTextContent('false');
    });

    it('should ignore invalid data from change events', async () => {
      let changeCallback: ((settings: any) => void) | null = null;

      window.electronAPI = {
        ...window.electronAPI,
        getIndividualHotkeys: vi.fn().mockResolvedValue({
          alwaysOnTop: true,
          bossKey: true,
          quickChat: true,
          printToPdf: true,
        }),
        onIndividualHotkeysChanged: vi.fn((cb) => {
          changeCallback = cb;
          return () => {};
        }),
      } as any;

      render(
        <IndividualHotkeysProvider>
          <TestConsumer />
        </IndividualHotkeysProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('bossKey')).toHaveTextContent('true');
      });

      // Send invalid data - should be ignored
      await act(async () => {
        changeCallback?.({ invalid: 'format' });
      });

      // Settings should remain unchanged
      expect(screen.getByTestId('alwaysOnTop')).toHaveTextContent('true');
      expect(screen.getByTestId('bossKey')).toHaveTextContent('true');
      expect(screen.getByTestId('quickChat')).toHaveTextContent('true');
    });
  });

  describe('useIndividualHotkeys hook', () => {
    it('should throw when used outside of provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestConsumer />);
      }).toThrow('useIndividualHotkeys must be used within an IndividualHotkeysProvider');

      consoleError.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should cleanup subscription on unmount', async () => {
      const mockCleanup = vi.fn();
      window.electronAPI = {
        ...window.electronAPI,
        getIndividualHotkeys: vi.fn().mockResolvedValue({
          alwaysOnTop: true,
          bossKey: true,
          quickChat: true,
          printToPdf: true,
        }),
        onIndividualHotkeysChanged: vi.fn().mockReturnValue(mockCleanup),
      } as any;

      const { unmount } = render(
        <IndividualHotkeysProvider>
          <TestConsumer />
        </IndividualHotkeysProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('alwaysOnTop')).toHaveTextContent('true');
      });

      unmount();

      expect(mockCleanup).toHaveBeenCalled();
    });
  });
});

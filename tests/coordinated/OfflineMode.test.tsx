/**
 * Integration tests for offline mode functionality.
 * Tests the full offline workflow in a more integrated environment.
 */

import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../../src/renderer/App';

// ============================================================================
// Mock: framer-motion (animations don't work well in JSDOM)
// ============================================================================
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => {
      // Filter out framer-motion specific props to avoid warnings
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { variants, initial, whileHover, whileTap, animate, exit, transition, ...domProps } =
        props;
      return React.createElement('div', { ...domProps, ref }, children);
    }),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) =>
    React.createElement(React.Fragment, {}, children),
}));

// ============================================================================
// Mock: window.matchMedia (JSDOM doesn't have this)
// ============================================================================
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ============================================================================
// Mock: Electron API
// ============================================================================
const mockElectronAPI = {
  minimizeWindow: vi.fn(),
  maximizeWindow: vi.fn(),
  closeWindow: vi.fn(),
  showWindow: vi.fn(),
  isMaximized: vi.fn().mockResolvedValue(false),
  openOptions: vi.fn(),
  openGoogleSignIn: vi.fn().mockResolvedValue(undefined),
  platform: 'win32' as NodeJS.Platform,
  isElectron: true,

  // Theme API
  getTheme: vi.fn().mockResolvedValue({ preference: 'system', effectiveTheme: 'dark' }),
  setTheme: vi.fn(),
  onThemeChanged: vi.fn().mockReturnValue(() => {}),

  // Quick Chat API
  submitQuickChat: vi.fn(),
  hideQuickChat: vi.fn(),
  cancelQuickChat: vi.fn(),
  onQuickChatExecute: vi.fn().mockReturnValue(() => {}),

  // Gemini Iframe Navigation API
  onGeminiNavigate: vi.fn().mockReturnValue(() => {}),
  signalGeminiReady: vi.fn(),

  // Individual Hotkeys API
  getIndividualHotkeys: vi.fn().mockResolvedValue({
    alwaysOnTop: true,
    bossKey: true,
    quickChat: true,
    printToPdf: true,
  }),
  setIndividualHotkey: vi.fn(),
  onIndividualHotkeysChanged: vi.fn().mockReturnValue(() => {}),

  // Hotkey Accelerators API
  getHotkeyAccelerators: vi.fn().mockResolvedValue({
    alwaysOnTop: 'Ctrl+Shift+T',
    bossKey: 'Ctrl+Shift+B',
    quickChat: 'Ctrl+Shift+X',
    printToPdf: 'Ctrl+Shift+P',
  }),
  setHotkeyAccelerator: vi.fn(),
  onHotkeyAcceleratorsChanged: vi.fn().mockReturnValue(() => {}),
  getFullHotkeySettings: vi.fn().mockResolvedValue({
    enabled: { alwaysOnTop: true, bossKey: true, quickChat: true, printToPdf: true },
    accelerators: {
      alwaysOnTop: 'Ctrl+Shift+T',
      bossKey: 'Ctrl+Shift+B',
      quickChat: 'Ctrl+Shift+X',
      printToPdf: 'Ctrl+Shift+P',
    },
  }),

  // Always On Top API
  getAlwaysOnTop: vi.fn().mockResolvedValue({ enabled: false }),
  setAlwaysOnTop: vi.fn(),
  onAlwaysOnTopChanged: vi.fn().mockReturnValue(() => {}),

  // Auto-Update API
  getAutoUpdateEnabled: vi.fn().mockResolvedValue(true),
  setAutoUpdateEnabled: vi.fn(),
  checkForUpdates: vi.fn(),
  installUpdate: vi.fn(),
  onUpdateAvailable: vi.fn().mockReturnValue(() => {}),
  onUpdateDownloaded: vi.fn().mockReturnValue(() => {}),
  onUpdateError: vi.fn().mockReturnValue(() => {}),
  onUpdateNotAvailable: vi.fn().mockReturnValue(() => {}),
  onDownloadProgress: vi.fn().mockReturnValue(() => {}),
  onCheckingForUpdate: vi.fn().mockReturnValue(() => {}),
  getLastUpdateCheckTime: vi.fn().mockResolvedValue(Date.now()),

  // Print to PDF API
  printToPdf: vi.fn(),
  cancelPrint: vi.fn(),
  onPrintToPdfSuccess: vi.fn().mockReturnValue(() => {}),
  onPrintToPdfError: vi.fn().mockReturnValue(() => {}),
  onPrintProgressStart: vi.fn().mockReturnValue(() => {}),
  onPrintProgressUpdate: vi.fn().mockReturnValue(() => {}),
  onPrintProgressEnd: vi.fn().mockReturnValue(() => {}),
  onPrintOverlayHide: vi.fn().mockReturnValue(() => {}),
  onPrintOverlayShow: vi.fn().mockReturnValue(() => {}),

  // Toast API
  onToastShow: vi.fn().mockReturnValue(() => {}),

  // Tray API
  getTrayTooltip: vi.fn().mockResolvedValue('Gemini'),

  // Dev Testing API
  devShowBadge: vi.fn(),
  devClearBadge: vi.fn(),
  devSetUpdateEnabled: vi.fn(),
  devEmitUpdateEvent: vi.fn(),
  devMockPlatform: vi.fn(),
  onDebugTriggerError: vi.fn().mockReturnValue(() => {}),
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
  configurable: true,
});

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
    it('overlay remains visible until retry is clicked after going online', async () => {
      onlineGetter.mockReturnValue(false);

      await act(async () => {
        render(<App />);
      });

      expect(screen.getByTestId('offline-overlay')).toBeInTheDocument();

      // Simulate going online - overlay should still be visible
      // (app requires retry/reload to recover from initial offline state)
      await act(async () => {
        onlineGetter.mockReturnValue(true);
        window.dispatchEvent(new Event('online'));
      });

      // Overlay should still be visible because error state is still set
      expect(screen.getByTestId('offline-overlay')).toBeInTheDocument();

      // User should click retry to recover
      const retryButton = screen.getByTestId('offline-retry-button');
      expect(retryButton).toBeInTheDocument();
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

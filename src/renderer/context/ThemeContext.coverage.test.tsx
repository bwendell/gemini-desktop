import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

// Helper to access context
const TestComponent = () => {
  const { theme, currentEffectiveTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="effective">{currentEffectiveTheme}</span>
      <button onClick={() => setTheme('light')}>Set Light</button>
    </div>
  );
};

describe('ThemeContext Coverage', () => {
  // Save original matches
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default matchMedia mock
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    (window as any).electronAPI = undefined;
  });

  it('handles initialization error by falling back to system preference', async () => {
    // Mock matchMedia to return dark
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    // Mock Electron API to throw on getTheme
    window.electronAPI = {
      getTheme: vi.fn().mockRejectedValue(new Error('IPC Error')),
      setTheme: vi.fn(),
      onThemeChanged: vi.fn().mockReturnValue(() => {}),
    } as any;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    // Should fall back to system (dark)
    expect(screen.getByTestId('effective')).toHaveTextContent('dark');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to initialize theme'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('handles legacy theme data format on initialization', async () => {
    // Mock getTheme to return legacy string "light"
    window.electronAPI = {
      getTheme: vi.fn().mockResolvedValue('light'),
      setTheme: vi.fn(),
      onThemeChanged: vi.fn().mockReturnValue(() => {}),
    } as any;

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Using legacy theme format'),
      'light'
    );

    consoleSpy.mockRestore();
  });

  it('handles legacy theme data format on update event', async () => {
    let listener: any;
    window.electronAPI = {
      getTheme: vi.fn().mockResolvedValue({ preference: 'system', effectiveTheme: 'dark' }),
      setTheme: vi.fn(),
      onThemeChanged: vi.fn().mockImplementation((cb) => {
        listener = cb;
        return () => {};
      }),
    } as any;

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    expect(listener).toBeDefined();

    // Trigger legacy string update
    await act(async () => {
      listener('light');
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Using legacy change format'),
      'light'
    );

    consoleSpy.mockRestore();
  });

  it('handles setTheme error gracefully', async () => {
    window.electronAPI = {
      getTheme: vi.fn().mockResolvedValue({ preference: 'light', effectiveTheme: 'light' }),
      setTheme: vi.fn().mockImplementation(() => {
        throw new Error('Set failed');
      }),
      onThemeChanged: vi.fn().mockReturnValue(() => {}),
    } as any;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
    });

    await act(async () => {
      screen.getByText('Set Light').click();
    });

    // Theme state should still update locally
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to set theme'),
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('handles unmount during async operations', async () => {
    let resolvePromise: any;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    window.electronAPI = {
      getTheme: vi.fn().mockReturnValue(promise), // Hangs until we resolve
      setTheme: vi.fn(),
      onThemeChanged: vi.fn().mockReturnValue(() => {}),
    } as any;

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    let unmount: any;
    await act(async () => {
      const result = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );
      unmount = result.unmount;
    });

    // Unmount while promise is pending
    unmount();

    // Now resolve
    await act(async () => {
      resolvePromise({ preference: 'light', effectiveTheme: 'light' });
    });

    // Should NOT log "Theme initialized" because isMounted checks prevented it
    expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('Theme initialized'));

    consoleSpy.mockRestore();
  });
});

/**
 * Centralized type definitions for E2E tests.
 */

// Extend the global Window interface
declare global {
  interface Window {
    electronAPI: {
      getAlwaysOnTop: () => Promise<{ enabled: boolean }>;
      setAlwaysOnTop: (enabled: boolean) => void;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      isMaximized: () => boolean;
      // Add other API methods here as needed
    };
  }
}

export {};

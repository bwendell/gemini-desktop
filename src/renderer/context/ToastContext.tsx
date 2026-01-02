/**
 * Toast Context and Provider
 *
 * Provides a centralized API for showing toast notifications from anywhere in the app.
 * Uses the generic Toast and ToastContainer components for rendering.
 *
 * @module ToastContext
 *
 * @example
 * ```tsx
 * // In a component:
 * const { showToast, showSuccess, showError } = useToast();
 *
 * showToast({ type: 'info', message: 'Hello!' });
 * showSuccess('Changes saved');
 * showError('Something went wrong');
 * ```
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';

import { ToastContainer, type ToastItem } from '../components/toast/ToastContainer';
import type { ToastType, ToastAction } from '../components/toast/Toast';

/**
 * Default durations for auto-dismiss (in milliseconds)
 */
const DEFAULT_DURATIONS: Record<ToastType, number | null> = {
  success: 5000,
  info: 5000,
  warning: 7000,
  error: 10000,
  progress: null, // No auto-dismiss for progress toasts
};

/**
 * Options for showing a toast
 */
export interface ShowToastOptions {
  /** Optional custom ID (auto-generated if not provided) */
  id?: string;
  /** Type of toast */
  type: ToastType;
  /** Optional title (bold header) */
  title?: string;
  /** Toast message content */
  message: string;
  /** Custom duration in ms (null = persistent, undefined = use default) */
  duration?: number | null;
  /** Progress percentage (0-100) for progress type */
  progress?: number;
  /** Action buttons */
  actions?: ToastAction[];
  /** If true, toast will not auto-dismiss regardless of type */
  persistent?: boolean;
}

/**
 * Toast context value
 */
export interface ToastContextValue {
  /** Show a toast with the given options, returns toast ID */
  showToast: (options: ShowToastOptions) => string;
  /** Dismiss a specific toast by ID */
  dismissToast: (id: string) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
  /** Current toast items */
  toasts: ToastItem[];
  /** Convenience helper: show a success toast */
  showSuccess: (message: string, options?: Partial<ShowToastOptions>) => string;
  /** Convenience helper: show an error toast */
  showError: (message: string, options?: Partial<ShowToastOptions>) => string;
  /** Convenience helper: show an info toast */
  showInfo: (message: string, options?: Partial<ShowToastOptions>) => string;
  /** Convenience helper: show a warning toast */
  showWarning: (message: string, options?: Partial<ShowToastOptions>) => string;
}

/**
 * Toast context (null when outside provider)
 */
export const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Props for ToastProvider
 */
export interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Toast Provider Component
 *
 * Wraps the application to provide toast functionality via useToast hook.
 * Renders the ToastContainer which manages the toast stack.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <ToastProvider>
 *       <YourApp />
 *     </ToastProvider>
 *   );
 * }
 * ```
 */
export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /**
   * Add a toast and optionally schedule auto-dismiss
   */
  const showToast = useCallback((options: ShowToastOptions): string => {
    const id = options.id ?? crypto.randomUUID();

    const toast: ToastItem = {
      id,
      type: options.type,
      title: options.title,
      message: options.message,
      icon: undefined,
      progress: options.progress,
      actions: options.actions,
    };

    setToasts((prev) => [...prev, toast]);

    // Schedule auto-dismiss unless persistent or progress type
    if (!options.persistent) {
      const duration =
        options.duration !== undefined ? options.duration : DEFAULT_DURATIONS[options.type];

      if (duration !== null) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    }

    return id;
  }, []);

  /**
   * Dismiss a specific toast by ID
   */
  const dismissToast = useCallback((id: string): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * Dismiss all toasts
   */
  const dismissAll = useCallback((): void => {
    setToasts([]);
  }, []);

  /**
   * Convenience helper: show a success toast
   */
  const showSuccess = useCallback(
    (message: string, options?: Partial<ShowToastOptions>): string => {
      return showToast({ type: 'success', message, ...options });
    },
    [showToast]
  );

  /**
   * Convenience helper: show an error toast
   */
  const showError = useCallback(
    (message: string, options?: Partial<ShowToastOptions>): string => {
      return showToast({ type: 'error', message, ...options });
    },
    [showToast]
  );

  /**
   * Convenience helper: show an info toast
   */
  const showInfo = useCallback(
    (message: string, options?: Partial<ShowToastOptions>): string => {
      return showToast({ type: 'info', message, ...options });
    },
    [showToast]
  );

  /**
   * Convenience helper: show a warning toast
   */
  const showWarning = useCallback(
    (message: string, options?: Partial<ShowToastOptions>): string => {
      return showToast({ type: 'warning', message, ...options });
    },
    [showToast]
  );

  /**
   * Memoize context value to prevent unnecessary re-renders
   */
  const contextValue = useMemo<ToastContextValue>(
    () => ({
      showToast,
      dismissToast,
      dismissAll,
      toasts,
      showSuccess,
      showError,
      showInfo,
      showWarning,
    }),
    [showToast, dismissToast, dismissAll, toasts, showSuccess, showError, showInfo, showWarning]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast functionality
 *
 * Provides methods to show, dismiss, and manage toasts from any component.
 *
 * @throws Error if used outside of ToastProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { showToast, showSuccess, showError, dismissAll } = useToast();
 *
 *   const handleSave = async () => {
 *     try {
 *       await saveData();
 *       showSuccess('Data saved successfully!');
 *     } catch (error) {
 *       showError('Failed to save data');
 *     }
 *   };
 *
 *   return <button onClick={handleSave}>Save</button>;
 * }
 * ```
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (context === null) {
    throw new Error(
      'useToast must be used within a ToastProvider. ' +
        'Make sure your component is wrapped with <ToastProvider>.'
    );
  }

  return context;
}

export default ToastProvider;

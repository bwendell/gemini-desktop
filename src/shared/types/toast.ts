/**
 * Toast Types
 *
 * Shared type definitions for toast notifications that are used across
 * main, renderer, and preload processes.
 *
 * @module shared/types/toast
 */

/**
 * Valid toast types for display variants
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'progress';

/**
 * Payload for IPC toast:show messages from main process to renderer.
 * This is a subset of ShowToastOptions that can be safely sent via IPC.
 */
export interface ToastPayload {
  /** Type of toast (determines styling and default duration) */
  type: ToastType;
  /** Optional title displayed in bold above the message */
  title?: string;
  /** The main toast message content */
  message: string;
  /** Custom duration in milliseconds (null = persistent, undefined = use default) */
  duration?: number | null;
  /** Progress percentage (0-100) for progress type toasts */
  progress?: number;
}

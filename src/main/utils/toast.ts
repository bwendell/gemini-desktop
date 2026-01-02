/**
 * Toast Utility for Main Process
 *
 * Provides a helper function for sending toast notifications from the main process
 * to renderer windows via IPC.
 *
 * @module main/utils/toast
 */

import type { BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ToastPayload } from '../../shared/types/toast';

/**
 * Send a toast notification to a renderer window.
 *
 * @param window - The BrowserWindow to send the toast to
 * @param options - Toast payload with type, message, and optional title/duration/progress
 *
 * @example
 * ```ts
 * import { showToast } from './utils/toast';
 *
 * // Show a success toast
 * showToast(mainWindow, {
 *   type: 'success',
 *   message: 'File saved successfully!',
 * });
 *
 * // Show an error toast with title
 * showToast(mainWindow, {
 *   type: 'error',
 *   title: 'Connection Failed',
 *   message: 'Unable to connect to server. Please try again.',
 * });
 *
 * // Show a progress toast
 * showToast(mainWindow, {
 *   type: 'progress',
 *   title: 'Downloading...',
 *   message: 'update-1.2.3.exe',
 *   progress: 45,
 * });
 * ```
 */
export function showToast(window: BrowserWindow, options: ToastPayload): void {
  if (window && !window.isDestroyed()) {
    window.webContents.send(IPC_CHANNELS.TOAST_SHOW, options);
  }
}

/**
 * Window Manager Helper.
 *
 * Provides safe window cleanup operations that properly handle WebDriver session cleanup.
 * This module addresses the issue where closing windows via browser.execute() causes
 * the WebDriver connection to drop.
 *
 * @module WindowManagerHelper
 */

import { browser } from '@wdio/globals';
import { E2ELogger } from './logger';

/**
 * Safely closes all windows except the main window.
 * Uses browser.closeWindow() which properly handles WebDriver session cleanup.
 *
 * @param mainWindowHandle - The handle of the main window to preserve
 */
export async function closeAllSecondaryWindows(mainWindowHandle: string): Promise<void> {
  const handles = await browser.getWindowHandles();

  for (const handle of handles) {
    if (handle !== mainWindowHandle) {
      try {
        await browser.switchToWindow(handle);
        E2ELogger.info('WindowManagerHelper', `Closing secondary window: ${handle}`);
        await browser.closeWindow();
      } catch {
        // Window might already be closed
        E2ELogger.info('WindowManagerHelper', `Window ${handle} already closed or inaccessible`);
      }
    }
  }

  // Switch back to main window
  await switchToMainWindowSafely(mainWindowHandle);
}

/**
 * Safely switch back to the main window, with fallback to first available window.
 *
 * @param mainWindowHandle - The expected main window handle
 */
export async function switchToMainWindowSafely(mainWindowHandle: string): Promise<void> {
  const remainingHandles = await browser.getWindowHandles();

  if (remainingHandles.includes(mainWindowHandle)) {
    await browser.switchToWindow(mainWindowHandle);
    E2ELogger.info('WindowManagerHelper', 'Switched back to main window');
  } else if (remainingHandles.length > 0) {
    await browser.switchToWindow(remainingHandles[0]);
    E2ELogger.info(
      'WindowManagerHelper',
      `Main window not found, switched to first available: ${remainingHandles[0]}`
    );
  }
}

/**
 * Close a specific window by its handle.
 * Uses browser.closeWindow() which properly handles WebDriver session cleanup.
 *
 * @param windowHandle - The handle of the window to close
 * @param returnToHandle - Optional handle to switch to after closing
 */
export async function closeWindowByHandle(
  windowHandle: string,
  returnToHandle?: string
): Promise<void> {
  try {
    await browser.switchToWindow(windowHandle);
    E2ELogger.info('WindowManagerHelper', `Closing window: ${windowHandle}`);
    await browser.closeWindow();
  } catch {
    E2ELogger.info('WindowManagerHelper', `Window ${windowHandle} already closed or inaccessible`);
  }

  if (returnToHandle) {
    await switchToMainWindowSafely(returnToHandle);
  }
}

/**
 * E2E Print Actions Helpers.
 *
 * Provides reusable utilities for testing print-to-pdf functionality.
 * Includes dialog interception, file verification, and print trigger helpers.
 *
 * @module printActions
 */

/// <reference path="./wdio-electron.d.ts" />

import { browser } from '@wdio/globals';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { E2ELogger } from './logger';
import { E2E_TIMING } from './e2eConstants';
import { pressComplexShortcut } from './workflows';
import { clickMenuItemById } from './menuActions';

// =============================================================================
// Types
// =============================================================================

export interface PrintDialogInterceptResult {
  dialogCalled: boolean;
  dialogOptions?: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  };
}

export interface PrintFileVerificationResult {
  exists: boolean;
  size: number;
  isValidPdf: boolean;
}

// =============================================================================
// Dialog Interception
// =============================================================================

/**
 * Sets up dialog interception to capture print save dialog calls.
 * The dialog will be auto-cancelled or auto-saved depending on the config.
 *
 * @param config - Configuration for dialog behavior
 * @returns Cleanup function to restore original dialog
 */
export async function setupPrintDialogInterception(config: {
  autoSave?: boolean;
  savePath?: string;
}): Promise<void> {
  const { autoSave = false, savePath } = config;

  await browser.electron.execute(
    (electron: typeof import('electron'), opts: { autoSave: boolean; savePath?: string }) => {
      const originalShowSaveDialog = electron.dialog.showSaveDialog;
      (electron.dialog as any)._originalShowSaveDialog = originalShowSaveDialog;
      (electron.dialog as any)._printDialogData = {
        called: false,
        options: null,
      };

      electron.dialog.showSaveDialog = async (
        windowOrOptions: any,
        maybeOptions?: any
      ): Promise<any> => {
        const options = maybeOptions || windowOrOptions;
        (electron.dialog as any)._printDialogData = {
          called: true,
          options: {
            title: options?.title,
            defaultPath: options?.defaultPath,
            filters: options?.filters,
          },
        };

        if (opts.autoSave && opts.savePath) {
          return { canceled: false, filePath: opts.savePath };
        }
        return { canceled: true, filePath: undefined };
      };
    },
    { autoSave, savePath }
  );

  E2ELogger.info('printActions', 'Dialog interception set up');
}

/**
 * Gets the intercepted dialog data and restores original dialog.
 */
export async function getPrintDialogInterceptResult(): Promise<PrintDialogInterceptResult> {
  const result = await browser.electron.execute((electron: typeof import('electron')) => {
    const data = (electron.dialog as any)._printDialogData || { called: false };

    // Restore original
    if ((electron.dialog as any)._originalShowSaveDialog) {
      electron.dialog.showSaveDialog = (electron.dialog as any)._originalShowSaveDialog;
      delete (electron.dialog as any)._originalShowSaveDialog;
      delete (electron.dialog as any)._printDialogData;
    }

    return {
      dialogCalled: data.called,
      dialogOptions: data.options,
    };
  });

  E2ELogger.info('printActions', `Dialog was called: ${result.dialogCalled}`);
  return result;
}

/**
 * Cleans up any leftover dialog interception state.
 */
export async function cleanupDialogInterception(): Promise<void> {
  await browser.electron.execute((electron: typeof import('electron')) => {
    if ((electron.dialog as any)._originalShowSaveDialog) {
      electron.dialog.showSaveDialog = (electron.dialog as any)._originalShowSaveDialog;
      delete (electron.dialog as any)._originalShowSaveDialog;
      delete (electron.dialog as any)._printDialogData;
    }
  });
}

// =============================================================================
// Print Triggers
// =============================================================================

/**
 * Triggers print via the keyboard hotkey (Ctrl+Shift+P / Cmd+Shift+P).
 */
export async function triggerPrintViaHotkey(): Promise<void> {
  await pressComplexShortcut(['primary', 'shift'], 'p');
  await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
  E2ELogger.info('printActions', 'Triggered print via hotkey');
}

/**
 * Triggers print via the File menu.
 */
export async function triggerPrintViaMenu(): Promise<void> {
  await clickMenuItemById('menu-file-print-to-pdf');
  await browser.pause(E2E_TIMING.IPC_ROUND_TRIP);
  E2ELogger.info('printActions', 'Triggered print via menu');
}

// =============================================================================
// File Verification
// =============================================================================

/**
 * Gets a unique temp file path for PDF testing.
 */
export function getTempPdfPath(): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  return path.join(os.tmpdir(), `gemini-e2e-test-${timestamp}-${randomId}.pdf`);
}

/**
 * Verifies a PDF file was created and is valid.
 */
export function verifyPdfFile(filePath: string): PrintFileVerificationResult {
  if (!fs.existsSync(filePath)) {
    return { exists: false, size: 0, isValidPdf: false };
  }

  const stats = fs.statSync(filePath);
  const buffer = fs.readFileSync(filePath);

  // PDF files start with %PDF-
  const isValidPdf = buffer.length >= 5 && buffer.slice(0, 5).toString('ascii') === '%PDF-';

  return {
    exists: true,
    size: stats.size,
    isValidPdf,
  };
}

/**
 * Deletes a test PDF file if it exists.
 */
export function cleanupTestPdfFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      E2ELogger.info('printActions', `Cleaned up test file: ${filePath}`);
    }
  } catch (error) {
    E2ELogger.info('printActions', `Failed to cleanup file: ${error}`);
  }
}

// =============================================================================
// Error Injection
// =============================================================================

/**
 * Sets up file write failure mock for error testing.
 */
export async function setupFileWriteFailure(): Promise<void> {
  await browser.electron.execute((electron: typeof import('electron')) => {
    // Store original fs.writeFile
    const fs = require('fs');
    const originalWriteFile = fs.writeFile;
    (fs as any)._originalWriteFile = originalWriteFile;
    (fs as any)._writeFailureEnabled = true;

    // Replace with failing version
    fs.writeFile = (
      path: string,
      data: any,
      options: any,
      callback?: (err: Error | null) => void
    ) => {
      const cb = typeof options === 'function' ? options : callback;
      if ((fs as any)._writeFailureEnabled && path.endsWith('.pdf')) {
        if (cb) cb(new Error('E2E injected write failure'));
        return;
      }
      originalWriteFile(path, data, options, callback);
    };
  });

  E2ELogger.info('printActions', 'File write failure mock enabled');
}

/**
 * Removes file write failure mock.
 */
export async function cleanupFileWriteFailure(): Promise<void> {
  await browser.electron.execute((electron: typeof import('electron')) => {
    const fs = require('fs');
    if ((fs as any)._originalWriteFile) {
      fs.writeFile = (fs as any)._originalWriteFile;
      delete (fs as any)._originalWriteFile;
      delete (fs as any)._writeFailureEnabled;
    }
  });

  E2ELogger.info('printActions', 'File write failure mock removed');
}

// =============================================================================
// Complete Workflow Helpers
// =============================================================================

/**
 * Performs a complete print workflow and returns the result.
 * Sets up dialog interception, triggers print, waits for completion.
 *
 * @param trigger - How to trigger print ('hotkey' or 'menu')
 * @param autoSave - Whether to auto-save (true) or cancel (false)
 * @returns Object with dialog info and file path (if saved)
 */
export async function performPrintWorkflow(
  trigger: 'hotkey' | 'menu',
  autoSave: boolean = false
): Promise<{
  dialogCalled: boolean;
  filePath?: string;
  fileResult?: PrintFileVerificationResult;
}> {
  const tempPath = autoSave ? getTempPdfPath() : undefined;

  // Set up interception
  await setupPrintDialogInterception({ autoSave, savePath: tempPath });

  // Trigger print
  if (trigger === 'hotkey') {
    await triggerPrintViaHotkey();
  } else {
    await triggerPrintViaMenu();
  }

  // Wait for print operation
  await browser.pause(E2E_TIMING.EXTENDED_PAUSE_MS);

  // Get result
  const dialogResult = await getPrintDialogInterceptResult();

  // Verify file if auto-saved
  let fileResult: PrintFileVerificationResult | undefined;
  if (autoSave && tempPath) {
    // Wait a bit longer for file write
    await browser.pause(1000);
    fileResult = verifyPdfFile(tempPath);
  }

  return {
    dialogCalled: dialogResult.dialogCalled,
    filePath: tempPath,
    fileResult,
  };
}

/**
 * Abstract base class for IPC handlers.
 *
 * Provides common utilities and patterns for domain-specific IPC handlers.
 * All handlers should extend this class to ensure consistent behavior and
 * reduce code duplication.
 *
 * @module ipc/BaseIpcHandler
 */

import { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import type { IpcHandlerDependencies } from './types';
import type { Logger } from '../../types';

/**
 * Abstract base class for IPC handlers.
 *
 * Provides:
 * - Dependency injection via constructor
 * - `getWindowFromEvent()` helper for safely extracting window from IPC events
 * - `broadcastToAllWindows()` helper for sending messages to all windows
 * - `handleError()` helper for consistent error logging
 */
export abstract class BaseIpcHandler {
    /** Dependencies injected via constructor */
    protected readonly deps: IpcHandlerDependencies;
    /** Logger instance for consistent logging */
    protected readonly logger: Logger;

    /**
     * Creates a new IPC handler instance.
     * @param deps - Handler dependencies
     */
    constructor(deps: IpcHandlerDependencies) {
        this.deps = deps;
        this.logger = deps.logger;
    }

    /**
     * Register IPC handlers with ipcMain.
     * Must be implemented by subclasses.
     */
    abstract register(): void;

    /**
     * Optional post-registration initialization.
     * Override in subclasses that need async initialization.
     */
    initialize?(): void | Promise<void>;

    /**
     * Get the BrowserWindow from an IPC event safely.
     *
     * Extracts the window that sent the IPC message, handling cases where
     * the window may have been destroyed or the webContents is invalid.
     *
     * @param event - IPC event from ipcMain.on or ipcMain.handle
     * @returns The BrowserWindow or null if not found/destroyed
     */
    protected getWindowFromEvent(event: IpcMainEvent | IpcMainInvokeEvent): BrowserWindow | null {
        try {
            const win = BrowserWindow.fromWebContents(event.sender);
            if (win && win.isDestroyed()) {
                return null;
            }
            return win;
        } catch (error) {
            this.logger.error('Failed to get window from event:', error);
            return null;
        }
    }

    /**
     * Broadcast a message to all open windows.
     *
     * Sends an IPC message to all BrowserWindow instances, gracefully
     * handling destroyed windows. Errors for individual windows are logged
     * but don't affect other windows.
     *
     * @param channel - IPC channel to send on
     * @param data - Optional data to send
     */
    protected broadcastToAllWindows(channel: string, data?: unknown): void {
        const windows = BrowserWindow.getAllWindows();

        windows.forEach((win) => {
            try {
                if (!win.isDestroyed()) {
                    win.webContents.send(channel, data);
                }
            } catch (error) {
                this.logger.error('Error broadcasting to window:', {
                    error: (error as Error).message,
                    windowId: win.id,
                    channel,
                });
            }
        });
    }

    /**
     * Log an error with consistent formatting and context.
     *
     * Provides a standardized way to log errors with operation name and
     * optional context data. Use this for all error handling in handlers.
     *
     * @param operation - Description of the operation that failed
     * @param error - The error that occurred
     * @param context - Optional additional context data
     */
    protected handleError(operation: string, error: unknown, context?: Record<string, unknown>): void {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        this.logger.error(`Error during ${operation}:`, {
            error: errorMessage,
            stack: errorStack,
            ...context,
        });
    }
}

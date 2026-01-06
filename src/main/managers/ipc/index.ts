/**
 * IPC Handler barrel file.
 *
 * Re-exports all IPC handler classes and types for clean imports.
 *
 * @module ipc
 */

// Types
export type { IpcHandlerDependencies, UserPreferences } from './types';

// Base class
export { BaseIpcHandler } from './BaseIpcHandler';

// Handlers
export { ShellIpcHandler } from './ShellIpcHandler';
export { WindowIpcHandler } from './WindowIpcHandler';

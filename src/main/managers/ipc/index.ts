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
export { ThemeIpcHandler } from './ThemeIpcHandler';
export { ZoomIpcHandler } from './ZoomIpcHandler';
export { AlwaysOnTopIpcHandler } from './AlwaysOnTopIpcHandler';
export { PrintIpcHandler } from './PrintIpcHandler';
export { HotkeyIpcHandler } from './HotkeyIpcHandler';
export { AppIpcHandler } from './AppIpcHandler';
export { AutoUpdateIpcHandler } from './AutoUpdateIpcHandler';
export { QuickChatIpcHandler } from './QuickChatIpcHandler';
export { TextPredictionIpcHandler } from './TextPredictionIpcHandler';

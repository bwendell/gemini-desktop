/**
 * Shared Types
 *
 * Barrel export for all shared type definitions that are used across
 * main, renderer, and preload processes.
 */

// Export all type modules
export * from './theme';
export * from './hotkeys';
export * from './updates';
export * from './ipc';
export * from './toast';

// Re-export ElectronAPI explicitly for easier imports
export type { ElectronAPI } from './ipc';

// Note: Global Window augmentation is handled in src/main/types.ts for backward compatibility

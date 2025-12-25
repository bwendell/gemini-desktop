/**
 * Shared TypeScript types for the Gemini Desktop application.
 * This file contains interfaces and types used across components.
 */

/**
 * Window control action types
 */
export type WindowAction = 'minimize' | 'maximize' | 'close';

/**
 * Webview configuration options
 */
export interface WebviewConfig {
  url: string;
  label: string;
}

/**
 * Titlebar configuration for theming extensibility
 */
export interface TitlebarConfig {
  title: string;
  showIcon?: boolean;
  // Future: theme configuration
}

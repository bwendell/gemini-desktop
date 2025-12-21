/**
 * Utility modules for the Gemini Desktop application.
 */

export { getPlatform, isMacOS, isWindows, isLinux, usesCustomWindowControls } from './platform';
export type { Platform } from './platform';
export { createRendererLogger, type Logger } from './logger';

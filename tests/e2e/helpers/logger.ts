/**
 * E2E Logger — re-exports TestLogger from shared as E2ELogger for backward compatibility.
 *
 * All existing imports of E2ELogger and LogLevel from this file continue to work unchanged.
 */

// Re-export LogLevel type so existing `import { LogLevel } from './logger'` sites compile.
export type { LogLevel } from '../../shared/test-logger';

// Re-export TestLogger under the E2ELogger name used throughout e2e tests.
export { TestLogger as E2ELogger } from '../../shared/test-logger';

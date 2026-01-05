/**
 * Barrel export for shared test mocks.
 *
 * Usage:
 * ```typescript
 * import { createMockLogger, hoistedMockLogger } from '../../helpers/mocks';
 * import { createMockWindowManager, createMockStore } from '../../helpers/mocks';
 * ```
 *
 * @module tests/helpers/mocks
 */

// Main process mocks - Logger
export {
  createMockLogger,
  hoistedMockLogger,
  mockLoggerModule,
  resetMockLoggerModule,
  type MockLogger,
} from './main/logger';

// Main process mocks - Managers
export {
  createMockWindowManager,
  createMockStore,
  createMockUpdateManager,
  createMockPrintManager,
  createMockHotkeyManager,
  createMockLlmManager,
  type MockWindowManager,
  type MockStore,
  type MockUpdateManager,
  type MockPrintManager,
  type MockHotkeyManager,
  type MockLlmManager,
} from './main/managers';

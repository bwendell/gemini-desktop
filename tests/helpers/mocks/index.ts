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

export {
    createMockLogger,
    hoistedMockLogger,
    mockLoggerModule,
    resetMockLoggerModule,
    type MockLogger,
} from './main/logger';

export {
    createMockWindowManager,
    createMockStore,
    createMockUpdateManager,
    createMockExportManager,
    createMockHotkeyManager,
    createMockLlmManager,
    type MockWindowManager,
    type MockStore,
    type MockUpdateManager,
    type MockExportManager,
    type MockHotkeyManager,
    type MockLlmManager,
} from './main/managers';

export { createMockWebContents, type MockWebContents, type MockWebContentsOptions } from './main/webContents';

export {
    createMockPlatformAdapter,
    platformAdapterPresets,
    useMockPlatformAdapter,
    resetPlatformAdapterForTests,
    type MockPlatformAdapter,
} from './main/platformAdapterMock';

export {
    createMockElectronAPI,
    setupMockElectronAPI,
    clearMockElectronAPI,
    type MockElectronAPIOverrides,
    type MockedElectronAPI,
} from './renderer/electronAPI';

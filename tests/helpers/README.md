# Test Helpers

Shared utilities for testing the Gemini Desktop application. These helpers reduce code duplication and ensure consistent test patterns across the codebase.

## Directory Structure

```text
tests/helpers/
├── mocks/                    # Mock factories for dependencies
│   ├── main/                 # Main process mocks
│   │   ├── logger.ts         # Logger mock utilities
│   │   ├── managers.ts       # Manager mock factories
│   │   └── webContents.ts    # WebContents mock factory
│   ├── renderer/             # Renderer process mocks
│   │   └── electronAPI.ts    # ElectronAPI mock factory
│   └── index.ts              # Barrel export
├── harness/                  # Test harness utilities
│   ├── timers.ts             # Fake timer utilities
│   ├── platform.ts           # Platform stubbing utilities
│   └── index.ts              # Barrel export
└── setup/                    # Test setup files
    └── coordinated.ts        # Coordinated test setup
```

## Mock Factories

Import mocks from the barrel export:

```typescript
import { createMockWindowManager, createMockStore } from '../helpers/mocks';
```

### Logger Mocks

```typescript
import { createMockLogger, hoistedMockLogger } from '../helpers/mocks';

// For most tests, use the automatic mock via __mocks__ directory:
vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/logger';

// For custom behavior, create a mock logger:
const logger = createMockLogger();
logger.log('test message');
expect(logger.log).toHaveBeenCalledWith('test message');
```

### Manager Mocks

```typescript
import {
  createMockWindowManager,
  createMockStore,
  createMockUpdateManager,
  createMockPrintManager,
  createMockHotkeyManager,
  createMockLlmManager,
} from '../helpers/mocks';

// Create with defaults
const windowManager = createMockWindowManager();
const store = createMockStore();

// Create with overrides
const windowManager = createMockWindowManager({
  getMainWindow: vi.fn().mockReturnValue(mockWindow),
});

const store = createMockStore({
  autoUpdateEnabled: true,
  theme: 'dark',
});
```

### WebContents Mocks

```typescript
import { createMockWebContents } from '../helpers/mocks';

// Basic mock
const webContents = createMockWebContents();

// With scroll capture support (for print tests)
const webContents = createMockWebContents({
  withScrollCapture: true,
  scrollHeight: 2000,
  clientHeight: 1000,
});
```

### ElectronAPI Mocks (Renderer)

```typescript
import { setupMockElectronAPI, clearMockElectronAPI } from '../helpers/mocks';

beforeEach(() => {
  setupMockElectronAPI({
    getTheme: vi.fn().mockResolvedValue({ preference: 'dark' }),
  });
});

afterEach(() => {
  clearMockElectronAPI();
});
```

## Harness Utilities

Import harness utilities from the barrel export:

```typescript
import { useFakeTimers, stubPlatform } from '../helpers/harness';
```

### Timer Utilities

```typescript
import { useFakeTimers, useRealTimers, advanceTimers, runAllTimers } from '../helpers/harness';

beforeEach(() => {
  // Enable fake timers with optional date
  useFakeTimers('2025-01-15T12:00:00Z');
});

afterEach(() => {
  useRealTimers();
});

it('waits for timer', async () => {
  setTimeout(() => callback(), 1000);
  advanceTimers(1000);
  expect(callback).toHaveBeenCalled();
});
```

### Platform Utilities

```typescript
import { stubPlatform, restorePlatform, eachPlatform } from '../helpers/harness';

// Single platform test
beforeEach(() => {
  stubPlatform('darwin');
});

afterEach(() => {
  restorePlatform();
});

// Multi-platform test
describe.each(eachPlatform())('on %s', (platform) => {
  beforeEach(() => {
    stubPlatform(platform);
  });

  afterEach(() => {
    restorePlatform();
  });

  it('works on all platforms', () => {
    expect(process.platform).toBe(platform);
  });
});
```

## Migration Guide

When adding new tests, follow these patterns:

### 1. Use Shared Mocks Instead of Inline Definitions

❌ **Before:**

```typescript
const mockWindowManager = {
  getMainWindow: vi.fn(),
  getOptionsWindow: vi.fn(),
  // ... 20+ methods
};
```

✅ **After:**

```typescript
import { createMockWindowManager } from '../helpers/mocks';
const mockWindowManager = createMockWindowManager();
```

### 2. Use Harness Utilities for Common Patterns

❌ **Before:**

```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
  vi.stubGlobal('process', { ...process, platform: 'darwin' });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
```

✅ **After:**

```typescript
import { useFakeTimers, useRealTimers, stubPlatform, restorePlatform } from '../helpers/harness';

beforeEach(() => {
  useFakeTimers('2025-01-15T12:00:00Z');
  stubPlatform('darwin');
});

afterEach(() => {
  useRealTimers();
  restorePlatform();
});
```

### 3. Use the Logger **mocks** Directory

For automatic logger mocking, vitest uses the `__mocks__` directory pattern:

```typescript
// Just mock and import - vitest handles the rest
vi.mock('../../src/main/utils/logger');
import { mockLogger } from '../../src/main/utils/logger';

// Use mockLogger for assertions
expect(mockLogger.error).toHaveBeenCalledWith('...');
```

## Adding New Mock Factories

When adding new shared mocks:

1. Create the factory in the appropriate directory (`mocks/main/` or `mocks/renderer/`)
2. Export from the barrel file (`mocks/index.ts`)
3. Include JSDoc with usage examples
4. Add the factory to this README

Example factory structure:

```typescript
/**
 * Creates a mock SomeManager with all methods stubbed.
 *
 * @param overrides - Custom implementations for specific methods
 * @returns MockSomeManager instance
 */
export function createMockSomeManager(overrides: Partial<SomeManager> = {}): MockSomeManager {
  return {
    methodA: vi.fn(),
    methodB: vi.fn(),
    ...overrides,
  };
}
```

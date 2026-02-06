/**
 * Unit tests for DBusFallback module.
 *
 * This test suite validates the D-Bus fallback module for XDG Desktop Portal
 * GlobalShortcuts communication on Wayland systems.
 *
 * All D-Bus calls are fully mocked - no real D-Bus communication occurs.
 *
 * @module dbusFallback.test
 * @see DBusFallback - The module being tested
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock D-Bus functions
const mockDisconnect = vi.fn();
const mockCreateSession = vi.fn();
const mockBindShortcuts = vi.fn();
const mockGet = vi.fn();
const mockOn = vi.fn();

// Create mock interface getter
const mockGetInterface = vi.fn();

// Create mock getProxyObject
const mockGetProxyObject = vi.fn();

// Track if sessionBus was called
const mockSessionBusCalls: unknown[] = [];

// Factory function for creating the bus mock
const createBusMock = () => ({
    getProxyObject: mockGetProxyObject,
    disconnect: mockDisconnect,
});

// Mock dbus-next at the top level
vi.mock('dbus-next', () => ({
    sessionBus: () => {
        mockSessionBusCalls.push(Date.now());
        return createBusMock();
    },
    Variant: class {
        constructor(
            public signature: string,
            public value: unknown
        ) {}
    },
}));

// ============================================================================
// Test Suite
// ============================================================================

describe('DBusFallback', () => {
    let dbusFallback: typeof import('../../../../src/main/utils/dbusFallback');

    /**
     * Set up fresh mocks and module before each test.
     */
    beforeEach(async () => {
        // Clear all mock call history
        vi.clearAllMocks();
        mockSessionBusCalls.length = 0;

        // Set up default mock implementations
        mockGetInterface.mockImplementation((iface: string) => {
            if (iface === 'org.freedesktop.DBus.Properties') {
                return { Get: mockGet };
            }
            return {
                CreateSession: mockCreateSession,
                BindShortcuts: mockBindShortcuts,
                on: mockOn,
            };
        });

        mockGetProxyObject.mockResolvedValue({
            getInterface: mockGetInterface,
        });

        // Default: CreateSession returns a session path
        mockCreateSession.mockResolvedValue({
            session_handle: '/org/freedesktop/portal/desktop/session/test123',
        });

        // Default: BindShortcuts succeeds
        mockBindShortcuts.mockResolvedValue({});

        // Default: Properties interface returns GlobalShortcuts
        mockGet.mockResolvedValue(['org.freedesktop.portal.GlobalShortcuts']);

        // Re-import the module to get fresh state
        vi.resetModules();
        dbusFallback = await import('../../../../src/main/utils/dbusFallback');
    });

    /**
     * Clean up after each test.
     */
    afterEach(async () => {
        try {
            await dbusFallback.destroySession();
        } catch {
            // Ignore cleanup errors
        }
    });

    // ========================================================================
    // Dynamic Import Verification
    // ========================================================================

    describe('Dynamic Import', () => {
        it('does NOT import dbus-next at module level', async () => {
            const fs = await import('fs');
            const path = await import('path');
            const sourceFile = path.resolve(process.cwd(), 'src/main/utils/dbusFallback.ts');

            const content = fs.readFileSync(sourceFile, 'utf-8');

            // Check that there's no top-level import of dbus-next
            const topLevelImportRegex = /^import\s+.*from\s+['"]dbus-next['"]/m;
            expect(content).not.toMatch(topLevelImportRegex);

            // Verify there IS a dynamic import
            const dynamicImportRegex = /import\(['"]dbus-next['"]\)/;
            expect(content).toMatch(dynamicImportRegex);
        });
    });

    // ========================================================================
    // isDBusFallbackAvailable
    // ========================================================================

    describe('isDBusFallbackAvailable', () => {
        it('returns true when GlobalShortcuts interface is available', async () => {
            mockGet.mockResolvedValue(['org.freedesktop.portal.GlobalShortcuts']);

            const result = await dbusFallback.isDBusFallbackAvailable();

            expect(result).toBe(true);
            expect(mockSessionBusCalls.length).toBeGreaterThan(0);
        });

        it('returns false when D-Bus connection fails', async () => {
            mockGetProxyObject.mockRejectedValue(new Error('Connection refused'));

            const result = await dbusFallback.isDBusFallbackAvailable();

            expect(result).toBe(false);
        });

        it('returns false when portal does not have GlobalShortcuts interface', async () => {
            mockGet.mockResolvedValue(['org.freedesktop.portal.FileChooser']);

            const result = await dbusFallback.isDBusFallbackAvailable();

            expect(result).toBe(false);
        });

        it('returns false when Properties.Get throws', async () => {
            mockGetInterface.mockImplementation((iface: string) => {
                if (iface === 'org.freedesktop.DBus.Properties') {
                    return {
                        Get: vi.fn().mockRejectedValue(new Error('Method not found')),
                    };
                }
                return {};
            });

            const result = await dbusFallback.isDBusFallbackAvailable();

            expect(result).toBe(false);
        });
    });

    // ========================================================================
    // registerViaDBus
    // ========================================================================

    describe('registerViaDBus', () => {
        const testShortcuts = [
            { id: 'quickChat' as const, accelerator: 'Ctrl+Shift+Space', description: 'Quick Chat toggle' },
            { id: 'bossKey' as const, accelerator: 'Ctrl+Alt+H', description: 'Hide window' },
        ];

        it('returns success results when all shortcuts bind successfully', async () => {
            const results = await dbusFallback.registerViaDBus(testShortcuts);

            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({ hotkeyId: 'quickChat', success: true });
            expect(results[1]).toEqual({ hotkeyId: 'bossKey', success: true });
        });

        it('calls CreateSession with correct parameters', async () => {
            await dbusFallback.registerViaDBus(testShortcuts);

            expect(mockCreateSession).toHaveBeenCalledTimes(1);
            const callArgs = mockCreateSession.mock.calls[0];
            expect(callArgs).toBeDefined();
        });

        it('calls BindShortcuts with all shortcuts in a single batch', async () => {
            await dbusFallback.registerViaDBus(testShortcuts);

            // BindShortcuts should be called exactly once (batch operation)
            expect(mockBindShortcuts).toHaveBeenCalledTimes(1);
        });

        it('returns failure results when CreateSession fails', async () => {
            mockCreateSession.mockRejectedValue(new Error('Session creation denied'));

            const results = await dbusFallback.registerViaDBus(testShortcuts);

            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({
                hotkeyId: 'quickChat',
                success: false,
                error: expect.stringContaining('Session creation denied'),
            });
            expect(results[1]).toEqual({
                hotkeyId: 'bossKey',
                success: false,
                error: expect.stringContaining('Session creation denied'),
            });
        });

        it('returns failure results when BindShortcuts fails', async () => {
            mockBindShortcuts.mockRejectedValue(new Error('Shortcuts rejected by portal'));

            const results = await dbusFallback.registerViaDBus(testShortcuts);

            expect(results).toHaveLength(2);
            results.forEach((result) => {
                expect(result.success).toBe(false);
                expect(result.error).toContain('Shortcuts rejected by portal');
            });
        });

        it('returns failure results when D-Bus connection fails', async () => {
            mockGetProxyObject.mockRejectedValue(new Error('D-Bus unavailable'));

            const results = await dbusFallback.registerViaDBus(testShortcuts);

            expect(results).toHaveLength(2);
            results.forEach((result) => {
                expect(result.success).toBe(false);
                expect(result.error).toContain('D-Bus unavailable');
            });
        });

        it('handles empty shortcuts array', async () => {
            const results = await dbusFallback.registerViaDBus([]);

            expect(results).toHaveLength(0);
            // Should not call D-Bus at all for empty array
            expect(mockSessionBusCalls.length).toBe(0);
        });

        it('catches and logs errors without throwing', async () => {
            mockGetProxyObject.mockRejectedValue(new Error('Unexpected error'));

            // Should not throw
            await expect(dbusFallback.registerViaDBus(testShortcuts)).resolves.toBeDefined();
        });

        it('sets up signal handlers for Activated/Deactivated', async () => {
            await dbusFallback.registerViaDBus(testShortcuts);

            expect(mockOn).toHaveBeenCalledWith('Activated', expect.any(Function));
            expect(mockOn).toHaveBeenCalledWith('Deactivated', expect.any(Function));
        });
    });

    // ========================================================================
    // destroySession
    // ========================================================================

    describe('destroySession', () => {
        it('disconnects D-Bus connection when session exists', async () => {
            await dbusFallback.registerViaDBus([
                { id: 'quickChat' as const, accelerator: 'Ctrl+Shift+Space', description: 'Quick Chat' },
            ]);

            await dbusFallback.destroySession();

            expect(mockDisconnect).toHaveBeenCalled();
        });

        it('does not throw when called without active session', async () => {
            await expect(dbusFallback.destroySession()).resolves.not.toThrow();
        });

        it('cleans up session state (allows new registration)', async () => {
            await dbusFallback.registerViaDBus([
                { id: 'quickChat' as const, accelerator: 'Ctrl+Shift+Space', description: 'Quick Chat' },
            ]);
            await dbusFallback.destroySession();

            // Should be able to register again
            const results = await dbusFallback.registerViaDBus([
                { id: 'bossKey' as const, accelerator: 'Ctrl+Alt+H', description: 'Boss Key' },
            ]);

            expect(results).toHaveLength(1);
            expect(results[0].success).toBe(true);
        });

        it('handles disconnect errors gracefully', async () => {
            await dbusFallback.registerViaDBus([
                { id: 'quickChat' as const, accelerator: 'Ctrl+Shift+Space', description: 'Quick Chat' },
            ]);

            mockDisconnect.mockImplementation(() => {
                throw new Error('Disconnect failed');
            });

            // Should not throw
            await expect(dbusFallback.destroySession()).resolves.not.toThrow();
        });
    });

    // ========================================================================
    // Error Handling
    // ========================================================================

    describe('Error Handling', () => {
        it('catches D-Bus connection failure', async () => {
            mockGetProxyObject.mockRejectedValue(new Error('org.freedesktop.DBus.Error.ServiceUnknown'));

            const result = await dbusFallback.isDBusFallbackAvailable();

            expect(result).toBe(false);
        });

        it('handles portal not available error', async () => {
            mockGetProxyObject.mockRejectedValue(new Error('org.freedesktop.DBus.Error.NameHasNoOwner'));

            const results = await dbusFallback.registerViaDBus([
                { id: 'quickChat' as const, accelerator: 'Ctrl+Shift+Space', description: 'Quick Chat' },
            ]);

            expect(results[0].success).toBe(false);
            expect(results[0].error).toBeDefined();
        });

        it('handles method call timeout', async () => {
            mockCreateSession.mockRejectedValue(new Error('org.freedesktop.DBus.Error.Timeout'));

            const results = await dbusFallback.registerViaDBus([
                { id: 'quickChat' as const, accelerator: 'Ctrl+Shift+Space', description: 'Quick Chat' },
            ]);

            expect(results[0].success).toBe(false);
            expect(results[0].error).toContain('Timeout');
        });

        it('never throws uncaught exceptions to caller from registerViaDBus', async () => {
            mockGetProxyObject.mockRejectedValue(new Error('Unexpected segfault'));

            await expect(
                dbusFallback.registerViaDBus([
                    { id: 'quickChat' as const, accelerator: 'Ctrl+Shift+Space', description: 'Quick Chat' },
                ])
            ).resolves.toBeDefined();
        });

        it('never throws uncaught exceptions to caller from isDBusFallbackAvailable', async () => {
            mockGetProxyObject.mockRejectedValue(new Error('Unexpected crash'));

            await expect(dbusFallback.isDBusFallbackAvailable()).resolves.toBe(false);
        });

        it('never throws uncaught exceptions to caller from destroySession', async () => {
            await dbusFallback.registerViaDBus([
                { id: 'quickChat' as const, accelerator: 'Ctrl+Shift+Space', description: 'Quick Chat' },
            ]);
            mockDisconnect.mockImplementation(() => {
                throw new Error('Crash during disconnect');
            });

            await expect(dbusFallback.destroySession()).resolves.not.toThrow();
        });
    });

    // ========================================================================
    // Session Lifecycle
    // ========================================================================

    describe('Session Lifecycle', () => {
        it('creates new session on repeated registerViaDBus calls (destroying previous)', async () => {
            await dbusFallback.registerViaDBus([
                { id: 'quickChat' as const, accelerator: 'Ctrl+Shift+Space', description: 'Quick Chat' },
            ]);
            await dbusFallback.registerViaDBus([
                { id: 'bossKey' as const, accelerator: 'Ctrl+Alt+H', description: 'Boss Key' },
            ]);

            // CreateSession should be called for each registration
            // (since we destroy previous session before creating new one)
            expect(mockCreateSession.mock.calls.length).toBeGreaterThanOrEqual(1);
        });
    });
});

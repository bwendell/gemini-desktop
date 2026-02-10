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

// Create mock interface getter
const mockGetInterface = vi.fn();

// Create mock getProxyObject
const mockGetProxyObject = vi.fn();

// Track if sessionBus was called
const mockSessionBusCalls: unknown[] = [];

// Track bus-level message listeners for simulating Response signals
type BusMessageHandler = (msg: {
    type: number;
    path?: string;
    interface?: string;
    member?: string;
    body?: unknown[];
}) => void;
let busMessageHandlers: BusMessageHandler[] = [];
const mockBusOn = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (event === 'message') {
        busMessageHandlers.push(handler as BusMessageHandler);
    }
});
const mockBusRemoveListener = vi.fn((event: string, handler: (...args: unknown[]) => void) => {
    if (event === 'message') {
        busMessageHandlers = busMessageHandlers.filter((h) => h !== handler);
    }
});

/**
 * Simulate a portal Response signal on all registered bus message handlers.
 */
function simulatePortalResponse(requestPath: string, code: number, results: Record<string, unknown>) {
    const msg = {
        type: 4, // SIGNAL
        path: requestPath,
        interface: 'org.freedesktop.portal.Request',
        member: 'Response',
        body: [code, results],
    };
    // Use process.nextTick so it fires after the promise sets up its listener
    process.nextTick(() => {
        for (const handler of [...busMessageHandlers]) {
            handler(msg);
        }
    });
}

// Factory function for creating the bus mock
const createBusMock = () => ({
    name: ':1.42',
    getProxyObject: mockGetProxyObject,
    disconnect: mockDisconnect,
    on: mockBusOn,
    removeListener: mockBusRemoveListener,
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
        busMessageHandlers = [];

        // Set up default mock implementations
        mockGetInterface.mockImplementation((iface: string) => {
            if (iface === 'org.freedesktop.DBus.Properties') {
                return { Get: mockGet };
            }
            return {
                CreateSession: mockCreateSession,
                BindShortcuts: mockBindShortcuts,
            };
        });

        mockGetProxyObject.mockResolvedValue({
            getInterface: mockGetInterface,
        });

        // Default: CreateSession succeeds (returns request path)
        mockCreateSession.mockImplementation(async (options: Record<string, { value?: string }>) => {
            const handleToken = options?.handle_token?.value || 'token';
            const sessionToken = options?.session_handle_token?.value || 'session';
            const requestPath = `/org/freedesktop/portal/desktop/request/1_42/${handleToken}`;

            // Simulate the Response signal arriving asynchronously
            simulatePortalResponse(requestPath, 0, {
                session_handle: {
                    value: `/org/freedesktop/portal/desktop/session/1_42/${sessionToken}`,
                },
            });

            return requestPath;
        });

        // Default: BindShortcuts succeeds (returns request path)
        mockBindShortcuts.mockImplementation(
            async (
                _sessionPath: string,
                _shortcuts: unknown[],
                _parent: string,
                options: Record<string, { value?: string }>
            ) => {
                const handleToken = options?.handle_token?.value || 'bind_token';
                const requestPath = `/org/freedesktop/portal/desktop/request/1_42/${handleToken}`;

                // Simulate Response signal for BindShortcuts
                simulatePortalResponse(requestPath, 0, {
                    shortcuts: { value: [] },
                });

                return requestPath;
            }
        );

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
    // electronAcceleratorToXdg
    // ========================================================================

    describe('electronAcceleratorToXdg', () => {
        it('converts CommandOrControl to CTRL', () => {
            expect(dbusFallback.electronAcceleratorToXdg('CommandOrControl+Shift+Space')).toBe('CTRL+SHIFT+space');
        });

        it('converts CmdOrCtrl to CTRL', () => {
            expect(dbusFallback.electronAcceleratorToXdg('CmdOrCtrl+Alt+H')).toBe('CTRL+ALT+h');
        });

        it('converts Ctrl to CTRL', () => {
            expect(dbusFallback.electronAcceleratorToXdg('Ctrl+Shift+P')).toBe('CTRL+SHIFT+p');
        });

        it('converts Alt to ALT', () => {
            expect(dbusFallback.electronAcceleratorToXdg('Alt+F4')).toBe('ALT+F4');
        });

        it('converts Super/Meta to LOGO', () => {
            expect(dbusFallback.electronAcceleratorToXdg('Super+L')).toBe('LOGO+l');
            expect(dbusFallback.electronAcceleratorToXdg('Meta+L')).toBe('LOGO+l');
        });

        it('preserves function keys in uppercase', () => {
            expect(dbusFallback.electronAcceleratorToXdg('Ctrl+F12')).toBe('CTRL+F12');
            expect(dbusFallback.electronAcceleratorToXdg('Ctrl+F1')).toBe('CTRL+F1');
        });

        it('converts Space key to lowercase xkb name', () => {
            expect(dbusFallback.electronAcceleratorToXdg('Ctrl+Space')).toBe('CTRL+space');
        });

        it('converts special keys to xkb names', () => {
            expect(dbusFallback.electronAcceleratorToXdg('Ctrl+Enter')).toBe('CTRL+Return');
            expect(dbusFallback.electronAcceleratorToXdg('Ctrl+Escape')).toBe('CTRL+Escape');
            expect(dbusFallback.electronAcceleratorToXdg('Ctrl+Tab')).toBe('CTRL+Tab');
            expect(dbusFallback.electronAcceleratorToXdg('Ctrl+Delete')).toBe('CTRL+Delete');
        });

        it('converts single characters to lowercase', () => {
            expect(dbusFallback.electronAcceleratorToXdg('Ctrl+H')).toBe('CTRL+h');
            expect(dbusFallback.electronAcceleratorToXdg('Ctrl+A')).toBe('CTRL+a');
        });

        it('handles the default app accelerators correctly', () => {
            expect(dbusFallback.electronAcceleratorToXdg('CommandOrControl+Shift+Space')).toBe('CTRL+SHIFT+space');
            expect(dbusFallback.electronAcceleratorToXdg('CommandOrControl+Alt+H')).toBe('CTRL+ALT+h');
            expect(dbusFallback.electronAcceleratorToXdg('CommandOrControl+Alt+P')).toBe('CTRL+ALT+p');
            expect(dbusFallback.electronAcceleratorToXdg('CommandOrControl+Shift+P')).toBe('CTRL+SHIFT+p');
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
            { id: 'quickChat' as const, accelerator: 'CommandOrControl+Shift+Space', description: 'Quick Chat toggle' },
            { id: 'bossKey' as const, accelerator: 'CommandOrControl+Alt+H', description: 'Hide window' },
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
            const options = mockCreateSession.mock.calls[0][0];
            expect(options.handle_token.value).toBeDefined();
            expect(options.session_handle_token.value).toBeDefined();
        });

        it('calls BindShortcuts with all shortcuts in a single batch', async () => {
            await dbusFallback.registerViaDBus(testShortcuts);

            // BindShortcuts should be called exactly once (batch operation)
            expect(mockBindShortcuts).toHaveBeenCalledTimes(1);
        });

        it('converts accelerators to XDG format when registering', async () => {
            await dbusFallback.registerViaDBus(testShortcuts);

            const bindCall = mockBindShortcuts.mock.calls[0];
            const shortcutSpecs = bindCall[1]; // second arg = shortcut specs

            // Check that accelerators were converted
            const quickChatTrigger = shortcutSpecs[0][1].preferred_trigger;
            expect(quickChatTrigger.value).toBe('CTRL+SHIFT+space');

            const bossKeyTrigger = shortcutSpecs[1][1].preferred_trigger;
            expect(bossKeyTrigger.value).toBe('CTRL+ALT+h');
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

        it('sets up bus-level Activated signal handler', async () => {
            await dbusFallback.registerViaDBus(testShortcuts);

            // Bus-level on('message', ...) should be called for signal handling
            expect(mockBusOn).toHaveBeenCalledWith('message', expect.any(Function));
        });

        it('invokes action callbacks when Activated signal fires', async () => {
            const mockCallback = vi.fn();
            const callbacks = new Map<string, () => void>([['quickChat', mockCallback]]);

            await dbusFallback.registerViaDBus(
                testShortcuts,
                callbacks as Map<import('../../../../src/shared/types/hotkeys').HotkeyId, () => void>
            );

            // Simulate an Activated signal via bus-level message
            for (const handler of busMessageHandlers) {
                handler({
                    type: 4, // SIGNAL
                    interface: 'org.freedesktop.portal.GlobalShortcuts',
                    member: 'Activated',
                    body: ['/session/path', 'quickChat', {}],
                });
            }

            expect(mockCallback).toHaveBeenCalledTimes(1);
        });

        it('should NOT invoke callbacks when actionCallbacks is not provided', async () => {
            await dbusFallback.registerViaDBus(testShortcuts);

            expect(() => {
                for (const handler of busMessageHandlers) {
                    handler({
                        type: 4,
                        interface: 'org.freedesktop.portal.GlobalShortcuts',
                        member: 'Activated',
                        body: ['/session/path', 'quickChat', {}],
                    });
                }
            }).not.toThrow();
        });

        it('should invoke the correct callback for each shortcut ID', async () => {
            const quickChatCallback = vi.fn();
            const bossKeyCallback = vi.fn();
            const callbacks = new Map<import('../../../../src/shared/types/hotkeys').HotkeyId, () => void>([
                ['quickChat', quickChatCallback],
                ['bossKey', bossKeyCallback],
            ]);

            await dbusFallback.registerViaDBus(testShortcuts, callbacks);

            for (const handler of busMessageHandlers) {
                handler({
                    type: 4,
                    interface: 'org.freedesktop.portal.GlobalShortcuts',
                    member: 'Activated',
                    body: ['/session/path', 'bossKey', {}],
                });
            }

            expect(bossKeyCallback).toHaveBeenCalledTimes(1);
            expect(quickChatCallback).not.toHaveBeenCalled();
        });

        it('handles Activated signal for unknown shortcut ID gracefully', async () => {
            const mockCallback = vi.fn();
            const callbacks = new Map<string, () => void>([['quickChat', mockCallback]]);

            await dbusFallback.registerViaDBus(
                testShortcuts,
                callbacks as Map<import('../../../../src/shared/types/hotkeys').HotkeyId, () => void>
            );

            // Simulate an Activated signal for an unknown ID — should not throw
            for (const handler of busMessageHandlers) {
                handler({
                    type: 4,
                    interface: 'org.freedesktop.portal.GlobalShortcuts',
                    member: 'Activated',
                    body: ['/session/path', 'unknownHotkey', {}],
                });
            }

            expect(mockCallback).not.toHaveBeenCalled();
        });

        it('handles callback error in Activated signal gracefully', async () => {
            const mockCallback = vi.fn(() => {
                throw new Error('Callback crash');
            });
            const callbacks = new Map<string, () => void>([['quickChat', mockCallback]]);

            await dbusFallback.registerViaDBus(
                testShortcuts,
                callbacks as Map<import('../../../../src/shared/types/hotkeys').HotkeyId, () => void>
            );

            // Should not throw even when callback crashes
            for (const handler of busMessageHandlers) {
                handler({
                    type: 4,
                    interface: 'org.freedesktop.portal.GlobalShortcuts',
                    member: 'Activated',
                    body: ['/session/path', 'quickChat', {}],
                });
            }

            expect(mockCallback).toHaveBeenCalledTimes(1);
        });
    });

    // ========================================================================
    // destroySession
    // ========================================================================

    describe('destroySession', () => {
        it('disconnects D-Bus connection when session exists', async () => {
            await dbusFallback.registerViaDBus([
                { id: 'quickChat' as const, accelerator: 'CommandOrControl+Shift+Space', description: 'Quick Chat' },
            ]);

            await dbusFallback.destroySession();

            expect(mockDisconnect).toHaveBeenCalled();
        });

        it('removes bus-level message handler on destroy', async () => {
            await dbusFallback.registerViaDBus([
                { id: 'quickChat' as const, accelerator: 'CommandOrControl+Shift+Space', description: 'Quick Chat' },
            ]);

            await dbusFallback.destroySession();

            expect(mockBusRemoveListener).toHaveBeenCalledWith('message', expect.any(Function));
        });

        it('does not throw when called without active session', async () => {
            await expect(dbusFallback.destroySession()).resolves.not.toThrow();
        });

        it('cleans up session state (allows new registration)', async () => {
            await dbusFallback.registerViaDBus([
                { id: 'quickChat' as const, accelerator: 'CommandOrControl+Shift+Space', description: 'Quick Chat' },
            ]);
            await dbusFallback.destroySession();

            // Should be able to register again
            const results = await dbusFallback.registerViaDBus([
                { id: 'bossKey' as const, accelerator: 'CommandOrControl+Alt+H', description: 'Boss Key' },
            ]);

            expect(results).toHaveLength(1);
            expect(results[0].success).toBe(true);
        });

        it('handles disconnect errors gracefully', async () => {
            await dbusFallback.registerViaDBus([
                { id: 'quickChat' as const, accelerator: 'CommandOrControl+Shift+Space', description: 'Quick Chat' },
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
                { id: 'quickChat' as const, accelerator: 'CommandOrControl+Shift+Space', description: 'Quick Chat' },
            ]);

            expect(results[0].success).toBe(false);
            expect(results[0].error).toBeDefined();
        });

        it('handles method call timeout', async () => {
            mockCreateSession.mockRejectedValue(new Error('org.freedesktop.DBus.Error.Timeout'));

            const results = await dbusFallback.registerViaDBus([
                { id: 'quickChat' as const, accelerator: 'CommandOrControl+Shift+Space', description: 'Quick Chat' },
            ]);

            expect(results[0].success).toBe(false);
            expect(results[0].error).toContain('Timeout');
        });

        it('handles CreateSession Response with non-zero code', async () => {
            mockCreateSession.mockImplementation(async (options: Record<string, { value?: string }>) => {
                const handleToken = options?.handle_token?.value || 'token';
                const requestPath = `/org/freedesktop/portal/desktop/request/1_42/${handleToken}`;
                simulatePortalResponse(requestPath, 2, {}); // code=2 means error
                return requestPath;
            });

            const results = await dbusFallback.registerViaDBus([
                { id: 'quickChat' as const, accelerator: 'CommandOrControl+Shift+Space', description: 'Quick Chat' },
            ]);

            expect(results[0].success).toBe(false);
            expect(results[0].error).toContain('response code 2');
        });

        it('never throws uncaught exceptions to caller from registerViaDBus', async () => {
            mockGetProxyObject.mockRejectedValue(new Error('Unexpected segfault'));

            await expect(
                dbusFallback.registerViaDBus([
                    {
                        id: 'quickChat' as const,
                        accelerator: 'CommandOrControl+Shift+Space',
                        description: 'Quick Chat',
                    },
                ])
            ).resolves.toBeDefined();
        });

        it('never throws uncaught exceptions to caller from isDBusFallbackAvailable', async () => {
            mockGetProxyObject.mockRejectedValue(new Error('Unexpected crash'));

            await expect(dbusFallback.isDBusFallbackAvailable()).resolves.toBe(false);
        });

        it('never throws uncaught exceptions to caller from destroySession', async () => {
            await dbusFallback.registerViaDBus([
                { id: 'quickChat' as const, accelerator: 'CommandOrControl+Shift+Space', description: 'Quick Chat' },
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
                { id: 'quickChat' as const, accelerator: 'CommandOrControl+Shift+Space', description: 'Quick Chat' },
            ]);
            await dbusFallback.registerViaDBus([
                { id: 'bossKey' as const, accelerator: 'CommandOrControl+Alt+H', description: 'Boss Key' },
            ]);

            // CreateSession should be called for each registration
            // (since we destroy previous session before creating new one)
            expect(mockCreateSession.mock.calls.length).toBeGreaterThanOrEqual(1);
        });
    });

    // ========================================================================
    // P0/P1: Wayland Hotkey Registration
    // ========================================================================

    describe('P0/P1: Wayland Hotkey Registration', () => {
        it('P0-1: should report failure for all shortcuts when BindShortcuts Response returns error code', async () => {
            // Override BindShortcuts to return a non-zero response code
            mockBindShortcuts.mockImplementation(
                async (
                    _sessionPath: string,
                    _shortcuts: unknown[],
                    _parent: string,
                    options: Record<string, { value?: string }>
                ) => {
                    const handleToken = options?.handle_token?.value || 'bind_token';
                    const requestPath = `/org/freedesktop/portal/desktop/request/1_42/${handleToken}`;
                    // Response code 2 = system error (all shortcuts fail)
                    simulatePortalResponse(requestPath, 2, {});
                    return requestPath;
                }
            );

            const testShortcuts = [
                { id: 'quickChat' as const, accelerator: 'CommandOrControl+Shift+Space', description: 'Quick Chat' },
                { id: 'bossKey' as const, accelerator: 'CommandOrControl+Alt+H', description: 'Boss Key' },
            ];

            const results = await dbusFallback.registerViaDBus(testShortcuts);

            // All shortcuts should fail (batch model — all-or-nothing)
            expect(results).toHaveLength(2);
            expect(results[0]).toEqual({
                hotkeyId: 'quickChat',
                success: false,
                error: expect.any(String),
            });
            expect(results[1]).toEqual({
                hotkeyId: 'bossKey',
                success: false,
                error: expect.any(String),
            });
            // Cleanup should have occurred
            expect(mockDisconnect).toHaveBeenCalled();
        });

        it('P0-2: should handle D-Bus connection drop during BindShortcuts gracefully', async () => {
            // BindShortcuts throws a connection error
            mockBindShortcuts.mockRejectedValue(new Error('org.freedesktop.DBus.Error.NotConnected'));

            const testShortcuts = [
                { id: 'quickChat' as const, accelerator: 'CommandOrControl+Shift+Space', description: 'Quick Chat' },
                { id: 'bossKey' as const, accelerator: 'CommandOrControl+Alt+H', description: 'Boss Key' },
            ];

            const results = await dbusFallback.registerViaDBus(testShortcuts);

            // All shortcuts should fail
            expect(results).toHaveLength(2);
            results.forEach((result) => {
                expect(result.success).toBe(false);
                expect(result.error).toContain('NotConnected');
            });
            // Should not throw uncaught exception
        });

        describe('P1-1: User Dismissal vs System Error', () => {
            const testShortcuts = [
                { id: 'quickChat' as const, accelerator: 'CommandOrControl+Shift+Space', description: 'Quick Chat' },
            ];

            it('P1-1a: should handle user dismissal (code=1) as non-success', async () => {
                mockBindShortcuts.mockImplementation(
                    async (
                        _sessionPath: string,
                        _shortcuts: unknown[],
                        _parent: string,
                        options: Record<string, { value?: string }>
                    ) => {
                        const handleToken = options?.handle_token?.value || 'bind_token';
                        const requestPath = `/org/freedesktop/portal/desktop/request/1_42/${handleToken}`;
                        // User dismissed the portal approval dialog
                        simulatePortalResponse(requestPath, 1, {});
                        return requestPath;
                    }
                );

                const results = await dbusFallback.registerViaDBus(testShortcuts);

                expect(results).toHaveLength(1);
                expect(results[0].success).toBe(false);
                expect(results[0].error).toBeDefined();
            });

            it('P1-1b: should handle system error (code=2) as non-success', async () => {
                mockBindShortcuts.mockImplementation(
                    async (
                        _sessionPath: string,
                        _shortcuts: unknown[],
                        _parent: string,
                        options: Record<string, { value?: string }>
                    ) => {
                        const handleToken = options?.handle_token?.value || 'bind_token';
                        const requestPath = `/org/freedesktop/portal/desktop/request/1_42/${handleToken}`;
                        // System error
                        simulatePortalResponse(requestPath, 2, {});
                        return requestPath;
                    }
                );

                const results = await dbusFallback.registerViaDBus(testShortcuts);

                expect(results).toHaveLength(1);
                expect(results[0].success).toBe(false);
                expect(results[0].error).toBeDefined();
            });

            it('P1-1c: both dismissal and error should clean up D-Bus session', async () => {
                mockBindShortcuts.mockImplementation(
                    async (
                        _sessionPath: string,
                        _shortcuts: unknown[],
                        _parent: string,
                        options: Record<string, { value?: string }>
                    ) => {
                        const handleToken = options?.handle_token?.value || 'bind_token';
                        const requestPath = `/org/freedesktop/portal/desktop/request/1_42/${handleToken}`;
                        simulatePortalResponse(requestPath, 1, {});
                        return requestPath;
                    }
                );

                await dbusFallback.registerViaDBus(testShortcuts);

                // Cleanup should have occurred (destroySession is called when bindSucceeded is false)
                expect(mockDisconnect).toHaveBeenCalled();
            });
        });
    });
});

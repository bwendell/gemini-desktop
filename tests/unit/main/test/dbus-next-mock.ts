/**
 * Mock for dbus-next module.
 *
 * Provides stub implementation for D-Bus session bus and portal interfaces
 * used by dbusFallback.ts for Wayland global shortcuts.
 */

import { vi } from 'vitest';

// Mock D-Bus connection
const mockConnection = {
    getProxyObject: vi.fn().mockResolvedValue({
        getInterface: vi.fn().mockReturnValue({
            CreateSession: vi.fn().mockResolvedValue({ session_handle: '/test/session' }),
            BindShortcuts: vi.fn().mockResolvedValue(undefined),
            Get: vi.fn().mockResolvedValue(['org.freedesktop.portal.GlobalShortcuts']),
            on: vi.fn(),
        }),
    }),
    disconnect: vi.fn(),
};

// Mock Variant class
class MockVariant {
    type: string;
    value: unknown;
    constructor(type: string, value: unknown) {
        this.type = type;
        this.value = value;
    }
}

// Export mocked dbus-next module
export const sessionBus = vi.fn(() => mockConnection);
export const Variant = MockVariant;
export default {
    sessionBus,
    Variant,
};

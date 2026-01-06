/**
 * Unit tests for useMenuDefinitions hook.
 * Covers tasks 9.2.1 through 9.2.3 - zoom menu item tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMenuDefinitions, MenuItem } from '../../../../src/renderer/components/titlebar/useMenuDefinitions';

// Define electronAPI mock type
interface MockElectronAPI {
    getAlwaysOnTop: ReturnType<typeof vi.fn>;
    onAlwaysOnTopChanged: ReturnType<typeof vi.fn>;
    getHotkeyAccelerators: ReturnType<typeof vi.fn>;
    onHotkeyAcceleratorsChanged: ReturnType<typeof vi.fn>;
    getZoomLevel: ReturnType<typeof vi.fn>;
    onZoomLevelChanged: ReturnType<typeof vi.fn>;
    zoomIn: ReturnType<typeof vi.fn>;
    zoomOut: ReturnType<typeof vi.fn>;
}

// Mock electronAPI
const mockElectronAPI: MockElectronAPI = {
    getAlwaysOnTop: vi.fn(),
    onAlwaysOnTopChanged: vi.fn(),
    getHotkeyAccelerators: vi.fn(),
    onHotkeyAcceleratorsChanged: vi.fn(),
    getZoomLevel: vi.fn(),
    onZoomLevelChanged: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
};

// Helper to check if a menu item is a separator
function isSeparator(item: MenuItem): item is { separator: true } {
    return 'separator' in item && item.separator === true;
}

// Helper to find a menu item by ID
function findMenuItemById(menus: ReturnType<typeof useMenuDefinitions>, id: string): MenuItem | undefined {
    for (const menu of menus) {
        for (const item of menu.items) {
            if (!isSeparator(item) && item.id === id) {
                return item;
            }
        }
    }
    return undefined;
}

// Helper to get the View menu
function getViewMenu(menus: ReturnType<typeof useMenuDefinitions>) {
    return menus.find((menu) => menu.label === 'View');
}

describe('useMenuDefinitions', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup default mock implementations
        mockElectronAPI.getAlwaysOnTop.mockResolvedValue({ enabled: false });
        mockElectronAPI.onAlwaysOnTopChanged.mockReturnValue(() => {});
        mockElectronAPI.getHotkeyAccelerators.mockResolvedValue({});
        mockElectronAPI.onHotkeyAcceleratorsChanged.mockReturnValue(() => {});
        mockElectronAPI.getZoomLevel.mockResolvedValue(100);
        mockElectronAPI.onZoomLevelChanged.mockReturnValue(() => {});
        mockElectronAPI.zoomIn.mockResolvedValue(undefined);
        mockElectronAPI.zoomOut.mockResolvedValue(undefined);

        // Set up window.electronAPI
        Object.defineProperty(window, 'electronAPI', {
            value: mockElectronAPI,
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        // Clean up window.electronAPI
        delete (window as unknown as { electronAPI?: MockElectronAPI }).electronAPI;
    });

    describe('9.2.1 - Zoom menu items are present in View menu', () => {
        it('includes Zoom In item with correct ID in View menu', async () => {
            const { result } = renderHook(() => useMenuDefinitions());

            // Wait for effects to complete
            await act(async () => {});

            const zoomInItem = findMenuItemById(result.current, 'menu-view-zoom-in');
            expect(zoomInItem).toBeDefined();
            expect(isSeparator(zoomInItem!)).toBe(false);
        });

        it('includes Zoom Out item with correct ID in View menu', async () => {
            const { result } = renderHook(() => useMenuDefinitions());

            // Wait for effects to complete
            await act(async () => {});

            const zoomOutItem = findMenuItemById(result.current, 'menu-view-zoom-out');
            expect(zoomOutItem).toBeDefined();
            expect(isSeparator(zoomOutItem!)).toBe(false);
        });

        it('places zoom items in the View menu', async () => {
            const { result } = renderHook(() => useMenuDefinitions());

            // Wait for effects to complete
            await act(async () => {});

            const viewMenu = getViewMenu(result.current);
            expect(viewMenu).toBeDefined();

            const viewMenuItems = viewMenu!.items.filter((item) => !isSeparator(item));
            const zoomInItem = viewMenuItems.find((item) => !isSeparator(item) && item.id === 'menu-view-zoom-in');
            const zoomOutItem = viewMenuItems.find((item) => !isSeparator(item) && item.id === 'menu-view-zoom-out');

            expect(zoomInItem).toBeDefined();
            expect(zoomOutItem).toBeDefined();
        });
    });

    describe('9.2.2 - Zoom menu items have correct shortcuts', () => {
        it('Zoom In has Ctrl+= shortcut', async () => {
            const { result } = renderHook(() => useMenuDefinitions());

            // Wait for effects to complete
            await act(async () => {});

            const zoomInItem = findMenuItemById(result.current, 'menu-view-zoom-in');
            expect(zoomInItem).toBeDefined();

            if (!isSeparator(zoomInItem!)) {
                expect(zoomInItem!.shortcut).toBe('Ctrl+=');
            }
        });

        it('Zoom Out has Ctrl+- shortcut', async () => {
            const { result } = renderHook(() => useMenuDefinitions());

            // Wait for effects to complete
            await act(async () => {});

            const zoomOutItem = findMenuItemById(result.current, 'menu-view-zoom-out');
            expect(zoomOutItem).toBeDefined();

            if (!isSeparator(zoomOutItem!)) {
                expect(zoomOutItem!.shortcut).toBe('Ctrl+-');
            }
        });
    });

    describe('9.2.3 - Zoom menu items display current zoom percentage', () => {
        it('Zoom In label includes (100%) when at default zoom', async () => {
            mockElectronAPI.getZoomLevel.mockResolvedValue(100);

            const { result } = renderHook(() => useMenuDefinitions());

            // Wait for the async getZoomLevel to resolve
            await waitFor(() => {
                const zoomInItem = findMenuItemById(result.current, 'menu-view-zoom-in');
                if (!isSeparator(zoomInItem!)) {
                    expect(zoomInItem!.label).toContain('(100%)');
                }
            });
        });

        it('Zoom Out label includes (100%) when at default zoom', async () => {
            mockElectronAPI.getZoomLevel.mockResolvedValue(100);

            const { result } = renderHook(() => useMenuDefinitions());

            // Wait for the async getZoomLevel to resolve
            await waitFor(() => {
                const zoomOutItem = findMenuItemById(result.current, 'menu-view-zoom-out');
                if (!isSeparator(zoomOutItem!)) {
                    expect(zoomOutItem!.label).toContain('(100%)');
                }
            });
        });

        it('zoom labels update when zoom level changes to 150%', async () => {
            mockElectronAPI.getZoomLevel.mockResolvedValue(150);

            const { result } = renderHook(() => useMenuDefinitions());

            // Wait for the async getZoomLevel to resolve
            await waitFor(() => {
                const zoomInItem = findMenuItemById(result.current, 'menu-view-zoom-in');
                if (!isSeparator(zoomInItem!)) {
                    expect(zoomInItem!.label).toContain('(150%)');
                }
            });

            await waitFor(() => {
                const zoomOutItem = findMenuItemById(result.current, 'menu-view-zoom-out');
                if (!isSeparator(zoomOutItem!)) {
                    expect(zoomOutItem!.label).toContain('(150%)');
                }
            });
        });

        it('zoom labels update dynamically via onZoomLevelChanged', async () => {
            mockElectronAPI.getZoomLevel.mockResolvedValue(100);

            // Capture the callback registered with onZoomLevelChanged
            let zoomChangedCallback: ((level: number) => void) | null = null;
            mockElectronAPI.onZoomLevelChanged.mockImplementation((callback) => {
                zoomChangedCallback = callback;
                return () => {};
            });

            const { result } = renderHook(() => useMenuDefinitions());

            // Wait for initial state
            await waitFor(() => {
                const zoomInItem = findMenuItemById(result.current, 'menu-view-zoom-in');
                if (!isSeparator(zoomInItem!)) {
                    expect(zoomInItem!.label).toContain('(100%)');
                }
            });

            // Simulate zoom level change from main process
            await act(async () => {
                if (zoomChangedCallback) {
                    zoomChangedCallback(125);
                }
            });

            // Verify labels updated
            await waitFor(() => {
                const zoomInItem = findMenuItemById(result.current, 'menu-view-zoom-in');
                if (!isSeparator(zoomInItem!)) {
                    expect(zoomInItem!.label).toContain('(125%)');
                }
            });

            await waitFor(() => {
                const zoomOutItem = findMenuItemById(result.current, 'menu-view-zoom-out');
                if (!isSeparator(zoomOutItem!)) {
                    expect(zoomOutItem!.label).toContain('(125%)');
                }
            });
        });
    });

    describe('Zoom menu item actions', () => {
        it('Zoom In action calls window.electronAPI.zoomIn()', async () => {
            const { result } = renderHook(() => useMenuDefinitions());

            // Wait for effects to complete
            await act(async () => {});

            const zoomInItem = findMenuItemById(result.current, 'menu-view-zoom-in');
            expect(zoomInItem).toBeDefined();

            if (!isSeparator(zoomInItem!) && zoomInItem!.action) {
                await act(async () => {
                    zoomInItem!.action!();
                });

                expect(mockElectronAPI.zoomIn).toHaveBeenCalledTimes(1);
            }
        });

        it('Zoom Out action calls window.electronAPI.zoomOut()', async () => {
            const { result } = renderHook(() => useMenuDefinitions());

            // Wait for effects to complete
            await act(async () => {});

            const zoomOutItem = findMenuItemById(result.current, 'menu-view-zoom-out');
            expect(zoomOutItem).toBeDefined();

            if (!isSeparator(zoomOutItem!) && zoomOutItem!.action) {
                await act(async () => {
                    zoomOutItem!.action!();
                });

                expect(mockElectronAPI.zoomOut).toHaveBeenCalledTimes(1);
            }
        });
    });
});

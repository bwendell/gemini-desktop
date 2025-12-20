/**
 * Unit tests for MainLayout component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MainLayout } from './MainLayout';
import { ZenModeProvider } from '../../context/ZenModeContext';

/** Helper to render MainLayout wrapped in required providers */
function renderMainLayout(children?: React.ReactNode) {
    return render(
        <ZenModeProvider>
            <MainLayout>{children}</MainLayout>
        </ZenModeProvider>
    );
}

describe('MainLayout', () => {
    /** Store original electronAPI for restoration after tests */
    let originalElectronAPI: typeof window.electronAPI;

    beforeEach(() => {
        vi.clearAllMocks();
        originalElectronAPI = window.electronAPI;
        // Default mock: Zen Mode disabled, not macOS
        window.electronAPI = {
            ...window.electronAPI,
            platform: 'win32',
            getZenMode: vi.fn().mockResolvedValue({ enabled: false }),
            onZenModeChanged: vi.fn().mockReturnValue(() => { }),
        } as any;
    });

    afterEach(() => {
        window.electronAPI = originalElectronAPI;
    });

    describe('structure', () => {
        it('renders main-layout container', async () => {
            renderMainLayout();

            await waitFor(() => {
                const layout = document.querySelector('.main-layout');
                expect(layout).toBeInTheDocument();
            });
        });

        it('renders Titlebar component when Zen Mode is disabled', async () => {
            renderMainLayout();

            await waitFor(() => {
                const titlebar = document.querySelector('header.titlebar');
                expect(titlebar).toBeInTheDocument();
            });
        });

        it('renders main content area', async () => {
            renderMainLayout();

            await waitFor(() => {
                const main = document.querySelector('main.main-content');
                expect(main).toBeInTheDocument();
            });
        });
    });

    describe('children', () => {
        it('renders children inside main content area', async () => {
            renderMainLayout(<div data-testid="child">Test Child</div>);

            await waitFor(() => {
                const child = screen.getByTestId('child');
                expect(child).toBeInTheDocument();
                expect(child).toHaveTextContent('Test Child');

                // Verify child is inside main
                const main = document.querySelector('main.main-content');
                expect(main).toContainElement(child);
            });
        });

        it('renders multiple children', async () => {
            renderMainLayout(
                <>
                    <div data-testid="child1">First</div>
                    <div data-testid="child2">Second</div>
                </>
            );

            await waitFor(() => {
                expect(screen.getByTestId('child1')).toBeInTheDocument();
                expect(screen.getByTestId('child2')).toBeInTheDocument();
            });
        });

        it('renders without children', async () => {
            renderMainLayout();

            await waitFor(() => {
                const main = document.querySelector('main.main-content');
                expect(main).toBeInTheDocument();
                expect(main).toBeEmptyDOMElement();
            });
        });
    });

    describe('Zen Mode', () => {
        it('hides Titlebar when Zen Mode is enabled on Windows', async () => {
            window.electronAPI = {
                ...window.electronAPI,
                platform: 'win32',
                getZenMode: vi.fn().mockResolvedValue({ enabled: true }),
                onZenModeChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            renderMainLayout();

            await waitFor(() => {
                const titlebar = document.querySelector('header.titlebar');
                expect(titlebar).not.toBeInTheDocument();
            });
        });

        it('hides Titlebar when Zen Mode is enabled on Linux', async () => {
            window.electronAPI = {
                ...window.electronAPI,
                platform: 'linux',
                getZenMode: vi.fn().mockResolvedValue({ enabled: true }),
                onZenModeChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            renderMainLayout();

            await waitFor(() => {
                const titlebar = document.querySelector('header.titlebar');
                expect(titlebar).not.toBeInTheDocument();
            });
        });

        it('always shows Titlebar on macOS even when Zen Mode is enabled', async () => {
            window.electronAPI = {
                ...window.electronAPI,
                platform: 'darwin',
                getZenMode: vi.fn().mockResolvedValue({ enabled: true }),
                onZenModeChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            renderMainLayout();

            await waitFor(() => {
                const titlebar = document.querySelector('header.titlebar');
                expect(titlebar).toBeInTheDocument();
            });
        });

        it('shows Titlebar when Zen Mode is disabled', async () => {
            window.electronAPI = {
                ...window.electronAPI,
                platform: 'win32',
                getZenMode: vi.fn().mockResolvedValue({ enabled: false }),
                onZenModeChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            renderMainLayout();

            await waitFor(() => {
                const titlebar = document.querySelector('header.titlebar');
                expect(titlebar).toBeInTheDocument();
            });
        });

        it('updates layout when Zen Mode changes externally', async () => {
            let changeCallback: ((data: { enabled: boolean }) => void) | null = null;

            window.electronAPI = {
                ...window.electronAPI,
                platform: 'win32',
                getZenMode: vi.fn().mockResolvedValue({ enabled: false }),
                onZenModeChanged: vi.fn().mockImplementation((cb) => {
                    changeCallback = cb;
                    return () => { };
                }),
            } as any;

            renderMainLayout();

            // Initially titlebar should be visible
            await waitFor(() => {
                const titlebar = document.querySelector('header.titlebar');
                expect(titlebar).toBeInTheDocument();
            });

            // Simulate external Zen Mode toggle
            if (changeCallback) {
                changeCallback({ enabled: true });
            }

            // Now titlebar should be hidden
            await waitFor(() => {
                const titlebar = document.querySelector('header.titlebar');
                expect(titlebar).not.toBeInTheDocument();
            });
        });
    });

    describe('layout order', () => {
        it('renders Titlebar before main content when visible', async () => {
            renderMainLayout(<div>Content</div>);

            await waitFor(() => {
                const layout = document.querySelector('.main-layout');
                const children = layout?.children;

                expect(children?.length).toBe(2);
                expect(children?.[0]).toHaveClass('titlebar');
                expect(children?.[1]).toHaveClass('main-content');
            });
        });

        it('only renders main content when Titlebar is hidden', async () => {
            window.electronAPI = {
                ...window.electronAPI,
                platform: 'win32',
                getZenMode: vi.fn().mockResolvedValue({ enabled: true }),
                onZenModeChanged: vi.fn().mockReturnValue(() => { }),
            } as any;

            renderMainLayout(<div>Content</div>);

            await waitFor(() => {
                const layout = document.querySelector('.main-layout');
                const children = layout?.children;

                expect(children?.length).toBe(1);
                expect(children?.[0]).toHaveClass('main-content');
            });
        });
    });
});


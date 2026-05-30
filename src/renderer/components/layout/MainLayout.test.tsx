import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainLayout } from './MainLayout';

describe('MainLayout', () => {
    describe('structure', () => {
        it('renders main-layout container', () => {
            render(<MainLayout />);

            const layout = document.querySelector('.main-layout');
            expect(layout).toBeInTheDocument();
        });

        it('renders Titlebar component', () => {
            render(<MainLayout />);

            const titlebar = document.querySelector('header.titlebar');
            expect(titlebar).toBeInTheDocument();
        });

        it('renders main content area', () => {
            render(<MainLayout />);

            const main = document.querySelector('main.main-content');
            expect(main).toBeInTheDocument();
        });
    });

    describe('children', () => {
        it('renders children inside main content area', () => {
            render(
                <MainLayout>
                    <div data-testid="child">Test Child</div>
                </MainLayout>
            );

            const child = screen.getByTestId('child');
            expect(child).toBeInTheDocument();
            expect(child).toHaveTextContent('Test Child');

            // Verify child is inside main
            const main = document.querySelector('main.main-content');
            expect(main).toContainElement(child);
        });

        it('renders multiple children', () => {
            render(
                <MainLayout>
                    <div data-testid="child1">First</div>
                    <div data-testid="child2">Second</div>
                </MainLayout>
            );

            expect(screen.getByTestId('child1')).toBeInTheDocument();
            expect(screen.getByTestId('child2')).toBeInTheDocument();
        });

        it('renders without children', () => {
            render(<MainLayout />);

            const main = document.querySelector('main.main-content');
            expect(main).toBeInTheDocument();
            expect(main).toBeEmptyDOMElement();
        });

        it('renders undefined children', () => {
            render(<MainLayout>{undefined}</MainLayout>);

            const main = document.querySelector('main.main-content');
            expect(main).toBeInTheDocument();
        });

        it('renders null children', () => {
            render(<MainLayout>{null}</MainLayout>);

            const main = document.querySelector('main.main-content');
            expect(main).toBeInTheDocument();
        });
    });

    describe('layout order', () => {
        it('renders Titlebar before main content', () => {
            render(
                <MainLayout>
                    <div>Content</div>
                </MainLayout>
            );

            const layout = document.querySelector('.main-layout');
            const children = layout?.children;

            expect(children?.length).toBe(2);
            expect(children?.[0]).toHaveClass('titlebar');
            expect(children?.[1]).toHaveClass('main-content');
        });
    });

    describe('fullscreen mode', () => {
        it('hides Titlebar and tabBar when in fullscreen mode', () => {
            let fullscreenCallback: ((fullscreen: boolean) => void) | undefined;
            const mockUnsubscribe = vi.fn();

            // Mock window.electronAPI
            const originalElectronAPI = (window as any).electronAPI;
            (window as any).electronAPI = {
                ...originalElectronAPI,
                onFullscreenChanged: (cb: (f: boolean) => void) => {
                    fullscreenCallback = cb;
                    return mockUnsubscribe;
                },
            };

            const { rerender } = render(
                <MainLayout tabBar={<div className="test-tabbar">TabBar</div>}>
                    <div>Content</div>
                </MainLayout>
            );

            // Verify they are visible initially
            expect(document.querySelector('header.titlebar')).toBeInTheDocument();
            expect(document.querySelector('.test-tabbar')).toBeInTheDocument();

            // Trigger fullscreen
            if (fullscreenCallback) {
                fullscreenCallback(true);
            }
            rerender(
                <MainLayout tabBar={<div className="test-tabbar">TabBar</div>}>
                    <div>Content</div>
                </MainLayout>
            );

            // Verify they are hidden
            expect(document.querySelector('header.titlebar')).not.toBeInTheDocument();
            expect(document.querySelector('.test-tabbar')).not.toBeInTheDocument();

            // Trigger exit fullscreen
            if (fullscreenCallback) {
                fullscreenCallback(false);
            }
            rerender(
                <MainLayout tabBar={<div className="test-tabbar">TabBar</div>}>
                    <div>Content</div>
                </MainLayout>
            );

            // Verify they are visible again
            expect(document.querySelector('header.titlebar')).toBeInTheDocument();
            expect(document.querySelector('.test-tabbar')).toBeInTheDocument();

            // Clean up window mock
            (window as any).electronAPI = originalElectronAPI;
        });
    });
});

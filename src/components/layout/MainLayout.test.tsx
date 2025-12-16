/**
 * Unit tests for MainLayout component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainLayout } from './MainLayout';

// Mock dependencies for Titlebar
vi.mock('@tauri-apps/plugin-os', () => ({
    type: vi.fn(() => 'windows'),
}));

vi.mock('@tauri-apps/api/window', () => ({
    Window: {
        getCurrent: vi.fn(() => ({
            minimize: vi.fn(),
            maximize: vi.fn(),
            close: vi.fn(),
            isMaximized: vi.fn().mockResolvedValue(false),
            isFullscreen: vi.fn().mockResolvedValue(false),
            setFullscreen: vi.fn(),
        })),
    },
}));

vi.mock('@tauri-apps/plugin-process', () => ({
    exit: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    message: vi.fn(),
}));

vi.mock('@tauri-apps/api/menu', () => ({
    Menu: { new: vi.fn().mockResolvedValue({ popup: vi.fn() }) },
    MenuItem: { new: vi.fn().mockResolvedValue({}) },
    PredefinedMenuItem: { new: vi.fn().mockResolvedValue({}) },
}));

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
            render(<MainLayout><div>Content</div></MainLayout>);

            const layout = document.querySelector('.main-layout');
            const children = layout?.children;

            expect(children?.length).toBe(2);
            expect(children?.[0]).toHaveClass('titlebar');
            expect(children?.[1]).toHaveClass('main-content');
        });
    });
});

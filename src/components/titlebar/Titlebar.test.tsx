/**
 * Unit tests for Titlebar component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Titlebar } from './Titlebar';
import { setMockPlatform } from '../../test/setup';

describe('Titlebar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setMockPlatform('win32');
    });

    describe('default rendering', () => {
        it('renders with default title', () => {
            render(<Titlebar />);

            expect(screen.getByText('Gemini Desktop')).toBeInTheDocument();
        });

        it('renders app icon by default', () => {
            render(<Titlebar />);

            // Check for SVG icon in titlebar-icon div
            const titlebar = document.querySelector('.titlebar');
            const iconDiv = titlebar?.querySelector('.titlebar-icon');
            expect(iconDiv).toBeInTheDocument();
            expect(iconDiv?.querySelector('svg')).toBeInTheDocument();
        });

        it('renders header element with titlebar class', () => {
            render(<Titlebar />);

            const header = document.querySelector('header.titlebar');
            expect(header).toBeInTheDocument();
        });

        it('renders drag region', () => {
            render(<Titlebar />);

            const dragRegion = document.querySelector('.titlebar-drag-region');
            expect(dragRegion).toBeInTheDocument();
        });
    });

    describe('custom configuration', () => {
        it('renders with custom title', () => {
            render(<Titlebar config={{ title: 'Custom Title' }} />);

            expect(screen.getByText('Custom Title')).toBeInTheDocument();
        });

        it('hides icon when showIcon is false', () => {
            render(<Titlebar config={{ showIcon: false }} />);

            const iconDiv = document.querySelector('.titlebar-icon');
            expect(iconDiv).not.toBeInTheDocument();
        });

        it('shows icon when showIcon is true', () => {
            render(<Titlebar config={{ showIcon: true }} />);

            const iconDiv = document.querySelector('.titlebar-icon');
            expect(iconDiv).toBeInTheDocument();
        });

        it('merges partial config with defaults', () => {
            render(<Titlebar config={{ title: 'Only Title' }} />);

            // Title should be custom
            expect(screen.getByText('Only Title')).toBeInTheDocument();
            // Icon should still show (default)
            const iconDiv = document.querySelector('.titlebar-icon');
            expect(iconDiv).toBeInTheDocument();
        });
    });

    describe('child components', () => {
        it('renders TitlebarMenu on Windows', () => {
            setMockPlatform('win32');
            render(<Titlebar />);

            const menuBar = document.querySelector('.titlebar-menu-bar');
            expect(menuBar).toBeInTheDocument();
        });

        it('renders WindowControls on Windows', () => {
            setMockPlatform('win32');
            render(<Titlebar />);

            const controls = document.querySelector('.window-controls');
            expect(controls).toBeInTheDocument();
        });

        it('hides TitlebarMenu on macOS', () => {
            setMockPlatform('darwin');
            render(<Titlebar />);

            const menuBar = document.querySelector('.titlebar-menu-bar');
            expect(menuBar).not.toBeInTheDocument();
        });

        it('hides WindowControls on macOS', () => {
            setMockPlatform('darwin');
            render(<Titlebar />);

            const controls = document.querySelector('.window-controls');
            expect(controls).not.toBeInTheDocument();
        });
    });

    describe('layout structure', () => {
        it('has titlebar-left section', () => {
            render(<Titlebar />);

            const leftSection = document.querySelector('.titlebar-left');
            expect(leftSection).toBeInTheDocument();
        });

        it('title is inside drag region', () => {
            render(<Titlebar />);

            const dragRegion = document.querySelector('.titlebar-drag-region');
            const title = dragRegion?.querySelector('.titlebar-title');
            expect(title).toBeInTheDocument();
            expect(title).toHaveTextContent('Gemini Desktop');
        });
    });

    describe('menu definitions', () => {
        it('passes menu definitions to TitlebarMenu', () => {
            setMockPlatform('win32');
            render(<Titlebar />);

            // Check that default menus are rendered (Edit menu was removed)
            expect(screen.getByText('File')).toBeInTheDocument();
            expect(screen.getByText('View')).toBeInTheDocument();
            expect(screen.getByText('Help')).toBeInTheDocument();
            // Edit menu should not exist
            expect(screen.queryByText('Edit')).not.toBeInTheDocument();
        });
    });
});

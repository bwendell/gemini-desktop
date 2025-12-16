/**
 * Unit tests for OptionsWindowTitlebar component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OptionsWindowTitlebar } from './OptionsWindowTitlebar';

// Mock the useWindowControls hook
const mockMinimize = vi.fn();
const mockMaximize = vi.fn();
const mockClose = vi.fn();

vi.mock('../../hooks/useWindowControls', () => ({
    useWindowControls: () => ({
        minimize: mockMinimize,
        maximize: mockMaximize,
        close: mockClose,
    }),
}));

// Mock the platform utility
let mockUsesCustomWindowControls = true;
vi.mock('../../utils', () => ({
    usesCustomWindowControls: () => mockUsesCustomWindowControls,
}));

describe('OptionsWindowTitlebar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUsesCustomWindowControls = true;
    });

    describe('rendering', () => {
        it('should render the titlebar with default title', () => {
            render(<OptionsWindowTitlebar />);

            expect(screen.getByTestId('options-titlebar')).toBeInTheDocument();
            expect(screen.getByTestId('options-titlebar-title')).toHaveTextContent('Options');
        });

        it('should render with custom title', () => {
            render(<OptionsWindowTitlebar title="Settings" />);

            expect(screen.getByTestId('options-titlebar-title')).toHaveTextContent('Settings');
        });

        it('should render window controls on Windows/Linux', () => {
            mockUsesCustomWindowControls = true;
            render(<OptionsWindowTitlebar />);

            expect(screen.getByTestId('options-window-controls')).toBeInTheDocument();
            expect(screen.getByTestId('options-minimize-button')).toBeInTheDocument();
            expect(screen.getByTestId('options-close-button')).toBeInTheDocument();

            // Maximize button should NOT be present
            expect(screen.queryByTestId('options-maximize-button')).not.toBeInTheDocument();
        });

        it('should NOT render window controls on macOS', () => {
            mockUsesCustomWindowControls = false;
            render(<OptionsWindowTitlebar />);

            expect(screen.queryByTestId('options-window-controls')).not.toBeInTheDocument();
        });

        it('should have a draggable region', () => {
            render(<OptionsWindowTitlebar />);

            const dragRegion = screen.getByTestId('options-titlebar-title').parentElement;
            expect(dragRegion).toHaveClass('options-titlebar-drag-region');
        });
    });

    describe('window controls functionality', () => {
        it('should call minimize when minimize button is clicked', () => {
            render(<OptionsWindowTitlebar />);

            fireEvent.click(screen.getByTestId('options-minimize-button'));
            expect(mockMinimize).toHaveBeenCalledTimes(1);
        });

        it('should call close when close button is clicked', () => {
            render(<OptionsWindowTitlebar />);

            fireEvent.click(screen.getByTestId('options-close-button'));
            expect(mockClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('accessibility', () => {
        it('should have accessible labels on window control buttons', () => {
            render(<OptionsWindowTitlebar />);

            expect(screen.getByLabelText('Minimize window')).toBeInTheDocument();
            expect(screen.getByLabelText('Close window')).toBeInTheDocument();
            expect(screen.queryByLabelText('Maximize window')).not.toBeInTheDocument();
        });

        it('should have title attributes for tooltips', () => {
            render(<OptionsWindowTitlebar />);

            expect(screen.getByTitle('Minimize')).toBeInTheDocument();
            expect(screen.getByTitle('Close')).toBeInTheDocument();
            expect(screen.queryByTitle('Maximize')).not.toBeInTheDocument();
        });
    });

    describe('no menu bar', () => {
        it('should NOT render any menu elements', () => {
            render(<OptionsWindowTitlebar />);

            // Ensure no menu bar is present (unlike main titlebar)
            expect(screen.queryByRole('menubar')).not.toBeInTheDocument();
            expect(screen.queryByTestId('titlebar-menu-bar')).not.toBeInTheDocument();
        });
    });
});

/**
 * Unit tests for Titlebar component.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { Titlebar } from './Titlebar';
import { setMockPlatform, mockElectronAPI } from '../../../../tests/unit/renderer/test/setup';

// Mock the useUpdateToast hook
vi.mock('../../context/UpdateToastContext', () => ({
    useUpdateToast: vi.fn(() => ({
        hasPendingUpdate: false,
        installUpdate: vi.fn(),
    })),
}));

// Import after mocking
import { useUpdateToast } from '../../context/UpdateToastContext';

describe('Titlebar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setMockPlatform('win32');
        // Reset mock to default value
        (useUpdateToast as Mock).mockReturnValue({
            hasPendingUpdate: false,
            installUpdate: vi.fn(),
        });
    });

    // Helper to render with act to suppress async state warnings
    const renderWithAct = async (ui: React.ReactElement) => {
        let result: ReturnType<typeof render>;
        await act(async () => {
            result = render(ui);
        });
        return result!;
    };

    describe('default rendering', () => {
        it('renders with default title', async () => {
            await renderWithAct(<Titlebar />);

            expect(screen.getByText('Gemini Desktop')).toBeInTheDocument();
        });

        it('renders app icon by default', async () => {
            await renderWithAct(<Titlebar />);

            // Check for icon in titlebar-icon div
            const titlebar = document.querySelector('.titlebar');
            const iconDiv = titlebar?.querySelector('.titlebar-icon');
            expect(iconDiv).toBeInTheDocument();
            expect(iconDiv?.querySelector('img')).toBeInTheDocument();
        });

        it('renders header element with titlebar class', async () => {
            await renderWithAct(<Titlebar />);

            const header = document.querySelector('header.titlebar');
            expect(header).toBeInTheDocument();
        });

        it('renders drag region', async () => {
            await renderWithAct(<Titlebar />);

            const dragRegion = document.querySelector('.titlebar-drag-region');
            expect(dragRegion).toBeInTheDocument();
        });
    });

    describe('custom configuration', () => {
        it('renders with custom title', async () => {
            await renderWithAct(<Titlebar config={{ title: 'Custom Title' }} />);

            expect(screen.getByText('Custom Title')).toBeInTheDocument();
        });

        it('hides icon when showIcon is false', async () => {
            await renderWithAct(<Titlebar config={{ showIcon: false }} />);

            const iconDiv = document.querySelector('.titlebar-icon');
            expect(iconDiv).not.toBeInTheDocument();
        });

        it('shows icon when showIcon is true', async () => {
            await renderWithAct(<Titlebar config={{ showIcon: true }} />);

            const iconDiv = document.querySelector('.titlebar-icon');
            expect(iconDiv).toBeInTheDocument();
        });

        it('merges partial config with defaults', async () => {
            await renderWithAct(<Titlebar config={{ title: 'Only Title' }} />);

            // Title should be custom
            expect(screen.getByText('Only Title')).toBeInTheDocument();
            // Icon should still show (default)
            const iconDiv = document.querySelector('.titlebar-icon');
            expect(iconDiv).toBeInTheDocument();
        });
    });

    describe('child components', () => {
        it('renders TitlebarMenu on Windows', async () => {
            setMockPlatform('win32');
            await renderWithAct(<Titlebar />);

            const menuBar = document.querySelector('.titlebar-menu-bar');
            expect(menuBar).toBeInTheDocument();
        });

        it('renders WindowControls on Windows', async () => {
            setMockPlatform('win32');
            await renderWithAct(<Titlebar />);

            const controls = document.querySelector('.window-controls');
            expect(controls).toBeInTheDocument();
        });

        it('hides TitlebarMenu on macOS', async () => {
            setMockPlatform('darwin');
            await renderWithAct(<Titlebar />);

            const menuBar = document.querySelector('.titlebar-menu-bar');
            expect(menuBar).not.toBeInTheDocument();
        });

        it('hides WindowControls on macOS', async () => {
            setMockPlatform('darwin');
            await renderWithAct(<Titlebar />);

            const controls = document.querySelector('.window-controls');
            expect(controls).not.toBeInTheDocument();
        });
    });

    describe('macOS-specific styling', () => {
        it('applies macos class on macOS platform', async () => {
            setMockPlatform('darwin');
            await renderWithAct(<Titlebar />);

            const header = document.querySelector('header.titlebar');
            expect(header).toHaveClass('macos');
        });

        it('does not apply macos class on Windows', async () => {
            setMockPlatform('win32');
            await renderWithAct(<Titlebar />);

            const header = document.querySelector('header.titlebar');
            expect(header).not.toHaveClass('macos');
        });

        it('does not apply macos class on Linux', async () => {
            setMockPlatform('linux');
            await renderWithAct(<Titlebar />);

            const header = document.querySelector('header.titlebar');
            expect(header).not.toHaveClass('macos');
        });
    });

    describe('layout structure', () => {
        it('has titlebar-left section', async () => {
            await renderWithAct(<Titlebar />);

            const leftSection = document.querySelector('.titlebar-left');
            expect(leftSection).toBeInTheDocument();
        });

        it('title is inside drag region', async () => {
            await renderWithAct(<Titlebar />);

            const dragRegion = document.querySelector('.titlebar-drag-region');
            const title = dragRegion?.querySelector('.titlebar-title');
            expect(title).toBeInTheDocument();
            expect(title).toHaveTextContent('Gemini Desktop');
        });
    });

    describe('menu definitions', () => {
        it('passes menu definitions to TitlebarMenu', async () => {
            setMockPlatform('win32');
            await renderWithAct(<Titlebar />);

            // Check that default menus are rendered (Edit menu was removed)
            expect(screen.getByText('File')).toBeInTheDocument();
            expect(screen.getByText('View')).toBeInTheDocument();
            expect(screen.getByText('Help')).toBeInTheDocument();
            // Edit menu should not exist
            expect(screen.queryByText('Edit')).not.toBeInTheDocument();
        });
    });

    describe('update badge', () => {
        it('does not render update badge when no pending update', async () => {
            await renderWithAct(<Titlebar />);

            expect(screen.queryByTestId('update-badge')).not.toBeInTheDocument();
        });

        it('does not crash when UpdateToastContext is not available', async () => {
            // Mock throws to simulate context not available
            (useUpdateToast as Mock).mockImplementation(() => {
                throw new Error('Context not available');
            });

            // The try-catch in Titlebar should handle missing context gracefully
            await renderWithAct(<Titlebar />);

            // Component should render without errors
            expect(screen.getByTestId('titlebar')).toBeInTheDocument();
        });

        it('renders update badge when hasPendingUpdate is true', async () => {
            const mockInstallUpdate = vi.fn();
            (useUpdateToast as Mock).mockReturnValue({
                hasPendingUpdate: true,
                installUpdate: mockInstallUpdate,
            });

            await renderWithAct(<Titlebar />);

            expect(screen.getByTestId('update-badge')).toBeInTheDocument();
        });

        it('calls openOptions with about tab when badge is clicked', async () => {
            const mockInstallUpdate = vi.fn();
            (useUpdateToast as Mock).mockReturnValue({
                hasPendingUpdate: true,
                installUpdate: mockInstallUpdate,
            });

            await renderWithAct(<Titlebar />);

            const badge = screen.getByTestId('update-badge');
            fireEvent.click(badge);

            expect(mockElectronAPI.openOptions).toHaveBeenCalledWith('about');
        });

        it('does not call openOptions when installUpdate is not available', async () => {
            // This tests the if (installUpdate) check in handleBadgeClick
            (useUpdateToast as Mock).mockReturnValue({
                hasPendingUpdate: true,
                installUpdate: undefined,
            });

            await renderWithAct(<Titlebar />);

            const badge = screen.getByTestId('update-badge');
            fireEvent.click(badge);

            expect(mockElectronAPI.openOptions).not.toHaveBeenCalled();
        });
    });
});

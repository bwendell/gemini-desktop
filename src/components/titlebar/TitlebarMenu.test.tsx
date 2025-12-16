/**
 * Unit tests for TitlebarMenu component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { type as getOsType } from '@tauri-apps/plugin-os';
import { TitlebarMenu } from './TitlebarMenu';
import type { MenuDefinition } from './menuTypes';
import '@testing-library/jest-dom'; // Ensure jest-dom matchers are available

// Mock dependencies
vi.mock('@tauri-apps/plugin-os', () => ({
    type: vi.fn(),
}));

const mockGetOsType = vi.mocked(getOsType);

describe('TitlebarMenu', () => {
    const sampleMenus: MenuDefinition[] = [
        {
            label: 'File',
            items: [
                { label: 'New', shortcut: 'Ctrl+N', action: vi.fn() },
                { separator: true },
                { label: 'Exit', action: vi.fn() },
            ],
        },
        {
            label: 'Edit',
            items: [
                { label: 'Undo', shortcut: 'Ctrl+Z' },
                { label: 'Disabled Item', disabled: true },
            ],
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetOsType.mockReturnValue('windows');
    });

    describe('platform behavior', () => {
        it('renders menu buttons on Windows', () => {
            mockGetOsType.mockReturnValue('windows');
            render(<TitlebarMenu menus={sampleMenus} />);

            expect(screen.getByText('File')).toBeInTheDocument();
            expect(screen.getByText('Edit')).toBeInTheDocument();
        });

        it('renders menu buttons on Linux', () => {
            mockGetOsType.mockReturnValue('linux');
            render(<TitlebarMenu menus={sampleMenus} />);

            expect(screen.getByText('File')).toBeInTheDocument();
            expect(screen.getByText('Edit')).toBeInTheDocument();
        });

        it('returns null on macOS', () => {
            mockGetOsType.mockReturnValue('macos');
            const { container } = render(<TitlebarMenu menus={sampleMenus} />);

            expect(container.firstChild).toBeNull();
        });
    });

    describe('menu interactions', () => {
        it('opens dropdown on click', () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            const fileButton = screen.getByText('File');
            fireEvent.click(fileButton);

            // Check if dropdown items are visible
            expect(screen.getByText('New')).toBeVisible();
            expect(screen.getByText('Exit')).toBeVisible();
        });

        it('closes dropdown on second click', () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            const fileButton = screen.getByText('File');
            fireEvent.click(fileButton);
            expect(screen.getByText('New')).toBeVisible();

            fireEvent.click(fileButton);
            expect(screen.queryByText('New')).not.toBeInTheDocument();
        });

        it('closes dropdown on click outside', () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            const fileButton = screen.getByText('File');
            fireEvent.click(fileButton);
            expect(screen.getByText('New')).toBeVisible();

            fireEvent.mouseDown(document.body);
            expect(screen.queryByText('New')).not.toBeInTheDocument();
        });

        it('switches menu on hover when active', () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            const fileButton = screen.getByText('File');
            const editButton = screen.getByText('Edit');

            // Open File menu
            fireEvent.click(fileButton);
            expect(screen.getByText('Exit')).toBeVisible();
            expect(screen.queryByText('Undo')).not.toBeInTheDocument();

            // Hover over Edit menu
            fireEvent.mouseEnter(editButton);
            expect(screen.queryByText('Exit')).not.toBeInTheDocument();
            expect(screen.getByText('Undo')).toBeVisible();
        });

        it('executes action and closes menu on item click', () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            const fileButton = screen.getByText('File');
            fireEvent.click(fileButton);

            const firstItem = sampleMenus[0].items[0];
            // Safe access using type guard
            if (!('separator' in firstItem)) {
                const newAction = firstItem.action;
                const newItem = screen.getByText('New');

                fireEvent.click(newItem);

                if (newAction) {
                    expect(newAction).toHaveBeenCalled();
                }
                expect(screen.queryByText('New')).not.toBeInTheDocument();
            }
        });

        it('does not close or execute action on disabled item click', () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            fireEvent.click(screen.getByText('Edit'));
            const disabledItem = screen.getByText('Disabled Item').closest('button');

            expect(disabledItem).toBeDisabled();

            if (disabledItem) {
                fireEvent.click(disabledItem);
            }

            // Should still be open
            expect(screen.getByText('Undo')).toBeVisible();
        });
    });
});

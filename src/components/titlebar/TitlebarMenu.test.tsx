/**
 * Unit tests for TitlebarMenu component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { type as getOsType } from '@tauri-apps/plugin-os';
import { Menu, MenuItem as TauriMenuItem, PredefinedMenuItem } from '@tauri-apps/api/menu';
import { TitlebarMenu } from './TitlebarMenu';
import type { MenuDefinition } from './menuTypes';

// Mock dependencies
vi.mock('@tauri-apps/plugin-os', () => ({
    type: vi.fn(),
}));

const mockMenuPopup = vi.fn();
const mockMenuNew = vi.fn();

vi.mock('@tauri-apps/api/menu', () => ({
    Menu: {
        new: vi.fn(),
    },
    MenuItem: {
        new: vi.fn(),
    },
    PredefinedMenuItem: {
        new: vi.fn(),
    },
}));

const mockGetOsType = vi.mocked(getOsType);
const mockedMenu = vi.mocked(Menu);
const mockedMenuItem = vi.mocked(TauriMenuItem);
const mockedPredefinedMenuItem = vi.mocked(PredefinedMenuItem);

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
        mockMenuPopup.mockResolvedValue(undefined);
        mockMenuNew.mockResolvedValue({ popup: mockMenuPopup });
        mockedMenu.new.mockImplementation(mockMenuNew);
        mockedMenuItem.new.mockImplementation(async (opts) => ({ ...opts, type: 'menuitem' }));
        mockedPredefinedMenuItem.new.mockImplementation(async (opts) => ({ ...opts, type: 'predefined' }));
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

    describe('menu button rendering', () => {
        it('renders a button for each menu', () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            const buttons = screen.getAllByRole('button');
            expect(buttons).toHaveLength(2);
            expect(buttons[0]).toHaveTextContent('File');
            expect(buttons[1]).toHaveTextContent('Edit');
        });

        it('renders with correct CSS class', () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            const buttons = screen.getAllByRole('button');
            buttons.forEach((btn) => {
                expect(btn).toHaveClass('titlebar-menu-button');
            });
        });

        it('renders empty when no menus provided', () => {
            const { container } = render(<TitlebarMenu menus={[]} />);

            expect(container.querySelector('.titlebar-menu-bar')).toBeInTheDocument();
            expect(screen.queryAllByRole('button')).toHaveLength(0);
        });
    });

    describe('menu click handling', () => {
        it('clicking menu button creates native menu and shows popup', async () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            const fileButton = screen.getByText('File');
            fireEvent.click(fileButton);

            await waitFor(() => {
                expect(mockedMenu.new).toHaveBeenCalled();
                expect(mockMenuPopup).toHaveBeenCalled();
            });
        });

        it('creates menu items with correct properties', async () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            const fileButton = screen.getByText('File');
            fireEvent.click(fileButton);

            await waitFor(() => {
                // Check that MenuItem.new was called for non-separator items
                expect(mockedMenuItem.new).toHaveBeenCalled();
                // Check that PredefinedMenuItem.new was called for separator
                expect(mockedPredefinedMenuItem.new).toHaveBeenCalledWith({ item: 'Separator' });
            });
        });

        it('includes shortcuts in menu item text', async () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            const fileButton = screen.getByText('File');
            fireEvent.click(fileButton);

            await waitFor(() => {
                // Check MenuItem.new was called with shortcut in text
                const calls = mockedMenuItem.new.mock.calls;
                const newItemCall = calls.find((call) =>
                    call[0]?.text?.includes('New') && call[0]?.text?.includes('Ctrl+N')
                );
                expect(newItemCall).toBeDefined();
            });
        });

        it('sets enabled to false for disabled items', async () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            const editButton = screen.getByText('Edit');
            fireEvent.click(editButton);

            await waitFor(() => {
                const calls = mockedMenuItem.new.mock.calls;
                const disabledCall = calls.find((call) =>
                    call[0]?.text?.includes('Disabled Item') && call[0]?.enabled === false
                );
                expect(disabledCall).toBeDefined();
            });
        });

        it('handles menu creation errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const error = new Error('Menu creation failed');
            mockedMenu.new.mockRejectedValue(error);

            render(<TitlebarMenu menus={sampleMenus} />);

            const fileButton = screen.getByText('File');
            fireEvent.click(fileButton);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Failed to show menu:', error);
            });

            consoleSpy.mockRestore();
        });
    });
});

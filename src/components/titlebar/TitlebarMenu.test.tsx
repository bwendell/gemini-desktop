/**
 * Unit tests for TitlebarMenu component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TitlebarMenu } from './TitlebarMenu';
import type { MenuDefinition } from './menuTypes';
import { setMockPlatform } from '../../test/setup';
import '@testing-library/jest-dom'; // Ensure jest-dom matchers are available

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
        setMockPlatform('win32');
    });

    describe('platform behavior', () => {
        it('renders menu buttons on Windows', () => {
            setMockPlatform('win32');
            render(<TitlebarMenu menus={sampleMenus} />);

            expect(screen.getByText('File')).toBeInTheDocument();
            expect(screen.getByText('Edit')).toBeInTheDocument();
        });

        it('renders menu buttons on Linux', () => {
            setMockPlatform('linux');
            render(<TitlebarMenu menus={sampleMenus} />);

            expect(screen.getByText('File')).toBeInTheDocument();
            expect(screen.getByText('Edit')).toBeInTheDocument();
        });

        it('returns null on macOS', () => {
            setMockPlatform('darwin');
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
            vi.useFakeTimers();
            render(<TitlebarMenu menus={sampleMenus} />);

            const fileButton = screen.getByText('File');
            fireEvent.click(fileButton);

            // Fast-forward so the event listener is attached
            vi.runAllTimers();

            expect(screen.getByText('New')).toBeVisible();

            // Verify backdrop exists
            const backdrop = document.querySelector('.titlebar-menu-backdrop');
            expect(backdrop).toBeInTheDocument();

            // Click backdrop to close
            if (backdrop) {
                fireEvent.click(backdrop);
            }
            expect(screen.queryByText('New')).not.toBeInTheDocument();

            vi.useRealTimers();
        });

        it('closes dropdown on click outside (document body)', () => {
            vi.useFakeTimers();
            render(<TitlebarMenu menus={sampleMenus} />);

            const fileButton = screen.getByText('File');
            fireEvent.click(fileButton);

            // Fast-forward so the event listener is attached
            vi.runAllTimers();

            expect(screen.getByText('New')).toBeVisible();

            fireEvent.mouseDown(document.body);
            expect(screen.queryByText('New')).not.toBeInTheDocument();

            vi.useRealTimers();
        });

        it('closes dropdown when Escape key is pressed', () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            const fileButton = screen.getByText('File');
            fireEvent.click(fileButton);
            expect(screen.getByText('New')).toBeVisible();

            fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
            expect(screen.queryByText('New')).not.toBeInTheDocument();
        });

        it('does not close dropdown when other keys are pressed', () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            const fileButton = screen.getByText('File');
            fireEvent.click(fileButton);
            expect(screen.getByText('New')).toBeVisible();

            fireEvent.keyDown(document, { key: 'Enter', code: 'Enter' });
            expect(screen.getByText('New')).toBeVisible();
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

        it('does not switch menu on hover when no menu is active', () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            const editButton = screen.getByText('Edit');

            // Hover without clicking first - menu should not open
            fireEvent.mouseEnter(editButton);
            expect(screen.queryByText('Undo')).not.toBeInTheDocument();
        });

        it('closes menu when clicking on item without action', () => {
            render(<TitlebarMenu menus={sampleMenus} />);

            fireEvent.click(screen.getByText('Edit'));
            const undoItem = screen.getByText('Undo');

            // Click on item without action
            fireEvent.click(undoItem);

            // Menu should still close
            expect(screen.queryByText('Undo')).not.toBeInTheDocument();
        });

        it('keeps dropdown open when clicking inside dropdown', () => {
            vi.useFakeTimers();
            render(<TitlebarMenu menus={sampleMenus} />);

            const fileButton = screen.getByText('File');
            fireEvent.click(fileButton);
            vi.runAllTimers();

            const dropdown = document.querySelector('.titlebar-menu-dropdown');
            expect(dropdown).toBeInTheDocument();

            // Click inside dropdown but not on an item
            if (dropdown) {
                fireEvent.mouseDown(dropdown);
            }

            // Dropdown should still be open
            expect(screen.getByText('New')).toBeVisible();

            vi.useRealTimers();
        });

        it('keeps dropdown open when clicking inside menu bar', () => {
            vi.useFakeTimers();
            render(<TitlebarMenu menus={sampleMenus} />);

            const fileButton = screen.getByText('File');
            fireEvent.click(fileButton);
            vi.runAllTimers();

            const menuBar = document.querySelector('.titlebar-menu-bar');
            expect(menuBar).toBeInTheDocument();

            // Click inside menu bar (but not on a button)
            if (menuBar) {
                fireEvent.mouseDown(menuBar);
            }

            // Dropdown should still be open
            expect(screen.getByText('New')).toBeVisible();

            vi.useRealTimers();
        });
    });
});

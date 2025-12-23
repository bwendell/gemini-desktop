import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutoUpdateToggle } from './AutoUpdateToggle';

describe('AutoUpdateToggle', () => {
    const mockGetAutoUpdateEnabled = vi.fn();
    const mockSetAutoUpdateEnabled = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock electronAPI
        window.electronAPI = {
            getAutoUpdateEnabled: mockGetAutoUpdateEnabled,
            setAutoUpdateEnabled: mockSetAutoUpdateEnabled,
        } as any;
    });

    it('renders loading state initially', async () => {
        // Return a promise that doesn't resolve immediately to keep it in loading state
        mockGetAutoUpdateEnabled.mockReturnValue(new Promise(() => { }));

        render(<AutoUpdateToggle />);

        expect(screen.getByTestId('auto-update-toggle-loading')).toBeInTheDocument();
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders toggle with enabled state loaded from API', async () => {
        mockGetAutoUpdateEnabled.mockResolvedValue(true);

        render(<AutoUpdateToggle />);

        await waitFor(() => {
            expect(screen.queryByTestId('auto-update-toggle-loading')).not.toBeInTheDocument();
        });

        const toggle = screen.getByRole('switch');
        expect(toggle).toBeInTheDocument();
        expect(toggle).toBeChecked();
    });

    it('renders toggle with disabled state loaded from API', async () => {
        mockGetAutoUpdateEnabled.mockResolvedValue(false);

        render(<AutoUpdateToggle />);

        await waitFor(() => {
            expect(screen.queryByTestId('auto-update-toggle-loading')).not.toBeInTheDocument();
        });

        const toggle = screen.getByRole('switch');
        expect(toggle).not.toBeChecked();
    });

    it('calls setAutoUpdateEnabled when toggled', async () => {
        mockGetAutoUpdateEnabled.mockResolvedValue(true);

        render(<AutoUpdateToggle />);

        await waitFor(() => {
            expect(screen.queryByTestId('auto-update-toggle-loading')).not.toBeInTheDocument();
        });

        const toggle = screen.getByRole('switch');
        fireEvent.click(toggle);

        expect(mockSetAutoUpdateEnabled).toHaveBeenCalledWith(false);
    });

    it('handles error when loading state gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
        mockGetAutoUpdateEnabled.mockRejectedValue(new Error('IPC error'));

        render(<AutoUpdateToggle />);

        await waitFor(() => {
            expect(screen.queryByTestId('auto-update-toggle-loading')).not.toBeInTheDocument();
        });

        // Should default to true on error
        const toggle = screen.getByRole('switch');
        expect(toggle).toBeChecked();

        expect(consoleSpy).toHaveBeenCalledWith('Failed to load auto-update state:', expect.any(Error));
        consoleSpy.mockRestore();
    });
});

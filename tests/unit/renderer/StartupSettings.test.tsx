import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { StartupSettings } from '../../../src/renderer/components/options/StartupSettings';
import { clearMockElectronAPI, setupMockElectronAPI } from '../../helpers/mocks';

describe('StartupSettings', () => {
    const mockGetLaunchAtStartup = vi.fn();
    const mockSetLaunchAtStartup = vi.fn();
    const mockGetStartMinimized = vi.fn();
    const mockSetStartMinimized = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        mockGetLaunchAtStartup.mockResolvedValue(false);
        mockSetLaunchAtStartup.mockReturnValue(undefined);
        mockGetStartMinimized.mockResolvedValue(false);
        mockSetStartMinimized.mockReturnValue(undefined);

        setupMockElectronAPI({
            getLaunchAtStartup: mockGetLaunchAtStartup,
            setLaunchAtStartup: mockSetLaunchAtStartup,
            getStartMinimized: mockGetStartMinimized,
            setStartMinimized: mockSetStartMinimized,
        });
    });

    describe('Rendering', () => {
        it('shows loading state initially', () => {
            mockGetLaunchAtStartup.mockImplementation(() => new Promise(() => {}));
            render(<StartupSettings />);
            expect(screen.getByTestId('startup-settings-loading')).toBeInTheDocument();
        });

        it('renders both toggles after loading', async () => {
            render(<StartupSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('startup-settings')).toBeInTheDocument();
                expect(screen.getByTestId('launch-at-startup-toggle')).toBeInTheDocument();
                expect(screen.getByTestId('start-minimized-toggle')).toBeInTheDocument();
            });
        });
    });

    describe('Interactions', () => {
        it('calls setLaunchAtStartup when launch toggle clicked', async () => {
            render(<StartupSettings />);
            await waitFor(() => expect(screen.getByTestId('launch-at-startup-toggle-switch')).toBeInTheDocument());

            fireEvent.click(screen.getByTestId('launch-at-startup-toggle-switch'));

            await waitFor(() => {
                expect(mockSetLaunchAtStartup).toHaveBeenCalledWith(true);
            });
        });

        it('disables start minimized toggle when launch-at-startup is false', async () => {
            mockGetLaunchAtStartup.mockResolvedValue(false);
            render(<StartupSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('start-minimized-toggle-switch')).toHaveAttribute('aria-disabled', 'true');
            });
        });

        it('enables start minimized toggle when launch-at-startup is true', async () => {
            mockGetLaunchAtStartup.mockResolvedValue(true);
            render(<StartupSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('start-minimized-toggle-switch')).toHaveAttribute('aria-disabled', 'false');
            });
        });

        it('turning off launch-at-startup also calls setStartMinimized(false)', async () => {
            mockGetLaunchAtStartup.mockResolvedValue(true);
            mockGetStartMinimized.mockResolvedValue(true);
            render(<StartupSettings />);

            await waitFor(() => expect(screen.getByTestId('launch-at-startup-toggle-switch')).toBeInTheDocument());
            fireEvent.click(screen.getByTestId('launch-at-startup-toggle-switch'));

            await waitFor(() => {
                expect(mockSetLaunchAtStartup).toHaveBeenCalledWith(false);
                expect(mockSetStartMinimized).toHaveBeenCalledWith(false);
            });
        });

        it('calls setStartMinimized when start minimized toggle clicked', async () => {
            mockGetLaunchAtStartup.mockResolvedValue(true);
            render(<StartupSettings />);

            await waitFor(() => expect(screen.getByTestId('start-minimized-toggle-switch')).toBeInTheDocument());
            fireEvent.click(screen.getByTestId('start-minimized-toggle-switch'));

            await waitFor(() => {
                expect(mockSetStartMinimized).toHaveBeenCalledWith(true);
            });
        });
    });

    describe('Without ElectronAPI', () => {
        it('handles missing API gracefully', async () => {
            clearMockElectronAPI();
            (window as unknown as { electronAPI?: unknown }).electronAPI = undefined;

            render(<StartupSettings />);
            await waitFor(() => {
                expect(screen.getByTestId('startup-settings')).toBeInTheDocument();
            });
        });
    });
});

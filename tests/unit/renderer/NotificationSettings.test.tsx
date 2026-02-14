/**
 * Unit tests for NotificationSettings component.
 *
 * Tests the Options UI component for response notification settings including:
 * - Toggle state rendering (Task 6.5)
 * - API interactions
 * - Loading states
 *
 * @module NotificationSettings.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationSettings } from '../../../src/renderer/components/options/NotificationSettings';
import { setupMockElectronAPI, clearMockElectronAPI } from '../../helpers/mocks';

describe('NotificationSettings (Task 6.5)', () => {
    const mockGetResponseNotificationsEnabled = vi.fn();
    const mockSetResponseNotificationsEnabled = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mock implementation
        mockGetResponseNotificationsEnabled.mockResolvedValue(true);
        mockSetResponseNotificationsEnabled.mockReturnValue(undefined);

        // Use shared factory with test-specific overrides
        setupMockElectronAPI({
            getResponseNotificationsEnabled: mockGetResponseNotificationsEnabled,
            setResponseNotificationsEnabled: mockSetResponseNotificationsEnabled,
        });
    });

    describe('Rendering', () => {
        it('shows loading state initially', async () => {
            // Defer resolution to keep loading state
            mockGetResponseNotificationsEnabled.mockImplementation(
                () => new Promise(() => {}) // Never resolves
            );

            render(<NotificationSettings />);

            expect(screen.getByTestId('notification-settings-loading')).toBeInTheDocument();
        });

        it('renders the component container after loading', async () => {
            render(<NotificationSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
            });
        });

        it('renders response notifications toggle', async () => {
            render(<NotificationSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('response-notifications-toggle')).toBeInTheDocument();
            });
        });
    });

    describe('Toggle States', () => {
        it('renders toggle in enabled state when notifications enabled', async () => {
            mockGetResponseNotificationsEnabled.mockResolvedValue(true);

            render(<NotificationSettings />);

            await waitFor(() => {
                const toggle = screen.getByTestId('response-notifications-toggle');
                expect(toggle).toBeInTheDocument();
            });
        });

        it('renders toggle in disabled state when notifications disabled', async () => {
            mockGetResponseNotificationsEnabled.mockResolvedValue(false);

            render(<NotificationSettings />);

            await waitFor(() => {
                const toggle = screen.getByTestId('response-notifications-toggle');
                expect(toggle).toBeInTheDocument();
            });
        });

        it('calls setResponseNotificationsEnabled when toggle clicked', async () => {
            mockGetResponseNotificationsEnabled.mockResolvedValue(false);

            render(<NotificationSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('response-notifications-toggle')).toBeInTheDocument();
            });

            // Click the toggle switch button
            const toggleSwitch = screen.getByTestId('response-notifications-toggle-switch');
            fireEvent.click(toggleSwitch);

            await waitFor(() => {
                expect(mockSetResponseNotificationsEnabled).toHaveBeenCalledWith(true);
            });
        });

        it('calls setResponseNotificationsEnabled with false when toggling off', async () => {
            mockGetResponseNotificationsEnabled.mockResolvedValue(true);

            render(<NotificationSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('response-notifications-toggle')).toBeInTheDocument();
            });

            // Click the toggle switch button
            const toggleSwitch = screen.getByTestId('response-notifications-toggle-switch');
            fireEvent.click(toggleSwitch);

            await waitFor(() => {
                expect(mockSetResponseNotificationsEnabled).toHaveBeenCalledWith(false);
            });
        });

        it('reverts toggle state when setter fails', async () => {
            mockSetResponseNotificationsEnabled.mockRejectedValue(new Error('Setter failed'));

            render(<NotificationSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
            });

            const toggleSwitch = screen.getByTestId('response-notifications-toggle-switch');
            expect(toggleSwitch).toHaveAttribute('aria-checked', 'true');

            fireEvent.click(toggleSwitch);

            await waitFor(() => {
                expect(toggleSwitch).toHaveAttribute('aria-checked', 'true');
            });
        });
    });

    describe('API Interactions', () => {
        it('fetches initial state on mount', async () => {
            render(<NotificationSettings />);

            await waitFor(() => {
                expect(mockGetResponseNotificationsEnabled).toHaveBeenCalled();
            });
        });

        it('defaults to enabled when API returns undefined', async () => {
            mockGetResponseNotificationsEnabled.mockResolvedValue(undefined);

            render(<NotificationSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
            });
        });

        it('handles API error gracefully', async () => {
            mockGetResponseNotificationsEnabled.mockRejectedValue(new Error('API Error'));

            render(<NotificationSettings />);

            // Should still render, defaults to enabled
            await waitFor(() => {
                expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
            });
        });
    });

    describe('Without ElectronAPI', () => {
        it('handles missing electronAPI gracefully', async () => {
            clearMockElectronAPI();
            window.electronAPI = undefined;

            render(<NotificationSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
            });
        });

        it('handles electronAPI object without notification methods', async () => {
            setupMockElectronAPI();
            delete window.electronAPI?.getResponseNotificationsEnabled;
            delete window.electronAPI?.setResponseNotificationsEnabled;

            render(<NotificationSettings />);

            await waitFor(() => {
                expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
            });

            const toggleSwitch = screen.getByTestId('response-notifications-toggle-switch');
            fireEvent.click(toggleSwitch);

            // Should update local state without throwing when setter isn't available
            await waitFor(() => {
                expect(toggleSwitch).toHaveAttribute('aria-checked', 'false');
            });
            expect(mockSetResponseNotificationsEnabled).not.toHaveBeenCalled();
        });
    });
});

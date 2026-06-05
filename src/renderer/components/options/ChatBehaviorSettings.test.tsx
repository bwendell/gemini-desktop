import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { ChatBehaviorSettings } from './ChatBehaviorSettings';

// Mock electronAPI
const mockElectronAPI = {
    getSmartEnterEnabled: vi.fn(),
    setSmartEnterEnabled: vi.fn(),
    getScrollToBottomButtonEnabled: vi.fn(),
    setScrollToBottomButtonEnabled: vi.fn(),
};

beforeEach(() => {
    vi.clearAllMocks();
    (window as any).electronAPI = mockElectronAPI;
});

describe('ChatBehaviorSettings', () => {
    it('should load preferences from electronAPI and render toggles', async () => {
        mockElectronAPI.getSmartEnterEnabled.mockResolvedValue(true);
        mockElectronAPI.getScrollToBottomButtonEnabled.mockResolvedValue(false);

        await act(async () => {
            render(<ChatBehaviorSettings />);
        });

        // Toggles should be visible
        expect(screen.getByText('Queue Submit on Upload (Smart Enter)')).toBeInTheDocument();
        expect(screen.getByText('Scroll-to-Bottom Button')).toBeInTheDocument();

        // Check if the switches have correct state
        const toggles = screen.getAllByRole('switch');
        expect(toggles[0]).toHaveAttribute('aria-checked', 'true'); // smart enter is true
        expect(toggles[1]).toHaveAttribute('aria-checked', 'false'); // scroll to bottom is false
    });

    it('should update smart enter preference when toggled', async () => {
        mockElectronAPI.getSmartEnterEnabled.mockResolvedValue(true);
        mockElectronAPI.getScrollToBottomButtonEnabled.mockResolvedValue(true);

        await act(async () => {
            render(<ChatBehaviorSettings />);
        });

        const toggles = screen.getAllByRole('switch');

        await act(async () => {
            fireEvent.click(toggles[0]);
        });

        expect(mockElectronAPI.setSmartEnterEnabled).toHaveBeenCalledWith(false);
    });

    it('should update scroll to bottom preference when toggled', async () => {
        mockElectronAPI.getSmartEnterEnabled.mockResolvedValue(true);
        mockElectronAPI.getScrollToBottomButtonEnabled.mockResolvedValue(true);

        await act(async () => {
            render(<ChatBehaviorSettings />);
        });

        const toggles = screen.getAllByRole('switch');

        await act(async () => {
            fireEvent.click(toggles[1]);
        });

        expect(mockElectronAPI.setScrollToBottomButtonEnabled).toHaveBeenCalledWith(false);
    });
});

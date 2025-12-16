/**
 * Unit tests for OptionsWindow component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OptionsWindow } from './OptionsWindow';

// Mock ErrorBoundary to simplify testing
vi.mock('../ErrorBoundary', () => ({
    ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock OptionsWindowTitlebar
vi.mock('./OptionsWindowTitlebar', () => ({
    OptionsWindowTitlebar: ({ title }: { title: string }) => (
        <header data-testid="mock-options-titlebar">{title}</header>
    ),
}));

describe('OptionsWindow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('rendering', () => {
        it('should render the options window container', () => {
            render(<OptionsWindow />);

            expect(screen.getByTestId('options-window')).toBeInTheDocument();
        });

        it('should render the titlebar with correct title', () => {
            render(<OptionsWindow />);

            expect(screen.getByTestId('mock-options-titlebar')).toBeInTheDocument();
            expect(screen.getByTestId('mock-options-titlebar')).toHaveTextContent('Options');
        });

        it('should render the content area', () => {
            render(<OptionsWindow />);

            expect(screen.getByTestId('options-content')).toBeInTheDocument();
        });

        it('should display placeholder message', () => {
            render(<OptionsWindow />);

            expect(screen.getByText(/Options will be available here/)).toBeInTheDocument();
        });
    });

    describe('layout structure', () => {
        it('should have correct class names for styling', () => {
            render(<OptionsWindow />);

            expect(screen.getByTestId('options-window')).toHaveClass('options-window');
            expect(screen.getByTestId('options-content')).toHaveClass('options-content');
        });
    });
});

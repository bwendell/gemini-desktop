/**
 * Unit tests for App component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock all dependencies
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@tauri-apps/plugin-os', () => ({
    type: vi.fn(() => 'windows'),
}));

vi.mock('@tauri-apps/api/window', () => ({
    Window: {
        getCurrent: vi.fn(() => ({
            minimize: vi.fn(),
            maximize: vi.fn(),
            close: vi.fn(),
            isMaximized: vi.fn().mockResolvedValue(false),
            isFullscreen: vi.fn().mockResolvedValue(false),
            setFullscreen: vi.fn(),
        })),
    },
}));

vi.mock('@tauri-apps/plugin-process', () => ({
    exit: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    message: vi.fn(),
}));

vi.mock('@tauri-apps/api/menu', () => ({
    Menu: { new: vi.fn().mockResolvedValue({ popup: vi.fn() }) },
    MenuItem: { new: vi.fn().mockResolvedValue({}) },
    PredefinedMenuItem: { new: vi.fn().mockResolvedValue({}) },
}));

// Mock the hook for isolated component testing
const mockUseWebviewInit = vi.fn();
vi.mock('./hooks/useWebviewInit', () => ({
    useWebviewInit: () => mockUseWebviewInit(),
}));

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loading state', () => {
        it('shows loading state when isLoading is true', () => {
            mockUseWebviewInit.mockReturnValue({
                isReady: false,
                error: null,
                isLoading: true,
                retry: vi.fn(),
            });

            render(<App />);

            expect(screen.getByText('Loading Gemini...')).toBeInTheDocument();
            const spinner = document.querySelector('.webview-loading-spinner');
            expect(spinner).toBeInTheDocument();
        });

        it('has loading container with correct class', () => {
            mockUseWebviewInit.mockReturnValue({
                isReady: false,
                error: null,
                isLoading: true,
                retry: vi.fn(),
            });

            render(<App />);

            const loadingDiv = document.querySelector('.webview-loading');
            expect(loadingDiv).toBeInTheDocument();
        });

        it('hides loading when isLoading is false', () => {
            mockUseWebviewInit.mockReturnValue({
                isReady: true,
                error: null,
                isLoading: false,
                retry: vi.fn(),
            });

            render(<App />);

            expect(screen.queryByText('Loading Gemini...')).not.toBeInTheDocument();
        });
    });

    describe('error state', () => {
        it('shows error message when error is set', () => {
            mockUseWebviewInit.mockReturnValue({
                isReady: false,
                error: 'Webview failed',
                isLoading: false,
                retry: vi.fn(),
            });

            render(<App />);

            expect(screen.getByText('Failed to load: Webview failed')).toBeInTheDocument();
        });

        it('shows error container with correct class', () => {
            mockUseWebviewInit.mockReturnValue({
                isReady: false,
                error: 'Test error',
                isLoading: false,
                retry: vi.fn(),
            });

            render(<App />);

            const errorDiv = document.querySelector('.webview-error');
            expect(errorDiv).toBeInTheDocument();
        });

        it('does not show error when error is null', () => {
            mockUseWebviewInit.mockReturnValue({
                isReady: true,
                error: null,
                isLoading: false,
                retry: vi.fn(),
            });

            render(<App />);

            expect(screen.queryByText(/Failed to load/)).not.toBeInTheDocument();
        });
    });

    describe('ready state', () => {
        it('hides loading and error when ready', () => {
            mockUseWebviewInit.mockReturnValue({
                isReady: true,
                error: null,
                isLoading: false,
                retry: vi.fn(),
            });

            render(<App />);

            expect(screen.queryByText('Loading Gemini...')).not.toBeInTheDocument();
            expect(screen.queryByText(/Failed to load/)).not.toBeInTheDocument();
        });
    });

    describe('layout structure', () => {
        it('renders MainLayout container', () => {
            mockUseWebviewInit.mockReturnValue({
                isReady: true,
                error: null,
                isLoading: false,
                retry: vi.fn(),
            });

            render(<App />);

            const layout = document.querySelector('.main-layout');
            expect(layout).toBeInTheDocument();
        });

        it('renders webview-container', () => {
            mockUseWebviewInit.mockReturnValue({
                isReady: true,
                error: null,
                isLoading: false,
                retry: vi.fn(),
            });

            render(<App />);

            const container = document.querySelector('.webview-container');
            expect(container).toBeInTheDocument();
        });

        it('renders Titlebar via MainLayout', () => {
            mockUseWebviewInit.mockReturnValue({
                isReady: true,
                error: null,
                isLoading: false,
                retry: vi.fn(),
            });

            render(<App />);

            const titlebar = document.querySelector('.titlebar');
            expect(titlebar).toBeInTheDocument();
        });

        it('renders main content area', () => {
            mockUseWebviewInit.mockReturnValue({
                isReady: true,
                error: null,
                isLoading: false,
                retry: vi.fn(),
            });

            render(<App />);

            const main = document.querySelector('.main-content');
            expect(main).toBeInTheDocument();
        });
    });
});

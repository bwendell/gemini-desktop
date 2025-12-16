/**
 * Unit tests for App component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loading state', () => {
        it('shows loading state initially', () => {
            render(<App />);

            expect(screen.getByText('Loading Gemini...')).toBeInTheDocument();
            const spinner = document.querySelector('.webview-loading-spinner');
            expect(spinner).toBeInTheDocument();
        });

        it('hides loading when iframe loads', () => {
            render(<App />);

            const iframe = screen.getByTestId('gemini-iframe');
            fireEvent.load(iframe);

            expect(screen.queryByText('Loading Gemini...')).not.toBeInTheDocument();
        });
    });

    describe('error state', () => {
        // Note: The iframe onError handler cannot be tested in JSDOM because
        // fireEvent.error() doesn't trigger React's synthetic onError for iframes.
        // This has been manually verified to work in the actual Electron environment.
        it.skip('shows error message when iframe errors (manual test only)', () => {
            // This test is skipped because JSDOM cannot properly simulate iframe errors
        });
    });

    describe('layout structure', () => {
        it('renders MainLayout container', () => {
            render(<App />);

            const layout = document.querySelector('.main-layout');
            expect(layout).toBeInTheDocument();
        });

        it('renders webview-container', () => {
            render(<App />);

            const container = document.querySelector('.webview-container');
            expect(container).toBeInTheDocument();
        });

        it('renders Titlebar via MainLayout', () => {
            render(<App />);

            const titlebar = document.querySelector('.titlebar');
            expect(titlebar).toBeInTheDocument();
        });

        it('renders iframe with correct src', () => {
            render(<App />);

            const iframe = screen.getByTestId('gemini-iframe') as HTMLIFrameElement;
            expect(iframe).toBeInTheDocument();
            expect(iframe.src).toBe('https://gemini.google.com/app');
        });
    });
});

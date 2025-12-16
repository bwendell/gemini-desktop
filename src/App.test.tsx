/**
 * Unit tests for App component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';

describe('App', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('loading state', () => {
        it('shows loading state initially', async () => {
            await act(async () => {
                render(<App />);
            });

            expect(screen.getByText('Loading Gemini...')).toBeInTheDocument();
            const spinner = document.querySelector('.webview-loading-spinner');
            expect(spinner).toBeInTheDocument();
        });

        it('hides loading when iframe loads', async () => {
            await act(async () => {
                render(<App />);
            });

            const iframe = screen.getByTestId('gemini-iframe');
            await act(async () => {
                fireEvent.load(iframe);
            });

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
        it('renders MainLayout container', async () => {
            await act(async () => {
                render(<App />);
            });

            const layout = document.querySelector('.main-layout');
            expect(layout).toBeInTheDocument();
        });

        it('renders webview-container', async () => {
            await act(async () => {
                render(<App />);
            });

            const container = document.querySelector('.webview-container');
            expect(container).toBeInTheDocument();
        });

        it('renders Titlebar via MainLayout', async () => {
            await act(async () => {
                render(<App />);
            });

            const titlebar = document.querySelector('.titlebar');
            expect(titlebar).toBeInTheDocument();
        });

        it('renders iframe with correct src', async () => {
            await act(async () => {
                render(<App />);
            });

            const iframe = screen.getByTestId('gemini-iframe') as HTMLIFrameElement;
            expect(iframe).toBeInTheDocument();
            expect(iframe.src).toBe('https://gemini.google.com/app');
        });
    });

    describe('theme integration', () => {
        it('applies data-theme attribute to root element', async () => {
            await act(async () => {
                render(<App />);
            });

            // Allow theme effect to run
            await act(async () => { });

            // Verify the data-theme attribute was set (default should be 'system' which resolves to 'dark' or 'light')
            const themeAttr = document.documentElement.getAttribute('data-theme');
            expect(themeAttr).toBeTruthy();
        });
    });
});

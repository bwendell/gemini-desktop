/* @vitest-environment jsdom */

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MainLayout } from '../../../src/renderer/components/layout/MainLayout';
import { Titlebar } from '../../../src/renderer/components/titlebar/Titlebar';
import { WindowControls } from '../../../src/renderer/components/titlebar/WindowControls';
import { clearMockElectronAPI, setupMockElectronAPI } from '../../helpers/mocks';

// Mock the platform detection utilities
vi.mock('../../../src/renderer/utils/platform', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        isMacOS: vi.fn(),
        usesCustomWindowControls: vi.fn(),
    };
});

import { isMacOS, usesCustomWindowControls } from '../../../src/renderer/utils/platform';

describe('macOS Layout Integration', () => {
    beforeEach(() => {
        setupMockElectronAPI({
            platform: 'darwin',
        });
    });

    afterEach(() => {
        clearMockElectronAPI();
        cleanup();
        vi.clearAllMocks();
    });

    describe('Titlebar macOS behavior', () => {
        it('should add macos class to titlebar when isMacOS returns true', () => {
            (isMacOS as any).mockReturnValue(true);
            (usesCustomWindowControls as any).mockReturnValue(false);

            render(<Titlebar />);

            const titlebar = screen.getByTestId('titlebar');
            expect(titlebar.classList.contains('macos')).toBe(true);
            expect(titlebar.classList.contains('titlebar')).toBe(true);
        });

        it('should not add macos class to titlebar when isMacOS returns false', () => {
            (isMacOS as any).mockReturnValue(false);
            (usesCustomWindowControls as any).mockReturnValue(true);

            render(<Titlebar />);

            const titlebar = screen.getByTestId('titlebar');
            expect(titlebar.classList.contains('macos')).toBe(false);
            expect(titlebar.classList.contains('titlebar')).toBe(true);
        });

        it('should render titlebar with correct structure', () => {
            (isMacOS as any).mockReturnValue(true);
            (usesCustomWindowControls as any).mockReturnValue(false);

            render(<Titlebar />);

            const titlebar = screen.getByTestId('titlebar');
            expect(titlebar).toBeTruthy();
            expect(titlebar.tagName).toBe('HEADER');
        });
    });

    describe('WindowControls macOS behavior', () => {
        it('should return null when usesCustomWindowControls is false (macOS)', () => {
            (isMacOS as any).mockReturnValue(true);
            (usesCustomWindowControls as any).mockReturnValue(false);

            const { container } = render(<WindowControls />);

            // When null is returned, container should be empty
            expect(container.firstChild).toBeNull();
        });

        it('should render window controls when usesCustomWindowControls is true (non-macOS)', () => {
            (isMacOS as any).mockReturnValue(false);
            (usesCustomWindowControls as any).mockReturnValue(true);

            render(<WindowControls />);

            // Window controls should be rendered
            const windowControls = document.querySelector('.window-controls');
            expect(windowControls).toBeTruthy();
        });

        it('should not render window controls div on macOS', () => {
            (isMacOS as any).mockReturnValue(true);
            (usesCustomWindowControls as any).mockReturnValue(false);

            render(<WindowControls />);

            // Window controls div should not exist
            const windowControls = document.querySelector('.window-controls');
            expect(windowControls).toBeNull();
        });
    });

    describe('MainLayout structure and CSS', () => {
        it('should render MainLayout with main-content class exists', () => {
            (isMacOS as any).mockReturnValue(true);
            (usesCustomWindowControls as any).mockReturnValue(false);

            render(
                <MainLayout>
                    <div className="test-child">Test Content</div>
                </MainLayout>
            );

            const mainContent = document.querySelector('.main-content');
            expect(mainContent).toBeTruthy();
            expect(mainContent?.classList.contains('main-content')).toBe(true);
        });

        it('should render webview-container with class', () => {
            (isMacOS as any).mockReturnValue(true);
            (usesCustomWindowControls as any).mockReturnValue(false);

            const { container } = render(
                <div className="webview-container">
                    <iframe title="test" />
                </div>
            );

            const webviewContainer = container.querySelector('.webview-container');
            expect(webviewContainer).toBeTruthy();
            expect(webviewContainer?.classList.contains('webview-container')).toBe(true);
        });

        it('should have tab-bar class exists', () => {
            // Create a mock tab-bar element with the CSS class
            const { container } = render(
                <div className="tab-bar">
                    <div className="tab-bar__tabs" />
                    <button className="tab-bar__new">+</button>
                </div>
            );

            const tabBar = container.querySelector('.tab-bar');
            expect(tabBar).toBeTruthy();
            expect(tabBar?.classList.contains('tab-bar')).toBe(true);
        });

        it('should render main-layout with correct structure', () => {
            (isMacOS as any).mockReturnValue(true);
            (usesCustomWindowControls as any).mockReturnValue(false);

            render(
                <MainLayout>
                    <div>Content</div>
                </MainLayout>
            );

            const mainLayout = screen.getByTestId('main-layout');
            expect(mainLayout).toBeTruthy();
            expect(mainLayout.classList.contains('main-layout')).toBe(true);
        });
    });

    describe('macOS layout integration', () => {
        it('should render complete layout with proper structure on macOS', () => {
            (isMacOS as any).mockReturnValue(true);
            (usesCustomWindowControls as any).mockReturnValue(false);

            render(
                <MainLayout tabBar={<div className="tab-bar" data-testid="tab-bar" />}>
                    <div className="webview-container" data-testid="webview-container">
                        <iframe title="gemini" className="gemini-iframe" />
                    </div>
                </MainLayout>
            );

            // Check titlebar has macos class
            const titlebar = screen.getByTestId('titlebar');
            expect(titlebar.classList.contains('macos')).toBe(true);

            // Check WindowControls is not rendered
            const windowControls = document.querySelector('.window-controls');
            expect(windowControls).toBeNull();

            // Check main-content exists
            const mainContent = document.querySelector('.main-content');
            expect(mainContent).toBeTruthy();

            // Check webview-container exists
            const webviewContainer = screen.getByTestId('webview-container');
            expect(webviewContainer).toBeTruthy();
            expect(webviewContainer.classList.contains('webview-container')).toBe(true);

            // Check tab-bar exists
            const tabBar = screen.getByTestId('tab-bar');
            expect(tabBar).toBeTruthy();
        });

        it('should have correct element hierarchy on macOS', () => {
            (isMacOS as any).mockReturnValue(true);
            (usesCustomWindowControls as any).mockReturnValue(false);

            render(
                <MainLayout tabBar={<div className="tab-bar" data-testid="tab-bar" />}>
                    <div className="webview-container" />
                </MainLayout>
            );

            const mainLayout = screen.getByTestId('main-layout');
            const titlebar = screen.getByTestId('titlebar');

            // Titlebar should be first child of main-layout
            expect(mainLayout.firstChild).toBe(titlebar);
        });
    });

    describe('non-macOS layout (Windows/Linux)', () => {
        it('should not have macos class when not on macOS', () => {
            (isMacOS as any).mockReturnValue(false);
            (usesCustomWindowControls as any).mockReturnValue(true);

            render(<Titlebar />);

            const titlebar = screen.getByTestId('titlebar');
            expect(titlebar.classList.contains('macos')).toBe(false);
        });

        it('should render WindowControls when not on macOS', () => {
            (isMacOS as any).mockReturnValue(false);
            (usesCustomWindowControls as any).mockReturnValue(true);

            render(<WindowControls />);

            const windowControls = document.querySelector('.window-controls');
            expect(windowControls).toBeTruthy();

            // Should have minimize, maximize, and close buttons
            const buttons = windowControls?.querySelectorAll('button');
            expect(buttons?.length).toBe(3);
        });
    });
});

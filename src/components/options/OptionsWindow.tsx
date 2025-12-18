/**
 * Options window root component with tabbed navigation.
 * 
 * This component provides the main layout for the options/settings window.
 * It supports multiple tabs: Settings (theme customization) and About (legal info).
 * 
 * The window can be opened with a specific tab via URL hash or IPC.
 * 
 * @module OptionsWindow
 */

import { useState, useEffect, useCallback } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { OptionsWindowTitlebar } from './OptionsWindowTitlebar';
import { ThemeSelector } from './ThemeSelector';
import { AboutSection } from './AboutSection';
import './options-window.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Available tab identifiers for the options window.
 */
export type OptionsTab = 'settings' | 'about';

/**
 * Props for the OptionsSection component.
 * Defines a reusable section container for different settings categories.
 */
interface OptionsSectionProps {
    /** Section title displayed as a header */
    title: string;
    /** Unique identifier for testing/accessibility */
    testId?: string;
    /** Content to render inside the section */
    children: React.ReactNode;
}

/**
 * Props for the TabButton component.
 */
interface TabButtonProps {
    /** Tab identifier */
    id: OptionsTab;
    /** Display label */
    label: string;
    /** Currently active tab */
    activeTab: OptionsTab;
    /** Callback when tab is clicked */
    onClick: (tab: OptionsTab) => void;
}

// ============================================================================
// TabButton Component
// ============================================================================

/**
 * Individual tab button for navigation.
 */
function TabButton({ id, label, activeTab, onClick }: TabButtonProps) {
    const isActive = activeTab === id;

    return (
        <button
            className={`options-tab-button ${isActive ? 'active' : ''}`}
            onClick={() => onClick(id)}
            aria-selected={isActive}
            role="tab"
            data-testid={`options-tab-${id}`}
        >
            {label}
        </button>
    );
}

// ============================================================================
// OptionsSection Component
// ============================================================================

/**
 * Reusable section container for settings.
 * Provides consistent styling for different option categories.
 * 
 * @param props - Section properties
 * @returns Rendered options section
 */
function OptionsSection({ title, testId, children }: OptionsSectionProps) {
    return (
        <section className="options-section" data-testid={testId}>
            <h2>{title}</h2>
            <div className="options-section__content">
                {children}
            </div>
        </section>
    );
}

// ============================================================================
// OptionsWindow Component
// ============================================================================

/**
 * Determine initial tab from URL hash.
 * Supports: #about, #settings (default)
 */
function getInitialTab(): OptionsTab {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'about') return 'about';
    return 'settings';
}

/**
 * Root component for the Options window.
 * 
 * Layout:
 * - Custom titlebar at the top (with window controls only)
 * - Tab navigation (Settings | About)
 * - Content area based on selected tab
 * 
 * The window is designed to be opened from the File menu in the main window.
 * The About tab is opened from Help > About Gemini Desktop.
 * 
 * @example
 * // Open options window to About tab:
 * window.electronAPI?.openOptions('about');
 */
export function OptionsWindow() {
    const [activeTab, setActiveTab] = useState<OptionsTab>(getInitialTab);

    // Update tab if hash changes (e.g., opened with specific tab)
    useEffect(() => {
        const handleHashChange = () => {
            setActiveTab(getInitialTab());
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleTabChange = useCallback((tab: OptionsTab) => {
        setActiveTab(tab);
        // Update URL hash for state persistence
        window.location.hash = tab;
    }, []);

    // Determine titlebar text based on active tab
    const titlebarText = activeTab === 'about' ? 'About' : 'Options';

    return (
        <ErrorBoundary>
            <div className="options-window" data-testid="options-window">
                <OptionsWindowTitlebar title={titlebarText} />

                {/* Tab Navigation */}
                <nav className="options-tabs" role="tablist" data-testid="options-tabs">
                    <TabButton
                        id="settings"
                        label="Settings"
                        activeTab={activeTab}
                        onClick={handleTabChange}
                    />
                    <TabButton
                        id="about"
                        label="About"
                        activeTab={activeTab}
                        onClick={handleTabChange}
                    />
                </nav>

                {/* Tab Content */}
                <main className="options-content" data-testid="options-content">
                    {activeTab === 'settings' && (
                        <>
                            {/* Appearance Settings */}
                            <OptionsSection title="Appearance" testId="options-appearance">
                                <ThemeSelector />
                            </OptionsSection>

                            {/* 
                             * Future sections can be added here:
                             * 
                             * <OptionsSection title="Privacy" testId="options-privacy">
                             *     <PrivacySettings />
                             * </OptionsSection>
                             * 
                             * <OptionsSection title="Keyboard Shortcuts" testId="options-shortcuts">
                             *     <KeyboardShortcuts />
                             * </OptionsSection>
                             */}
                        </>
                    )}

                    {activeTab === 'about' && (
                        <AboutSection />
                    )}
                </main>
            </div>
        </ErrorBoundary>
    );
}

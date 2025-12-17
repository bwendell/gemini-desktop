/**
 * Options window root component.
 * 
 * This component provides the main layout for the options/settings window.
 * Designed to be modular and extensible for future settings sections.
 * 
 * @module OptionsWindow
 */

import { ErrorBoundary } from '../ErrorBoundary';
import { OptionsWindowTitlebar } from './OptionsWindowTitlebar';
import { ThemeSelector } from './ThemeSelector';
import './options-window.css';

// ============================================================================
// Types
// ============================================================================

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
 * Root component for the Options window.
 * 
 * Layout:
 * - Custom titlebar at the top (with window controls only)
 * - Scrollable content area with modular settings sections
 * 
 * The window is designed to be opened from the File menu in the main window.
 * New settings sections can be easily added by using the OptionsSection component.
 * 
 * @example
 * // Adding a new settings section in the future:
 * <OptionsSection title="Privacy" testId="options-privacy">
 *     <PrivacySettings />
 * </OptionsSection>
 */
export function OptionsWindow() {
    return (
        <ErrorBoundary>
            <div className="options-window" data-testid="options-window">
                <OptionsWindowTitlebar title="Options" />
                <main className="options-content" data-testid="options-content">
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
                </main>
            </div>
        </ErrorBoundary>
    );
}


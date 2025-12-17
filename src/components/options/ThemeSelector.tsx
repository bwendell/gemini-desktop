/**
 * ThemeSelector Component
 * 
 * A visually appealing theme selection component with animated preview cards.
 * Each card displays a mini-preview of the theme colors with smooth transitions.
 * 
 * Features:
 * - Visual theme preview cards with light/dark color representations
 * - Animated selection indicator using Framer Motion
 * - Keyboard accessible (Tab navigation, Enter/Space to select)
 * - Graceful degradation if animations fail
 * 
 * @module ThemeSelector
 * @example
 * <ThemeSelector />
 */

import React, { useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme, Theme } from '../../context/ThemeContext';
import './ThemeSelector.css';

// ============================================================================
// Types
// ============================================================================

/** Configuration for a theme option card */
interface ThemeOption {
    /** Theme identifier */
    id: Theme;
    /** Display label for the theme */
    label: string;
    /** Icon component or element */
    icon: React.ReactNode;
    /** Colors to show in the preview */
    previewColors: {
        background: string;
        foreground: string;
        accent: string;
    };
}

/** Props for the ThemeCard component */
interface ThemeCardProps {
    /** Theme option configuration */
    option: ThemeOption;
    /** Whether this card is currently selected */
    isSelected: boolean;
    /** Callback when this card is clicked */
    onSelect: () => void;
}

// ============================================================================
// Theme Options Configuration
// ============================================================================

/**
 * Theme options with their visual configurations.
 * Easily extendable for future theme additions.
 */
const THEME_OPTIONS: ThemeOption[] = [
    {
        id: 'system',
        label: 'System',
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4 6h16v10H4V6zm16-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h6v2H8v2h8v-2h-2v-2h6c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" />
            </svg>
        ),
        previewColors: {
            background: 'linear-gradient(135deg, #1a1a1a 50%, #ffffff 50%)',
            foreground: '#888888',
            accent: '#8ab4f8',
        },
    },
    {
        id: 'light',
        label: 'Light',
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
            </svg>
        ),
        previewColors: {
            background: '#ffffff',
            foreground: '#202124',
            accent: '#1a73e8',
        },
    },
    {
        id: 'dark',
        label: 'Dark',
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
            </svg>
        ),
        previewColors: {
            background: '#1a1a1a',
            foreground: '#e8eaed',
            accent: '#8ab4f8',
        },
    },
];

// ============================================================================
// Animation Variants
// ============================================================================

/** Animation variants for card hover and selection states */
const cardVariants = {
    initial: { scale: 1, y: 0 },
    hover: { scale: 1.02, y: -2 },
    tap: { scale: 0.98 },
};

/** Animation variants for the checkmark indicator */
const checkmarkVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0, opacity: 0 },
};

// ============================================================================
// ThemeCard Component
// ============================================================================

/**
 * Individual theme selection card with preview and animation.
 * Memoized for performance optimization.
 */
const ThemeCard = memo(function ThemeCard({ option, isSelected, onSelect }: ThemeCardProps) {
    /**
     * Handle keyboard interaction for accessibility.
     * Activates on Enter or Space key press.
     */
    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect();
        }
    }, [onSelect]);

    return (
        <motion.div
            className={`theme-card ${isSelected ? 'theme-card--selected' : ''}`}
            variants={cardVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
            role="radio"
            aria-checked={isSelected}
            aria-label={`${option.label} theme`}
            tabIndex={0}
            data-testid={`theme-card-${option.id}`}
        >
            {/* Theme Preview */}
            <div
                className="theme-card__preview"
                style={{ background: option.previewColors.background }}
                aria-hidden="true"
            >
                <div
                    className="theme-card__preview-content"
                    style={{
                        backgroundColor: option.id === 'system' ? 'transparent' : option.previewColors.background,
                    }}
                >
                    {/* Mini UI mockup */}
                    <div
                        className="theme-card__preview-header"
                        style={{
                            backgroundColor: option.id === 'system'
                                ? 'rgba(128, 128, 128, 0.3)'
                                : option.id === 'light' ? '#f0f0f0' : '#1f1f1f'
                        }}
                    />
                    <div className="theme-card__preview-body">
                        <div
                            className="theme-card__preview-text"
                            style={{ backgroundColor: option.previewColors.foreground }}
                        />
                        <div
                            className="theme-card__preview-accent"
                            style={{ backgroundColor: option.previewColors.accent }}
                        />
                    </div>
                </div>
            </div>

            {/* Card Label */}
            <div className="theme-card__label">
                <span className="theme-card__icon" aria-hidden="true">
                    {option.icon}
                </span>
                <span className="theme-card__text">{option.label}</span>
            </div>

            {/* Selection Indicator */}
            <AnimatePresence>
                {isSelected && (
                    <motion.div
                        className="theme-card__checkmark"
                        variants={checkmarkVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        data-testid={`theme-checkmark-${option.id}`}
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
});

// ============================================================================
// ThemeSelector Component
// ============================================================================

/**
 * Theme selector component with animated preview cards.
 * 
 * Provides a visually appealing way to select between system, light, and dark themes.
 * Uses Framer Motion for smooth animations and transitions.
 * 
 * @returns The theme selector component
 */
export const ThemeSelector = memo(function ThemeSelector() {
    const { theme, setTheme } = useTheme();

    /**
     * Handle theme selection.
     * Errors are handled by ThemeContext.setTheme.
     */
    const handleThemeSelect = useCallback((themeId: Theme) => {
        setTheme(themeId);
        console.log(`[ThemeSelector] Theme changed to: ${themeId}`);
    }, [setTheme]);

    return (
        <div
            className="theme-selector-container"
            role="radiogroup"
            aria-label="Theme selection"
            data-testid="theme-selector"
        >
            <div className="theme-selector-cards">
                {THEME_OPTIONS.map((option) => (
                    <ThemeCard
                        key={option.id}
                        option={option}
                        isSelected={theme === option.id}
                        onSelect={() => handleThemeSelect(option.id)}
                    />
                ))}
            </div>
        </div>
    );
});

// Re-export for barrel imports
export default ThemeSelector;

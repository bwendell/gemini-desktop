import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AboutSection } from './AboutSection';

// Version injected from package.json via vitest define
declare const __APP_VERSION__: string;

describe('AboutSection', () => {
    it('renders the title and version', () => {
        render(<AboutSection />);
        expect(screen.getByText('Gemini Desktop')).toBeInTheDocument();
        expect(screen.getByTestId('about-version')).toHaveTextContent(`Version ${__APP_VERSION__}`);
    });

    it('renders the legal disclaimer', () => {
        render(<AboutSection />);
        expect(screen.getByTestId('about-disclaimer')).toHaveTextContent(/unofficial/i);
        expect(screen.getByTestId('about-disclaimer')).toHaveTextContent(/NOT affiliated/);
    });

    it('renders trademark notices', () => {
        render(<AboutSection />);
        expect(screen.getByText(/"Gemini" and "Google" are registered trademarks/i)).toBeInTheDocument();
    });

    it('renders all required links with correct attributes', () => {
        render(<AboutSection />);

        const licenseLink = screen.getByTestId('about-license-link');
        expect(licenseLink).toHaveAttribute('href', expect.stringContaining('LICENSE'));
        expect(licenseLink).toHaveAttribute('target', '_blank');
        expect(licenseLink).toHaveAttribute('rel', 'noopener noreferrer');

        const disclaimerLink = screen.getByTestId('about-disclaimer-link');
        expect(disclaimerLink).toHaveAttribute('href', expect.stringContaining('DISCLAIMER.md'));

        const tosLink = screen.getByTestId('about-google-tos-link');
        expect(tosLink).toHaveAttribute('href', 'https://policies.google.com/terms');

        const aiLink = screen.getByTestId('about-google-ai-link');
        expect(aiLink).toHaveAttribute('href', 'https://policies.google.com/terms/generative-ai');
    });

    it('renders copyright notice', () => {
        render(<AboutSection />);
        expect(screen.getByText(/© 2025 Ben Wendell/)).toBeInTheDocument();
    });
});

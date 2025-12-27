import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineOverlay } from './OfflineOverlay';

describe('OfflineOverlay', () => {
  it('renders overlay container', () => {
    render(<OfflineOverlay />);
    const overlay = document.querySelector('.offline-overlay');
    expect(overlay).toBeInTheDocument();
  });

  it('renders offline message', () => {
    render(<OfflineOverlay />);
    expect(screen.getByText('Network Unavailable')).toBeInTheDocument();
    expect(
      screen.getByText('Please check your internet connection to continue using Gemini.')
    ).toBeInTheDocument();
  });

  it('renders offline icon', () => {
    render(<OfflineOverlay />);
    const icon = document.querySelector('.offline-icon');
    expect(icon).toBeInTheDocument();
    expect(icon?.tagName.toLowerCase()).toBe('svg');
  });

  it('has correct class for styling', () => {
    render(<OfflineOverlay />);
    const overlay = document.querySelector('.offline-overlay');
    expect(overlay).toHaveClass('offline-overlay');
  });
});

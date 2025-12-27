/**
 * Integration test for macOS titlebar styling.
 *
 * Verifies that the titlebar correctly handles macOS traffic light button spacing
 * by applying the appropriate CSS class and padding.
 */

import { browser, expect } from '@wdio/globals';

describe('macOS Titlebar Integration Tests', () => {
  before(async () => {
    await browser.waitUntil(async () => (await browser.getWindowHandles()).length > 0);
  });

  it('should have correct titlebar structure on macOS', async () => {
    // Get platform from Electron
    const platform = await browser.execute(() => {
      return (window as any).electronAPI?.platform;
    });

    // Skip if not on macOS (test will pass but not really run the assertions)
    if (platform !== 'darwin') {
      console.log('Skipping macOS-specific test on non-macOS platform');
      return;
    }

    // Check titlebar exists
    const titlebar = await browser.$('.titlebar');
    await expect(titlebar).toBeExisting();

    // Verify macOS class is applied
    const hasMacOsClass = await browser.execute(() => {
      const titlebar = document.querySelector('.titlebar');
      return titlebar?.classList.contains('macos');
    });
    expect(hasMacOsClass).toBe(true);

    // Verify padding is applied (check computed style)
    const paddingLeft = await browser.execute(() => {
      const leftSection = document.querySelector('.titlebar-left');
      return leftSection ? window.getComputedStyle(leftSection).paddingLeft : null;
    });

    // Should be 70px as defined in CSS
    expect(paddingLeft).toBe('70px');
  });

  it('should not have macOS class on Windows/Linux', async () => {
    // Get platform from Electron
    const platform = await browser.execute(() => {
      return (window as any).electronAPI?.platform;
    });

    // Skip if on macOS (test will pass but not really run the assertions)
    if (platform === 'darwin') {
      console.log('Skipping Windows/Linux-specific test on macOS platform');
      return;
    }

    // Check titlebar exists
    const titlebar = await browser.$('.titlebar');
    await expect(titlebar).toBeExisting();

    // Verify macOS class is NOT applied
    const hasMacOsClass = await browser.execute(() => {
      const titlebar = document.querySelector('.titlebar');
      return titlebar?.classList.contains('macos');
    });
    expect(hasMacOsClass).toBe(false);

    // Verify default padding is applied (12px)
    const paddingLeft = await browser.execute(() => {
      const leftSection = document.querySelector('.titlebar-left');
      return leftSection ? window.getComputedStyle(leftSection).paddingLeft : null;
    });

    expect(paddingLeft).toBe('12px');
  });

  it('should have titlebar-left element positioned correctly', async () => {
    // Verify titlebar-left exists
    const leftSection = await browser.$('.titlebar-left');
    await expect(leftSection).toBeExisting();

    // Verify it contains the icon
    const icon = await browser.$('.titlebar-left .titlebar-icon img');
    await expect(icon).toBeExisting();

    // Verify the titlebar-left is a flex container
    const display = await browser.execute(() => {
      const leftSection = document.querySelector('.titlebar-left');
      return leftSection ? window.getComputedStyle(leftSection).display : null;
    });
    expect(display).toBe('flex');
  });
});

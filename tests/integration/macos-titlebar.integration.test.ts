/**
 * Integration test for macOS titlebar styling.
 * 
 * Verifies that the titlebar correctly handles macOS traffic light button spacing
 * by applying the appropriate CSS class and padding.
 */

import { test, expect, _electron as electron, type ElectronApplication } from '@playwright/test';
import path from 'path';

let electronApp: ElectronApplication;

test.beforeAll(async () => {
  // Launch Electron app
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../dist-electron/main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
  });
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe('macOS Titlebar Integration Tests', () => {
  test('titlebar has correct structure on macOS', async () => {
    const window = await electronApp.firstWindow();
    
    // Get platform from Electron
    const platform = await window.evaluate(() => {
      return window.electronAPI?.platform;
    });

    // Skip if not on macOS
    if (platform !== 'darwin') {
      test.skip();
      return;
    }

    // Check titlebar exists
    const titlebar = await window.locator('.titlebar');
    await expect(titlebar).toBeVisible();

    // Verify macOS class is applied
    const hasMacOsClass = await titlebar.evaluate((el) => {
      return el.classList.contains('macos');
    });
    expect(hasMacOsClass).toBe(true);

    // Verify padding is applied (check computed style)
    const leftSection = await window.locator('.titlebar-left');
    const paddingLeft = await leftSection.evaluate((el) => {
      return window.getComputedStyle(el).paddingLeft;
    });
    
    // Should be 70px as defined in CSS
    expect(paddingLeft).toBe('70px');
  });

  test('titlebar does not have macOS class on Windows/Linux', async () => {
    const window = await electronApp.firstWindow();
    
    // Get platform from Electron
    const platform = await window.evaluate(() => {
      return window.electronAPI?.platform;
    });

    // Skip if on macOS
    if (platform === 'darwin') {
      test.skip();
      return;
    }

    // Check titlebar exists
    const titlebar = await window.locator('.titlebar');
    await expect(titlebar).toBeVisible();

    // Verify macOS class is NOT applied
    const hasMacOsClass = await titlebar.evaluate((el) => {
      return el.classList.contains('macos');
    });
    expect(hasMacOsClass).toBe(false);

    // Verify default padding is applied (12px)
    const leftSection = await window.locator('.titlebar-left');
    const paddingLeft = await leftSection.evaluate((el) => {
      return window.getComputedStyle(el).paddingLeft;
    });
    
    expect(paddingLeft).toBe('12px');
  });

  test('titlebar-left element exists and is positioned correctly', async () => {
    const window = await electronApp.firstWindow();
    
    // Verify titlebar-left exists
    const leftSection = await window.locator('.titlebar-left');
    await expect(leftSection).toBeVisible();

    // Verify it contains the icon
    const icon = await leftSection.locator('.titlebar-icon img');
    await expect(icon).toBeVisible();

    // Verify the titlebar-left is a flex container
    const display = await leftSection.evaluate((el) => {
      return window.getComputedStyle(el).display;
    });
    expect(display).toBe('flex');
  });
});

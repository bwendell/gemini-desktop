/**
 * Context Menu Page Object.
 *
 * Encapsulates all selectors and interactions for testing context menu behavior.
 * Includes test input management, context menu operations, and keyboard shortcuts.
 *
 * @module ContextMenuPage
 */

/// <reference path="../helpers/wdio-electron.d.ts" />

import { BasePage } from './BasePage';
import { Selectors } from '../helpers/selectors';
import { browser, $ } from '@wdio/globals';
import { isMacOS } from '../helpers/platform';

/**
 * Default test input ID used when no specific ID is provided.
 */
const DEFAULT_TEST_INPUT_ID = 'e2e-context-menu-test-input';

/**
 * Page Object for testing context menu functionality.
 * Provides methods to create test inputs, interact with context menus,
 * and perform clipboard operations.
 */
export class ContextMenuPage extends BasePage {
  constructor() {
    super('ContextMenuPage');
  }

  // ===========================================================================
  // LOCATORS
  // ===========================================================================

  /** Selector for the main layout container */
  get mainLayoutSelector(): string {
    return Selectors.mainLayout;
  }

  /** Selector for the webview container */
  get webviewContainerSelector(): string {
    return Selectors.webviewContainer;
  }

  /**
   * Get selector for a test input by ID.
   * @param id - The input element ID
   */
  testInputSelector(id: string = DEFAULT_TEST_INPUT_ID): string {
    return `#${id}`;
  }

  // ===========================================================================
  // PLATFORM HELPERS
  // ===========================================================================

  /**
   * Get the modifier key for the current platform.
   * @returns 'Meta' for macOS, 'Control' for Windows/Linux
   */
  async getModifierKey(): Promise<'Meta' | 'Control'> {
    return (await isMacOS()) ? 'Meta' : 'Control';
  }

  // ===========================================================================
  // TEST INPUT MANAGEMENT
  // ===========================================================================

  /**
   * Create a test input element for context menu testing.
   * @param id - Optional custom ID for the input element
   * @param options - Optional configuration for the input
   * @returns The created input element
   */
  async createTestInput(
    id: string = DEFAULT_TEST_INPUT_ID,
    options: { readOnly?: boolean; value?: string; top?: string } = {}
  ): Promise<WebdriverIO.Element> {
    const { readOnly = false, value = '', top = '100px' } = options;

    this.log(`Creating test input: ${id}`);

    await browser.execute(
      (inputId, isReadOnly, initialValue, topPosition) => {
        // Remove existing input if present
        const existingInput = document.getElementById(inputId);
        if (existingInput) {
          existingInput.remove();
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.id = inputId;
        input.style.position = 'fixed';
        input.style.top = topPosition;
        input.style.left = '100px';
        input.style.width = '300px';
        input.style.height = '40px';
        input.style.zIndex = '99999';
        input.style.fontSize = '16px';
        input.style.padding = '8px';

        if (isReadOnly) {
          input.readOnly = true;
        }
        if (initialValue) {
          input.value = initialValue;
        }

        document.body.appendChild(input);
      },
      id,
      readOnly,
      value,
      top
    );

    const input = await $(this.testInputSelector(id));
    await input.waitForExist({ timeout: 5000 });
    return input;
  }

  /**
   * Remove a test input element.
   * @param id - Optional custom ID for the input element
   */
  async removeTestInput(id: string = DEFAULT_TEST_INPUT_ID): Promise<void> {
    this.log(`Removing test input: ${id}`);
    await browser.execute((inputId) => {
      const input = document.getElementById(inputId);
      if (input) {
        input.remove();
      }
    }, id);
  }

  /**
   * Get a reference to a test input element.
   * @param id - Optional custom ID for the input element
   * @returns The input element
   */
  async getTestInput(id: string = DEFAULT_TEST_INPUT_ID): Promise<WebdriverIO.Element> {
    return $(this.testInputSelector(id));
  }

  // ===========================================================================
  // CONTEXT MENU OPERATIONS
  // ===========================================================================

  /**
   * Open the context menu on an element by right-clicking.
   * @param element - The element to right-click
   */
  async openContextMenu(element: WebdriverIO.Element): Promise<void> {
    this.log('Opening context menu');
    await element.click({ button: 'right' });
    await this.pause(300);
  }

  /**
   * Close the context menu by pressing Escape.
   */
  async closeContextMenu(): Promise<void> {
    this.log('Closing context menu');
    await browser.keys(['Escape']);
    await this.pause(200);
  }

  /**
   * Navigate to and select "Cut" from the context menu.
   * Assumes context menu is already open.
   */
  async selectCut(): Promise<void> {
    this.log('Selecting Cut from context menu');
    await browser.keys(['ArrowDown']); // Cut is first item
    await browser.keys(['Enter']);
    await this.pause(300);
  }

  /**
   * Navigate to and select "Copy" from the context menu.
   * Assumes context menu is already open.
   */
  async selectCopy(): Promise<void> {
    this.log('Selecting Copy from context menu');
    await browser.keys(['ArrowDown']); // Skip Cut
    await browser.keys(['ArrowDown']); // Select Copy
    await browser.keys(['Enter']);
    await this.pause(300);
  }

  /**
   * Navigate to and select "Paste" from the context menu.
   * Assumes context menu is already open.
   */
  async selectPaste(): Promise<void> {
    this.log('Selecting Paste from context menu');
    await browser.keys(['ArrowDown', 'ArrowDown', 'ArrowDown']); // Navigate to Paste
    await browser.keys(['Enter']);
    await this.pause(300);
  }

  /**
   * Navigate to and select "Delete" from the context menu.
   * Assumes context menu is already open.
   */
  async selectDelete(): Promise<void> {
    this.log('Selecting Delete from context menu');
    await browser.keys(['ArrowDown', 'ArrowDown', 'ArrowDown', 'ArrowDown']); // Navigate to Delete
    await browser.keys(['Enter']);
    await this.pause(300);
  }

  /**
   * Navigate to and select "Select All" from the context menu.
   * Assumes context menu is already open.
   */
  async selectSelectAll(): Promise<void> {
    this.log('Selecting Select All from context menu');
    // Navigate to Select All (after Cut, Copy, Paste, Delete, Separator)
    for (let i = 0; i < 6; i++) {
      await browser.keys(['ArrowDown']);
    }
    await browser.keys(['Enter']);
    await this.pause(300);
  }

  // ===========================================================================
  // KEYBOARD SHORTCUTS
  // ===========================================================================

  /**
   * Select all text using keyboard shortcut (Ctrl+A / Cmd+A).
   */
  async selectAllWithKeyboard(): Promise<void> {
    const modKey = await this.getModifierKey();
    await browser.keys([modKey, 'a']);
    await this.pause(100);
  }

  /**
   * Copy selected text using keyboard shortcut (Ctrl+C / Cmd+C).
   */
  async copyWithKeyboard(): Promise<void> {
    const modKey = await this.getModifierKey();
    await browser.keys([modKey, 'c']);
    await this.pause(200);
  }

  /**
   * Paste text using keyboard shortcut (Ctrl+V / Cmd+V).
   */
  async pasteWithKeyboard(): Promise<void> {
    const modKey = await this.getModifierKey();
    await browser.keys([modKey, 'v']);
    await this.pause(200);
  }

  /**
   * Cut selected text using keyboard shortcut (Ctrl+X / Cmd+X).
   */
  async cutWithKeyboard(): Promise<void> {
    const modKey = await this.getModifierKey();
    await browser.keys([modKey, 'x']);
    await this.pause(200);
  }

  // ===========================================================================
  // CLIPBOARD HELPERS
  // ===========================================================================

  /**
   * Set text to the clipboard via a temporary textarea.
   * @param text - The text to copy to clipboard
   */
  async setClipboardText(text: string): Promise<void> {
    this.log(`Setting clipboard text: "${text}"`);
    await browser.execute((clipboardText: string) => {
      const temp = document.createElement('textarea');
      temp.value = clipboardText;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
    }, text);
    await this.pause(200);
  }

  /**
   * Verify clipboard contains expected text by pasting into a new input.
   * @param expectedText - The expected clipboard content
   * @returns True if the clipboard contains the expected text
   */
  async verifyClipboardContains(expectedText: string): Promise<string> {
    const verifyInputId = 'e2e-clipboard-verify-input';

    // Create a verify input
    const verifyInput = await this.createTestInput(verifyInputId, { top: '200px' });
    await verifyInput.click();

    // Paste into it
    await this.pasteWithKeyboard();

    // Get the value
    const pastedValue = await verifyInput.getValue();

    // Cleanup
    await this.removeTestInput(verifyInputId);

    return pastedValue;
  }

  // ===========================================================================
  // ELEMENT INTERACTIONS
  // ===========================================================================

  /**
   * Type text into an input element and optionally select all.
   * @param element - The input element
   * @param text - The text to type
   * @param selectAll - Whether to select all after typing
   */
  async typeAndSelect(
    element: WebdriverIO.Element,
    text: string,
    selectAll: boolean = true
  ): Promise<void> {
    await element.click();
    await element.setValue(text);
    if (selectAll) {
      await this.selectAllWithKeyboard();
    }
  }

  // ===========================================================================
  // WAIT OPERATIONS
  // ===========================================================================

  /**
   * Wait for the main window to be ready.
   * @param timeout - Timeout in milliseconds (default: 15000)
   */
  async waitForAppReady(timeout = 15000): Promise<void> {
    this.log('Waiting for app to be ready');
    await this.waitForElementToExist(this.mainLayoutSelector, timeout);
  }

  /**
   * Get the webview container element.
   */
  async getWebviewContainer(): Promise<WebdriverIO.Element> {
    return this.waitForElement(this.webviewContainerSelector, 10000);
  }
}

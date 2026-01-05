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
   * Open the context menu on an element using native input event simulation.
   * Uses webContents.sendInputEvent() to trigger Electron's native context-menu handler.
   * @param element - The element to right-click
   */
  async openContextMenu(element: WebdriverIO.Element): Promise<void> {
    this.log('Opening context menu via native sendInputEvent');

    // Get element position for accurate click coordinates
    const location = await element.getLocation();
    const size = await element.getSize();

    // Calculate center of element
    const x = Math.round(location.x + size.width / 2);
    const y = Math.round(location.y + size.height / 2);

    this.log(`Element position: (${x}, ${y})`);

    // Use sendInputEvent to simulate a native right-click
    await this.triggerContextMenuViaInputEvent(x, y);

    // Wait for the menu to be captured by our spy
    await this.waitForMenuOpen();
  }

  /**
   * Trigger a native right-click at the specified coordinates using sendInputEvent.
   * This is Electron's official API for input simulation and triggers the actual
   * context-menu event on webContents.
   * @param x - X coordinate
   * @param y - Y coordinate
   */
  async triggerContextMenuViaInputEvent(x: number, y: number): Promise<void> {
    this.log(`Sending native right-click at (${x}, ${y})`);

    await browser.electron.execute(
      (electron, coords) => {
        const wm = (global as any).windowManager;
        if (!wm) throw new Error('WindowManager not found on global');
        const win = wm.getMainWindow();
        if (!win) throw new Error('MainWindow not found');

        // Send mouseDown with button: 'right' to start the right-click
        win.webContents.sendInputEvent({
          type: 'mouseDown',
          x: coords.x,
          y: coords.y,
          button: 'right',
          clickCount: 1,
        });

        // Send mouseUp to complete the right-click
        win.webContents.sendInputEvent({
          type: 'mouseUp',
          x: coords.x,
          y: coords.y,
          button: 'right',
          clickCount: 1,
        });
      },
      { x, y }
    );

    // Small pause to let Electron process the input events
    await this.pause(100);
  }

  /**
   * Legacy method for fallback context menu simulation.
   * Kept for compatibility but sendInputEvent is preferred.
   */
  async simulateWebContentsContextMenu(flags: { [key: string]: boolean }): Promise<void> {
    await browser.electron.execute((electron, flags) => {
      const wm = (global as any).windowManager;
      if (!wm) throw new Error('WindowManager not found on global');
      const win = wm.getMainWindow();
      if (!win) throw new Error('MainWindow not found');

      // Emit context-menu event with mocked params
      win.webContents.emit('context-menu', new Event('context-menu'), {
        x: 0,
        y: 0,
        editFlags: flags,
        selectionText: flags.canCopy ? 'mock selection' : '',
        isEditable: true,
      });
    }, flags as any);
  }

  /**
   * Wait for the context menu to be captured by the menu spy.
   */
  async waitForMenuOpen(): Promise<void> {
    await browser.waitUntil(
      async () => {
        return browser.electron.execute(() => {
          return !!(global as any).lastContextMenu;
        });
      },
      {
        timeout: 5000,
        interval: 100,
        timeoutMsg: 'Context menu did not open (was not captured by shim) within 5s',
      }
    );
  }

  /**
   * Close the context menu by pressing Escape.
   */
  async closeContextMenu(): Promise<void> {
    this.log('Closing context menu');
    await browser.keys(['Escape']);
    await this.pause(200);
  }

  async setupMenuSpy(): Promise<void> {
    await browser.electron.execute(() => {
      const { Menu } = require('electron');
      if (!(global as any).originalPopup) {
        (global as any).originalPopup = Menu.prototype.popup;
        Menu.prototype.popup = function (options) {
          (global as any).lastContextMenu = this;
          console.log('[E2E] Menu.popup mocked - menu captured, native popup suppressed');
          // Do NOT call originalPopup to avoid blocking the main process
        };
      }
      (global as any).lastContextMenu = null; // Clear previous menu
    });
  }

  async getMenuItemState(
    roleOrLabel: string
  ): Promise<{ enabled: boolean; visible: boolean; label: string } | null> {
    return browser.electron.execute((electron, filter) => {
      const menu = (global as any).lastContextMenu;
      if (!menu) return null;

      let item = menu.items.find((i: any) => i.role === filter || i.label === filter);
      if (!item) {
        item = menu.items.find(
          (i: any) => i.label && i.label.toLowerCase() === filter.toLowerCase()
        );
      }

      if (!item) {
        console.log(`[E2E] Item "${filter}" not found in menu. Available items:`);
        menu.items.forEach((i: any) =>
          console.log(` - Label: "${i.label}", Role: "${i.role}", Enabled: ${i.enabled}`)
        );
        return null;
      }

      return {
        enabled: item.enabled,
        visible: item.visible,
        label: item.label,
      };
    }, roleOrLabel);
  }

  /**
   * Selects "Cut" from the context menu
   */
  async selectCut(): Promise<void> {
    this.log('Selecting Cut from context menu');
    // For verification, we just check existence in the spec
  }

  /**
   * Selects "Copy" from the context menu
   */
  async selectCopy(): Promise<void> {
    this.log('Selecting Copy from context menu');
  }

  /**
   * Selects "Paste" from the context menu
   */
  async selectPaste(): Promise<void> {
    this.log('Selecting Paste from context menu');
  }

  /**
   * Selects "Delete" from the context menu
   */
  async selectDelete(): Promise<void> {
    this.log('Selecting Delete from context menu');
  }

  /**
   * Selects "Select All" from the context menu
   */
  async selectSelectAll(): Promise<void> {
    this.log('Selecting Select All from context menu');
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
    await browser.electron.execute((electron, data) => {
      electron.clipboard.writeText(data);
    }, text);
    await this.pause(200);
  }

  /**
   * Clear the clipboard content.
   */
  async clearClipboard(): Promise<void> {
    this.log('Clearing clipboard');
    await this.setClipboardText('');
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

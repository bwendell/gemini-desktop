/**
 * Quick Chat Application Component
 *
 * A macOS Spotlight-inspired floating input for sending prompts to Gemini.
 * Features glassmorphism styling, auto-focus, and keyboard shortcuts.
 *
 * @module QuickChatApp
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SearchIcon, SendIcon } from './Icons';
import { QUICK_CHAT_TEST_IDS } from '../../utils/testIds';
import './QuickChat.css';

/**
 * Main Quick Chat component.
 * Renders a Spotlight-like floating input with submit functionality.
 */
function QuickChatApp(): React.ReactElement {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Handle form submission.
   * Sends the prompt to main process and closes window.
   */
  const handleSubmit = useCallback(() => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue) {
      window.electronAPI?.submitQuickChat(trimmedValue);
      setInputValue('');
    }
  }, [inputValue]);

  /**
   * Handle keyboard events.
   * Enter = submit, Escape = cancel
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        window.electronAPI?.cancelQuickChat();
      }
    },
    [handleSubmit]
  );

  /**
   * Handle input value change.
   */
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  }, []);

  return (
    <div className="quick-chat-container" data-testid={QUICK_CHAT_TEST_IDS.QUICK_CHAT_CONTAINER}>
      <div className="quick-chat-input-wrapper">
        <div className="quick-chat-icon" aria-hidden="true">
          <SearchIcon />
        </div>
        <input
          ref={inputRef}
          type="text"
          className="quick-chat-input"
          placeholder="Ask Gemini..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          data-testid={QUICK_CHAT_TEST_IDS.QUICK_CHAT_INPUT}
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="quick-chat-submit"
          onClick={handleSubmit}
          disabled={!inputValue.trim()}
          data-testid={QUICK_CHAT_TEST_IDS.QUICK_CHAT_SUBMIT}
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

export default QuickChatApp;

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
import { createRendererLogger } from '../../utils';
import './QuickChat.css';

/** Logger for Quick Chat component */
const logger = createRendererLogger('[QuickChat]');

/** Debounce delay for text prediction requests in milliseconds */
const PREDICTION_DEBOUNCE_MS = 300;

/**
 * Main Quick Chat component.
 * Renders a Spotlight-like floating input with submit functionality.
 */
function QuickChatApp(): React.ReactElement {
  const [inputValue, setInputValue] = useState('');

  // Text prediction state
  const [prediction, setPrediction] = useState<string | null>(null);
  const [_isLoadingPrediction, setIsLoadingPrediction] = useState(false);
  const [isPredictionEnabled, setIsPredictionEnabled] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);

  // Ref for debounce timeout
  const predictionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync text prediction enabled state and model readiness from settings
  useEffect(() => {
    // Get initial prediction status
    logger.log('Loading initial prediction status...');
    window.electronAPI?.getTextPredictionStatus().then((settings) => {
      logger.log('Initial prediction status:', {
        enabled: settings.enabled,
        status: settings.status,
        isReady: settings.status === 'ready',
      });
      setIsPredictionEnabled(settings.enabled);
      setIsModelReady(settings.status === 'ready');
    });

    // Subscribe to status changes
    const unsubscribe = window.electronAPI?.onTextPredictionStatusChanged((settings) => {
      logger.log('Prediction status changed:', {
        enabled: settings.enabled,
        status: settings.status,
        isReady: settings.status === 'ready',
      });
      setIsPredictionEnabled(settings.enabled);
      setIsModelReady(settings.status === 'ready');
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (predictionTimeoutRef.current) {
        clearTimeout(predictionTimeoutRef.current);
      }
    };
  }, []);

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
      setPrediction(null);
    }
  }, [inputValue]);

  /**
   * Handle keyboard events.
   * Enter = submit, Escape = cancel, Tab = accept prediction
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        // If prediction is showing, dismiss it first; otherwise cancel Quick Chat
        if (prediction) {
          logger.log('Escape pressed, dismissing prediction');
          setPrediction(null);
        } else {
          window.electronAPI?.cancelQuickChat();
        }
      } else if (event.key === 'Tab' && prediction) {
        // Accept prediction: append to input and clear prediction
        event.preventDefault();
        logger.log('Tab pressed, accepting prediction:', prediction);
        setInputValue(inputValue + prediction);
        setPrediction(null);
      }
    },
    [handleSubmit, prediction, inputValue]
  );

  /**
   * Handle input value change with debounced prediction requests.
   * Requests prediction 300ms after user stops typing.
   */
  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      setInputValue(newValue);

      // Cancel any pending prediction request
      if (predictionTimeoutRef.current) {
        clearTimeout(predictionTimeoutRef.current);
        predictionTimeoutRef.current = null;
      }

      // Clear prediction when typing continues
      setPrediction(null);

      // Only request prediction if enabled, model ready, and input has content
      if (!isPredictionEnabled || !isModelReady || !newValue.trim()) {
        logger.log('Prediction skipped:', {
          isPredictionEnabled,
          isModelReady,
          hasContent: Boolean(newValue.trim()),
        });
        setIsLoadingPrediction(false);
        return;
      }

      // Debounce prediction request
      logger.log('Scheduling prediction request for:', newValue.substring(0, 50));
      setIsLoadingPrediction(true);
      predictionTimeoutRef.current = setTimeout(async () => {
        try {
          logger.log('Requesting prediction from LLM...');
          const result = await window.electronAPI?.predictText(newValue);
          // Only set prediction if we got a result and input hasn't changed
          if (result) {
            logger.log('Prediction received:', result.substring(0, 50));
            setPrediction(result);
          } else {
            logger.log('No prediction returned');
          }
        } catch {
          // Silently ignore prediction errors
          logger.log('Prediction request failed');
        } finally {
          setIsLoadingPrediction(false);
        }
      }, PREDICTION_DEBOUNCE_MS);
    },
    [isPredictionEnabled, isModelReady]
  );

  return (
    <div className="quick-chat-container" data-testid={QUICK_CHAT_TEST_IDS.QUICK_CHAT_CONTAINER}>
      <div className="quick-chat-input-wrapper">
        <div className="quick-chat-icon" aria-hidden="true">
          <SearchIcon />
        </div>
        {/* Ghost text overlay - shows current input + prediction */}
        {prediction && (
          <div
            className="quick-chat-ghost-text"
            aria-hidden="true"
            data-testid={QUICK_CHAT_TEST_IDS.QUICK_CHAT_GHOST_TEXT}
          >
            <span className="quick-chat-ghost-text-typed">{inputValue}</span>
            <span className="quick-chat-ghost-text-prediction">{prediction}</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          className="quick-chat-input"
          placeholder="Ask Gemini..."
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            logger.log('Input blurred, clearing prediction');
            setPrediction(null);
          }}
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

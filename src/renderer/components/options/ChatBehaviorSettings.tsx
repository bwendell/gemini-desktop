/**
 * ChatBehaviorSettings Component
 *
 * Configures behaviors related to the Gemini chat view, including:
 * - Smart Enter (blocking submit key while attachments upload)
 * - Scroll-to-Bottom button visibility
 *
 * @module ChatBehaviorSettings
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { CapsuleToggle } from '../common/CapsuleToggle';

export const ChatBehaviorSettings = memo(function ChatBehaviorSettings() {
    const [smartEnterEnabled, setSmartEnterEnabled] = useState(true);
    const [scrollToBottomEnabled, setScrollToBottomEnabled] = useState(true);
    const [loading, setLoading] = useState(true);

    // Load initial states from main process settings store
    useEffect(() => {
        let isMounted = true;

        const loadState = async () => {
            try {
                const getSmartEnter = window.electronAPI?.getSmartEnterEnabled;
                const getScrollToBottom = window.electronAPI?.getScrollToBottomButtonEnabled;

                if (typeof getSmartEnter !== 'function' || typeof getScrollToBottom !== 'function') {
                    return;
                }

                const [seEnabled, stbEnabled] = await Promise.all([getSmartEnter(), getScrollToBottom()]);

                if (isMounted) {
                    setSmartEnterEnabled(seEnabled ?? true);
                    setScrollToBottomEnabled(stbEnabled ?? true);
                }
            } catch (error) {
                console.error('Failed to load chat behavior settings state:', error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadState();

        return () => {
            isMounted = false;
        };
    }, []);

    // Handle Smart Enter toggle change
    const handleSmartEnterChange = useCallback(async (newEnabled: boolean) => {
        setSmartEnterEnabled(newEnabled);

        try {
            const setSmartEnter = window.electronAPI?.setSmartEnterEnabled;
            if (typeof setSmartEnter === 'function') {
                await setSmartEnter(newEnabled);
            }
        } catch (error) {
            console.error('Failed to set smart enter state:', error);
            // Revert on failure
            setSmartEnterEnabled((current) => !current);
        }
    }, []);

    // Handle Scroll to Bottom toggle change
    const handleScrollToBottomChange = useCallback(async (newEnabled: boolean) => {
        setScrollToBottomEnabled(newEnabled);

        try {
            const setScrollToBottom = window.electronAPI?.setScrollToBottomButtonEnabled;
            if (typeof setScrollToBottom === 'function') {
                await setScrollToBottom(newEnabled);
            }
        } catch (error) {
            console.error('Failed to set scroll to bottom button state:', error);
            // Revert on failure
            setScrollToBottomEnabled((current) => !current);
        }
    }, []);

    if (loading) {
        return (
            <div className="chat-behavior-settings loading" data-testid="chat-behavior-settings-loading">
                Loading...
            </div>
        );
    }

    return (
        <div
            className="chat-behavior-settings"
            data-testid="chat-behavior-settings"
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
            <CapsuleToggle
                checked={smartEnterEnabled}
                onChange={handleSmartEnterChange}
                label="Queue Submit on Upload (Smart Enter)"
                description="Prevent empty submissions by waiting for active image uploads to finish before sending"
                testId="smart-enter-toggle"
            />
            <CapsuleToggle
                checked={scrollToBottomEnabled}
                onChange={handleScrollToBottomChange}
                label="Scroll-to-Bottom Button"
                description="Show a floating down-arrow button (▼) to quickly scroll down in conversations"
                testId="scroll-to-bottom-toggle"
            />
        </div>
    );
});

export default ChatBehaviorSettings;

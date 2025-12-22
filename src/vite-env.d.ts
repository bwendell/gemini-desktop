/// <reference types="vite/client" />

interface Window {
    electronAPI?: {
        minimizeWindow: () => void;
        maximizeWindow: () => void;
        closeWindow: () => void;
        isMaximized: () => Promise<boolean>;
        openOptions: (tab?: 'settings' | 'about') => void;
        openGoogleSignIn: () => Promise<void>;

        // Theme API
        getTheme: () => Promise<{ preference: 'light' | 'dark' | 'system'; effectiveTheme: 'light' | 'dark' }>;
        setTheme: (theme: 'light' | 'dark' | 'system') => void;
        onThemeChanged: (callback: (data: { preference: 'light' | 'dark' | 'system'; effectiveTheme: 'light' | 'dark' }) => void) => () => void;

        // Quick Chat API
        submitQuickChat: (text: string) => void;
        hideQuickChat: () => void;
        cancelQuickChat: () => void;
        onQuickChatExecute: (callback: (text: string) => void) => () => void;

        // Individual Hotkeys API
        getIndividualHotkeys: () => Promise<{ alwaysOnTop: boolean; bossKey: boolean; quickChat: boolean }>;
        setIndividualHotkey: (id: 'alwaysOnTop' | 'bossKey' | 'quickChat', enabled: boolean) => void;
        onIndividualHotkeysChanged: (callback: (settings: { alwaysOnTop: boolean; bossKey: boolean; quickChat: boolean }) => void) => () => void;

        // Always On Top API
        getAlwaysOnTop: () => Promise<{ enabled: boolean }>;
        setAlwaysOnTop: (enabled: boolean) => void;
        onAlwaysOnTopChanged: (callback: (data: { enabled: boolean }) => void) => () => void;

        platform: string;
        isElectron: boolean;
    };
}

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
    getTheme: () => Promise<{
      preference: 'light' | 'dark' | 'system';
      effectiveTheme: 'light' | 'dark';
    }>;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    onThemeChanged: (
      callback: (data: {
        preference: 'light' | 'dark' | 'system';
        effectiveTheme: 'light' | 'dark';
      }) => void
    ) => () => void;

    // Quick Chat API
    submitQuickChat: (text: string) => void;
    hideQuickChat: () => void;
    cancelQuickChat: () => void;
    onQuickChatExecute: (callback: (text: string) => void) => () => void;

    // Gemini Iframe Navigation API (for Quick Chat integration)
    onGeminiNavigate: (callback: (data: { url: string; text: string }) => void) => () => void;
    signalGeminiReady: (text: string) => void;

    // Individual Hotkeys API
    getIndividualHotkeys: () => Promise<{
      alwaysOnTop: boolean;
      bossKey: boolean;
      quickChat: boolean;
      printToPdf: boolean;
    }>;
    setIndividualHotkey: (
      id: 'alwaysOnTop' | 'bossKey' | 'quickChat' | 'printToPdf',
      enabled: boolean
    ) => void;
    onIndividualHotkeysChanged: (
      callback: (settings: {
        alwaysOnTop: boolean;
        bossKey: boolean;
        quickChat: boolean;
        printToPdf: boolean;
      }) => void
    ) => () => void;

    // Hotkey Accelerators API
    getHotkeyAccelerators: () => Promise<{
      alwaysOnTop: string;
      bossKey: string;
      quickChat: string;
      printToPdf: string;
    }>;
    getFullHotkeySettings: () => Promise<{
      alwaysOnTop: { enabled: boolean; accelerator: string };
      bossKey: { enabled: boolean; accelerator: string };
      quickChat: { enabled: boolean; accelerator: string };
      printToPdf: { enabled: boolean; accelerator: string };
    }>;
    setHotkeyAccelerator: (
      id: 'alwaysOnTop' | 'bossKey' | 'quickChat' | 'printToPdf',
      accelerator: string
    ) => void;
    onHotkeyAcceleratorsChanged: (
      callback: (accelerators: {
        alwaysOnTop: string;
        bossKey: string;
        quickChat: string;
        printToPdf: string;
      }) => void
    ) => () => void;

    // Always On Top API
    getAlwaysOnTop: () => Promise<{ enabled: boolean }>;
    setAlwaysOnTop: (enabled: boolean) => void;
    onAlwaysOnTopChanged: (callback: (data: { enabled: boolean }) => void) => () => void;

    // Auto-Update API
    getAutoUpdateEnabled: () => Promise<boolean>;
    setAutoUpdateEnabled: (enabled: boolean) => void;
    checkForUpdates: () => void;
    installUpdate: () => void;
    onUpdateAvailable: (
      callback: (info: {
        version: string;
        releaseName?: string;
        releaseNotes?: string | Array<{ version: string; note: string }>;
      }) => void
    ) => () => void;
    onUpdateDownloaded: (
      callback: (info: {
        version: string;
        releaseName?: string;
        releaseNotes?: string | Array<{ version: string; note: string }>;
      }) => void
    ) => () => void;
    onUpdateError: (callback: (error: string) => void) => () => void;
    onUpdateNotAvailable: (
      callback: (info: {
        version: string;
        releaseName?: string;
        releaseNotes?: string | Array<{ version: string; note: string }>;
      }) => void
    ) => () => void;
    onDownloadProgress: (
      callback: (progress: {
        percent: number;
        bytesPerSecond?: number;
        transferred?: number;
        total?: number;
      }) => void
    ) => () => void;

    // Dev Testing API (only for manual testing in development)
    devShowBadge: (version?: string) => void;
    devClearBadge: () => void;
    devSetUpdateEnabled: (enabled: boolean) => void;
    devEmitUpdateEvent: (event: string, data: any) => void;
    devMockPlatform: (platform: string | null, env: Record<string, string> | null) => void;

    // E2E Testing Helpers
    onDebugTriggerError: (callback: () => void) => () => void;

    // Print to PDF API
    printToPdf: () => void;
    onPrintToPdfSuccess: (callback: (filePath: string) => void) => () => void;
    onPrintToPdfError: (callback: (error: string) => void) => () => void;

    // Print Progress API (for scrolling screenshot capture)
    cancelPrint: () => void;
    onPrintProgressStart: (callback: (data: { totalPages: number }) => void) => () => void;
    onPrintProgressUpdate: (
      callback: (data: { currentPage: number; totalPages: number; progress: number }) => void
    ) => () => void;
    onPrintProgressEnd: (
      callback: (data: { cancelled: boolean; success: boolean }) => void
    ) => () => void;
    onPrintOverlayHide: (callback: () => void) => () => void;
    onPrintOverlayShow: (callback: () => void) => () => void;

    platform: string;
    isElectron: boolean;
  };
}

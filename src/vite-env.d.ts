/// <reference types="vite/client" />

interface Window {
    electronAPI: {
        minimizeWindow: () => void;
        maximizeWindow: () => void;
        closeWindow: () => void;
        isMaximized: () => Promise<boolean>;
        openOptions: () => void;
        platform: string;
        isElectron: boolean;
    };
}

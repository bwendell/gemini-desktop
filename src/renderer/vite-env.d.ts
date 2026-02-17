/// <reference types="vite/client" />

import type { ElectronAPI } from '../shared/types';

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export {};

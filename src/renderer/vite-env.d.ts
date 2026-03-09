/// <reference types="vite/client" />

import type { ElectronAPI } from '../shared/types';

interface ToastTestHelpers {
    showToast: (options: import('./context/ToastContext').ShowToastOptions) => string;
    dismissToast: (id: string) => void;
    dismissAll: () => void;
    getToasts: () => import('./components/toast/ToastContainer').ToastItem[];
    showSuccess: (message: string, options?: Partial<import('./context/ToastContext').ShowToastOptions>) => string;
    showError: (message: string, options?: Partial<import('./context/ToastContext').ShowToastOptions>) => string;
    showInfo: (message: string, options?: Partial<import('./context/ToastContext').ShowToastOptions>) => string;
    showWarning: (message: string, options?: Partial<import('./context/ToastContext').ShowToastOptions>) => string;
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
        __toastTestHelpers?: ToastTestHelpers;
    }
}

export {};

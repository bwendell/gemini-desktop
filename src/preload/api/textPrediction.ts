import { ipcRenderer } from 'electron';

import { IPC_CHANNELS } from '../../shared/constants/ipc-channels';
import type { ElectronAPI } from '../../shared/types';
import type { TextPredictionSettings } from '../../shared/types/text-prediction';
import { createSubscription } from '../createSubscription';

export const textPredictionAPI: Pick<
    ElectronAPI,
    | 'getTextPredictionEnabled'
    | 'setTextPredictionEnabled'
    | 'getTextPredictionGpuEnabled'
    | 'setTextPredictionGpuEnabled'
    | 'getTextPredictionStatus'
    | 'onTextPredictionStatusChanged'
    | 'onTextPredictionDownloadProgress'
    | 'predictText'
> = {
    getTextPredictionEnabled: () => ipcRenderer.invoke(IPC_CHANNELS.TEXT_PREDICTION_GET_ENABLED),
    setTextPredictionEnabled: (enabled: boolean) =>
        ipcRenderer.invoke(IPC_CHANNELS.TEXT_PREDICTION_SET_ENABLED, enabled),
    getTextPredictionGpuEnabled: () => ipcRenderer.invoke(IPC_CHANNELS.TEXT_PREDICTION_GET_GPU_ENABLED),
    setTextPredictionGpuEnabled: (enabled: boolean) =>
        ipcRenderer.invoke(IPC_CHANNELS.TEXT_PREDICTION_SET_GPU_ENABLED, enabled),
    getTextPredictionStatus: () => ipcRenderer.invoke(IPC_CHANNELS.TEXT_PREDICTION_GET_STATUS),
    onTextPredictionStatusChanged: createSubscription<TextPredictionSettings>(IPC_CHANNELS.TEXT_PREDICTION_STATUS_CHANGED),
    onTextPredictionDownloadProgress: createSubscription<number>(IPC_CHANNELS.TEXT_PREDICTION_DOWNLOAD_PROGRESS),
    predictText: (partialText: string) => ipcRenderer.invoke(IPC_CHANNELS.TEXT_PREDICTION_PREDICT, partialText),
};

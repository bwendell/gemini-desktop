/**
 * Text Prediction Types
 *
 * Shared types for local LLM text prediction functionality across main and renderer processes.
 */

/**
 * Status of the local LLM model.
 */
export type ModelStatus = 'not-downloaded' | 'downloading' | 'initializing' | 'ready' | 'error';

/**
 * Text prediction settings and status information.
 */
export interface TextPredictionSettings {
    /** Whether text prediction is enabled */
    enabled: boolean;
    /** Whether GPU acceleration is enabled */
    gpuEnabled: boolean;
    /** Current status of the model */
    status: ModelStatus;
    /** Download progress percentage (0-100), present during download */
    downloadProgress?: number;
    /** Error message if status is 'error' */
    errorMessage?: string;
}

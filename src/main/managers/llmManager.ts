/**
 * LLM Manager for the Electron main process.
 *
 * Handles local LLM inference using node-llama-cpp for text prediction.
 * Manages model download, loading, GPU acceleration, and inference.
 *
 * @module LlmManager
 */

import { app } from 'electron';
import * as path from 'path';
import { existsSync, readFileSync } from 'fs';
// node-llama-cpp is ESM-only with top-level await, so we must use dynamic import()
// Types are imported for TypeScript but the actual module is loaded dynamically
import type { Llama, LlamaModel, LlamaContext, LlamaCompletion } from 'node-llama-cpp';
import { createLogger } from '../utils/logger';

const logger = createLogger('[LlmManager]');

/**
 * Helper to dynamically import ESM modules in CommonJS context.
 * Uses Function constructor to prevent TypeScript from transpiling import() to require().
 * This is necessary because node-llama-cpp is ESM-only with top-level await.
 */
async function importNodeLlamaCpp(): Promise<typeof import('node-llama-cpp')> {
    // Using Function constructor prevents TypeScript from transpiling this to require()
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const dynamicImport = new Function('specifier', 'return import(specifier)');
    return dynamicImport('node-llama-cpp');
}

/**
 * Model status states for tracking lifecycle.
 */
export type ModelStatus = 'not-downloaded' | 'downloading' | 'initializing' | 'ready' | 'error';

/**
 * Configuration for a supported LLM model.
 * Extensible structure allows adding new models easily.
 */
export interface ModelConfig {
    /** Unique identifier for the model */
    id: string;
    /** Human-readable display name */
    displayName: string;
    /** Hugging Face URI or direct download URL */
    uri: string;
    /** Expected file name after download */
    fileName: string;
    /** SHA256 checksum for validation (optional, node-llama-cpp validates internally) */
    sha256?: string;
    /** Approximate size in bytes for display purposes */
    sizeBytes: number;
}

/**
 * Registry of supported models.
 * Add new models here to extend LLM support.
 *
 * Using Qwen3 family for text completion:
 * - Qwen3-0.6B: Ultra-lightweight, fastest inference
 * - Qwen3-1.7B: Good balance of quality and speed (default)
 * - Qwen3-4B: Higher quality predictions
 */
export const MODEL_REGISTRY: Record<string, ModelConfig> = {
    'qwen3-0.6b': {
        id: 'qwen3-0.6b',
        displayName: 'Qwen3 0.6B',
        // Official Qwen GGUF - no authentication required
        uri: 'hf:Qwen/Qwen3-0.6B-GGUF/Qwen3-0.6B-Q8_0.gguf',
        // Note: node-llama-cpp prefixes the filename with the HF org name
        fileName: 'hf_Qwen_Qwen3-0.6B-Q8_0.gguf',
        sizeBytes: 640_000_000, // ~640 MB (q8_0 quantization)
    },
    'qwen3-1.7b': {
        id: 'qwen3-1.7b',
        displayName: 'Qwen3 1.7B',
        // Official Qwen GGUF - no authentication required
        uri: 'hf:Qwen/Qwen3-1.7B-GGUF/Qwen3-1.7B-Q8_0.gguf',
        // Note: node-llama-cpp prefixes the filename with the HF org name
        fileName: 'hf_Qwen_Qwen3-1.7B-Q8_0.gguf',
        sizeBytes: 1_800_000_000, // ~1.8 GB (q8_0 quantization)
    },
    'qwen3-4b': {
        id: 'qwen3-4b',
        displayName: 'Qwen3 4B',
        // Official Qwen GGUF - no authentication required
        uri: 'hf:Qwen/Qwen3-4B-GGUF/Qwen3-4B-Q4_K_M.gguf',
        // Note: node-llama-cpp prefixes the filename with the HF org name
        fileName: 'hf_Qwen_Qwen3-4B-Q4_K_M.gguf',
        sizeBytes: 2_560_000_000, // ~2.56 GB (Q4_K_M quantization)
    },
};

/** Default model to use for text prediction (0.6B for lower memory requirements) */
export const DEFAULT_MODEL_ID = 'qwen3-0.6b';

/**
 * Callback for download progress updates.
 */
export type DownloadProgressCallback = (percent: number) => void;

/**
 * Callback for status change events.
 */
export type StatusChangeCallback = (status: ModelStatus, errorMessage?: string) => void;

/**
 * LlmManager handles local LLM text prediction.
 *
 * Features:
 * - On-demand model download from Hugging Face
 * - GPU acceleration support with CPU fallback
 * - Text prediction inference
 * - Status tracking and events
 * - Extensible model registry for multiple LLM support
 */
export default class LlmManager {
    private status: ModelStatus = 'not-downloaded';
    private gpuEnabled = false;
    private errorMessage: string | null = null;
    private downloadProgress = 0;
    private currentModelId: string = DEFAULT_MODEL_ID;
    private modelPath: string | null = null;
    private abortController: AbortController | null = null;
    private nativeAvailable: boolean | null = null;
    private nativeProbeError: string | null = null;
    private nativeVersion: string | null = null;

    // node-llama-cpp instances
    private llama: Llama | null = null;
    private model: LlamaModel | null = null;
    private context: LlamaContext | null = null;
    private completion: LlamaCompletion | null = null;

    // Status change listeners
    private statusListeners: StatusChangeCallback[] = [];

    constructor() {
        logger.log('LlmManager created');
    }

    ensureNativeAvailable(context: string): boolean {
        if (this.nativeAvailable !== null) {
            return this.nativeAvailable;
        }

        if (process.env.NODE_ENV === 'test') {
            this.nativeAvailable = true;
            return true;
        }

        if (process.env.CI === 'true' || process.argv.includes('--integration-test')) {
            this.nativeAvailable = false;
            this.nativeProbeError = 'Native module operations disabled in CI or integration tests.';
            logger.warn('Native module probe blocked by environment', {
                context,
                ci: process.env.CI === 'true',
                integrationTest: process.argv.includes('--integration-test'),
            });
            return false;
        }

        if (process.type && process.type !== 'browser') {
            this.nativeAvailable = false;
            this.nativeProbeError = `node-llama-cpp must run in main process, got process.type=${process.type}`;
            logger.error('Native module probe failed (not main process)', {
                context,
                processType: process.type,
            });
            return false;
        }

        try {
            const pkgPath = require.resolve('node-llama-cpp/package.json');
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
            this.nativeVersion = pkg.version ?? null;
            if (!this.nativeVersion) {
                this.nativeAvailable = false;
                this.nativeProbeError = 'node-llama-cpp version missing in package.json';
                logger.warn('Native module probe failed (missing version)', {
                    context,
                    packageJsonPath: pkgPath,
                });
                return false;
            }
            this.nativeAvailable = true;
            logger.log('Native module probe succeeded', {
                context,
                version: this.nativeVersion,
                packageJsonPath: pkgPath,
            });
            return true;
        } catch (error) {
            this.nativeAvailable = false;
            this.nativeProbeError = error instanceof Error ? error.message : 'node-llama-cpp not found';
            const appPath = typeof app.getAppPath === 'function' ? app.getAppPath() : 'unknown';
            const isPackaged = typeof app.isPackaged === 'boolean' ? app.isPackaged : false;
            logger.warn('Native module probe failed', {
                context,
                error: this.nativeProbeError,
                appPath,
                isPackaged,
            });
            return false;
        }
    }

    isNativeAvailable(context: string = 'isNativeAvailable'): boolean {
        if (this.nativeAvailable === null) {
            return this.ensureNativeAvailable(context);
        }
        return this.nativeAvailable === true;
    }

    /**
     * Register a listener for status changes.
     */
    onStatusChange(callback: StatusChangeCallback): () => void {
        this.statusListeners.push(callback);
        return () => {
            this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
        };
    }

    /**
     * Update status and notify listeners.
     */
    private setStatus(status: ModelStatus, errorMessage?: string): void {
        this.status = status;
        this.errorMessage = errorMessage ?? null;
        logger.log('Status changed', { status, errorMessage });
        this.statusListeners.forEach((cb) => cb(status, errorMessage));
    }

    /**
     * Get the directory where models are stored.
     */
    getModelsDirectory(): string {
        return path.join(app.getPath('userData'), 'models');
    }

    /**
     * Validate that a model ID exists in the registry and return its config.
     * @throws Error if model ID is unknown
     */
    private validateModelId(modelId: string): ModelConfig {
        const config = MODEL_REGISTRY[modelId];
        if (!config) {
            throw new Error(`Unknown model: ${modelId}`);
        }
        return config;
    }

    /**
     * Get the full path for a model file.
     */
    getModelPath(modelId: string): string {
        const config = this.validateModelId(modelId);
        return path.join(this.getModelsDirectory(), config.fileName);
    }

    /**
     * Check if a model is already downloaded.
     */
    isModelDownloaded(modelId: string = this.currentModelId): boolean {
        try {
            const modelPath = this.getModelPath(modelId);
            return existsSync(modelPath);
        } catch {
            return false;
        }
    }

    /**
     * Initialize the LLM manager.
     * Sets up event listeners and checks existing model state.
     */
    async initialize(): Promise<void> {
        logger.log('Initializing LlmManager');

        // Check if model already exists on disk
        if (this.isModelDownloaded()) {
            this.modelPath = this.getModelPath(this.currentModelId);
            // Don't set to 'ready' yet - model needs to be loaded first
            // Status stays 'not-downloaded' until explicitly enabled
            logger.log('Model found on disk', { modelPath: this.modelPath });
        }
    }

    /**
     * Download the specified model with progress callbacks.
     *
     * @param onProgress - Callback for progress updates (0-100)
     * @param modelId - Model to download (defaults to current model)
     * @throws Error if download fails
     */
    async downloadModel(onProgress?: DownloadProgressCallback, modelId: string = this.currentModelId): Promise<void> {
        if (!this.ensureNativeAvailable('downloadModel')) {
            const message = this.nativeProbeError ?? 'node-llama-cpp is not available';
            this.setStatus('error', message);
            throw new Error(message);
        }
        // Guard against concurrent downloads
        if (this.status === 'downloading') {
            throw new Error('Download already in progress');
        }

        const config = this.validateModelId(modelId);

        // Check if already downloaded
        if (this.isModelDownloaded(modelId)) {
            logger.log('Model already downloaded', { modelId });
            this.downloadProgress = 100;
            onProgress?.(100);
            return;
        }

        logger.log('Starting model download', {
            modelId,
            uri: config.uri,
            sizeBytes: config.sizeBytes,
        });

        this.setStatus('downloading');
        this.downloadProgress = 0;
        this.abortController = new AbortController();

        try {
            // Dynamic import for ESM module using helper to prevent transpilation
            const { createModelDownloader } = await importNodeLlamaCpp();

            const downloader = await createModelDownloader({
                modelUri: config.uri,
                dirPath: this.getModelsDirectory(),
                showCliProgress: false,
                onProgress: (status: { downloadedSize: number; totalSize: number }) => {
                    const percent = Math.round((status.downloadedSize / status.totalSize) * 100);
                    this.downloadProgress = percent;
                    onProgress?.(percent);
                    logger.log('Download progress', {
                        percent,
                        downloaded: status.downloadedSize,
                        total: status.totalSize,
                    });
                },
            });

            const downloadedPath = await downloader.download({
                signal: this.abortController.signal,
            });

            this.modelPath = downloadedPath;

            logger.log('Model download complete', { modelPath: this.modelPath });

            // Verify file exists
            if (!this.modelPath || !existsSync(this.modelPath)) {
                throw new Error('Downloaded file not found after download');
            }

            this.downloadProgress = 100;
            onProgress?.(100);
            // Don't set status to 'ready' - model needs to be loaded first
            // Status will be set when loadModel() is called
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Download failed';

            // Check if it was cancelled
            if (this.abortController?.signal.aborted) {
                logger.log('Download cancelled');
                this.setStatus('not-downloaded');
                return;
            }

            logger.error('Model download failed', { error, modelId });
            this.setStatus('error', message);
            throw error;
        } finally {
            this.abortController = null;
        }
    }

    /**
     * Load the model into memory for inference.
     * Requires model to be downloaded first.
     *
     * @throws Error if model not downloaded or loading fails
     */
    async loadModel(): Promise<void> {
        if (!this.ensureNativeAvailable('loadModel')) {
            const message = this.nativeProbeError ?? 'node-llama-cpp is not available';
            this.setStatus('error', message);
            throw new Error(message);
        }
        // Guard against concurrent load operations
        if (this.status === 'initializing') {
            throw new Error('Model is currently loading');
        }

        // Check if model is downloaded
        if (!this.isModelDownloaded()) {
            throw new Error('Model not downloaded. Call downloadModel() first.');
        }

        // Already loaded
        if (this.status === 'ready' && this.model && this.context) {
            logger.log('Model already loaded');
            return;
        }

        logger.log('Loading model', {
            modelId: this.currentModelId,
            gpuEnabled: this.gpuEnabled,
        });

        this.setStatus('initializing');

        try {
            // Dynamic import for ESM module using helper to prevent transpilation
            const { getLlama, LlamaCompletion } = await importNodeLlamaCpp();

            // Get llama instance with GPU setting
            const gpuMode = this.gpuEnabled ? 'auto' : false;
            logger.log('Initializing Llama with GPU mode', {
                gpuMode,
                gpuEnabled: this.gpuEnabled,
            });

            this.llama = await getLlama({
                gpu: gpuMode,
                build: 'never', // Don't build from source in Electron - users may not have build tools
            });

            logger.log('Llama instance created', {
                gpuEnabled: this.gpuEnabled,
                gpuModeRequested: gpuMode,
            });

            // Get model path
            const modelPath = this.getModelPath(this.currentModelId);

            // Load the model
            this.model = await this.llama.loadModel({
                modelPath,
            });

            // Create context for inference
            this.context = await this.model.createContext();

            // Create completion instance for text completion (not chat)
            this.completion = new LlamaCompletion({
                contextSequence: this.context.getSequence(),
            });

            this.setStatus('ready');
            logger.log('Model loaded successfully', {
                modelId: this.currentModelId,
                gpuEnabled: this.gpuEnabled,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to load model';
            logger.error('Failed to load model', { error });

            // If GPU failed, try CPU fallback
            if (this.gpuEnabled) {
                logger.warn('GPU load failed, attempting CPU fallback');
                try {
                    this.gpuEnabled = false;
                    await this.loadModel();
                    return;
                } catch (cpuError) {
                    logger.error('CPU fallback also failed', { error: cpuError });
                }
            }

            this.setStatus('error', message);
            throw error;
        }
    }

    /**
     * Unload the model from memory to free resources.
     */
    unloadModel(): void {
        logger.log('Unloading model');

        if (this.completion) {
            // Completion doesn't have dispose, just nullify
            this.completion = null;
        }

        if (this.context) {
            this.context.dispose();
            this.context = null;
        }

        if (this.model) {
            this.model.dispose();
            this.model = null;
        }

        if (this.llama) {
            this.llama.dispose();
            this.llama = null;
        }

        // Model is unloaded but may still be on disk - set status to not-downloaded
        // (user can call loadModel() again if the file exists)
        this.setStatus('not-downloaded');

        logger.log('Model unloaded');
    }

    /**
     * Check if the model is currently loaded and ready for inference.
     */
    isModelLoaded(): boolean {
        return this.status === 'ready' && this.model !== null && this.context !== null;
    }

    /**
     * Get the loaded model (for advanced use cases).
     */
    getLoadedModel(): LlamaModel | null {
        return this.model;
    }

    /**
     * Get the inference context (for advanced use cases).
     */
    getContext(): LlamaContext | null {
        return this.context;
    }

    /**
     * Default timeout for inference in milliseconds.
     * Increased to 2000ms for larger Qwen3 models.
     */
    private static readonly INFERENCE_TIMEOUT_MS = 2000;

    /**
     * Generate a text prediction for the given partial text.
     *
     * @param partialText - The text to complete
     * @param timeoutMs - Maximum time to wait for inference (default: 500ms)
     * @returns The predicted continuation, or null if model not ready or timeout
     */
    async predict(partialText: string, timeoutMs?: number): Promise<string | null> {
        // Return null if model not ready
        if (!this.isModelLoaded() || !this.completion) {
            logger.warn('Predict called but model not ready');
            return null;
        }

        // Validate input
        if (!partialText || partialText.trim().length === 0) {
            return null;
        }

        const timeout = timeoutMs ?? LlmManager.INFERENCE_TIMEOUT_MS;

        logger.log('Starting prediction', {
            partialTextLength: partialText.length,
            timeoutMs: timeout,
        });

        // Create abort controller for timeout
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), timeout);

        try {
            // Use direct text completion - no chat template, just continue the input
            logger.log('Generating completion', { partialText });

            const completion = await this.completion.generateCompletion(partialText, {
                signal: abortController.signal,
                maxTokens: 10, // Limit tokens for quick suggestions (3-4 words)
                temperature: 0.7, // Slightly creative but not too random
            });

            logger.log('Raw model response', { completion, partialText });

            // The completion should just be the continuation (no input echo)
            const cleaned = completion?.trim() ?? null;

            logger.log('Prediction complete', {
                inputLength: partialText.length,
                outputLength: cleaned?.length ?? 0,
                cleanedResult: cleaned,
            });

            return cleaned || null;
        } catch (error) {
            // Check if it was a timeout/abort
            if (error instanceof Error && error.name === 'AbortError') {
                logger.log('Prediction timed out', { timeoutMs: timeout });
                return null;
            }

            logger.error('Prediction failed', { error });
            return null;
        } finally {
            // Always clean up the timeout to prevent memory leaks
            clearTimeout(timeoutId);
        }
    }

    /**
     * Cancel an in-progress download.
     */
    cancelDownload(): void {
        if (this.abortController) {
            logger.log('Cancelling download');
            this.abortController.abort();
        }
    }

    /**
     * Get the current download progress (0-100).
     */
    getDownloadProgress(): number {
        return this.downloadProgress;
    }

    /**
     * Set the current model to use.
     * If a model is currently loaded, it will be unloaded.
     */
    setCurrentModel(modelId: string): void {
        this.validateModelId(modelId);

        // Unload current model if switching
        if (this.currentModelId !== modelId && this.isModelLoaded()) {
            this.unloadModel();
        }

        this.currentModelId = modelId;
        logger.log('Current model set', { modelId });
    }

    /**
     * Get the current model ID.
     */
    getCurrentModelId(): string {
        return this.currentModelId;
    }

    /**
     * Get configuration for a specific model.
     */
    getModelConfig(modelId: string = this.currentModelId): ModelConfig | undefined {
        return MODEL_REGISTRY[modelId];
    }

    /**
     * Get all available models.
     */
    getAvailableModels(): ModelConfig[] {
        return Object.values(MODEL_REGISTRY);
    }

    /**
     * Dispose of the LLM manager.
     * Releases resources and unloads the model.
     */
    dispose(): void {
        logger.log('Disposing LlmManager');
        this.cancelDownload();
        this.unloadModel();
        this.statusListeners = [];
    }

    /**
     * Get the current model status.
     */
    getStatus(): ModelStatus {
        return this.status;
    }

    getNativeProbeError(): string | null {
        return this.nativeProbeError;
    }

    /**
     * Get the current error message, if any.
     */
    getErrorMessage(): string | null {
        return this.errorMessage;
    }

    /**
     * Check if GPU acceleration is enabled.
     */
    isGpuEnabled(): boolean {
        return this.gpuEnabled;
    }

    /**
     * Enable or disable GPU acceleration.
     * Requires model reload to take effect.
     *
     * @param enabled - Whether to enable GPU acceleration
     */
    setGpuEnabled(enabled: boolean): void {
        if (this.gpuEnabled === enabled) {
            return;
        }

        this.gpuEnabled = enabled;
        logger.log('GPU acceleration setting changed', { enabled });

        // Note: Requires reload to take effect
        // Caller should call unloadModel() then loadModel() if model is currently loaded
    }
}

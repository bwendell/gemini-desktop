declare module 'node-llama-cpp' {
    export type GpuMode = 'auto' | false;

    export interface LlamaContext {
        getSequence(): unknown;
        dispose(): void;
    }

    export interface LlamaModel {
        createContext(): Promise<LlamaContext>;
        dispose(): void;
    }

    export interface Llama {
        loadModel(options: { modelPath: string }): Promise<LlamaModel>;
        dispose(): void;
    }

    export interface LlamaCompletionOptions {
        contextSequence: unknown;
    }

    export class LlamaCompletion {
        constructor(options: LlamaCompletionOptions);
        generateCompletion(
            input: string,
            options: { signal?: AbortSignal; maxTokens: number; temperature: number }
        ): Promise<string | null>;
    }

    export interface ModelDownloaderOptions {
        modelUri: string;
        dirPath: string;
        showCliProgress: boolean;
        onProgress: (status: { downloadedSize: number; totalSize: number }) => void;
    }

    export interface ModelDownloader {
        download(options: { signal?: AbortSignal }): Promise<string>;
    }

    export function createModelDownloader(options: ModelDownloaderOptions): Promise<ModelDownloader>;

    export function getLlama(options: { gpu: GpuMode; build: 'never' }): Promise<Llama>;
}

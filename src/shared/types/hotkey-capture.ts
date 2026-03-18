export interface HotkeyCaptureResult {
    status: 'captured' | 'cancelled' | 'timeout';
    accelerator: string | null;
}

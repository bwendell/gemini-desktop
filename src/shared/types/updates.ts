/**
 * Update Types
 *
 * Shared types for auto-update functionality across main and renderer processes.
 */

/**
 * Update information from electron-updater.
 * Simplified version for use in both main and renderer processes.
 */
export interface UpdateInfo {
  /** The version of the update */
  version: string;
  /** Release name */
  releaseName?: string;
  /** Release notes (may be HTML or markdown) */
  releaseNotes?: string | Array<{ version: string; note: string }>;
  /** Release date */
  releaseDate?: string;
}

/**
 * Download progress information.
 */
export interface DownloadProgress {
  /** Percentage of download completed (0-100) */
  percent: number;
  /** Download speed in bytes per second */
  bytesPerSecond?: number;
  /** Bytes transferred so far */
  transferred?: number;
  /** Total bytes to download */
  total?: number;
}

/**
 * Structured Test Execution Logger with Timing Breadcrumbs.
 *
 * Records timestamped breadcrumbs during test execution to provide a timeline
 * of what happened leading up to test failures. Breadcrumbs are cleared at test
 * start and dumped to console on test failure.
 *
 * @module testLogger
 */

/**
 * A single breadcrumb entry with timestamp and delta timing.
 */
interface Breadcrumb {
    timestamp: number;
    scope: string;
    message: string;
    deltaMs: number;
}

/**
 * Structured test execution logger that records breadcrumbs during test execution.
 *
 * Usage:
 * ```typescript
 * import { testLogger } from './helpers';
 *
 * // In a test or workflow
 * testLogger.breadcrumb('workflow', 'Opening options window...');
 * await someAction();
 * testLogger.breadcrumb('workflow', 'Options window opened');
 * ```
 *
 * On test failure, breadcrumbs are dumped automatically by the hook in wdio.conf.js.
 */
class TestLogger {
    private breadcrumbs: Breadcrumb[] = [];
    private lastTimestamp: number = 0;

    /**
     * Record a breadcrumb with automatic timestamp and delta calculation.
     *
     * @param scope - The scope/component name (e.g., 'workflow', 'window', 'menu')
     * @param message - The breadcrumb message
     *
     * @example
     * testLogger.breadcrumb('workflow', 'Opening options window...');
     */
    breadcrumb(scope: string, message: string): void {
        const now = Date.now();
        const deltaMs = this.lastTimestamp === 0 ? 0 : now - this.lastTimestamp;

        this.breadcrumbs.push({
            timestamp: now,
            scope,
            message,
            deltaMs,
        });

        this.lastTimestamp = now;
    }

    /**
     * Clear all recorded breadcrumbs.
     * Called automatically at test start by the beforeTest hook.
     */
    clear(): void {
        this.breadcrumbs = [];
        this.lastTimestamp = 0;
    }

    /**
     * Dump all breadcrumbs to console in a formatted timeline.
     * Called automatically on test failure by the afterTest hook.
     *
     * @returns The formatted breadcrumb output (for logging purposes)
     */
    dump(): string {
        if (this.breadcrumbs.length === 0) {
            return '[testLogger] No breadcrumbs recorded.';
        }

        // Get start time for relative timestamps
        const startTime = this.breadcrumbs[0].timestamp;
        let output = '\n[testLogger] ========== BREADCRUMB TRAIL ==========\n';

        for (const crumb of this.breadcrumbs) {
            const relativeMs = crumb.timestamp - startTime;
            const deltaStr = crumb.deltaMs > 0 ? ` (+${crumb.deltaMs}ms)` : '';
            output += `[testLogger] [${relativeMs}ms]${deltaStr} [${crumb.scope}] ${crumb.message}\n`;
        }

        output += '[testLogger] =========================================\n';
        return output;
    }

    /**
     * Get all breadcrumbs as an array (for programmatic access).
     *
     * @returns Array of breadcrumb entries
     */
    getAll(): Breadcrumb[] {
        return [...this.breadcrumbs];
    }

    /**
     * Get breadcrumb count.
     *
     * @returns Number of breadcrumbs recorded
     */
    count(): number {
        return this.breadcrumbs.length;
    }
}

/**
 * Singleton instance of TestLogger for use throughout test suite.
 */
export const testLogger = new TestLogger();

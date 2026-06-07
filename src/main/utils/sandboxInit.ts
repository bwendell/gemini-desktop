/**
 * Sandbox Initialization (Side-Effect Module)
 *
 * This module MUST be imported FIRST in main.ts — before any module that
 * reads BASE_WEB_PREFERENCES. It detects Linux AppImage sandbox restrictions
 * and sets the 'no-sandbox' command line switch synchronously at import time.
 *
 * ES import statements are hoisted, so inline code in main.ts would run AFTER
 * all imports have been evaluated. By placing detection in a separate module
 * imported first, we guarantee it executes before constants.ts evaluates.
 */

import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { shouldDisableSandbox, shouldDisableV8Sandbox } from './sandboxDetector';

if (shouldDisableSandbox()) {
    app.commandLine.appendSwitch('no-sandbox');
}

if (process.platform === 'linux') {
    // The V8 sandbox must be disabled in three cases on Linux:
    //   1. The running kernel is incompatible with the V8 sandbox (kernel 7.x+),
    //      which crashes at startup regardless of any feature (#119, #315, #334).
    //   2. Text prediction is enabled, so the node-llama-cpp native module — which
    //      allocates ArrayBuffers outside the sandbox — will be loaded.
    //   3. The text-prediction E2E/integration smoke test flag is set.
    // The flag is applied at most once to avoid duplicate js-flags entries.
    let disableV8Sandbox = shouldDisableV8Sandbox();

    if (!disableV8Sandbox) {
        try {
            const settingsPath = path.join(app.getPath('userData'), 'settings.json');
            const raw = fs.readFileSync(settingsPath, 'utf-8');
            const settings = JSON.parse(raw) as { textPredictionEnabled?: boolean };

            if (settings?.textPredictionEnabled === true) {
                disableV8Sandbox = true;
            }
        } catch (error) {
            const err = error as NodeJS.ErrnoException;
            if (err?.code !== 'ENOENT' && process.env.NODE_ENV !== 'test') {
                console.warn(
                    '[sandboxInit] Failed to read or parse settings.json; V8 sandbox may not be disabled as expected.',
                    err
                );
            }
        }
    }

    if (!disableV8Sandbox && process.argv.includes('--test-text-prediction')) {
        disableV8Sandbox = true;
    }

    if (disableV8Sandbox) {
        app.commandLine.appendSwitch('js-flags', '--no-v8-sandbox');
    }
}

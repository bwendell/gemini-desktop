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
import { shouldDisableSandbox } from './sandboxDetector';

if (shouldDisableSandbox()) {
    app.commandLine.appendSwitch('no-sandbox');
}

if (process.platform === 'linux') {
    try {
        const settingsPath = path.join(app.getPath('userData'), 'settings.json');
        const raw = fs.readFileSync(settingsPath, 'utf-8');
        const settings = JSON.parse(raw) as { textPredictionEnabled?: boolean };

        if (settings?.textPredictionEnabled === true) {
            app.commandLine.appendSwitch('js-flags', '--no-v8-sandbox');
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

if (process.platform === 'linux' && process.argv.includes('--test-text-prediction')) {
    app.commandLine.appendSwitch('js-flags', '--no-v8-sandbox');
}

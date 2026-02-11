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
import { shouldDisableSandbox } from './sandboxDetector';

if (shouldDisableSandbox()) {
    app.commandLine.appendSwitch('no-sandbox');
}

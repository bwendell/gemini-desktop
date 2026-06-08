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
 *
 * NOTE: The V8 sandbox is intentionally NOT disabled here. On kernels that are
 * incompatible with the V8 sandbox cage, the sandbox-incompatible native
 * modules (`dbus-next`, `node-llama-cpp`) are skipped instead — see
 * `isV8SandboxIncompatibleKernel` in sandboxDetector and the guards in
 * dbusFallback.ts / llmManager.ts.
 */

import { app } from 'electron';
import { shouldDisableSandbox } from './sandboxDetector';

if (shouldDisableSandbox()) {
    app.commandLine.appendSwitch('no-sandbox');
}

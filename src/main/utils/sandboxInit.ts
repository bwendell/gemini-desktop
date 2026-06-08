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
 * NOTE: This module intentionally does NOT touch the V8 sandbox / V8 memory
 * cage. That cage is a compile-time feature of Electron and cannot be turned
 * off at runtime — passing a JS flag to disable it has no effect (V8 prints
 * "unrecognized flag"). The startup crash on Linux (issue #119) is instead
 * mitigated by never loading the native modules that allocate ArrayBuffers
 * outside the cage (dbus-next/usocket and node-llama-cpp); see hotkeyManager,
 * dbusFallback, and llmManager. The `no-sandbox` (Chromium) switch below is an
 * unrelated, legitimate AppImage compatibility measure.
 */

import { app } from 'electron';
import { shouldDisableSandbox } from './sandboxDetector';

if (shouldDisableSandbox()) {
    app.commandLine.appendSwitch('no-sandbox');
}

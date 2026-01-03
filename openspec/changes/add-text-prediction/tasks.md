# Tasks: Add Local LLM Text Prediction

## 1. Core Infrastructure - Dependencies & LlmManager

**Files to modify/create:**

- `package.json`
- `src/main/managers/llmManager.ts` (NEW)
- `src/main/store.ts`

**Verification:** `npm install && npm run typecheck && npm run lint`

**References:**

- [node-llama-cpp docs](https://withcatai.github.io/node-llama-cpp/) - Electron integration guide
- [updateManager.ts](file:///c:/Users/bwend/repos/gemini/src/main/managers/updateManager.ts) - existing manager pattern with events
- [store.ts](file:///c:/Users/bwend/repos/gemini/src/main/store.ts) - settings store pattern

**Tasks:**

- [x] 1.1 Add `node-llama-cpp` dependency to `package.json`
  - **Acceptance:** `npm install` succeeds, `node-llama-cpp` in dependencies

- [x] 1.2 Create `LlmManager` class skeleton in `src/main/managers/llmManager.ts`
  - Export class with constructor, `initialize()`, `dispose()` methods
  - Add logger using `createLogger('[LlmManager]')`
  - **Acceptance:** TypeScript compiles, lint passes

- [x] 1.3 Implement model download in `LlmManager`
  - `downloadModel(onProgress: (percent: number) => void): Promise<void>`
  - Download Phi-3.5-mini GGUF from Hugging Face to `app.getPath('userData')/models/`
  - SHA256 checksum validation after download
  - **Acceptance:** Can download model with progress callbacks, checksum validates

- [x] 1.4 Implement model loading in `LlmManager`
  - `loadModel(): Promise<void>` - lazy load from disk
  - `unloadModel(): void` - free memory
  - Track status: `'not-downloaded' | 'downloading' | 'initializing' | 'ready' | 'error'`
  - **Acceptance:** Model loads successfully, status transitions correctly

- [x] 1.5 Implement GPU acceleration toggle
  - `setGpuEnabled(enabled: boolean): void`
  - Requires model reload to take effect
  - **Acceptance:** GPU flag respected on model load, graceful CPU fallback if GPU unavailable

- [x] 1.6 Implement text prediction inference
  - `predict(partialText: string): Promise<string | null>`
  - Return null if model not ready or inference times out (500ms)
  - **Acceptance:** Returns reasonable text continuation, handles edge cases

- [x] 1.7 Add settings to `SettingsStore` defaults in `store.ts`
  - `textPredictionEnabled: false`
  - `textPredictionGpuEnabled: false`
  - `textPredictionModelStatus: 'not-downloaded'`
  - **Acceptance:** Settings persist across app restarts

---

## 2. IPC Layer

**Files to modify:**

- `src/shared/constants/ipc-channels.ts`
- `src/shared/types/text-prediction.ts` (NEW)
- `src/shared/types/ipc.ts`
- `src/preload/preload.ts`
- `src/main/managers/ipcManager.ts`

**Verification:** `npm run typecheck && npm run lint`

**References:**

- [ipc-channels.ts](file:///c:/Users/bwend/repos/gemini/src/shared/constants/ipc-channels.ts) - existing channel patterns
- [ipcManager.ts](file:///c:/Users/bwend/repos/gemini/src/main/managers/ipcManager.ts) - handler patterns
- [preload.ts](file:///c:/Users/bwend/repos/gemini/src/preload/preload.ts) - API exposure patterns

**Tasks:**

- [x] 2.1 Add IPC channels in `ipc-channels.ts`
  - `TEXT_PREDICTION_GET_ENABLED`, `TEXT_PREDICTION_SET_ENABLED`
  - `TEXT_PREDICTION_GET_GPU_ENABLED`, `TEXT_PREDICTION_SET_GPU_ENABLED`
  - `TEXT_PREDICTION_GET_STATUS`, `TEXT_PREDICTION_STATUS_CHANGED`
  - `TEXT_PREDICTION_DOWNLOAD_PROGRESS`, `TEXT_PREDICTION_PREDICT`
  - **Acceptance:** All channels defined, TypeScript compiles

- [x] 2.2 Create `text-prediction.ts` types in `src/shared/types/`
  - `ModelStatus` type: `'not-downloaded' | 'downloading' | 'initializing' | 'ready' | 'error'`
  - `TextPredictionSettings` interface with enabled, gpuEnabled, status, downloadProgress?, errorMessage?
  - **Acceptance:** Types exported, used by IPC handlers

- [x] 2.3 Extend `ElectronAPI` interface in `ipc.ts`
  - `getTextPredictionEnabled(): Promise<boolean>`
  - `setTextPredictionEnabled(enabled: boolean): Promise<void>`
  - `getTextPredictionGpuEnabled(): Promise<boolean>`
  - `setTextPredictionGpuEnabled(enabled: boolean): Promise<void>`
  - `getTextPredictionStatus(): Promise<TextPredictionSettings>`
  - `onTextPredictionStatusChanged(callback): () => void`
  - `onTextPredictionDownloadProgress(callback): () => void`
  - `predictText(partialText: string): Promise<string | null>`
  - **Acceptance:** Interface complete, no type errors

- [x] 2.4 Implement handlers in `ipcManager.ts`
  - Add `_setupTextPredictionHandlers()` method
  - Wire up all text prediction IPC channels to `LlmManager`
  - Emit status changes and download progress events
  - **Acceptance:** All handlers work end-to-end through IPC

- [x] 2.5 Expose APIs in `preload.ts`
  - Implement all methods from `ElectronAPI` text prediction section
  - **Acceptance:** Renderer can call all text prediction APIs

---

## 3. Options UI

**Files to create/modify:**

- `src/renderer/components/options/TextPredictionSettings.tsx` (NEW)
- `src/renderer/components/options/TextPredictionSettings.css` (NEW)
- `src/renderer/components/options/OptionsWindow.tsx`
- `src/renderer/components/options/index.ts`

**Verification:** `npm run dev` → Options window → verify UI renders

**References:**

- [AutoUpdateToggle.tsx](file:///c:/Users/bwend/repos/gemini/src/renderer/components/options/AutoUpdateToggle.tsx) - toggle component pattern
- [OptionsWindow.tsx](file:///c:/Users/bwend/repos/gemini/src/renderer/components/options/OptionsWindow.tsx) - section layout

**Tasks:**

- [x] 3.1 Create `TextPredictionSettings.tsx` component skeleton
  - Function component with hooks for settings state
  - **Acceptance:** Component renders without errors

- [x] 3.2 Implement enable/disable toggle
  - Calls `setTextPredictionEnabled()` on change
  - If enabling and model not downloaded, triggers download
  - **Acceptance:** Toggle works, triggers download when enabling

- [x] 3.3 Implement GPU acceleration toggle
  - Only visible when text prediction is enabled
  - Calls `setTextPredictionGpuEnabled()` on change
  - **Acceptance:** GPU toggle appears/hides correctly, persists setting

- [x] 3.4 Implement download progress bar
  - Listen to `onTextPredictionDownloadProgress` events
  - Show animated progress bar during download
  - **Acceptance:** Progress bar animates 0-100% during download

- [x] 3.5 Implement status indicator
  - Display: "Not downloaded", "Downloading...", "Initializing...", "Ready", "Error: {message}"
  - Show retry button on error
  - **Acceptance:** All status states display correctly

- [x] 3.6 Add CSS styling in `TextPredictionSettings.css`
  - Style toggle, progress bar, status indicator
  - Follow existing options component styles
  - **Acceptance:** UI matches existing options design

- [x] 3.7 Add section to `OptionsWindow.tsx`
  - Add `<OptionsSection title="Text Prediction">` with component
  - Export from `index.ts`
  - **Acceptance:** Section visible in Options Settings tab

---

## 4. Quick Chat Integration

**Files to modify:**

- `src/renderer/components/quickchat/QuickChatApp.tsx`
- `src/renderer/components/quickchat/QuickChat.css`

**Verification:** `npm run dev` → Quick Chat → type text → observe ghost text

**References:**

- [QuickChatApp.tsx](file:///c:/Users/bwend/repos/gemini/src/renderer/components/quickchat/QuickChatApp.tsx) - existing Quick Chat implementation
- [QuickChat.css](file:///c:/Users/bwend/repos/gemini/src/renderer/components/quickchat/QuickChat.css) - existing styles

**Tasks:**

- [ ] 4.1 Add prediction state to `QuickChatApp.tsx`
  - `prediction: string | null` state
  - `isLoadingPrediction: boolean` state
  - `isPredictionEnabled: boolean` from settings
  - **Acceptance:** State variables added, component compiles

- [ ] 4.2 Implement debounced prediction requests
  - Call `predictText()` 300ms after user stops typing
  - Cancel pending requests on new input
  - Only request if prediction enabled and model ready
  - **Acceptance:** Predictions requested at correct timing

- [ ] 4.3 Render ghost text after input
  - Display prediction as semi-transparent text after cursor position
  - Position absolutely to overlay input
  - **Acceptance:** Ghost text visible, positioned correctly

- [ ] 4.4 Handle Tab key to accept prediction
  - On Tab press with prediction visible, insert text
  - Clear prediction after accepting
  - Prevent default Tab behavior
  - **Acceptance:** Tab inserts prediction, input updates

- [ ] 4.5 Handle prediction dismissal
  - Clear prediction when user continues typing
  - Clear prediction when input loses focus
  - **Acceptance:** Prediction clears appropriately

- [ ] 4.6 Add ghost text CSS styling in `QuickChat.css`
  - `.quick-chat-ghost-text` class for prediction overlay
  - Match input font, semi-transparent, no pointer events
  - **Acceptance:** Ghost text styled correctly, non-interactive

---

## 5. Unit Tests

**Files to create/modify:**

- `tests/unit/main/llmManager.test.ts` (NEW)
- `tests/unit/main/ipcManager.test.ts`
- `tests/unit/preload/preload.test.ts`
- `tests/unit/renderer/TextPredictionSettings.test.tsx` (NEW)
- `tests/unit/renderer/QuickChatApp.test.tsx`

**Verification:** `npm run test -- --testPathPattern="llmManager|ipcManager|preload|TextPrediction|QuickChat"`

**References:**

- [updateManager.test.ts](file:///c:/Users/bwend/repos/gemini/tests/unit/main/updateManager.test.ts) - manager unit test patterns
- [ipcManager.test.ts](file:///c:/Users/bwend/repos/gemini/tests/unit/main/ipcManager.test.ts) - IPC handler test patterns
- [QuickChatApp.test.tsx](file:///c:/Users/bwend/repos/gemini/src/renderer/components/quickchat/QuickChatApp.test.tsx) - component test patterns

**Tasks:**

- [ ] 5.1 Unit test: `LlmManager.downloadModel()` reports progress and validates checksum
  - Mock HTTP download
  - **Acceptance:** Progress callbacks fire, checksum validation works

- [ ] 5.2 Unit test: `LlmManager.loadModel()` transitions status correctly
  - Mock node-llama-cpp
  - **Acceptance:** Status: not-downloaded → initializing → ready

- [ ] 5.3 Unit test: `LlmManager.predict()` returns suggestion or null
  - Mock inference
  - **Acceptance:** Returns string on success, null on timeout/error

- [ ] 5.4 Unit test: `LlmManager.unloadModel()` frees resources
  - **Acceptance:** Status returns to appropriate state, memory freed

- [ ] 5.5 Unit test: `LlmManager.setGpuEnabled()` updates configuration
  - **Acceptance:** GPU setting stored, takes effect on next load

- [ ] 5.6 Unit test: IPC handlers call `LlmManager` methods correctly
  - **Acceptance:** Each handler invokes correct manager method

- [ ] 5.7 Unit test: Preload `predictText` sends correct IPC message
  - **Acceptance:** IPC invoke called with correct channel

- [ ] 5.8 Unit test: `TextPredictionSettings` renders toggle states
  - **Acceptance:** Enabled/disabled states render correctly

- [ ] 5.9 Unit test: `TextPredictionSettings` shows download progress
  - **Acceptance:** Progress bar updates with percentage

- [ ] 5.10 Unit test: `QuickChatApp` displays ghost text when prediction available
  - **Acceptance:** Ghost text element appears with prediction content

- [ ] 5.11 Unit test: `QuickChatApp` accepts prediction on Tab key
  - **Acceptance:** Input value updated with prediction

---

## 6. Coordinated Tests

**Files to create:**

- `tests/coordinated/text-prediction-settings.coordinated.test.tsx` (NEW)
- `tests/coordinated/text-prediction-quickchat.coordinated.test.tsx` (NEW)
- `tests/coordinated/text-prediction-ipc.coordinated.test.ts` (NEW)

**Verification:** `npm run test:coordinated -- --testPathPattern="text-prediction"`

**References:**

- [toast-context.coordinated.test.tsx](file:///c:/Users/bwend/repos/gemini/tests/coordinated/toast-context.coordinated.test.tsx) - coordinated test patterns
- [print-to-pdf-ipc.coordinated.test.ts](file:///c:/Users/bwend/repos/gemini/tests/coordinated/print-to-pdf-ipc.coordinated.test.ts) - IPC coordinated patterns

**Tasks:**

- [ ] 6.1 Coordinated test: Enable toggle → triggers model download
  - Mock LlmManager, verify download initiated
  - **Acceptance:** Toggle ON triggers downloadModel() call

- [ ] 6.2 Coordinated test: Download progress → UI updates
  - Emit progress events, verify settings component updates
  - **Acceptance:** Progress bar reflects emitted percentages

- [ ] 6.3 Coordinated test: Status changes → component re-renders
  - Emit status: downloading → initializing → ready
  - **Acceptance:** Status indicator text updates for each state

- [ ] 6.4 Coordinated test: GPU toggle → setting persisted
  - Toggle GPU, verify store updated
  - **Acceptance:** Setting round-trips through IPC correctly

- [ ] 6.5 Coordinated test: Predict request → response received in Quick Chat
  - Type text, mock prediction response
  - **Acceptance:** Ghost text appears with mocked prediction

- [ ] 6.6 Coordinated test: Tab key → prediction accepted in Quick Chat
  - Show prediction, press Tab, verify input updated
  - **Acceptance:** Input contains full text + prediction

- [ ] 6.7 Coordinated test: Continued typing → prediction dismissed
  - Show prediction, type more, verify ghost text cleared
  - **Acceptance:** Ghost text removed on new input

- [ ] 6.8 Coordinated test: Prediction disabled → no ghost text
  - Disable feature, type text
  - **Acceptance:** No prediction requests made, no ghost text

- [ ] 6.9 Coordinated test: Error status → retry button works
  - Set error status, click retry
  - **Acceptance:** Download re-initiated on retry click

- [ ] 6.10 Coordinated test: IPC getTextPredictionStatus returns full state
  - **Acceptance:** Returns enabled, gpuEnabled, status, progress, error

---

## 7. Integration Tests

**Files to create:**

- `tests/integration/text-prediction-settings.integration.test.ts` (NEW)
- `tests/integration/text-prediction-quickchat.integration.test.ts` (NEW)
- `tests/integration/text-prediction-ipc.integration.test.ts` (NEW)

**Verification:** `npm run test:integration -- --spec="tests/integration/text-prediction*"`

**References:**

- [print-to-pdf.integration.test.ts](file:///c:/Users/bwend/repos/gemini/tests/integration/print-to-pdf.integration.test.ts) - integration test patterns
- [options-window.integration.test.ts](file:///c:/Users/bwend/repos/gemini/tests/integration) - options integration patterns

**Tasks:**

- [ ] 7.1 Integration test: IPC `getTextPredictionEnabled` returns stored value
  - **Acceptance:** Round-trip through main process returns correct boolean

- [ ] 7.2 Integration test: IPC `setTextPredictionEnabled` updates store
  - **Acceptance:** Value persists and can be retrieved

- [ ] 7.3 Integration test: IPC `getTextPredictionGpuEnabled` returns stored value
  - **Acceptance:** GPU setting round-trips correctly

- [ ] 7.4 Integration test: IPC `setTextPredictionGpuEnabled` updates store
  - **Acceptance:** GPU setting persists

- [ ] 7.5 Integration test: IPC `getTextPredictionStatus` returns complete state
  - **Acceptance:** All fields present: enabled, gpuEnabled, status

- [ ] 7.6 Integration test: Status change emits `TEXT_PREDICTION_STATUS_CHANGED` event
  - **Acceptance:** Renderer receives event when status changes

- [ ] 7.7 Integration test: Download progress emits `TEXT_PREDICTION_DOWNLOAD_PROGRESS` events
  - Mock download, verify progress events emitted
  - **Acceptance:** Progress events received by renderer

- [ ] 7.8 Integration test: IPC `predictText` returns prediction from LlmManager
  - Mock LlmManager.predict()
  - **Acceptance:** Prediction returned through IPC

- [ ] 7.9 Integration test: Options window Settings tab shows Text Prediction section
  - Open Options, navigate to Settings
  - **Acceptance:** Section visible with toggles

- [ ] 7.10 Integration test: Enable toggle triggers download flow
  - Click enable, verify download progress events
  - **Acceptance:** Full flow observable through integration

- [ ] 7.11 Integration test: Quick Chat receives predictions when enabled
  - Enable prediction, open Quick Chat, type
  - **Acceptance:** Ghost text appears after debounce

- [ ] 7.12 Integration test: Quick Chat Tab key sends accepted text
  - Accept prediction, submit
  - **Acceptance:** Submitted text includes prediction

- [ ] 7.13 Integration test: Settings persist across app restart
  - Enable prediction, close app, reopen
  - **Acceptance:** Toggle still enabled after restart

- [ ] 7.14 Integration test: Model status persists across app restart
  - Download model, close app, reopen
  - **Acceptance:** Status shows "Ready" after restart

---

## 8. E2E Tests

**Files to create:**

- `tests/e2e/text-prediction-options.spec.ts` (NEW)
- `tests/e2e/text-prediction-quickchat.spec.ts` (NEW)
- Update `tests/e2e/pages/OptionsPage.ts` if needed

**Verification:** `npm run test:e2e -- --spec="tests/e2e/text-prediction*"`

**References:**

- [E2E_TESTING_GUIDELINES.md](file:///c:/Users/bwend/repos/gemini/docs/E2E_TESTING_GUIDELINES.md) - Golden Rule: verify actual outcomes
- [toast-interactions.spec.ts](file:///c:/Users/bwend/repos/gemini/tests/e2e/toast-interactions.spec.ts) - E2E patterns

**Tasks:**

- [ ] 8.1 E2E test: Toggle text prediction ON in Options → verify status changes
  - Click toggle, observe status indicator
  - **Acceptance:** Status transitions visible to user

- [ ] 8.2 E2E test: Toggle text prediction OFF → verify model unloaded
  - Toggle OFF, verify status returns to disabled state
  - **Acceptance:** Status shows disabled state

- [ ] 8.3 E2E test: Toggle GPU acceleration → verify setting persists
  - Toggle ON, close/reopen Options, verify still ON
  - **Acceptance:** Setting survives app lifecycle

- [ ] 8.4 E2E test: Download progress bar visible during download
  - Enable prediction, observe progress UI
  - **Acceptance:** Progress bar animates during download

- [ ] 8.5 E2E test: Error state shows retry button
  - Simulate download failure, verify retry button
  - **Acceptance:** User can click retry to re-attempt

- [ ] 8.6 E2E test: Type in Quick Chat → ghost text appears
  - Type partial sentence, wait, observe prediction
  - **Acceptance:** Ghost text visible in UI

- [ ] 8.7 E2E test: Press Tab in Quick Chat → prediction accepted
  - Type, wait for prediction, press Tab, verify input contains prediction
  - **Acceptance:** Input value includes accepted prediction

- [ ] 8.8 E2E test: Continue typing → prediction dismissed
  - Type, wait for prediction, type more, verify prediction gone
  - **Acceptance:** Ghost text clears on continued input

- [ ] 8.9 E2E test: Escape key dismisses prediction
  - Type, wait for prediction, press Escape
  - **Acceptance:** Ghost text clears, input unchanged

- [ ] 8.10 E2E test: Submit with Enter ignores pending prediction
  - Type, wait for prediction, press Enter
  - **Acceptance:** Only original text submitted, not prediction

# Change: Add Local LLM Text Prediction for Quick Chat

## Why

Users can benefit from AI-powered text completion while typing prompts in Quick Chat. Using a locally-hosted LLM provides privacy (no data leaves the device), works offline after initial setup, and reduces latency compared to cloud-based solutions.

## What Changes

- Add **"Enable Text Prediction"** toggle in Options window Settings tab
- Add **"Use GPU Acceleration"** sub-toggle (visible when enabled)
- Add new `LlmManager` in main process using `node-llama-cpp` for local inference
- **On-demand model download** from Hugging Face when user enables the feature (~2GB Phi-3.5-mini)
- Download progress indicator and status display in Options
- Ghost text predictions appear in **Quick Chat only** (initial scope, expandable later)
- Tab key accepts prediction, inserting text into input
- IPC channels for prediction requests, settings, and status updates
- Comprehensive unit, coordinated, integration, and E2E tests

## Impact

- Affected specs: None (new capability)
- Affected code:
  - `src/main/managers/llmManager.ts` - **NEW** manager for model lifecycle and inference
  - `src/main/store.ts` - Add text prediction settings
  - `src/shared/constants/ipc-channels.ts` - Add text prediction channels
  - `src/shared/types/text-prediction.ts` - **NEW** types for prediction settings/status
  - `src/shared/types/ipc.ts` - Extend `ElectronAPI` interface
  - `src/preload/preload.ts` - Expose prediction APIs
  - `src/main/managers/ipcManager.ts` - Add prediction handlers
  - `src/renderer/components/options/TextPredictionSettings.tsx` - **NEW** settings component
  - `src/renderer/components/options/OptionsWindow.tsx` - Add settings section
  - `src/renderer/components/quickchat/QuickChatApp.tsx` - Add ghost text and Tab handling
  - `src/renderer/components/quickchat/QuickChat.css` - Ghost text styling
  - `package.json` - Add `node-llama-cpp` dependency

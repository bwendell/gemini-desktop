# Design: Local LLM Text Prediction

## Context

Adding local AI-powered text prediction to Quick Chat requires integrating `node-llama-cpp` into the Electron main process, managing model downloads, and providing a seamless UX for ghost text suggestions.

**Constraints:**

- `node-llama-cpp` must run in main process only (renderer crashes Electron)
- Model files are ~2GB and must be downloaded on-demand
- GPU acceleration is optional and hardware-dependent
- Cross-platform: Windows, macOS (Intel + ARM), Linux

## Goals / Non-Goals

**Goals:**

- Provide fast, local text prediction in Quick Chat
- Simple on/off toggle with automatic model setup
- Optional GPU acceleration for better performance
- Privacy-first: no data leaves the user's device

**Non-Goals (v1):**

- Main window (iframe) predictions (future enhancement)
- Multiple model selection (future enhancement)
- Training or fine-tuning locally
- Streaming tokens (v1 returns complete suggestion)

## Decisions

### Decision 1: Model Selection

**Choice:** Phi-3.5-mini-instruct (GGUF Q4_K_M quantization, ~2GB)

**Rationale:**

- Good balance of quality, size, and inference speed
- MIT license allows bundling
- Proven Electron compatibility with node-llama-cpp

**Alternatives considered:**

- TinyLlama (600MB) — faster download but noticeably lower quality
- Mistral-7B (4GB) — better quality but too large for typical users

### Decision 2: Inference Location

**Choice:** Main process, async handler with IPC

**Rationale:**

- `node-llama-cpp` requires main process
- Use async IPC to avoid blocking renderer
- Future: could move to utility process for true non-blocking

### Decision 3: UI Pattern

**Choice:** Ghost text overlay (like GitHub Copilot, Gmail Smart Compose)

**Rationale:**

- Familiar pattern users understand
- Non-intrusive — doesn't require extra UI elements
- Tab to accept is intuitive

### Decision 4: Model Storage

**Choice:** `app.getPath('userData')/models/` directory

**Rationale:**

- Survives app updates
- User-specific, respects per-user installations
- Easy to clear/reset

## Risks / Trade-offs

| Risk                                      | Mitigation                                                        |
| ----------------------------------------- | ----------------------------------------------------------------- |
| Large download (~2GB) may frustrate users | Show clear progress, allow cancel/retry                           |
| GPU detection may fail on some hardware   | Graceful fallback to CPU-only mode                                |
| Main process blocking during inference    | Use Promise with timeout, consider utility process for v2         |
| Model versioning/updates                  | Store version in settings, show "update available" if newer model |

## Migration Plan

**New feature, no migration required.**

Future considerations:

- If model format changes, detect old model and prompt re-download
- If adding model selection, migrate single-model setting to array

## Open Questions

1. **Download source**: Hugging Face direct or mirror for reliability?
2. **Inference timeout**: What's acceptable latency before showing no prediction?
3. **Context window**: How much previous input to include for better predictions?

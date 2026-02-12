# MCP Recommendations for Gemini Desktop - Session Learnings

## Date: 2026-02-10

## Patterns Identified

### Existing Architecture Patterns

1. **Manager Pattern**: All functionality wrapped in dedicated managers (LlmManager, ExportManager, etc.)
2. **IPC Handler Pattern**: All IPC handlers extend BaseIpcHandler with register/unregister methods
3. **Settings Store**: JSON-based persistence via SettingsStore class in userData directory
4. **Type Safety**: Strong TypeScript typing with shared types in src/shared/types/
5. **Security First**: Context isolation, allowed domain restrictions, user consent for all external operations

### Key Files for MCP Implementation Reference

- `/src/main/managers/exportManager.ts` - File operations with security
- `/src/main/managers/llmManager.ts` - External API integration (Hugging Face)
- `/src/main/managers/ipc/BaseIpcHandler.ts` - IPC handler base class
- `/src/main/store.ts` - Settings persistence
- `/src/shared/constants/ipc-channels.ts` - IPC channel definitions
- `/src/shared/types/ipc.ts` - TypeScript interfaces for IPC

## Recommendations Summary

Created comprehensive MCP recommendation document with 7 prioritized integrations:

1. **Local File System MCP** - Highest priority, enables reading/writing local files
2. **Chat History & Search MCP** - High priority, persistent local chat storage with search
3. **Obsidian/Note-Taking MCP** - High priority, bidirectional sync with knowledge bases
4. **Code Repository MCP** - Medium-high priority, Git repository access for code assistance
5. **LLM Model Management MCP** - Medium priority, enhanced local model management
6. **Browser Bookmark/History MCP** - Medium priority, import browser data
7. **System Integration MCP** - Low-medium priority, clipboard, calendar integration

## Privacy Principles Applied

All recommendations respect Gemini Desktop's privacy-first approach:

- Local-only data storage by default
- No unauthorized external API calls
- User-controlled opt-in for all integrations
- Sandboxed access with explicit user permission
- Transparent data flows

## Implementation Approach

Each MCP should follow the established pattern:

1. Create {Name}Manager class for business logic
2. Create {Name}IpcHandler extending BaseIpcHandler
3. Define types in src/shared/types/{name}.ts
4. Add IPC channels to ipc-channels.ts
5. Integrate into main.ts initialization

## Complexity Assessment

All recommended MCPs are achievable within the existing architecture:

- Leverage existing SettingsStore for persistence
- Follow BaseIpcHandler pattern for IPC
- Respect Electron security model
- Maintain TypeScript type safety

## Next Steps

The recommendation document provides:

- Detailed use cases for each MCP
- Specific integration points in existing codebase
- Implementation examples
- Security considerations
- 4-phase roadmap for gradual implementation
